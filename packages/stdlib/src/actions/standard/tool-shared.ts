/**
 * Shared tool-requirement validation for tool-gated actions (ADR-230 D3).
 *
 * Mirrors validateKeyRequirements (lock-shared.ts) for the author-configured
 * tool pattern: a trait declares which tool works (toolId/toolIds), the
 * action's validate() calls this helper, and an entity with no tool
 * requirement ignores an offered tool exactly as a keyless lockable ignores
 * keyless LOCK. Used by opening (D3b) and cutting (D3c).
 *
 * Public interface: TOOL_MESSAGES, validateToolRequirements().
 * Owner context: stdlib standard actions.
 */

import { EntityId } from '@sharpee/core';
import { ActionContext, ValidationResult } from '../enhanced-types';
import { IFEntity } from '@sharpee/world-model';
import { nounPhraseFor } from '../../utils';

/**
 * Shared message constants for tool validation.
 * These are message IDs, not English strings - lang-en-us resolves them.
 */
export const TOOL_MESSAGES = {
  NO_TOOL: 'no_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',
};

/**
 * Validates an action's tool requirement against the command's tool.
 *
 * @param context action context (for actor/world lookups)
 * @param target the tool-gated entity
 * @param tool the command's explicit tool entity, if any
 * @param requiresTool whether the target declares a tool requirement
 *   (e.g. OpenableBehavior.requiresTool(target))
 * @param canUseWith trait-specific predicate for "this tool works"
 *   (e.g. (id) => OpenableBehavior.canOpenWith(target, id))
 * @returns a failed ValidationResult, or null when validation passes
 */
export function validateToolRequirements(
  context: ActionContext,
  target: IFEntity,
  tool: IFEntity | undefined,
  requiresTool: boolean,
  canUseWith: (toolId: EntityId) => boolean
): ValidationResult | null {
  if (!requiresTool) {
    return null; // No tool required — an offered tool is ignored, not an error
  }

  // Tool is required but not provided
  if (!tool) {
    return {
      valid: false,
      error: TOOL_MESSAGES.NO_TOOL,
      params: { item: nounPhraseFor(target) }
    };
  }

  // Check if player has the tool
  const actor = context.player;
  const toolLocation = context.world.getLocation(tool.id);
  if (toolLocation !== actor.id) {
    return {
      valid: false,
      error: TOOL_MESSAGES.TOOL_NOT_HELD,
      params: { tool: nounPhraseFor(tool) }
    };
  }

  // Check if it's the right tool
  if (!canUseWith(tool.id)) {
    return {
      valid: false,
      error: TOOL_MESSAGES.WRONG_TOOL,
      params: {
        tool: nounPhraseFor(tool),
        item: nounPhraseFor(target)
      }
    };
  }

  return null; // All tool validations pass
}
