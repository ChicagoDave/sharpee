/**
 * Shared tool-requirement resolution for tool-gated actions (ADR-230 D3).
 *
 * Mirrors validateKeyRequirements (lock-shared.ts) for the author-configured
 * tool pattern: a trait declares which tool works (toolId/toolIds), the
 * action's validate() calls this helper, and an entity with no tool
 * requirement ignores an offered tool exactly as a keyless lockable ignores
 * keyless LOCK. Used by opening (D3b), cutting (D3c) and digging.
 *
 * GH #241 (publish-readiness P-28): a tool the player did not name is
 * implied when exactly one declared tool is in the player's hands, so
 * `cut the fuse` with the shears held cuts. Without one, a single declared
 * tool is named in the refusal (`needs_tool`); several declared tools, or
 * several held, keep the generic `no_tool`.
 *
 * Public interface: TOOL_MESSAGES, ToolResolution, resolveToolRequirements().
 * Owner context: stdlib standard actions.
 */

import { type EntityId } from '@sharpee/core';
import { ActionContext, ValidationResult } from '../enhanced-types.js';
import { IFEntity } from '@sharpee/world-model';
import { nounPhraseFor } from '../../utils/index.js';

/**
 * Shared message constants for tool validation.
 * These are message IDs, not English strings - lang-en-us resolves them.
 */
export const TOOL_MESSAGES = {
  NO_TOOL: 'no_tool',
  NEEDS_TOOL: 'needs_tool',
  TOOL_NOT_HELD: 'tool_not_held',
  WRONG_TOOL: 'wrong_tool',
};

/** What the requirement resolved to: a failure, or the tool to use (if any). */
export interface ToolResolution {
  /** The tool the action works with — explicit, or implied from the hands. */
  tool?: IFEntity;
  /** True when `tool` was implied rather than named in the command. */
  implicit?: boolean;
  /** The refusal, when the requirement is not met. */
  failure?: ValidationResult;
}

/**
 * Resolves an action's tool requirement against the command's tool and the
 * actor's hands.
 *
 * @param context action context (for actor/world lookups)
 * @param target the tool-gated entity
 * @param tool the command's explicit tool entity, if any
 * @param requiresTool whether the target declares a tool requirement
 *   (e.g. OpenableBehavior.requiresTool(target))
 * @param canUseWith trait-specific predicate for "this tool works"
 *   (e.g. (id) => OpenableBehavior.canOpenWith(target, id))
 * @param requiredTools the target's declared tool ids
 *   (e.g. OpenableBehavior.requiredTools(target))
 * @returns the resolution — `failure` set when validation fails
 */
export function resolveToolRequirements(
  context: ActionContext,
  target: IFEntity,
  tool: IFEntity | undefined,
  requiresTool: boolean,
  canUseWith: (toolId: EntityId) => boolean,
  requiredTools: EntityId[]
): ToolResolution {
  if (!requiresTool) {
    return { tool }; // No tool required — an offered tool is ignored, not an error
  }

  const actor = context.actor;
  const held = (candidate: IFEntity): boolean => context.world.getLocation(candidate.id) === actor.id;

  // No tool named: exactly one declared tool in hand is implied.
  if (!tool) {
    const inHand = requiredTools
      .map(id => context.world.getEntity(id))
      .filter((e): e is IFEntity => !!e && held(e) && canUseWith(e.id));
    if (inHand.length === 1) {
      return { tool: inHand[0], implicit: true };
    }
    const declared = requiredTools.length === 1 ? context.world.getEntity(requiredTools[0]) : undefined;
    if (declared && inHand.length === 0) {
      return {
        failure: {
          valid: false,
          error: TOOL_MESSAGES.NEEDS_TOOL,
          params: { item: nounPhraseFor(target), tool: nounPhraseFor(declared) }
        }
      };
    }
    return {
      failure: {
        valid: false,
        error: TOOL_MESSAGES.NO_TOOL,
        params: { item: nounPhraseFor(target) }
      }
    };
  }

  // Check if player has the tool
  if (!held(tool)) {
    return {
      failure: {
        valid: false,
        error: TOOL_MESSAGES.TOOL_NOT_HELD,
        params: { tool: nounPhraseFor(tool) }
      }
    };
  }

  // Check if it's the right tool
  if (!canUseWith(tool.id)) {
    return {
      failure: {
        valid: false,
        error: TOOL_MESSAGES.WRONG_TOOL,
        params: {
          tool: nounPhraseFor(tool),
          item: nounPhraseFor(target)
        }
      }
    };
  }

  return { tool }; // All tool validations pass
}
