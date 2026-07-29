/**
 * select-ids.ts — ADR-289 D2: the loader-side half of stable select identity.
 *
 * Purpose: two things the loader owes D2 — a rogue-IR backstop asserting every
 * `select-strategy` carries its compiler-assigned id, and the sweep that
 * removes the retired line-number key space from world state.
 *
 * Public interface: {@link assertSelectIds}, {@link sweepRetiredSelectKeys}.
 * Owner context: `@sharpee/story-loader`.
 *
 * Both follow ADR-276's two-layer pattern: the compiler assigns ids, and this
 * refuses IR that arrives without them rather than inventing a fallback. A
 * fallback to line numbers would be a silent return to the colliding key space
 * D2 exists to end.
 */
import type { IRStatement, StoryIR } from '@sharpee/chord';
import type { WorldModel } from '@sharpee/world-model';
import { LoadError } from './errors.js';
import { RETIRED_SELECT_KEY } from './state-keys.js';

/** Every statement list in a compiled story, in no particular order. */
function* statementBodies(ir: StoryIR): Generator<IRStatement[]> {
  yield* ir.story.onClauses.map((c) => c.body);
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
}

/** Walk a statement tree, including every nested routing body. */
function* walk(body: IRStatement[]): Generator<IRStatement> {
  for (const stmt of body) {
    yield stmt;
    switch (stmt.kind) {
      case 'select-on':
        for (const arm of stmt.arms) yield* walk(arm.body);
        break;
      case 'select-strategy':
        for (const alt of stmt.alternatives) yield* walk(alt);
        break;
      case 'ordinal':
      case 'each':
        yield* walk(stmt.body);
        break;
      default:
        break;
    }
  }
}

/**
 * Backstop: refuse IR whose `select-strategy` statements carry no id.
 *
 * The compiler assigns these (ADR-289 D2), so reaching here means rogue or
 * stale IR. Deliberately does NOT fall back to `span.line` — that is the
 * colliding key space this decision replaced.
 *
 * @throws LoadError naming the compiler gate that should have assigned the id
 */
export function assertSelectIds(ir: StoryIR): void {
  for (const body of statementBodies(ir)) {
    for (const stmt of walk(body)) {
      if (stmt.kind !== 'select-strategy') continue;
      if (typeof stmt.id === 'string' && stmt.id.length > 0) continue;
      throw new LoadError(
        `A \`select ${stmt.strategy}\` block carries no compiler-assigned id — the analyzer assigns one to every select block (ADR-289 D2). This IR is stale or hand-built; recompile the story.`,
        stmt.span,
      );
    }
  }
}

/**
 * Remove the retired `chord.occurrence.select.<line>` keys from world state.
 *
 * Runs on load AND on restore: restored state arrives from the world snapshot,
 * so a sweep confined to `initializeWorld` would never see the keys it exists
 * to remove. Idempotent — a swept world sweeps to zero.
 *
 * Matches bare digits only ({@link RETIRED_SELECT_KEY}). Never widen this to a
 * `chord.occurrence.select.*` glob: that prefix is also the new key space.
 *
 * @returns how many keys were removed
 */
export function sweepRetiredSelectKeys(world: WorldModel): number {
  const state = world.getState();
  const retired = Object.keys(state).filter((key) => RETIRED_SELECT_KEY.test(key));
  if (retired.length === 0) return 0;
  for (const key of retired) delete state[key];
  world.setState(state);
  return retired.length;
}
