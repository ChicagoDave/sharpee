# ADR-217: Chord Timer & Scheduler Controls

## Status: ACCEPTED (2026-07-14 — direction fixed by ADR-214 §4/OQ4; designed via interview the same session; all five open questions resolved)

> Child of ADR-214 (parity). ADR-214 §4 audited the scheduler and OQ4 resolved
> **full scheduler parity — every imperative control gets a Chord surface, none
> deferred**. This ADR designs the exact surface over the existing
> `packages/plugin-scheduler` API. Reserved by name in ADR-214 §8.

## Date: 2026-07-14

## Context

The scheduler (`packages/plugin-scheduler`) exposes a full imperative timer API,
but Chord reaches almost none of it. Grounding (2026-07-14 code sweep):

- **Daemons** — `Daemon { id, name, condition?, run, priority?, runOnce?,
  getRunnerState?/restoreRunnerState? }` (`src/types.ts:37-61`); service controls
  `registerDaemon` / `removeDaemon` / `pauseDaemon` / `resumeDaemon` / `hasDaemon`
  (`scheduler-service.ts:89-121`).
- **Fuses** — `Fuse { id, name, turns, trigger, entityId?, tickCondition?,
  onCancel?, priority?, repeat?, originalTurns? }` (`types.ts:66-96`); controls
  `setFuse` / `cancelFuse` / `getFuseRemaining` / `adjustFuse` / `pauseFuse` /
  `resumeFuse` / `hasFuse` / `cleanupEntity` (`scheduler-service.ts:127-195,385`).
- **Turn phase** — `SchedulerPlugin` priority 50, after NPC (100) / state-machine
  (75) (`scheduler-plugin.ts:14-16`).
- **What Chord reaches today**: exactly **one** entry point — `registerDaemon`,
  and only through a *reduced* structural `SchedulerDaemon` (`story-loader/
  runtime.ts:101-106`) with no `priority`/`runOnce`. `define sequence` compiles to
  a single world-state-pointer daemon (not a fuse chain, despite the IR name);
  `on every turn` compiles to per-turn condition daemons. **The entire fuse
  subsystem and every imperative control (`cancelFuse`, `adjustFuse`,
  `pause/resume`, `cleanupEntity`, `removeDaemon`, priority, `runOnce`) are
  unreachable.** The old top-level `once`/`every N turns` forms were removed
  (`parser.ts:237,245`).

ADR-214 OQ4 committed to closing all of it.

## Decision

*Direction fixed by ADR-214 §4/OQ4; spellings being designed here.* The Chord
surface exposes the full imperative scheduler API additively over the existing
subsystem (compiler + loader work only, no platform scheduler change).

### Fuses are first-class (resolved 2026-07-14)

Chord exposes fuses directly as one-shot timers — an honest 1:1 with the
scheduler's fuse API, so the imperative controls act on them directly:

- **Anonymous one-shot** — `in N turns: <statement>` (fire-and-forget; `setFuse`).
- **Named fuse** — `after N turns as <name>: <statement>` binds a **timer handle**
  `<name>`; the imperative controls target it by name.
