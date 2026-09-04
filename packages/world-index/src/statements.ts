/**
 * statements.ts — the two statement walks Reach depends on.
 *
 * Purpose: a gate opens only when something writes the blocking entity out of
 * its state, and a thing placed nowhere is fine if a statement moves it into
 * play. Both answers are a walk over every statement tree in the IR, and both
 * need the same thing the trees do not carry on their own: the context a
 * statement sits in, which decides whether the player can ever fire it.
 *
 * Public interface: collectStateWriters, entitiesMovedIntoPlay, StateWriter,
 * WriterOwner.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * @packageDocumentation
 * @see ADR-321 D4: a gate opens only when a `change` moves the entity out of the
 *   blocking state and that statement is itself triggerable
 */

import type { IREntity, StoryIR } from '@sharpee/chord';

/**
 * What has to be reachable for a writer to fire.
 *
 * An entity-owned clause fires when the player can act on that entity; a
 * machine's transition fires when the player can act on one of its role
 * entities; a story-owned clause — a sequence step, an every-turn clause, a
 * story action — fires on the story's own schedule and needs nothing reached.
 */
export type WriterOwner =
  | { kind: 'entity'; id: string }
  | { kind: 'machine'; name: string; roles: string[] }
  | { kind: 'story' };

/** One `change <entity> to <state>` statement, with the context that fires it. */
export interface StateWriter {
  /** Entity whose state the statement writes. */
  target: string;
  /** State it writes. */
  state: string;
  /** What must be reachable for the statement to fire. */
  owner: WriterOwner;
  /** Source line, for a finding that points at the author's own text. */
  line: number | null;
}

/** A node of unknown shape somewhere in a statement tree. */
type IRNode = Record<string, unknown>;

/** Whether a value is a walkable object or array. */
function isWalkable(node: unknown): node is IRNode | unknown[] {
  return typeof node === 'object' && node !== null;
}

/**
 * Resolve a `change` statement's target to an entity id.
 *
 * @param entityValue the statement's `entity` IRValue
 * @param itBinding the entity `it` refers to in this context, if any
 * @returns the target entity id, or `undefined` when it cannot be resolved
 */
function targetOf(entityValue: unknown, itBinding: string | undefined): string | undefined {
  if (!isWalkable(entityValue) || Array.isArray(entityValue)) return undefined;
  const value = entityValue as IRNode;
  if (value.kind === 'entity' && typeof value.id === 'string') return value.id;
  if (value.kind === 'it') return itBinding;
  return undefined;
}

/**
 * Collect every `change` statement in a subtree, with its firing context.
 *
 * @param root the subtree to walk
 * @param owner what must be reachable for statements found here to fire
 * @param itBinding the entity `it` refers to in this context, if any
 * @param into the accumulator to append to
 */
function walkForWriters(
  root: unknown,
  owner: WriterOwner,
  itBinding: string | undefined,
  into: StateWriter[],
): void {
  if (!isWalkable(root)) return;
  if (Array.isArray(root)) {
    for (const child of root) walkForWriters(child, owner, itBinding, into);
    return;
  }
  const node = root as IRNode;
  if (node.kind === 'change' && typeof node.state === 'string') {
    const target = targetOf(node.entity, itBinding);
    if (target !== undefined) {
      const span = node.span as { line?: number } | undefined;
      into.push({ target, state: node.state, owner, line: span?.line ?? null });
    }
  }
  for (const key of Object.keys(node)) walkForWriters(node[key], owner, itBinding, into);
}

/**
 * The entities that compose a named trait.
 *
 * @param ir the story IR
 * @param traitName the trait's adjective
 * @returns every entity composing it, in declaration order
 */
function composersOf(ir: StoryIR, traitName: string): IREntity[] {
  return ir.entities.filter((entity) =>
    (entity.traits ?? []).some((trait) => trait.name === traitName),
  );
}

/**
 * Every `change` statement in the story, resolved to a target entity and the
 * context that can fire it.
 *
 * A trait's clause is expanded once per composing entity, because that is what
 * `it` means there and what the player has to reach to fire it. A machine's
 * clause keeps the machine's own role bindings, since the transition is driven
 * by acting on a role entity rather than on whatever the statement writes.
 *
 * @param ir the story IR
 * @returns every resolvable state write; statements whose `it` cannot be bound
 *   to an entity are omitted rather than guessed at
 */
export function collectStateWriters(ir: StoryIR): StateWriter[] {
  const writers: StateWriter[] = [];

  for (const entity of ir.entities) {
    const owner: WriterOwner = { kind: 'entity', id: entity.id };
    walkForWriters(entity.onClauses, owner, entity.id, writers);
    walkForWriters(entity.topics, owner, entity.id, writers);
    walkForWriters(entity.manner, owner, entity.id, writers);
  }

  for (const trait of ir.traits ?? []) {
    for (const composer of composersOf(ir, trait.name)) {
      walkForWriters(
        trait.onClauses,
        { kind: 'entity', id: composer.id },
        composer.id,
        writers,
      );
    }
  }

  for (const machine of ir.machines ?? []) {
    const roles = machine.roles.map((role) => role.entity);
    walkForWriters(machine.states, { kind: 'machine', name: machine.name, roles }, undefined, writers);
  }

  const story: WriterOwner = { kind: 'story' };
  walkForWriters(ir.story?.onClauses, story, undefined, writers);
  walkForWriters(ir.sequences, story, undefined, writers);
  walkForWriters(ir.actions, story, undefined, writers);
  walkForWriters(ir.hatches, story, undefined, writers);

  return writers;
}

/**
 * The entities some statement moves into play.
 *
 * A thing with no placement is not a gap when a `move` brings it on stage; the
 * author put it in the story, just not on the map.
 *
 * @param ir the story IR
 * @returns entity ids named by a `move` statement anywhere in the story
 */
export function entitiesMovedIntoPlay(ir: StoryIR): Set<string> {
  const moved = new Set<string>();
  const walk = (root: unknown): void => {
    if (!isWalkable(root)) return;
    if (Array.isArray(root)) {
      for (const child of root) walk(child);
      return;
    }
    const node = root as IRNode;
    if (node.kind === 'move') {
      const entity = node.entity as IRNode | undefined;
      if (entity?.kind === 'entity' && typeof entity.id === 'string') moved.add(entity.id);
    }
    for (const key of Object.keys(node)) walk(node[key]);
  };
  walk(ir);
  return moved;
}
