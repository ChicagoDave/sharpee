/**
 * CharacterModelDialogue — DialogueExtension implementation (ADR-142)
 *
 * Implements the DialogueExtension interface (ADR-102) using the
 * character model conversation system. Wires topic resolution,
 * constraint evaluation, conversation lifecycle, and the ACL
 * into a single handler for stdlib's ASK/TELL/SAY/TALK TO actions.
 *
 * Public interface: CharacterModelDialogue.
 * Owner context: @sharpee/character / conversation
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import { DialogueExtension, DialogueResult } from './dialogue-types';
import { TopicRegistry } from './topic-registry';
import { ResponseCandidate } from './response-types';
import { evaluateConstraints, ConstraintEvaluator } from './constraint-evaluator';
import { ConversationLifecycle } from './lifecycle';
import { buildResponseIntent } from './acl';
import {
  ConversationData,
  AuthoredResponse,
  ResponseStateMutation,
} from './builder';

// ---------------------------------------------------------------------------
// NPC registration
// ---------------------------------------------------------------------------

/** Runtime state for a registered NPC. */
interface NpcConversationState {
  /** The NPC's CharacterModelTrait (for predicate evaluation and state). */
  trait: CharacterModelTrait;

  /** Topic registry built from authored topics. */
  topicRegistry: TopicRegistry;

  /** Authored responses keyed by trigger. */
  responses: Map<string, AuthoredResponse[]>;

  /** Current turn number accessor. */
  getTurn: () => number;
}

// ---------------------------------------------------------------------------
// CharacterModelDialogue
// ---------------------------------------------------------------------------

/**
 * DialogueExtension implementation backed by the character model.
 *
 * Manages per-NPC topic registries, constraint evaluation, conversation
 * lifecycle, and evidence tracking. One instance per game session.
 */
export class CharacterModelDialogue implements DialogueExtension {
  /** Per-NPC conversation state. */
  private readonly npcs: Map<string, NpcConversationState> = new Map();

  /** Shared constraint evaluator (owns conversation records and evidence). */
  private readonly evaluator: ConstraintEvaluator = new ConstraintEvaluator();

  /** Shared conversation lifecycle (owns active conversation state). */
  private readonly lifecycle: ConversationLifecycle = new ConversationLifecycle();

  /** Get the conversation lifecycle for external access. */
  getLifecycle(): ConversationLifecycle {
    return this.lifecycle;
  }

  /** Get the constraint evaluator for external access. */
  getEvaluator(): ConstraintEvaluator {
    return this.evaluator;
  }

  // =========================================================================
  // NPC registration
  // =========================================================================

  /**
   * Register an NPC with its conversation data and character model trait.
   *
   * @param npcId - The NPC entity ID
   * @param data - Compiled conversation data from ConversationBuilder
   * @param trait - The NPC's CharacterModelTrait
   * @param getTurn - Function that returns the current turn number
   */
  registerNpc(
    npcId: string,
    data: ConversationData,
    trait: CharacterModelTrait,
    getTurn: () => number,
  ): void {
    // Build topic registry from authored topics
    const topicRegistry = new TopicRegistry();
    for (const topicDef of data.topics) {
      topicRegistry.define(topicDef);
    }

    // Register initiative triggers
    for (const initiative of data.initiatives) {
      this.lifecycle.registerInitiative(npcId, initiative.conditions, initiative.messageId);
    }

    this.npcs.set(npcId, {
      trait,
      topicRegistry,
      responses: data.responses,
      getTurn,
    });
  }

  // =========================================================================
  // DialogueExtension implementation
  // =========================================================================

  /**
   * Handle ASK [npc] ABOUT [text].
   * Resolves topic, evaluates constraints, records response, builds intent.
   */
  handleAsk(npcId: string, aboutText: string): DialogueResult {
    const npc = this.npcs.get(npcId);
    if (!npc) return { handled: false };

    // Ensure conversation is active
    if (!this.lifecycle.isActive() || this.lifecycle.getActiveNpcId() !== npcId) {
      this.lifecycle.begin(npcId);
    }

    // Resolve topic
    const resolution = npc.topicRegistry.resolve(aboutText, npc.trait);

    if (resolution.type === 'none') {
      return {
        handled: true,
        messageId: 'character.conversation.unknown-topic',
      };
    }

    // Get the trigger key — for related topics, use the redirect target
    const topicName = resolution.type === 'exact'
      ? resolution.topic.name
      : resolution.via.name;
    const trigger = `asked about ${topicName}`;

    // Get authored responses for this trigger
    const authoredResponses = npc.responses.get(trigger);
    if (!authoredResponses || authoredResponses.length === 0) {
      // Topic exists but no responses authored for it
      if (resolution.type === 'related') {
        return {
          handled: true,
          messageId: 'character.conversation.related-redirect',
          params: { topic: topicName, via: resolution.via.name },
        };
      }
      return {
        handled: true,
        messageId: 'character.conversation.no-response',
      };
    }

    // Select and record response, then apply side effects
    const match = this.selectAndRecordResponse(npc, npcId, topicName, authoredResponses);
    if (!match) {
      return {
        handled: true,
        messageId: 'character.conversation.no-matching-response',
      };
    }

    this.applyResponseSideEffects(npc.trait, match.authoredResponse);

    // Build response intent through ACL
    const context = this.lifecycle.getContext()?.contextLabel;
    const intent = buildResponseIntent(match.selected, topicName, npc.trait, context);

    // Handle related topic redirect framing
    if (resolution.type === 'related') {
      return {
        handled: true,
        messageId: intent.messageId,
        params: {
          ...intent.params,
          _redirectedFrom: resolution.via.name,
        },
        responseIntent: intent,
      };
    }

    return {
      handled: true,
      messageId: intent.messageId,
      params: intent.params,
      responseIntent: intent,
    };
  }

