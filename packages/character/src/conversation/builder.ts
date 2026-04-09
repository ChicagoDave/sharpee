/**
 * Conversation builder API (ADR-142)
 *
 * Extends CharacterBuilder with fluent methods for defining conversation
 * topics, response constraints, NPC initiative, and NPC-to-NPC scenes.
 * Compiles to ConversationData stored in CompiledCharacter.
 *
 * Public interface: ConversationBuilder, ResponseChainBuilder,
 *   ConversationData, OffscreenScene, WitnessedScene, DialogueLine.
 * Owner context: @sharpee/character / conversation
 */

import { CharacterBuilder } from '../character-builder';
import { TopicDef } from './topic-registry';
import {
  ResponseAction,
  ResponseCandidate,
} from './response-types';
import {
  ConversationIntent,
  ConversationStrength,
  InitiativeTrigger,
} from './lifecycle';

// ---------------------------------------------------------------------------
// Compiled conversation data
// ---------------------------------------------------------------------------

/** State mutations triggered by a response. */
export interface ResponseStateMutation {
  threat?: number;
  mood?: string;
  disposition?: Record<string, string>;
}

/** Context settings attached to a response. */
export interface ResponseContextSettings {
  label: string;
  intent?: ConversationIntent;
  strength?: ConversationStrength;
  decayThreshold?: number;
}

/** Between-turn override keyed by turn number. */
export interface BetweenTurnOverride {
  turnNumber: number;
  messageId: string;
}

/** An authored response with its full metadata. */
export interface AuthoredResponse {
  /** The response candidate for constraint evaluation. */
  candidate: ResponseCandidate;

  /** Optional context to set after this response. */
  contextSettings?: ResponseContextSettings;

  /** Optional state mutations to apply after this response. */
  stateMutations?: ResponseStateMutation;

  /** Between-turn message overrides within this response's context. */
  betweenTurnOverrides?: BetweenTurnOverride[];

  /** Leave-attempt message when this response's context is blocking. */
  onLeaveAttemptMessage?: string;
}

/** A dialogue line in an NPC-to-NPC scene. */
export interface DialogueLine {
  speaker: string;
  says: string;
}

/** An offscreen NPC-to-NPC conversation (player absent). */
export interface OffscreenScene {
  npcA: string;
  npcB: string;
  conditions: string[];
  mutations: Record<string, ResponseStateMutation>;
  topicUnlocks?: Record<string, string[]>;
  onReturnMessage?: string;
}

/** An eavesdropping NPC-to-NPC conversation (player concealed). */
export interface WitnessedScene {
  npcA: string;
  npcB: string;
  conditions: string[];
  dialogue: DialogueLine[];
  mutations: Record<string, ResponseStateMutation>;
  playerLearns?: { topic: string; source: string };
  discoveredBy?: { condition: string; messageId: string };
}

/** All conversation data compiled from the builder. */
export interface ConversationData {
  /** Topic definitions. */
  topics: TopicDef[];

  /** Authored responses keyed by topic trigger (e.g., 'asked about murder'). */
  responses: Map<string, AuthoredResponse[]>;

  /** NPC initiative triggers. */
  initiatives: InitiativeTrigger[];

  /** Offscreen NPC-to-NPC scenes. */
  offscreenScenes: OffscreenScene[];

  /** Witnessed/eavesdropping NPC-to-NPC scenes. */
  witnessedScenes: WitnessedScene[];
}

/** Create empty conversation data. */
export function createConversationData(): ConversationData {
  return {
    topics: [],
    responses: new Map(),
    initiatives: [],
    offscreenScenes: [],
    witnessedScenes: [],
  };
}

// ---------------------------------------------------------------------------
// Response chain builder (fluent chain for .when().if().tell() etc.)
// ---------------------------------------------------------------------------

/**
 * Fluent builder for defining response constraints within a topic trigger.
 * Each .if().action() pair becomes one ResponseCandidate.
 */
export class ResponseChainBuilder {
  private readonly parentBuilder: ConversationBuilder;
  private readonly trigger: string;
  private candidates: AuthoredResponse[] = [];
  private currentConstraints: string[] = [];
  private pendingContextSettings?: ResponseContextSettings;
  private pendingStateMutations?: ResponseStateMutation;
  private pendingBetweenTurnOverrides: BetweenTurnOverride[] = [];
  private pendingOnLeaveAttemptMessage?: string;