- **Cancel** — `cancel <name>` (`cancelFuse`, runs the fuse's `onCancel`).
- **Reschedule** — `reschedule <name> by <delta>` (`adjustFuse`).
- **Pause/resume** — `pause <name>` / `resume <name>` (`pauseFuse`/`resumeFuse`).

The `as <name>` binding is the **named-timer-handle mechanism**: controls
reference a running timer by the name it was declared with.

**Handle scope — lexical (resolved 2026-07-14).** A `<name>` handle is visible
only within the scope it was declared (the same block/clause), not story-global.
Consequence: to control a timer from more than one place (the classic "start a
countdown in one action, defuse it in another"), the author declares it at an
**enclosing scope** — top level, or an entity on-clause shared by the controlling
actions. Entity-bound timers (below, `entityId` + `cleanupEntity`) are therefore
the idiom for cross-action control: the timer lives on the entity, and any clause
on that entity can cancel/reschedule it. This keeps timer names out of a global
namespace and ties a timer's controllability to a declared, visible scope.

### The remaining surface (spellings under design)

- `on every N turns …` — period timer.
- **data-driven delays — resolved 2026-07-14**: the delay slot accepts Chord's
  **existing value-expression grammar** (literals, world-state/property reads, and
  whatever arithmetic that grammar already supports) — a delay is just another
  place a value-expr appears, e.g. `in (fuse-length of the bomb) turns: …`,
  `after (patience of the guard) turns as leave: …`. No bespoke delay grammar.
- entity-bound timers with auto-cleanup on removal (`entityId` + `cleanupEntity`).
- **priority — named bands (resolved 2026-07-14)**: an optional trailing band on a
  timer declaration — `early` / `normal` / `late` — instead of raw integers.
  Bands map to reserved scheduler `priority` numbers with gaps for future
  insertion: `early = +10`, `normal = 0` (the default when omitted — today's
  behavior), `late = -10` (higher runs first, per the scheduler). Within one band,
  order falls to registration order (unchanged). The raw integer is deliberately
  **not** author-facing (Chord hides the implementation detail). These band
  numbers live in the scheduler's own daemon/fuse sort and are distinct from the
  plugin-level priorities (NPC 100 / state-machine 75 / scheduler 50), which order
  *plugins*, not timers — no collision. Spelling: `on every turn, late: …`,
  `after 3 turns as bomb, early: …`. Widening (more bands) is a later ratchet if
  three prove too coarse.
- `cancel sequence <name>` for the existing `define sequence` timelines.

Grouped as grammar-ratchet entries under this ADR (ADR-214 §4).

### Full Daemon shape (resolved 2026-07-14)

The story-loader stops building its own **reduced** `SchedulerDaemon`
(`runtime.ts:101-106`, only `id`/`name`/`condition`/`run`) and instead constructs
the **real** `Daemon` (`plugin-scheduler/src/types.ts:37-61`: adds `priority`,
`runOnce`, and the `getRunnerState?`/`restoreRunnerState?` serialization hooks).
This is required to carry the band-priority above and to expose `runOnce`
uniformly as `, once`, and it removes a drift-prone parallel type (one Daemon
shape, per the boundary discipline). The loader's `SchedulerContext` mirror is
likewise reconciled with the real context where the widened fields need it.

**`, once` → `runOnce` scope (pinned 2026-07-14):** the **new** constructs
(`on every N turns`, and daemon-shaped clauses going forward) compile `, once` to
the real `Daemon.runOnce` field — this is what the widening unlocks. The
**pre-existing** `define sequence` / `on every turn` implementations, which
already realize `, once` via a working world-state counter, are **left unchanged**
(additive, AC-4 — migrating them would be a behavior change for no benefit). So
`, once` is uniform in *spelling* across constructs, while existing timelines keep
their proven implementation and new ones use `runOnce`.

## Consequences

- Chord reaches the **entire** scheduler imperative API — fuses (one-shot + named
  + cancel/reschedule/pause), period timers, data-driven delays, entity-bound
  auto-cleanup, and banded priority — closing the ADR-214 §4 daemon/fuse parity
  gap. Compiler + loader work only; no platform scheduler change.
- Fuses become first-class in Chord, and the story-loader builds the real
  `Daemon`, deleting the reduced parallel struct (less drift surface).
- Timer names are lexically scoped, pushing cross-action control toward
  entity-bound timers — a deliberate constraint that keeps the timer namespace
  local and tied to a visible scope.
- Priority is authored as `early`/`normal`/`late` bands, hiding the scheduler's
  integer; a later ratchet can add bands if three prove too coarse.

## Acceptance criteria

Inherits ADR-214 AC-1..AC-4 (fixture-per-gap, pure-IR preserved, additive-only,
governance). Concretely:

- **AC-1 — fuse controls.** A fixture story arms a named fuse (`after N turns as
  bomb: lose …`), and separate paths `cancel bomb`, `reschedule bomb by +2`, and
  `pause`/`resume bomb`, each asserted against the countdown/firing.
- **AC-2 — period + delay + band.** Fixtures for `on every N turns`, a data-driven
  delay (`in (value-expr) turns: …`), and two competing `on every turn` clauses in
  different bands firing in band order.
- **AC-3 — entity cleanup.** A timer bound to an entity is auto-cancelled when the
  entity is removed (`cleanupEntity`), asserted by the trigger not firing.
- **AC-4 — additivity + full daemon.** Existing `define sequence` / `on every
  turn` stories (cloak, zoo) compile unchanged; a test confirms the loader emits a
  real `Daemon` (priority/runOnce populated) rather than the reduced struct.

## Session

Session ae2a61 (2026-07-14) — created as a grounded stub for the ADR-214 §8
roadmap, then designed via interview the same session (5 open questions resolved).
Parent: ADR-214 §4/OQ4. Related: ADR-210 (grammar ratchet), ADR-123 (daemon
serialization).
