/**
 * decisions.ts — ADR-289 D1 (as amended): every routing decision, made once.
 *
 * Purpose: let the mutations pass and the reports pass of a two-pass clause
 * body reach the same routing answers, so that **the report pass narrates the
 * branch whose mutations ran**.
 *
 * Public interface: {@link RoutingDecision}, {@link DecisionRecord},
 * {@link DecisionLedger}. Owner context: `@sharpee/story-loader`, the Chord
 * runtime — used by `runtime.ts`'s `execStatements` and threaded through the
 * interceptor, capability-behavior, topic-table and action-body paths.
 *
 * ## Where "once" is
 *
 * D1 originally specified a pre-mutation snapshot: walk the body at validate
 * time, decide everything, then have both passes read the answers. That was
 * implemented and **regressed `stories/fernhill` 495/495 -> 116 failures**,
 * because a suffix like `change it to softened when it has the sherry bottle`
 * is true only *after* the standard action has run — which happens after
 * validate. Deciding before the body begins is deciding too early.
 *
 * The amended rule: **the mutations pass is the decision pass.** Each decision
 * is made at the statement's own position as the mutations pass walks the
 * body, and replayed when the reports pass reaches the same statement. That is
 * what an author writes — a straight-line program in which each line sees the
 * effects of the lines above it — and the two-pass split is an ADR-228
 * implementation artifact that must stay invisible to them.
 *
 * It also makes Acceptance 7 and fernhill the same rule rather than opposing
 * ones:
 *
 * ```
 * phrase warning when it is armed    // still armed here -> emits
 * change it to spent
 *
 * change it to softened when it has the sherry bottle
 * phrase kettle-softened when it is softened  // softened above -> emits
 * ```
 *
 * ## Modes
 *
 * - `recording` — the mutations pass: decide live, remember the answer.
 * - `replaying` — the reports pass: return the remembered answer.
 * - `live` — single-pass contexts (`after` clauses, daemons, sequences, turn
 *   clauses) and `each` bodies: decide live, remember nothing. One pass cannot
 *   disagree with itself, so there is nothing to record.
 *
 * ## The `each`-body exception
 *
 * An `each` body runs once per match, but the record is keyed by statement
 * identity alone — so recording inside one would hand every iteration the last
 * iteration's answer. `each` bodies therefore run under a **live** ledger in
 * *both* passes, which is exactly how they behaved before this module existed.
 * The two passes can disagree there; that is the one known gap in D1's
 * "decided once" property, and widening the key to `(statement, match)` is
 * recorded as out of scope in ADR-289 D1.
 */
import type { IRStatement } from '@sharpee/chord';

/**
 * One statement's routing. Fields are populated only for the construct that
 * applies; `when` may co-occur with any of them, since a `when` suffix is a
 * property of a statement rather than a statement kind of its own.
 */
export interface RoutingDecision {
  /** `select-on` — the arm value the subject resolved to. */
  arm?: string;
  /** `select-strategy` — the index into `alternatives` that was chosen. */
  alternative?: number;
  /** `ordinal` — whether this firing's occurrence matched the block. */
  ordinalMet?: boolean;
  /** `each` — the matching IR ids, in creation order. */
  matches?: string[];
  /** Statement `when` suffix — the condition's truth at this position. */
  when?: boolean;
}

/** Routing for one clause body, keyed by statement identity. */
export type DecisionRecord = Map<IRStatement, RoutingDecision>;

type Mode = 'record' | 'replay' | 'live';

/**
 * Decides-or-replays a single routing question for one statement.
 *
 * The ledger is the only thing `execStatements` consults about routing, so
 * "the reports pass never re-derives" is enforced in one place rather than at
 * each construct's call site.
 */
export class DecisionLedger {
  private constructor(
    private readonly mode: Mode,
    /** The backing record. Shared by reference with the caller's bag. */
    readonly entries: DecisionRecord,
  ) {}

  /**
   * The mutations pass. Decisions are made live and written into `into`, which
   * the caller stashes for the reports pass.
   */
  static recording(into: DecisionRecord = new Map()): DecisionLedger {
    return new DecisionLedger('record', into);
  }

  /** The reports pass. Returns what the mutations pass decided. */
  static replaying(entries: DecisionRecord | undefined): DecisionLedger {
    return new DecisionLedger('replay', entries ?? new Map());
  }

  /** Single-pass contexts and `each` bodies — decide live, remember nothing. */
  static live(): DecisionLedger {
    return new DecisionLedger('live', new Map());
  }

  /**
   * Answer one routing question for `stmt`.
   *
   * @param stmt   the statement the decision belongs to
   * @param field  which question (see {@link RoutingDecision})
   * @param decide how to answer it live; called at most once
   * @returns the remembered answer when replaying, else the live one
   *
   * A replay miss falls through to `decide()` rather than throwing. It is not
   * expected — the reports pass walks the branches the mutations pass
   * recorded — but narrating something slightly stale beats throwing mid-report.
   */
  resolve<K extends keyof RoutingDecision>(
    stmt: IRStatement,
    field: K,
    decide: () => NonNullable<RoutingDecision[K]>,
  ): NonNullable<RoutingDecision[K]> {
    if (this.mode === 'replay') {
      const remembered = this.entries.get(stmt)?.[field];
      if (remembered !== undefined) return remembered as NonNullable<RoutingDecision[K]>;
    }
    const value = decide();
    if (this.mode === 'record') {
      this.entries.set(stmt, { ...this.entries.get(stmt), [field]: value });
    }
    return value;
  }
}