  /**
   * Handle TELL [npc] ABOUT [text].
   * Confrontation path — the player presents information.
   */
  handleTell(npcId: string, aboutText: string): DialogueResult {
    const npc = this.npcs.get(npcId);
    if (!npc) return { handled: false };

    // Ensure conversation is active
    if (!this.lifecycle.isActive() || this.lifecycle.getActiveNpcId() !== npcId) {
      this.lifecycle.begin(npcId);
    }

    // Resolve topic
    const resolution = npc.topicRegistry.resolve(aboutText, npc.trait);

    if (resolution.type === 'none') {
      return {
        handled: true,
        messageId: 'character.conversation.unknown-topic',
      };
    }

    const topicName = resolution.type === 'exact'
      ? resolution.topic.name
      : resolution.via.name;
    const trigger = `told about ${topicName}`;
    const turn = npc.getTurn();

    // Record that the player presented this evidence
    this.evaluator.recordEvidence(npcId, topicName, turn);

    // Get authored responses for the confrontation trigger
    const authoredResponses = npc.responses.get(trigger);
    if (!authoredResponses || authoredResponses.length === 0) {
      return {
        handled: true,
        messageId: 'character.conversation.no-response-to-evidence',
      };
    }

    // Select and record response, then apply side effects
    const match = this.selectAndRecordResponse(npc, npcId, topicName, authoredResponses);
    if (!match) {
      return {
        handled: true,
        messageId: 'character.conversation.no-matching-response',
      };
    }

    this.applyResponseSideEffects(npc.trait, match.authoredResponse);

    // Build response intent
    const context = this.lifecycle.getContext()?.contextLabel;
    const intent = buildResponseIntent(match.selected, topicName, npc.trait, context);

    return {
      handled: true,
      messageId: intent.messageId,
      params: intent.params,
      responseIntent: intent,
    };
  }

  /**
   * Handle SAY [text] or SAY [text] TO [npc].
   * Routes free speech through topic resolution.
   */
  handleSay(npcId: string | undefined, spokenText: string): DialogueResult {
    if (!npcId) return { handled: false };

    // Route through handleAsk — SAY is semantically similar
    return this.handleAsk(npcId, spokenText);
  }

  /**
   * Handle TALK TO [npc].
   * Initiates conversation lifecycle.
   */
  handleTalkTo(npcId: string): DialogueResult {
    const npc = this.npcs.get(npcId);
    if (!npc) return { handled: false };

    // Begin conversation
    this.lifecycle.begin(npcId);

    // Check for initiative triggers
    const triggers = this.lifecycle.getInitiativeTriggers(npcId);
    for (const trigger of triggers) {
      const allMet = trigger.conditions.every(cond => npc.trait.evaluate(cond));
      if (allMet) {
        return {
          handled: true,
          messageId: trigger.messageId,
        };
      }
    }

    // Default greeting
    return {
      handled: true,
      messageId: 'character.conversation.greeting',
    };
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /**
   * Select the best response for a topic and record it in the evaluator.
   *
   * Evaluates constraints across all authored responses, picks the best
   * match, and records the interaction.
   *
   * @param npc - NPC conversation state
   * @param npcId - The NPC entity ID
   * @param topicName - The resolved topic name
   * @param authoredResponses - Authored responses for this trigger
   * @returns The selected candidate and its authored response, or null
   */
  private selectAndRecordResponse(
    npc: NpcConversationState,
    npcId: string,
    topicName: string,
    authoredResponses: AuthoredResponse[],
  ): { selected: ResponseCandidate; authoredResponse: AuthoredResponse } | null {
    const candidates: ResponseCandidate[] = authoredResponses.map(r => r.candidate);
    const selected = evaluateConstraints(candidates, npc.trait);

    if (!selected) return null;

    const authoredResponse = authoredResponses.find(r => r.candidate === selected)!;
    const turn = npc.getTurn();

    this.evaluator.recordResponse(npcId, topicName, selected.action, turn);

    return { selected, authoredResponse };
  }

  /**
   * Apply side effects from a selected authored response: state mutations,
   * conversation context, between-turn overrides, and leave-attempt message.
   *
   * @param trait - The NPC's CharacterModelTrait
   * @param authoredResponse - The selected authored response
   */
  private applyResponseSideEffects(
    trait: CharacterModelTrait,
    authoredResponse: AuthoredResponse,
  ): void {
    if (authoredResponse.stateMutations) {
      this.applyStateMutations(trait, authoredResponse.stateMutations);
    }

    if (authoredResponse.contextSettings) {
      const ctx = authoredResponse.contextSettings;
      this.lifecycle.setContext(ctx.label, ctx.intent, ctx.strength, ctx.decayThreshold);

      if (authoredResponse.betweenTurnOverrides) {
        for (const override of authoredResponse.betweenTurnOverrides) {
          this.lifecycle.setBetweenTurnOverride(override.turnNumber, override.messageId);
        }
      }

      if (authoredResponse.onLeaveAttemptMessage) {
        this.lifecycle.setOnLeaveAttemptMessage(authoredResponse.onLeaveAttemptMessage);
      }
    }
  }

  /** Apply state mutations to the NPC's character model trait. */
  private applyStateMutations(
    trait: CharacterModelTrait,
    mutations: ResponseStateMutation,
  ): void {
    if (mutations.threat !== undefined) {
      trait.adjustThreat(mutations.threat);
    }
    if (mutations.mood !== undefined) {
      trait.setMood(mutations.mood);
    }
    if (mutations.disposition) {
      for (const [entityId, word] of Object.entries(mutations.disposition)) {
        trait.setDisposition(entityId, word);
      }
    }
  }
}
