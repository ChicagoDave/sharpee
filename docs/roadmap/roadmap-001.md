# 001 — Sharpee and Chord Temporal Controls

**Status**: DRAFT
**Built?**: none — no implementation authorized by any of the three ADRs
**Created**: 2026-08-14
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: TBD
**Traces to**: [`docs/work/temporal-controls/README.md`](../work/temporal-controls/README.md) (umbrella) · issue [#263](https://github.com/ChicagoDave/sharpee/issues/263) · ADR-315 · ADR-316 · ADR-317

---

## What it is

Who controls time in a Sharpee story: whether a command advances the clock, by how much, in
what order the turn's work happens, and how much of that a Chord author can say.

Chord authors already have rich control over **what happens as time passes** — `on every
turn`, `define sequence`, daemons, counters. They have **no control over the clock itself**.
Three gaps: a command cannot be made free from Chord at all, cannot be made *conditionally*
free from anywhere, and cannot be made to cost more than one turn from anywhere.

## Requirements

1. Create, monitor, stop, and restart a daemon based on turns.
2. Order malleable story and platform activities within a single turn.
3. Validate, execute, block, and report all of the above.

Requirement 2 is covered by ADR-317. Requirements 1 and 3 are open — the scheduler's
lifecycle API is complete but unreachable from Chord, and the four-phase pattern currently
stops at actions, leaving daemons two-phase (`condition` + `run`) and turn stages
zero-phase.

## Where it stands

| Piece | Covers | Status |
|---|---|---|
| Issue #263 | `takes no time` — a blanket per-verb Chord surface | Open, shippable on its own |
| ADR-315 | The cost decision is made from the action id before validation | DRAFT; Decision superseded by ADR-317, Context retained |
| ADR-316 | What costing *more* than one turn collides with | DRAFT, deferred |
| ADR-317 | The turn becomes declared stages with ordering constraints | DRAFT, design in progress |

The turn is already a thirteen-stage pipeline; the stages are simply anonymous,
unaddressable, and un-terminable. ADR-317's decision is that those thirteen are a **default,
not a floor** — some stages are immovable because moving them breaks the platform, some are
movable and moving them is author preference, and mobility is derived from declared
constraints rather than a hand-maintained flag.

## What has to be answered first

The Chord surface for ordering, given that Chord has no control flow by design. Inform's
answer — listing rules into a rulebook relative to named rules — is inherently imperative.
Requirement 1's verbs and requirement 3's shape both inherit from whatever answer this gets.

## Origin

A post titled "time trap" on topexpert.blog (2026-08-14, via planet-if.com) asked how to
stop the clock advancing on selected actions in Inform 7. Asking what Sharpee's equivalent
was turned up four layers, each exposed by the one above it.
