/**
 * Shared helper for consulting the world's dialogue selector from the
 * conversation actions' report phases (ADR-310 D15; contracts.md §5).
 *
 * ASK/TELL/SAY/TALK TO consult the registered selector when the addressed
 * NPC carries a `CharacterModelTrait`; an unhandled or absent selection
 * falls through to the action's default behavior (ADR-310 D7: no model,
 * no change). Story-registered interceptors still run after the emitted
 * event, unchanged — story overrides outrank the platform selector.
 *
 * Public interface: consultDialogueSelector.
 * Owner context: stdlib / actions / helpers
 */

import {
  IFEntity,
  TraitType,
  type ConversationIntent,
  type DialogueSelectionResult,
} from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types.js';

/**
 * Consult the world's dialogue selector for a conversation act.
 *
 * @param context - The action context (provides world and player)
 * @param target - The addressed NPC
 * @param intent - What the player is conversationally doing
 * @returns A handled selection, or `undefined` to use the action's default
 */
export function consultDialogueSelector(
  context: ActionContext,
  target: IFEntity,
  intent: ConversationIntent,
): DialogueSelectionResult | undefined {
  // D7: no model, no change — unmodeled NPCs never reach the selector.
  if (!target.has(TraitType.CHARACTER_MODEL)) return undefined;

  const selector = context.world.getDialogueSelector();
  if (!selector) return undefined;

  const selection = selector(target, intent, {
    world: context.world,
    speakerId: context.player.id,
  });
  return selection?.handled ? selection : undefined;
}
