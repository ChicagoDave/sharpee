/**
 * Shared tool-requirement resolution for tool-gated actions (ADR-230 D3).
 *
 * Mirrors validateKeyRequirements (lock-shared.ts) for the author-configured
 * tool pattern: a tool-gated trait holds a `ToolRequirement` (world-model's
 * one shape), the action's validate() hands it to this helper, and an entity
 * with no requirement ignores an offered tool exactly as a keyless lockable
 * ignores keyless LOCK. Used by opening (D3b), cutting (D3c), digging,
 * burning and lighting; a new tool-gated verb passes its trait's
 * requirement and adds nothing here.
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

import { ActionContext, ValidationResult } from '../enhanced-types.js';
import { IFEntity, accepts, type ToolRequirement } from '@sharpee/world-model';
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
 * @param requirement the target trait's tool requirement
 *   (e.g. target.get(OpenableTrait)?.toolRequirement); absent, no tool is needed
 * @returns the resolution — `failure` set when validation fails
 */
export function resolveToolRequirements(
  context: ActionContext,
  target: IFEntity,
  tool: IFEntity | undefined,
  requirement: ToolRequirement | undefined
): ToolResolution {
  if (!requirement) {
    return { tool }; // No tool required — an offered tool is ignored, not an error
  }
  const requiredTools = requirement.tools;

  const actor = context.actor;
  const held = (candidate: IFEntity): boolean => context.world.getLocation(candidate.id) === actor.id;

  // No tool named: exactly one declared tool in hand is implied.
  if (!tool) {
    const inHand = requiredTools
      .map(id => context.world.getEntity(id))
      .filter((e): e is IFEntity => !!e && held(e));
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
  if (!accepts(requirement, tool.id)) {
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
