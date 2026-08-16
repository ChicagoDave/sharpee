/**
 * The character dialogue selector (ADR-310 D15; contracts.md §5)
 *
 * Adapts CharacterModelDialogue to the world's dialogue-selector socket:
 * stdlib's ASK/TELL/SAY/TALK TO consult the registered selector for NPCs
 * carrying CharacterModelTrait, and an unhandled result falls through to
 * the action's default (ADR-310 D7: no model, no change). The selection
 * context's speaker becomes the lie ledger's audience (ADR-318 D9).
 *
 * Public interface: createCharacterDialogueSelector,
 *   registerCharacterDialogue.
 * Owner context: @sharpee/character / conversation
 */

import {
  WorldModel,
  TraitType,
  CharacterModelTrait,
  type DialogueSelector,
  type DialogueSelectionResult,
} from '@sharpee/world-model';
import { CharacterModelDialogue } from './dialogue-extension.js';
import { dialogueTurn } from '../character-clock.js';
import { markConversationTurn } from './conversation-marker.js';

/**
 * Build a DialogueSelector backed by a CharacterModelDialogue instance.
 *
 * @param dialogue - The conversation system holding registered NPCs
 * @returns The selector to register on the world
 */
export function createCharacterDialogueSelector(
  dialogue: CharacterModelDialogue,
): DialogueSelector {
  return (npc, intent, ctx): DialogueSelectionResult | undefined => {
    const result = (() => {
      switch (intent.type) {
        case 'ask':
          return dialogue.handleAsk(npc.id, intent.text ?? '', ctx.speakerId);
        case 'tell':
          return dialogue.handleTell(npc.id, intent.text ?? '', ctx.speakerId);
        case 'say':
          return dialogue.handleSay(npc.id, intent.text ?? '', ctx.speakerId);
        case 'talk-to':
          return dialogue.handleTalkTo(npc.id);
      }
    })();

    if (!result.handled) return undefined;

    // A handled delivery is a conversation in progress (ADR-310 D16):
    // stamp the marker so goal pursuit is suppressed while it is fresh.
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (trait) markConversationTurn(trait, ctx.speakerId, dialogueTurn(ctx.world));

    return {
      handled: true,
      messageId: result.messageId,
      params: result.params,
      authorEvents: result.authorEvents,
    };
  };
}

/**
 * Register the character dialogue selector on a world (idempotent
 * last-wins, per-world; re-register on every story load).
 *
 * @param world - The world whose conversation actions should consult it
 * @param dialogue - The conversation system holding registered NPCs
 */
export function registerCharacterDialogue(
  world: WorldModel,
  dialogue: CharacterModelDialogue,
): void {
  world.registerDialogueSelector(createCharacterDialogueSelector(dialogue));
}
