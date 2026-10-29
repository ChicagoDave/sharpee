/**
 * clause-ids.ts — the compiler-assigned identity of an `on`/`after` clause
 * and of the `select` statements under it.
 *
 * Purpose: a persisted key is derived from a name the author wrote, never
 * from a position in a list the author edits. A clause's identity is its
 * head — owner, kind, action, actor, role and tails — with an ordinal only
 * among identical heads of one root; a select's identity is its clause's
 * id plus its index among the selects of that clause's body, in document
 * order. The loader keys occurrence counters by these ids, the assertion
 * core and the arrange step compose the same key from the same head, and
 * the derived runner speaks it back; every one of them composes the string
 * through this module, so the shape has one home.
 *
 * Public interface: {@link ClauseHeadWords}, {@link clauseHeadWordsOf},
 * {@link clauseHeadId}, {@link spokenClauseHead}, {@link clauseIdOf},
 * {@link clauseOrdinalOf}, {@link assignClauseIds}, {@link assignSelectIds}.
 * Owner context: `@sharpee/chord` (browser-safe; imports nothing from the
 * platform).
 *
 * References:
 * - ADR-388 D2 — head-derived clause ids, `#n` among identical heads,
 *   select ids under the clause id.
 * - ADR-388 D7 — the spoken form the pin grammar reads.
 * - ADR-289 D2 — the select id is never bare digits and is a strict prefix
 *   of every per-owner key.
 */
import type { IROnClause, IRStatement, IRValue } from './ir.js';

/**
 * The words of a clause head that make its identity, each already a word:
 * the actor is `player` or an entity's IR id. A `while` guard and `, once`
 * are not among them. The pin grammar produces this shape without
 * importing it; the compiler derives it from a clause with
 * {@link clauseHeadWordsOf}.
 */
export interface ClauseHeadWords {
  clauseKind: 'on' | 'after';
  action: string;
  actor?: string;
  role?: string;
  sound?: string;
  valueTail?: string;
  counterpart?: string;
}

/** The fields of a compiled clause the identity reads. */
export interface ClauseHeadFields {
  clauseKind: 'on' | 'after';
  action: string;
  actor: IRValue | null;
  role: string | null;
  valueTail?: string;
  counterpart?: string;
  sound?: string;
}

/** The word the id and the spoken form use for a head's actor. */
function actorWord(actor: IRValue | null): string | undefined {
  if (actor === null) return undefined;
  switch (actor.kind) {
    case 'player':
      return 'player';
    case 'entity':
      return actor.id;
    default:
      return actor.kind;
  }
}

/**
 * The head words of a compiled clause.
 *
 * @param clause a compiled `on`/`after` clause, or any object carrying the head fields
 * @returns the head as words, tails present only when the clause has them
 */
export function clauseHeadWordsOf(clause: ClauseHeadFields): ClauseHeadWords {
  const actor = actorWord(clause.actor);
  return {
    clauseKind: clause.clauseKind,
    action: clause.action,
    ...(actor === undefined ? {} : { actor }),
    ...(clause.role === null ? {} : { role: clause.role }),
    ...(clause.sound === undefined ? {} : { sound: clause.sound }),
    ...(clause.valueTail === undefined ? {} : { valueTail: clause.valueTail }),
    ...(clause.counterpart === undefined ? {} : { counterpart: clause.counterpart }),
  };
}

/**
 * The head part of a clause id, without its owner:
 * `<kind>-<action>[-<sound>][-by-<actor>][-as-<role>][-to-<value>][-with-<counterpart>][#<n>]`.
 *
 * @param head the head words
 * @param ordinal the clause's 1-based order among identical heads, when its root has more than one
 * @returns the head id, e.g. `on-attacking-by-player#2`
 */
export function clauseHeadId(head: ClauseHeadWords, ordinal?: number): string {
  let id = `${head.clauseKind}-${head.action}`;
  if (head.sound !== undefined) id += `-${head.sound}`;
  if (head.actor !== undefined) id += `-by-${head.actor}`;
  if (head.role !== undefined) id += `-as-${head.role}`;
  if (head.valueTail !== undefined) id += `-to-${head.valueTail}`;
  if (head.counterpart !== undefined) id += `-with-${head.counterpart}`;
  if (ordinal !== undefined) id += `#${ordinal}`;
  return id;
}

