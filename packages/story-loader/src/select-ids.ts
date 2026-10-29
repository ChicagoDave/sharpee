/**
 * select-ids.ts — the loader-side half of compiler-assigned identity.
 *
 * Purpose: the rogue-IR backstops asserting that every `on`/`after` clause
 * and every `select-strategy` carries its compiler-assigned id, and that
 * the story carries its identity manifest and stamp. The compiler emits all
 * three (ADR-388 D2 over ADR-289 D2; ADR-388 D4); this refuses IR that
 * arrives without them rather than inventing a fallback. A fallback to a
 * position or a line number would be a silent return to the drifting key
 * space those decisions end; a manifest derived at load would stamp a
 * save with something other than the compile that wrote it.
 *
 * Public interface: {@link assertClauseIds}, {@link assertSelectIds},
 * {@link assertIdentity}.
 * Owner context: `@sharpee/story-loader`.
 *
 * References:
 * - ADR-276 — the two-layer pattern: compile gate, loader backstop.
 * - ADR-388 D6 — the retired line-number sweep this file once carried is
 *   gone with its key space; the restore reconciler (D5) drops orphans.
 */
import type { IROnClause, IRStatement, StoryIR } from '@sharpee/chord';
import { LoadError } from './errors.js';

/** Every `on`/`after` clause in a compiled story, with the root that owns it. */
function* onClauses(ir: StoryIR): Generator<[string, IROnClause]> {
  for (const clause of ir.story.onClauses) yield ['the story', clause];
  for (const entity of ir.entities) for (const clause of entity.onClauses) yield [entity.id, clause];
  for (const trait of ir.traits) for (const clause of trait.onClauses) yield [`trait ${trait.name}`, clause];
}

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
      // Every other kind has no nested body. Listed so that a new kind is a
      // compile error here until this walk has decided whether to descend.
      case 'refuse':
      case 'phrase':
      case 'emit':
      case 'play-sound':
      case 'set':
      case 'change':
      case 'change-player':
      case 'change-mood':
      case 'change-feeling':
      case 'move':
      case 'wear':
      case 'take-off':
      case 'act':
      case 'remove':
      case 'award':
      case 'raise':
      case 'lower':
      case 'set-counter':
      case 'timer':
      case 'vehicle-start':
      case 'vehicle-stop':
      case 'vehicle-send':
      case 'expanse-visibility':
      case 'expanse-wind':
      case 'vehicle-sails':
      case 'win':
      case 'lose':
      case 'kill':
      case 'must':
      case 'refuse-when':
      case 'then-open':
      case 'deflect':
      case 'leave':
      case 'hold-tongue':
        break;
      default: {
        const unhandled: never = stmt;
        throw new Error(`Unhandled statement kind: ${(unhandled as { kind: string }).kind}`);
      }
    }
  }
}

/**
 * Backstop: refuse IR whose `on`/`after` clauses carry no id.
 *
 * The compiler assigns these (ADR-388 D2), so reaching here means rogue or
 * stale IR. Deliberately does NOT fall back to the clause's position.
 *
 * @throws LoadError naming the compiler gate that should have assigned the id
 */
export function assertClauseIds(ir: StoryIR): void {
  for (const [owner, clause] of onClauses(ir)) {
    if (typeof clause.id === 'string' && clause.id.length > 0) continue;
    throw new LoadError(
      `An \`${clause.clauseKind} ${clause.action}\` clause on ${owner} carries no compiler-assigned id — the analyzer assigns one to every clause (ADR-388 D2). This IR is stale or hand-built; recompile the story.`,
      clause.span,
    );
  }
}

/**
 * Backstop: refuse IR whose `select-strategy` statements carry no id.
 *
 * The compiler assigns these (ADR-289 D2, ADR-388 D2), so reaching here
 * means rogue or stale IR. Deliberately does NOT fall back to `span.line` —
 * that is the colliding key space ADR-289 D2 replaced.
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
 * Backstop: refuse IR that carries no identity manifest or an empty stamp.
 *
 * The compiler's last pass emits both (ADR-388 D4), so reaching here means
 * rogue or stale IR. Deliberately does NOT derive a manifest at load — the
 * manifest is emitted, never derived, so a save's stamp always names the
 * compile that wrote it.
 *
 * @throws LoadError naming the compiler pass that should have emitted it
 */
export function assertIdentity(ir: StoryIR): void {
  const identity: unknown = ir.identity;
  const present = typeof identity === 'object' && identity !== null && typeof (identity as { stamp?: unknown }).stamp === 'string';
  if (present && (identity as { stamp: string }).stamp.length > 0) return;
  throw new LoadError(
    'This story carries no identity manifest — the analyzer emits one with its content stamp on every compile (ADR-388 D4). This IR is stale or hand-built; recompile the story.',
  );
}
