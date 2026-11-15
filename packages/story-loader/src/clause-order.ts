/**
 * clause-order.ts — where a clause's binding stands among the others one
 * entity carries for one action.
 *
 * The world consults every interceptor binding on an entity, higher priority
 * first and then in the order the entity's traits were added. This module
 * turns Chord's rule into those priorities: a thing's own clauses come
 * first, then its composed traits in the order written, and a clause that
 * says `, before <trait>` or `, after <trait>` is placed by that word.
 *
 * Invariants:
 * - Every priority a trait clause gets lies strictly between
 *   LATE_OWN_CLAUSE_PRIORITY and OWN_CLAUSE_PRIORITY, so a thing's own
 *   clauses are outermost on both sides.
 * - Every consistent set of stated orders is honored: if one trait's clause
 *   is stated to come before another's, its priority is higher.
 * - A stated order that cannot be honored is a LoadError, never ignored:
 *   a name that is no trait, a circle, or a clause nothing places.
 *
 * Public interface: OWN_CLAUSE_PRIORITY, LATE_OWN_CLAUSE_PRIORITY,
 * ChordLateBehaviorTrait, assertOrderingTrait, refuseUnplacedOrdering,
 * traitClausePriority.
 * Owner context: @sharpee/story-loader (read by the runtime's on-clauses
 * and dispatch-verbs sections at the bind step; it lives outside
 * `runtime/` because a section imports only the core among its siblings).
 *
 * References:
 * - ADR-118 Amendment 1 — every binding consulted; own clauses first.
 */
import type { IROnClause, StoryIR } from '@sharpee/chord';
import type { ITrait } from '@sharpee/world-model';
import { LoadError } from './errors.js';

/** A thing's own clauses outrank every trait's: the specific before the shared. */
export const OWN_CLAUSE_PRIORITY = 1000;

/** A thing's own clause that says `, after <trait>` stands behind every trait's. */
export const LATE_OWN_CLAUSE_PRIORITY = -1000;

/** Marker trait carried by entities with an own clause ordered `, after <trait>`. */
export class ChordLateBehaviorTrait implements ITrait {
  static readonly type = 'chord.behavior.late';
  readonly type = ChordLateBehaviorTrait.type;
}

/** One stated order between two traits' clauses for an action: `first` is consulted before `second`. */
interface Precedence {
  first: string;
  second: string;
  /** The clause that states it, for an error's span. */
  clause: IROnClause;
}

/** Whether a trait clause is bound as an interceptor, and so takes a place in the order. */
function isInterceptorClause(clause: IROnClause): boolean {
  return clause.routing !== 'capability' && clause.binding !== 'every-turn';
}

/**
 * Refuse a clause whose `, before <trait>` / `, after <trait>` names no story trait.
 *
 * @param ir the story's IR
 * @param clause the clause to check; one with no stated order passes
 * @throws LoadError when the named trait is not a `define trait`
 */
export function assertOrderingTrait(ir: StoryIR, clause: IROnClause): void {
  if (!clause.ordering) return;
  const { relation, trait } = clause.ordering;
  if (ir.traits.some((t) => t.name === trait)) return;
  throw new LoadError(
    `\`, ${relation} ${trait}\` names no trait — \`${trait}\` is not declared with \`define trait\`. A clause states its order against a story trait's clauses for the same action.`,
    clause.span,
  );
}

/**
 * Refuse a stated order on a clause that is not consulted in an order: an
 * every-turn clause, an event reaction, a clause on a story-defined action,
 * or a bare head (the owner's own action).
 *
 * @param clause the clause the caller is about to bind outside the order
 * @throws LoadError when the clause states an order
 */
export function refuseUnplacedOrdering(clause: IROnClause): void {
  if (!clause.ordering) return;
  const { relation, trait } = clause.ordering;
  throw new LoadError(
    `\`, ${relation} ${trait}\` places nothing on this \`${clause.action}\` clause. An order is stated between clauses that answer a standard action done to the thing (\`on the player opening, ${relation} ${trait}\`). Remove it.`,
    clause.span,
  );
}

/** Every order the story's traits state for one action's clauses. */
function precedencesFor(ir: StoryIR, action: string): Precedence[] {
  const stated: Precedence[] = [];
  for (const trait of ir.traits) {
    for (const clause of trait.onClauses) {
      if (clause.action !== action || !clause.ordering || !isInterceptorClause(clause)) continue;
      assertOrderingTrait(ir, clause);
      const named = clause.ordering.trait;
      stated.push(
        clause.ordering.relation === 'before'
          ? { first: trait.name, second: named, clause }
          : { first: named, second: trait.name, clause },
      );
    }
  }
  return stated;
}

/**
 * The longest run of stated orders leading away from a trait, behind it
 * (`first` to `second`) or ahead of it (`second` to `first`).
 *
 * @throws LoadError when the stated orders run in a circle
 */
function chainLength(name: string, stated: readonly Precedence[], side: 'behind' | 'ahead', action: string, path: readonly string[]): number {
  let longest = 0;
  for (const order of stated) {
    const from = side === 'behind' ? order.first : order.second;
    if (from !== name) continue;
    const next = side === 'behind' ? order.second : order.first;
    if (next === name || path.includes(next)) {
      const circle = [...path.slice(Math.max(path.indexOf(next), 0)), name, next];
      throw new LoadError(
        `Traits ${circle.map((n) => `\`${n}\``).join(' → ')} order their \`${action}\` clauses in a circle, so none can come first. Remove one \`, before\` or \`, after\`.`,
        order.clause.span,
      );
    }
    longest = Math.max(longest, 1 + chainLength(next, stated, side, action, [...path, name]));
  }
  return longest;
}

/**
 * The registration priority of one trait's clauses for one action.
 *
 * Zero when no stated order touches the trait for the action: it is
 * consulted in the order it was written on the thing. Otherwise the
 * priority is the number of stated orders that run behind the trait less
 * the number that run ahead of it, so a trait stated to come before another
 * always has the higher priority. Both traits a stated order names leave
 * the written order: the earlier stands before, and the later after, every
 * trait no order touches.
 *
 * @param ir the story's IR
 * @param traitName the `define trait` name
 * @param action the gerund the clauses answer (`lighting`)
 * @returns the priority to register the trait's binding for the action under
 * @throws LoadError for an undeclared trait name or a circle of stated orders
 */
export function traitClausePriority(ir: StoryIR, traitName: string, action: string): number {
  const stated = precedencesFor(ir, action);
  const priority =
    chainLength(traitName, stated, 'behind', action, []) - chainLength(traitName, stated, 'ahead', action, []);
  if (priority >= OWN_CLAUSE_PRIORITY || priority <= LATE_OWN_CLAUSE_PRIORITY) {
    throw new LoadError(
      `Trait \`${traitName}\`'s \`${action}\` clauses sit ${Math.abs(priority)} stated orders deep, past what the runtime places.`,
      ir.traits.find((t) => t.name === traitName)?.span,
    );
  }
  return priority;
}
