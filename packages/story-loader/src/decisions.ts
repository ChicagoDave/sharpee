/**
 * decisions.ts — ADR-289 D1: every routing decision, resolved once.
 *
 * Purpose: build the pre-mutation record of *all* routing a clause body will
 * take, so the mutations pass and the reports pass read the same answers
 * instead of each re-deriving them. The invariant this module exists to make
 * structural: **the report pass sees the routing the execute pass took.**
 *
 * Public interface: {@link RoutingDecision}, {@link DecisionRecord},
 * {@link DecisionDeps}, {@link snapshotDecisions}. Owner context:
 * `@sharpee/story-loader`, the Chord runtime — imported by `runtime.ts` and
 * consumed by both the interceptor path and the capability-behavior path.
 *
 * The five routing constructs and what is pinned for each:
 *
 * | Construct         | Recorded                              |
 * | ----------------- | ------------------------------------- |
 * | `select-on`       | the decided arm value                 |
 * | `select-strategy` | the chosen alternative index          |
 * | `ordinal`         | whether the occurrence matched        |
 * | `each`            | the match set, in creation order      |
 * | statement `when`  | the condition's truth                 |
 *
 * Before ADR-289 only `select-on` and `each` were recorded; `ordinal` was
 * walked but not stored, and `select-strategy` and the `when` suffix were
 * re-derived on every pass. That is what made a `cycling` select advance
 * twice per firing and narrate the branch it had not mutated.
 *
 * Dependencies flow inward: this module knows IR and nothing else. The
 * primitives that touch world state — deciding a strategy, enumerating a
 * match set, evaluating a condition — are injected via {@link DecisionDeps},
 * so the walk is testable without a world and the module cannot grow a
 * dependency on the runtime it serves.
 *
 * **Two deliberate non-walks**, both load-bearing:
 *
 * 1. *Untaken branches are not walked.* Only the arm/alternative/ordinal body
 *    actually taken is descended, so a select nested in a branch that does not
 *    run consumes no counter.
 * 2. *`each` bodies are not walked.* The record is keyed by statement identity
 *    alone, and an `each` body runs once per match — one pinned value cannot
 *    represent N iterations. Statements inside an `each` body therefore decide
 *    live on each pass, exactly as they did before this module existed. This
 *    is the one known gap in D1's "resolved once" property; widening the key
 *    to `(statement, match)` is recorded as out of scope in ADR-289 D1.
 */
import type { IRCondition, IRStatement } from '@sharpee/chord';

/**
 * One statement's pinned routing. Fields are populated only for the construct
 * that applies; `when` may co-occur with any of them, since a `when` suffix is
 * a property of a statement rather than a statement kind of its own.
 */
export interface RoutingDecision {
  /** `select-on` — the arm value the subject resolved to. */
  arm?: string;
  /** `select-strategy` — the index into `alternatives` that was chosen. */
  alternative?: number;
  /** `ordinal` — whether this firing's occurrence matched the block. */
  ordinalMet?: boolean;
  /** `each` — the matching IR ids, pinned in creation order. */
  matches?: string[];
  /** Statement `when` suffix — the condition's truth, pre-mutation. */
  when?: boolean;
}

/** Pre-mutation routing for one clause body, keyed by statement identity. */
export type DecisionRecord = Map<IRStatement, RoutingDecision>;

/**
 * The world-touching primitives the walk needs, injected by `runtime.ts`.
 *
 * `decideStrategy` is the only one that mutates: it read-increments the
 * select's persisted occurrence counter. Calling it here — once, at snapshot
 * time — is precisely what stops the double advance.
 */
export interface DecisionDeps<Ctx> {
  /** Resolve a `select-on` subject to its arm value. */
  decideSelectOn(stmt: Extract<IRStatement, { kind: 'select-on' }>, ctx: Ctx): string;
  /** Choose a `select-strategy` alternative, consuming its counter once. */
  decideStrategy(stmt: Extract<IRStatement, { kind: 'select-strategy' }>, ctx: Ctx): number;
  /**
   * Enumerate an `each` block's matches in creation order. Takes the declared
   * condition's NAME — an `each` block references a `define condition` by name
   * rather than carrying an inline condition tree.
   */
  matchesOf(conditionName: string, ctx: Ctx): string[];
  /** Evaluate a statement `when` suffix. */
  evalCondition(condition: IRCondition, ctx: Ctx): boolean;
}

/** A statement that may carry a `when` suffix (most kinds do). */
type MaybeSuffixed = { stmtWhen?: IRCondition | null };

/**
 * Record every routing decision this body will take, before any mutation runs.
 *
 * Walks only taken paths (see the module header). Advances each reached
 * `select-strategy`'s occurrence counter exactly once, as a side effect of
 * `deps.decideStrategy`.
 *
 * @param body the clause body to walk
 * @param ctx  the evaluation context, passed opaquely to `deps`; only
 *             `occurrence` is read here, to settle `ordinal` blocks
 * @param deps the world-touching primitives (see {@link DecisionDeps})
 * @returns the decision record; empty when the body has no routing
 */
export function snapshotDecisions<Ctx extends { occurrence?: number }>(
  body: IRStatement[],
  ctx: Ctx,
  deps: DecisionDeps<Ctx>,
): DecisionRecord {
  const decisions: DecisionRecord = new Map();

  const record = (stmt: IRStatement, part: RoutingDecision): void => {
    const existing = decisions.get(stmt);
    decisions.set(stmt, existing ? { ...existing, ...part } : part);
  };

  const walk = (stmts: IRStatement[]): void => {
    for (const stmt of stmts) {
      // The `when` suffix is routing too — it decides whether the statement
      // acts. Pinning it here is what makes `phrase warning when it is armed`
      // survive a later `change it to spent` in the same body: the reports
      // pass reads the pre-mutation truth instead of re-asking a world the
      // mutations pass has already changed.
      const suffix = (stmt as MaybeSuffixed).stmtWhen;
      if (suffix) record(stmt, { when: deps.evalCondition(suffix, ctx) });

      switch (stmt.kind) {
        case 'select-on': {
          const arm = deps.decideSelectOn(stmt, ctx);
          record(stmt, { arm });
          const taken = stmt.arms.find((a) => a.value === arm);
          if (taken) walk(taken.body);
          break;
        }
        case 'select-strategy': {
          // The counter is consumed HERE and only here. Both exec passes read
          // the index back off the record.
          const alternative = deps.decideStrategy(stmt, ctx);
          record(stmt, { alternative });
          const taken = stmt.alternatives[alternative];
          if (taken) walk(taken);
          break;
        }
        case 'ordinal': {
          const ordinalMet = ctx.occurrence === stmt.ordinal;
          record(stmt, { ordinalMet });
          if (ordinalMet) walk(stmt.body);
          break;
        }
        case 'each':
          // Pin the match set; do NOT walk the body (module header, note 2).
          record(stmt, { matches: deps.matchesOf(stmt.condition, ctx) });
          break;
        default:
          break;
      }
    }
  };

  walk(body);
  return decisions;
}