  constructor(trigger: string, parent: ConversationBuilder) {
    this.trigger = trigger;
    this.parentBuilder = parent;
  }

  // =========================================================================
  // Constraint setting
  // =========================================================================

  /**
   * Set predicate constraints for the next response.
   * All predicates must be satisfied for this response to be selected.
   *
   * @param predicates - Predicate names
   * @returns this for chaining
   */
  if(...predicates: string[]): ResponseChainBuilder {
    this.currentConstraints = predicates;
    return this;
  }

  /**
   * Mark the next response as the fallback (no constraints).
   *
   * @returns this for chaining
   */
  otherwise(): ResponseChainBuilder {
    this.currentConstraints = [];
    return this;
  }

  // =========================================================================
  // Response actions
  // =========================================================================

  private addResponse(
    action: ResponseAction,
    messageId: string,
    params?: Record<string, () => unknown>,
  ): ResponseChainBuilder {
    const authored: AuthoredResponse = {
      candidate: {
        action,
        messageId,
        constraints: [...this.currentConstraints],
        params,
      },
      contextSettings: this.pendingContextSettings,
      stateMutations: this.pendingStateMutations,
      betweenTurnOverrides: this.pendingBetweenTurnOverrides.length > 0
        ? [...this.pendingBetweenTurnOverrides]
        : undefined,
      onLeaveAttemptMessage: this.pendingOnLeaveAttemptMessage,
    };

    this.candidates.push(authored);

    // Reset pending state for next response
    this.currentConstraints = [];
    this.pendingContextSettings = undefined;
    this.pendingStateMutations = undefined;
    this.pendingBetweenTurnOverrides = [];
    this.pendingOnLeaveAttemptMessage = undefined;

    return this;
  }

  /** Share the information truthfully. */
  tell(messageId: string, params?: Record<string, () => unknown>): ResponseChainBuilder {
    return this.addResponse('tell', messageId, params);
  }

  /** Provide false information. */
  lie(messageId: string): ResponseChainBuilder {
    return this.addResponse('lie', messageId);
  }

  /** Change the subject. */
  deflect(messageId: string): ResponseChainBuilder {
    return this.addResponse('deflect', messageId);
  }

  /** Explicitly refuse to answer. */
  refuse(messageId: string): ResponseChainBuilder {
    return this.addResponse('refuse', messageId);
  }

  /** Know but don't mention. */
  omit(messageId: string): ResponseChainBuilder {
    return this.addResponse('omit', messageId);
  }

  /** Reveal previously hidden truth. */
  confess(messageId: string): ResponseChainBuilder {
    return this.addResponse('confess', messageId);
  }

  /** Fill gaps with invented details (NPC believes them). */
  confabulate(messageId: string): ResponseChainBuilder {
    return this.addResponse('confabulate', messageId);
  }

  /** Turn the question around. */
  askBack(messageId: string): ResponseChainBuilder {
    return this.addResponse('ask back', messageId);
  }

  // =========================================================================
  // Response modifiers (applied to the NEXT response added)
  // =========================================================================

  /**
   * Set conversation context after this response.
   *
   * @param label - Context label
   * @param opts - Optional intent, strength, decay threshold
   * @returns this for chaining
   */
  setsContext(
    label: string,
    opts?: { intent?: ConversationIntent; strength?: ConversationStrength; decayThreshold?: number },
  ): ResponseChainBuilder {
    this.pendingContextSettings = {
      label,
      intent: opts?.intent,
      strength: opts?.strength,
      decayThreshold: opts?.decayThreshold,
    };
    return this;
  }

  /**
   * Override between-turn commentary within this response's context.
   *
   * @param turnNumber - Which non-conversation turn this fires on
   * @param messageId - The message ID
   * @returns this for chaining
   */
  betweenTurns(turnNumber: number, messageId: string): ResponseChainBuilder {
    this.pendingBetweenTurnOverrides.push({ turnNumber, messageId });
    return this;
  }

  /**
   * Set the message shown when the player tries to leave during a blocking context.
   *
   * @param messageId - The message ID
   * @returns this for chaining
   */
  onLeaveAttempt(messageId: string): ResponseChainBuilder {
    this.pendingOnLeaveAttemptMessage = messageId;
    return this;
  }

  /**
   * Apply state mutations after this response.
   *
   * @param mutations - State changes (threat, mood, disposition)
   * @returns this for chaining
   */
  updatesState(mutations: ResponseStateMutation): ResponseChainBuilder {
    this.pendingStateMutations = mutations;
    return this;
  }

