# ADR-228: Interceptor Lifecycle Engine — the ADR-118 contract becomes a mechanism

## Status: ACCEPTED (2026-07-16 — all forks ruled by David, session 3ed9fb) — refines ADR-118

## Date: 2026-07-16

> Refines ADR-118 (Action Interceptors). ADR-118 defined the hook vocabulary
> (preValidate/postValidate/postExecute/postReport/onBlocked) but left the
> lifecycle's execution a **convention** hand-copied into each action. The
> full-coverage audit (`docs/work/adr-118-hook-audit/audit.md`, session c39d83)
> is the empirical verdict: 14 hand-rolled copies drifted into two guard
> semantics, two onBlocked semantics, three multi-object behaviors, and
> per-path skips — and 19 actions never picked the convention up at all,
> silently killing Chord `on <gerund> it` clauses. Two live Dungeo defects
> (trophy-case multi-put scoring, dead troll-talking interceptor) are direct
> consequences. This ADR turns the convention into a mechanism. Decision
> rationale with full pros/cons per fork:
> `docs/work/adr-118-hook-audit/decisions.md` (D0–D8).

## Context

The architecture underneath is sound and unchanged: the four-phase action
pattern (ADR-051), the (trait, actionId) interceptor registry (ADR-118/208),
and capability dispatch (ADR-090) all survive intact. The sole question each
ruling below answers is *who owns the lifecycle's execution and what its
contract promises*. Scope set by David: **100% coverage — every action, every
path, every entity** — not a high-value triage.

Structural exemptions that survive 100% coverage: actions with no entity to
key on (about, again, help, inventory, quitting, restarting, restoring,
saving, scoring, sleeping, undoing, version, waiting, looking) — `on <verb>
it` is unexpressable — and lowering/raising, which are full-delegation
capability actions by ADR-118's own design. Everything else gets wired.

## Decision

### D0 = B: A shared lifecycle engine in stdlib; actions declare their surface

One stdlib module owns the resolve → preValidate → postValidate →
postExecute → postReport → onBlocked lifecycle. Each action supplies a small
**declarative descriptor**: which command entities carry interceptors under
which action ids (including implicit-entity resolvers — going's
source/destination/door, exiting's current container), how multi-object items
map to per-item lifecycles, plus rare explicit special contracts (attacking's
postExecute-replaces-combat). The engine implements the D1–D4 rulings exactly
once; actions call into it at their four phase boundaries. Correctness
becomes structural: an action is "wired" iff it has a descriptor, so the D5
registry falls out mechanically and drift has nothing to drift.

Option C (engine-level generic interception in CommandExecutor) is named as
the natural second step **iff** multi-object commands are ever expanded
upstream (see D4); it is out of scope here because the per-item loops live
inside action execute/report, invisible to the engine.

### D1 = A: Veto-only guard semantics

A pre/postValidate hook may only **block**: `result.valid === false` acts;
`{valid: true}` and `null` both mean "no objection, continue." No hook can
skip standard validation or other entities' hooks by returning a truthy
shape. This matches ADR-118's prose (its example code, which short-circuits
on any non-null, is hereby corrected) and is behavior-preserving today: no
interceptor in the repo returns `{valid: true}` (verified in the audit).

**Reserved extension (not implemented)**: an explicit force-allow marker
(e.g. `{valid: true, force: true}` or a distinct `InterceptorResult` kind)
that skips remaining *standard* checks but never other entities' hooks. This
is the sanctioned path if a real consumer appears; do not reintroduce
short-circuit-on-truthy.

### D2 = C: onBlocked returns a structured result, symmetric with postReport

`onBlocked` returns `InterceptorReportResult`-style `{ override?, emit? }`:

- `override` swaps the standard blocked event's messageId/params — the event
  **type survives intact** (`if.event.take_blocked` etc.), so tests and state
  machines keyed on blocked events keep working;
- `emit` appends effects after it;
- `null`/`{}` means standard handling.

This is a signature change to `ActionInterceptor.onBlocked` (world-model
API). The bare-effects-array form (replace, with `[]` silently suppressing)
is retired. The primary custom-refusal path is unchanged: a validate hook
returning `{valid: false, error: customMessageId}` renders the custom message
on the blocked event (the white-hot-axe pattern).

### D3 = B: All command entities consulted, fixed published order

Each action resolves an interceptor per command entity — direct object,
indirect object/instrument, and the action-specific implicit entities (door +
source room + destination room for going, current container for exiting).
Rules:

- Each resolved interceptor gets its own sharedData and all five hooks.
- Validate-phase order is fixed and published: **direct object →
  indirect/instrument → implicit entities** (per-action descriptor lists the
  exact order). First veto stops the chain.
- postExecute/postReport run for every entity that survived validation.
- Item-side hooks in putting/inserting receive the container in their
  sharedData, mirroring how the container's hook receives itemId (ruled yes).