/**
 * The head as the pin grammar speaks it (ADR-388 D7):
 * `<kind> <action> [<sound>] [by <actor>] [as <role>] [to <value>] [with <counterpart>] [#<n>]`.
 *
 * @param head the head words
 * @param ordinal the clause's order among identical heads, when numbered
 * @returns e.g. `on attacking by player #2`
 */
export function spokenClauseHead(head: ClauseHeadWords, ordinal?: number): string {
  const words = [head.clauseKind, head.action];
  if (head.sound !== undefined) words.push(head.sound);
  if (head.actor !== undefined) words.push('by', head.actor);
  if (head.role !== undefined) words.push('as', head.role);
  if (head.valueTail !== undefined) words.push('to', head.valueTail);
  if (head.counterpart !== undefined) words.push('with', head.counterpart);
  if (ordinal !== undefined) words.push(`#${ordinal}`);
  return words.join(' ');
}

/**
 * A clause id from its owner key and head: `<owner>.<head-id>`.
 *
 * @param ownerKey the entity's IR id, `story`, or `trait.<name>` for a trait's clause
 * @param head the head words
 * @param ordinal the order among identical heads, when numbered
 */
export function clauseIdOf(ownerKey: string, head: ClauseHeadWords, ordinal?: number): string {
  return `${ownerKey}.${clauseHeadId(head, ordinal)}`;
}

/**
 * The `#n` ordinal a clause id carries, when it is one of several identical heads.
 *
 * @param clauseId a compiler-assigned clause id
 * @returns the ordinal, or undefined when the head is unique in its root
 */
export function clauseOrdinalOf(clauseId: string): number | undefined {
  const match = /#(\d+)$/.exec(clauseId);
  return match ? Number(match[1]) : undefined;
}

/**
 * Assign every clause of one root its id, and every select under it its id.
 *
 * Identical heads are numbered `#1`, `#2`, … in source order; a head unique
 * in its root carries no number. Mutates `id` on each clause and on each
 * `select-strategy` statement in its body.
 *
 * @param clauses one root's `onClauses`, in source order
 * @param ownerKey the root's key: an entity's IR id, `story`, or `trait.<name>`
 * @returns the same list, for use in an expression
 */
export function assignClauseIds<T extends IROnClause>(clauses: T[], ownerKey: string): T[] {
  const heads = clauses.map((clause) => clauseHeadId(clauseHeadWordsOf(clause)));
  const counts = new Map<string, number>();
  for (const head of heads) counts.set(head, (counts.get(head) ?? 0) + 1);
  const seen = new Map<string, number>();
  clauses.forEach((clause, index) => {
    const head = heads[index];
    let ordinal: number | undefined;
    if ((counts.get(head) ?? 0) > 1) {
      ordinal = (seen.get(head) ?? 0) + 1;
      seen.set(head, ordinal);
    }
    clause.id = ordinal === undefined ? `${ownerKey}.${head}` : `${ownerKey}.${head}#${ordinal}`;
    assignSelectIds(clause.body, clause.id);
  });
  return clauses;
}

/**
 * Number the `select-strategy` statements of a body `<prefix>.select#<k>`,
 * `k` counting every select in the body tree in document order. Inserting a
 * statement that is not a select re-keys nothing; a select-on arm, an
 * ordinal or an `each` body is walked, so a nested select is counted where
 * it is reached.
 *
 * @param body a statement list, walked in place
 * @param prefix the enclosing clause's id
 */
export function assignSelectIds(body: IRStatement[], prefix: string): void {
  let next = 0;
  const walk = (list: IRStatement[]): void => {
    for (const stmt of list) {
      switch (stmt.kind) {
        case 'select-strategy':
          next += 1;
          stmt.id = `${prefix}.select#${next}`;
          for (const alt of stmt.alternatives) walk(alt);
          break;
        case 'select-on':
          for (const arm of stmt.arms) walk(arm.body);
          break;
        case 'ordinal':
        case 'each':
          walk(stmt.body);
          break;
        default:
          break;
      }
    }
  };
  walk(body);
}