  // =========================================================================
  // Finalization
  // =========================================================================

  /**
   * Start a new .when() trigger chain, finalizing this one.
   *
   * @param trigger - The new trigger (e.g., 'asked about weapon')
   * @returns A new ResponseChainBuilder for the new trigger
   */
  when(trigger: string): ResponseChainBuilder {
    this.finalize();
    return this.parentBuilder.when(trigger);
  }

  /**
   * Return to the parent builder, finalizing this chain.
   *
   * @returns The parent ConversationBuilder
   */
  done(): ConversationBuilder {
    this.finalize();
    return this.parentBuilder;
  }

  /** @internal Finalize this chain and push candidates to parent. */
  finalize(): void {
    if (this.candidates.length > 0) {
      this.parentBuilder._addResponses(this.trigger, this.candidates);
      this.candidates = [];
    }
  }

  /** @internal Get candidates without finalizing (for testing). */
  _getCandidates(): AuthoredResponse[] {
    return this.candidates;
  }
}

// ---------------------------------------------------------------------------
// Conversation builder (extends CharacterBuilder)
// ---------------------------------------------------------------------------

/**
 * Extends CharacterBuilder with conversation-specific methods.
 * Accumulates conversation data and compiles it alongside
 * the character model data.
 */
export class ConversationBuilder extends CharacterBuilder {
  private readonly _conversationData: ConversationData = createConversationData();
  private _activeChain?: ResponseChainBuilder;

  // =========================================================================
  // Topic registration
  // =========================================================================

  /**
   * Define a conversation topic.
   *
   * @param name - The canonical topic name
   * @param def - Topic definition (keywords, related, availableWhen)
   * @returns this for chaining
   */
  topic(
    name: string,
    def: Omit<TopicDef, 'name'>,
  ): ConversationBuilder {
    this._conversationData.topics.push({ name, ...def });
    return this;
  }

  // =========================================================================
  // Response chains
  // =========================================================================

  /**
   * Begin a response chain for a trigger.
   * The trigger is typically 'asked about {topic}' or 'told about {topic}'.
   *
   * @param trigger - The trigger string
   * @returns A ResponseChainBuilder for fluent chaining
   */
  when(trigger: string): ResponseChainBuilder {
    // Finalize any pending chain
    this._finalizePendingChain();

    const chain = new ResponseChainBuilder(trigger, this);
    this._activeChain = chain;
    return chain;
  }

  /** @internal Called by ResponseChainBuilder to register completed responses. */
  _addResponses(trigger: string, responses: AuthoredResponse[]): void {
    const existing = this._conversationData.responses.get(trigger) ?? [];
    existing.push(...responses);
    this._conversationData.responses.set(trigger, existing);
  }

  // =========================================================================
  // NPC initiative
  // =========================================================================

  /**
   * Define when this NPC initiates conversation proactively.
   *
   * @param conditions - Predicate conditions
   * @param messageId - The message ID when the NPC initiates
   * @returns this for chaining
   */
  initiates(conditions: string[], messageId: string): ConversationBuilder {
    this._conversationData.initiatives.push({ conditions, messageId });
    return this;
  }

  // =========================================================================
  // NPC-to-NPC scenes
  // =========================================================================

  /**
   * Define an offscreen NPC-to-NPC conversation (player absent).
   *
   * @param scene - The offscreen scene definition
   * @returns this for chaining
   */
  offscreen(scene: OffscreenScene): ConversationBuilder {
    this._conversationData.offscreenScenes.push(scene);
    return this;
  }

  /**
   * Define an eavesdropping scene (player concealed).
   *
   * @param scene - The witnessed scene definition
   * @returns this for chaining
   */
  witnessed(scene: WitnessedScene): ConversationBuilder {
    this._conversationData.witnessedScenes.push(scene);
    return this;
  }

  // =========================================================================
  // Conversation data access
  // =========================================================================

  /**
   * Get the compiled conversation data.
   * Finalizes any pending response chain.
   *
   * @returns The conversation data
   */
  getConversationData(): ConversationData {
    this._finalizePendingChain();
    return this._conversationData;
  }

  // =========================================================================
  // Private helpers
  // =========================================================================

  /** Finalize any pending response chain builder. */
  private _finalizePendingChain(): void {
    if (this._activeChain) {
      this._activeChain.finalize();
      this._activeChain = undefined;
    }
  }
}
