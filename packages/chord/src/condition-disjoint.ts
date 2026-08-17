/**
 * Provable disjointness of IR conditions — the decision core of the
 * `analysis.phrase-overlap` pass (D7 ruling, 2026-08-16): within a topic
 * arm, conditional response lines must be provably pairwise exclusive,
 * so no story state can ever match two responses at once.
 *
 * The prover is deliberately conservative and only ever answers "these
 * two conditions can NEVER both hold" when it holds a witness:
 * - different words of one single-valued state axis on the same subject
 *   (mood, conscience band, threat — one word at a time by construction);
 * - `feels` toward the same target reading as two different words (the
 *   disposition scale reads as exactly one word);
 * - two different story phases (the story is in one phase at a time);
 * - an atom against its own negation (structural equality);
 * - numeric comparisons over the same value with disjoint ranges;
 * - compositions: a conjunction is disjoint from X when ANY conjunct is,
 *   a disjunction when EVERY disjunct is.
 * Everything else — independent booleans (`knows`, trait states), chance,
 * named conditions — yields no witness, and the caller reports ambiguity.
 *
 * Public interface: provablyDisjoint, buildSingleValuedAxes,
 * SingleValuedAxes.
 * Owner context: @sharpee/chord / analysis
 */

import type { IRCondition, IRValue } from './ir.js';

/** Word → axis id for every word of every single-valued state axis. */
export interface SingleValuedAxes {
  readonly axisOf: ReadonlyMap<string, string>;
}

/**
 * Build the single-valued axis table from closed vocabularies.
 * A word appearing in more than one axis is dropped entirely — an
 * ambiguous word can witness nothing (conservative both ways).
 *
 * @param vocabularies - axis id → its word list
 * @returns The word → axis lookup
 */
export function buildSingleValuedAxes(
  vocabularies: Record<string, readonly string[]>,
): SingleValuedAxes {
  const axisOf = new Map<string, string>();
  const collided = new Set<string>();
  for (const [axis, words] of Object.entries(vocabularies)) {
    for (const word of words) {
      if (axisOf.has(word) || collided.has(word)) {
        axisOf.delete(word);
        collided.add(word);
        continue;
      }
      axisOf.set(word, axis);
    }
  }
  return { axisOf };
}

/** Structural canonical form (IR conditions and values are pure data, no cycles). */
function canon(v: unknown): string {
  return JSON.stringify(v);
}

function valueEquals(a: IRValue, b: IRValue): boolean {
  return canon(a) === canon(b);
}

/**
 * Whether two conditions provably can never both hold.
 *
 * @param a - First condition
 * @param b - Second condition
 * @param axes - Single-valued axis table (buildSingleValuedAxes)
 * @returns True only when a disjointness witness exists
 */
export function provablyDisjoint(
  a: IRCondition,
  b: IRCondition,
  axes: SingleValuedAxes,
): boolean {
  // Double negation unwraps first so the not-vs-equal rule sees atoms.
  if (a.kind === 'not' && a.operand.kind === 'not') {
    return provablyDisjoint(a.operand.operand, b, axes);
  }
  if (b.kind === 'not' && b.operand.kind === 'not') {
    return provablyDisjoint(a, b.operand.operand, axes);
  }

  // A conjunction is disjoint from X when any conjunct is.
  if (a.kind === 'and') return a.operands.some((x) => provablyDisjoint(x, b, axes));
  if (b.kind === 'and') return b.operands.some((x) => provablyDisjoint(a, x, axes));

  // A disjunction is disjoint from X only when every disjunct is.
  if (a.kind === 'or') return a.operands.every((x) => provablyDisjoint(x, b, axes));
  if (b.kind === 'or') return b.operands.every((x) => provablyDisjoint(a, x, axes));

  // `not X` vs `Y`: provable only when Y IS X (structurally).
  if (a.kind === 'not') return canon(a.operand) === canon(b);
  if (b.kind === 'not') return canon(b.operand) === canon(a);

  return atomsDisjoint(a, b, axes);
}

/** Witness table over atom pairs (see module header for the axes). */
function atomsDisjoint(a: IRCondition, b: IRCondition, axes: SingleValuedAxes): boolean {
  if (a.kind === 'predicate' && b.kind === 'predicate') {
    // The same predicate with only the negated flag flipped.
    if (
      a.negated !== b.negated &&
      canon({ ...a, negated: false }) === canon({ ...b, negated: false })
    ) {
      return true;
    }
    // Two different words of one single-valued axis on the same subject.
    if (
      a.pred === 'is' && b.pred === 'is' && !a.negated && !b.negated &&
      valueEquals(a.subject, b.subject) &&
      a.object.kind === 'symbol' && b.object.kind === 'symbol' &&
      a.object.name !== b.object.name
    ) {
      const axis = axes.axisOf.get(a.object.name);
      if (axis !== undefined && axis === axes.axisOf.get(b.object.name)) return true;
    }
    return false;
  }

  // The disposition scale reads as exactly one word per (subject, target).
  if (a.kind === 'feels' && b.kind === 'feels') {
    return (
      valueEquals(a.subject, b.subject) &&
      valueEquals(a.target, b.target) &&
      a.disposition !== b.disposition
    );
  }

  // The story is in one phase at a time.
  if (a.kind === 'story-state' && b.kind === 'story-state') {
    return a.state !== b.state;
  }

  // A topic's recency reads as exactly one word at a time (ADR-320 D6).
  if (a.kind === 'recency' && b.kind === 'recency') {
    return a.topic === b.topic && a.word !== b.word;
  }

  // The current topic's ask count reads as exactly one word (ADR-320 D4).
  if (a.kind === 'asked' && b.kind === 'asked') {
    return a.word !== b.word;
  }

  if (a.kind === 'compare' && b.kind === 'compare') {
    return comparesDisjoint(a, b);
  }

  return false;
}

type CompareCond = Extract<IRCondition, { kind: 'compare' }>;

/** Numeric-literal interval as [low, high] with inclusivity flags. */
interface Interval {
  low: number;
  lowIncl: boolean;
  high: number;
  highIncl: boolean;
}

function intervalOf(op: CompareCond['op'], n: number): Interval {
  switch (op) {
    case 'eq': return { low: n, lowIncl: true, high: n, highIncl: true };
    case 'gt': return { low: n, lowIncl: false, high: Infinity, highIncl: true };
    case 'gte': return { low: n, lowIncl: true, high: Infinity, highIncl: true };
    case 'lt': return { low: -Infinity, lowIncl: true, high: n, highIncl: false };
    case 'lte': return { low: -Infinity, lowIncl: true, high: n, highIncl: true };
  }
}

function numberLiteral(v: IRValue): number | undefined {
  if (v.kind !== 'literal' || v.valueType !== 'number') return undefined;
  const n = Number(v.value);
  return Number.isFinite(n) ? n : undefined;
}

/** Same left value, both rights numeric literals, ranges that cannot meet. */
function comparesDisjoint(a: CompareCond, b: CompareCond): boolean {
  if (!valueEquals(a.left, b.left)) return false;
  const na = numberLiteral(a.right);
  const nb = numberLiteral(b.right);
  if (na === undefined || nb === undefined) return false;
  const ia = intervalOf(a.op, na);
  const ib = intervalOf(b.op, nb);
  const lo = ia.low > ib.low ? ia : ib;
  const hi = ia.high < ib.high ? ia : ib;
  if (hi.high < lo.low) return true;
  if (hi.high === lo.low && !(hi.highIncl && lo.lowIncl)) return true;
  return false;
}
