// packages/world-model/src/traits/tool-requirement.ts

/**
 * The one tool-requirement shape every tool-gated trait holds.
 *
 * A trait that needs a tool — Cuttable, Diggable, Flammable, Openable,
 * LightSource — carries an optional `toolRequirement`: absent means no tool
 * is needed, present means one of its `tools` must be used. The standard
 * actions read it through one resolver, so a new tool-gated verb adds no
 * fields of its own. The value is plain data, so it saves and restores with
 * the trait.
 *
 * Public interface: `ToolRequirement`, `IToolGated`, `toolRequirement()`,
 * `accepts()`.
 *
 * Owner context: `@sharpee/world-model` — traits.
 *
 * References: alignment-fixes Q12 (Older-1). `LockableTrait`'s key is not a
 * tool requirement: a key is the lock's own concept.
 */

import { type EntityId } from '@sharpee/core';

/** The tools that satisfy a requirement, in declaration order. Never empty. */
export interface ToolRequirement {
  readonly tools: readonly EntityId[];
}

/** A trait whose action needs a tool. Absent `toolRequirement`: no tool needed. */
export interface IToolGated {
  toolRequirement?: ToolRequirement;
}

/**
 * Builds a tool requirement.
 * @param tools the accepted tool ids, in declaration order
 * @returns the requirement
 * @throws when no tool is given — an empty requirement could never be met
 */
export function toolRequirement(...tools: EntityId[]): ToolRequirement {
  if (tools.length === 0) {
    throw new Error('A tool requirement needs at least one tool.');
  }
  return { tools: [...tools] };
}

/**
 * Whether a tool satisfies a requirement.
 * @param requirement the requirement
 * @param toolId the offered tool
 * @returns true when the tool is one the requirement accepts
 */
export function accepts(requirement: ToolRequirement, toolId: EntityId): boolean {
  return requirement.tools.includes(toolId);
}
