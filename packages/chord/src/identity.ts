/**
 * identity.ts — the story's identity manifest and its content stamp.
 *
 * Purpose: the last analysis pass reads the resolved IR and emits, as data
 * in the IR, every identity the runtime can persist a key under — entities
 * with their states and start placements, exits, clause and select ids,
 * chapter names, timer turns, landing lists, counters — and one hash over
 * all of it. A restore compares the save's stamp with the current story's
 * and, when they differ, reconciles the save against the manifest instead
 * of trusting it (ADR-388 D4, D5).
 *
 * Invariants: the manifest is derived from names and structure only —
 * never from spans or prose, so a prose edit leaves the stamp unchanged;
 * every family whose order carries no meaning is sorted, so reordering two
 * blocks leaves the stamp unchanged; chapters, timer turns and landing
 * rooms keep their declared order, because their order is their meaning.
 * Two compiles of one source yield byte-identical manifests.
 *
 * Public interface: buildIdentity, emptyIdentity.
 * Owner context: @sharpee/chord.
 */
import type { IREntity, IRIdentity, IRStatement, StoryIR } from './ir.js';
import { sha256Hex } from './sha256.js';

/** The manifest before the emitting pass runs: no identities, an empty stamp. */
export function emptyIdentity(): IRIdentity {
  return { stamp: '', entities: [], exits: [], clauses: [], selects: [], chapters: [], timers: [], landings: [], counters: [] };
}

/** Compare two strings by code unit, for the sorts below. */
function byText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The kind word an entity persists under: its first kind composition, `thing` when it has none. */
function kindOf(entity: IREntity): string {
  return entity.kinds[0]?.name ?? 'thing';
}

/** Every statement list in the story that may carry a select, in no particular order. */
function* statementBodies(ir: StoryIR): Generator<IRStatement[]> {
  yield* ir.story.onClauses.map((c) => c.body);
  for (const clause of ir.story.timerClauses ?? []) yield clause.body;
  for (const entity of ir.entities) {
    yield* entity.onClauses.map((c) => c.body);
    yield* entity.topics.map((row) => row.body);
  }
  for (const trait of ir.traits) yield* trait.onClauses.map((c) => c.body);
  for (const action of ir.actions) yield action.body;
  for (const sequence of ir.sequences) yield* sequence.steps.map((s) => s.body);
  for (const machine of ir.machines) {
    for (const state of machine.states) {
      yield state.onEnter;
      yield state.onExit;
    }
  }
  for (const timer of ir.timers) if (timer.meanwhile) yield timer.meanwhile.body;
  if (ir.startBlock) yield ir.startBlock.body;
}

/** Every `select-strategy` id under a body, descending the same routing bodies `assignSelectIds` numbers. */
function* selectIds(body: IRStatement[]): Generator<string> {
  for (const stmt of body) {
    switch (stmt.kind) {
      case 'select-strategy':
        yield stmt.id;
        for (const alt of stmt.alternatives) yield* selectIds(alt);
        break;
      case 'select-on':
        for (const arm of stmt.arms) yield* selectIds(arm.body);
        break;
      case 'ordinal':
      case 'each':
        yield* selectIds(stmt.body);
        break;
      default:
        break;
    }
  }
}

/**
 * The identity manifest of a resolved story, with its stamp.
 *
 * @param ir the IR every building pass has finished writing
 * @returns the manifest, every unordered family sorted, `stamp` the SHA-256
 *   of the manifest's other fields in their emitted order
 */
export function buildIdentity(ir: StoryIR): IRIdentity {
  const entities = ir.entities
    .map((e) => ({ id: e.id, kind: kindOf(e), states: e.states, startsIn: e.placement?.place ?? null }))
    .sort((a, b) => byText(a.id, b.id));

  const exits = ir.entities
    .flatMap((room) =>
      room.exits
        .filter((exit) => exit.to.kind !== 'unresolved')
        .map((exit) => ({ room: room.id, direction: exit.direction, destination: exit.to.kind === 'room' ? exit.to.id : 'outside' })),
    )
    .sort((a, b) => byText(a.room, b.room) || byText(a.direction, b.direction));

  const clauses = [
    ...ir.story.onClauses,
    ...ir.entities.flatMap((e) => e.onClauses),
    ...ir.traits.flatMap((t) => t.onClauses),
  ]
    .map((c) => ({ id: c.id, once: c.once }))
    .sort((a, b) => byText(a.id, b.id));

  const selects: string[] = [];
  for (const body of statementBodies(ir)) selects.push(...selectIds(body));
  selects.sort(byText);

  const chapters = (ir.chapters ?? []).map((c) => c.name);

  const timers = ir.timers.map((t) => ({ qualified: t.qualified, turns: t.states })).sort((a, b) => byText(a.qualified, b.qualified));

  const landings = ir.entities
    .filter((e) => e.landing !== undefined)
    .map((e) => ({ region: e.id, rooms: e.landing?.rooms ?? [] }))
    .sort((a, b) => byText(a.region, b.region));

  const counters = [
    ...ir.counters.map((c) => ({ name: c.name, owner: null as string | null })),
    ...ir.entities.flatMap((e) => e.counters.map((c) => ({ name: c.name, owner: e.id as string | null }))),
  ].sort((a, b) => byText(a.owner ?? '', b.owner ?? '') || byText(a.name, b.name));

  const content = { entities, exits, clauses, selects, chapters, timers, landings, counters };
  return { stamp: sha256Hex(JSON.stringify(content)), ...content };
}