- Throwing's target-else-item single-winner rule is retired: both target and
  item hooks run.

### D4 = A: Multi-object commands run the full per-item lifecycle via a shared helper

The multi-object helper owns resolve → preValidate → postValidate per item,
postExecute/postReport per successful item, onBlocked per failed item;
actions supply only their standard per-item logic. Aggregated output ("You
take: x, y, z") is preserved. This directly fixes the live trophy-case bug
("put all in case" deposits treasures with no `awardScore`) and taking's
missing onBlocked. Upstream expansion of "take all" into N single commands
(option B) is explicitly out of scope; noted as a possible future
simplification that would also unlock D0 option C.

### D5 = A: Chord loader fail-fast against a stdlib-exported registry

stdlib exports the authoritative set of interceptor-consulting action ids,
**derived mechanically from the descriptor table** (never hand-maintained).
The Chord story-loader rejects `on <gerund> it` for unknown gerunds with a
diagnostic at load time, and rejects lowering/raising with a pointed message
("use a capability behavior / Chord dispatch action"). A typo becomes a load
error instead of a silent no-op. This registry is the single source of truth
for both Sharpee and Chord (the elegance-parity seam).

### D6 = B: Delegation seams fire both ids, primary first

- `remove X from Y` consults `if.action.removing` AND `if.action.taking` on
  the item (specific id first, both run under D3's rule) — closing the
  TrollAxe bypass under taking's id regardless of author phrasing.
- `insert X in Y` consults `if.action.inserting`, then delegates into
  putting's `if.action.putting` hooks.
- **Rule stated for authors**: one physical operation can fire hooks under
  two ids; a trait should register its behavior under exactly one of them to
  avoid double-mutation.

### D7: Path-skip repairs (blessed)

1. **going, dark destination**: run both postReport hooks before the early
   return on the `if.event.went` path.
2. **throwing, capability path**: capability behavior first, then the
   interceptor's postExecute/postReport (matching the existing validate-phase
   order).
3. **attacking**: postExecute/postReport unconditional across
   combatant/non-combatant branches; the existing special contract
   (interceptor postExecute REPLACES combat resolution for combatants) is
   retained and must be an explicit descriptor flag, not a comment.
4. **Re-read entity guards** (eating/entering/reading/switching_on):
   standardize on the stashed validated entity at report time.
5. **Normalization**: IFActions constants everywhere, one sharedData key
   convention, delete dead locals — all of which the shared engine makes moot
   for migrated actions.

### D8: Chord `while`-gate lowering fix (blessed)

At all three story-loader lowering sites (`buildInterceptor`,
`buildTraitInterceptor`, `buildCapabilityBehavior` in
`packages/story-loader/src/runtime.ts`): evaluate `clause.condition` at the
top of preValidate/validate **before** `findRefusal`, and set/honor
chordSkip + `clause.once` uniformly in the trait paths. **Gate evaluation
point ruled**: once per firing, at validate time (double evaluation in
preValidate and postValidate is safe because no mutation occurs between them
within one action; the stated point exists so save/restore and future phases
cannot drift). Pinning tests required: while-false + leading-refusal (entity
and trait clauses, both routes), trait-clause `, once`, and a regression run
of the Cloak stumble suite.

## Consequences

- All 33 entity-keyed standard actions are touched: the 14 wired actions
  migrate onto the engine (deleting hand-rolled lifecycle code and fixing
  their path gaps), the 19 unwired actions become descriptor declarations.
  The live Dungeo bugs fall out of the migration rather than being
  spot-patched twice.
- Canonicalizing hook placement changes some observable orderings (e.g.
  taking's postValidate moves after ALL standard validation). Each such
  change needs transcript coverage; walkthrough chain per the one-good-run
  rule.
- `ActionInterceptor.onBlocked`'s signature changes (world-model); existing
  story implementations are few and are updated in the same program.
- Pinning tests live once against the engine, not 33 times. Future actions
  get lifecycle correctness by writing a descriptor; hand-rolling the
  lifecycle in a new action is a review-rejectable smell.
- Chord authors get load-time diagnostics for bad gerunds and gain 19 newly
  live `on <gerund> it` targets plus second-entity clauses (weapon, door,
  item-side) by construction.
- ADR-118 remains the origin of the hook vocabulary; its example code is
  superseded where it contradicts D1/D2. ADR-208's registry is unchanged.

## Sequencing (input to the implementation plan)

Lifecycle module + pinning tests → migrate the 14 wired actions → declare
the 19 new surfaces → D5 registry export + Chord fail-fast → D8 loader fix.

## Session

Session 3ed9fb (2026-07-16, chord-foundations), from the audit and decision
doc produced in session c39d83. All forks ruled by David 2026-07-16.
