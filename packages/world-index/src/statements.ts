/**
 * statements.ts — the two statement walks Reach depends on.
 *
 * Purpose: a gate opens only when something writes the blocking entity out of
 * its state, and a thing placed nowhere is fine if a statement moves it into
 * play. Both answers are a walk over every statement tree in the IR, and both
 * need the same thing the trees do not carry on their own: the context a
 * statement sits in, which decides whether the player can ever fire it.
 *
 * The walk is total. `collectStateWriters` visits every statement-bearing
 * root in the IR rather than a chosen list of surfaces: each entity whole
 * except its `states` list, each trait whole once per composing entity, each
 * machine whole, and every remaining top-level `StoryIR` key. An allowlist of
 * fields is the shape that failed here: the walk once named five entity
 * fields by hand and missed `timerClauses`, `moveClauses`, `exchanges`,
 * `greetings`, `initiative`, `conversations`, and most of the story-level
 * surface — and a missed writer reads as "this gate never opens" when it does.
 *
 * A `when <timer> expires` or `when <entity> moves` clause is attributed to
 * the entity whose block declares it, the same owner a plain `onClauses`
 * write gets — never to whatever starts the timer or causes the move. This is
 * conservative on purpose: the true trigger can be more specific, so the
 * holder can make a gate look openable one reachability step earlier than it
 * is. A distinct `timer` owner kind carrying the real trigger is built only
 * if measurement shows a false "reachable" from this approximation.
 *
 * Public interface: collectStateWriters, entitiesMovedIntoPlay, StateWriter,
 * WriterOwner.
 *
 * Owner context: @sharpee/world-index — the derivation package. No platform
 * contract.
 *
 * References:
 * - ADR-321 D4: a gate opens only when a `change` moves the entity out of the
 *   blocking state and that statement is itself triggerable.
 * - GH #517: the allowlist gap — 8 timer-clause, 1 move-clause and 1 exchange
 *   write across secret-letter and ides-of-march invisible to the old walk,
 *   measured by `tools/explorer-probe/lens-declared-state.js`'s `platformGap`.
 * - GH #518: the read-side counterpart, which reuses `forEachStatementRoot`.
 *
 * @packageDocumentation
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
 * Visit every statement-bearing root in a story IR, with the owner and `it`
 * binding that decides whether the player can trigger what is inside it.
 *
 * This is the shared substrate `collectStateWriters` walks below, and the one
 * a future `collectStateReaders` reuses rather than re-deriving —
 * both need the same roots, owners and `it` bindings; only what they match at
 * each node differs. Module-internal: nothing outside this file needs the
 * walk itself, only what a visitor collects from it.
 *
 * The sweep is total, not a chosen list, because a chosen list is the
 * shape that missed surfaces here: an entity whole except its `states` list
 * (declared state names, never statement nodes); a trait whole, once per
 * composing entity, because that is what `it` means there and what the
 * player has to reach to fire it; a machine whole, since its transition is
 * driven by acting on a role entity rather than on whatever the statement
 * writes (`it` is left unbound — a machine clause never has one); and every
 * remaining top-level `StoryIR` key, owned by the story itself, on the
 * story's own schedule.
 *
 * @param ir the story IR
 * @param visit called once per root with the subtree, its owner, and the
 *   entity `it` is bound to there (`undefined` where nothing binds it)
 */
function forEachStatementRoot(
  ir: StoryIR,
  visit: (root: unknown, owner: WriterOwner, itBinding: string | undefined) => void,
): void {
  for (const entity of ir.entities) {
    // `states` holds declared state names, never statement nodes — excluded
    // so the walk cannot mistake a value word for a target it never wrote.
    const { states: _states, ...rest } = entity;
    visit(rest, { kind: 'entity', id: entity.id }, entity.id);
  }

  for (const trait of ir.traits ?? []) {
    for (const composer of composersOf(ir, trait.name)) {
      visit(trait, { kind: 'entity', id: composer.id }, composer.id);
    }
  }

  for (const machine of ir.machines ?? []) {
    const roles = machine.roles.map((role) => role.entity);
    visit(machine, { kind: 'machine', name: machine.name, roles }, undefined);
  }

  const story: WriterOwner = { kind: 'story' };
  const record = ir as unknown as IRNode;
  for (const key of Object.keys(record)) {
    if (key === 'entities' || key === 'traits' || key === 'machines') continue;
    visit(record[key], story, undefined);
  }
}

/**
 * Every `change` statement in the story, resolved to a target entity and the
 * context that can fire it.
 *
 * Walks every statement-bearing root (`forEachStatementRoot`) rather than a
 * chosen list of entity/trait/machine fields — GH #517: the old allowlist
 * missed `timerClauses`, `moveClauses`, `exchanges`, `greetings`,
 * `initiative`, `conversations`, and most of the story-level surface.
 *
 * @param ir the story IR
 * @returns every resolvable state write; statements whose `it` cannot be bound
 *   to an entity are omitted rather than guessed at
 */
export function collectStateWriters(ir: StoryIR): StateWriter[] {
  const writers: StateWriter[] = [];
  forEachStatementRoot(ir, (root, owner, itBinding) => walkForWriters(root, owner, itBinding, writers));
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
