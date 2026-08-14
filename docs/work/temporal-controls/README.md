# Sharpee and Chord Temporal Controls

The umbrella for everything about **who controls time in a Sharpee story** — whether a
command advances the clock, how much, in what order the turn's work happens, and how much of
that a Chord author can say.

**Status**: all design, nothing authorized for implementation. One shippable issue.
**Opened**: 2026-08-14 (session 3da25e), branch `main`.

---

## Requirements

Stated by David, 2026-08-14. These define the umbrella's scope; the ADRs below are judged
against them, not the other way round.

**R1 — Create, monitor, stop, and restart a daemon based on turns.**
**R2 — Order malleable story and platform activities within a single turn.**
**R3 — Validate, execute, block, and report all of the above.**

### Coverage

| | Engine/service | Chord | Written up |
|---|---|---|---|
| **R1** daemon lifecycle | **Complete** — `registerDaemon` (`scheduler-service.ts:81`), `removeDaemon` (`:94`), `pauseDaemon` (`:99`), `resumeDaemon` (`:106`), `hasDaemon` (`:113`), `getFuseRemaining` (`:172`), `adjustFuse` (`:176`), `pauseFuse` (`:183`), `getActiveDaemons` (`:299`), `getActiveFuses` (`:318`) | **None** | **Nothing — gap** |
| **R2** intra-turn ordering | Numeric priority within one stage (`turn-plugin.ts:23`) | Implicit, unaddressable | ADR-317 |
| **R3** four-phase over daemons and stages | **Absent** | n/a | **Nothing — gap** |

### R1 — the API exists; Chord cannot name a daemon, let alone stop one

The scheduler's lifecycle surface is complete and unreachable. Grepping
`packages/chord/src/` and `packages/story-loader/src/` for `pauseDaemon` / `resumeDaemon` /
`removeDaemon` / `adjustFuse` / `pauseFuse` returns nothing. The only `stop` in the Chord
grammar is `stop music` / `stop ambient` (`chord.ebnf:730-732`), which is audio.

The blocking problem is **identity, not vocabulary**. Chord creates daemons implicitly —
`define sequence`, `on every turn` on an entity, story header, or region, all lowered at
`story-loader/src/runtime.ts:1364-1465` — and the author never names the daemon their clause
became. You cannot stop, restart, or inspect what you cannot name. So R1 is not "add four
verbs"; it is "give story-declared recurring work a first-class identity, then add four
verbs."

Monitoring has the same shape: `getActiveDaemons()` / `getActiveFuses()` return `DaemonInfo`
/ `FuseInfo` today for engine introspection, with no author- or IDE-facing surface over them.

### R3 — the four-phase pattern stops at actions

| Unit | Phases |
|---|---|
| Action (ADR-051) | validate / execute / report / blocked |
| Capability behavior (ADR-090) | validate / execute / report / blocked |
| Action interceptor (ADR-228) | preValidate / postValidate / postExecute / postReport / onBlocked |
| **Daemon** | **`condition?` + `run`** (`plugin-scheduler/src/types.ts:37-48`) — two-phase |
| **Turn stage** | **none** — statements in `executeTurn` |

A daemon cannot be blocked, and it has no report phase separate from its effect: `run`
mutates and returns events in one call. A failing fuse trigger is `console.error`'d and the
fuse discarded (`scheduler-service.ts:280-283`) — there is no vetoable path. This is why
story policy can veto an *action* through an interceptor but cannot veto a *daemon's* effect
the same way, and it is the requirement most likely to force changes inside
`SchedulerService` rather than around it — unlike R2, which the earlier analysis established
does **not** need a service rewrite.

### What the requirements change about the existing ADRs

Nothing is invalidated. ADR-315 and ADR-316 are both narrower than R1–R3 and stay as
written; ADR-317 satisfies R2 and is the only one of the three that a requirement squarely
covers. Two new ADRs are needed — R1 (daemon identity and lifecycle in Chord) and R3
(four-phase over daemons and stages) — and **R3 should be written after R1 and R2 settle**,
since it is the pattern applied *to* them and its shape depends on what they end up being.

---

## How this came about

A post titled "time trap" on topexpert.blog (2026-08-14, surfaced via planet-if.com) asked
how to stop the clock advancing on selected actions in Inform 7 — the *Writing with Inform*
Example 408 "Timeless" pattern, plus a rulebook for centralizing the exceptions.

Asking what Sharpee's equivalent was turned up four layers, each exposed by the one above it:

1. Chord cannot reach the mechanism Sharpee already has → **issue #263**
2. The mechanism decides too early to ever be conditional → **ADR-315**
3. The other direction — costing *more* than a turn — has no shape at all → **ADR-316**
4. Both are symptoms of the turn having no stages, only a fixed statement sequence with
   one extension point → **ADR-317**

## The pieces

| | What it covers | Status |
|---|---|---|
| **issue #263** | `takes no time` — a Chord surface reaching the existing meta-command path. Blanket per-verb only. | Open, shippable on its own, independent of everything below |
| **ADR-315** | Sharpee decides "does this cost time" from the action id before validation; Inform decides mid-sequence after the action ran. Three author-facing gaps follow. | DRAFT — **Decision superseded by ADR-317**; Context stands as its motivation |
| **ADR-316** | What N > 1 collides with. Proposes elapsed-time semantics and names the interruptible-activity model so it can't be smuggled in. | DRAFT — deferred ("future maybe") |
| **ADR-317** | The turn sequence becomes a declared list of named stages with per-stage ordering constraints. The current thirteen are a default, not a floor. | DRAFT — design in progress, no implementation authorized |

`docs/architecture/adrs/adr-31{5,6,7}-*.md`.

## What is settled

- **Chord authors have rich control over what happens as time passes** — `on every turn`,
  `define sequence`, daemons, counters — and **no control over the clock itself**. Three
  gaps: can't make a command free (TypeScript only, blanket), can't make it conditionally
  free (nowhere), can't make it cost more than one turn (nowhere).
- **The turn is already a thirteen-stage pipeline**; the stages are simply anonymous,
  unaddressable, and un-terminable.
- **Stages are defaults, not a fixed list** (David's call, ADR-317). Some are immovable
  because moving them breaks the platform; some are movable and moving them is author
  preference. Mobility is emergent from declared constraints, not a hand-maintained flag.
- **This is not a plugin rewrite.** `NpcService`, `SchedulerService`, and
  `StateMachineRegistry` are untouched — the three plugin adapters and the Chord lowering
  site change. The services already tolerate not running.

## What is open

The load-bearing one, ADR-317 Q1: **what the Chord surface looks like.** Reordering a
sequence is inherently a list, and Inform's answer — listing rules into a rulebook relative
to named rules — is imperative. Chord has no control flow by design. Everything else in the
three ADRs is cheaper to answer once this is.

The rest, by ADR: 315 has five (per-suppression granularity, what a cost condition can see,
refused actions, whether `MetaCommandRegistry` survives, `AGAIN`); 316 has five (separator
prose, per-sub-turn death check, the recording format, static vs. computed N, whether the
activity model belongs to Sharpee at all); 317 has six (Chord surface, save-file coupling,
add-vs-reorder, what may terminate, whether `act` decomposes, transcript recording).

## Corrections made while working

Recorded so they are not re-derived:

- The three turn plugins are thin adapters, not the logic. An earlier read of this called
  fine-grained staging a `NpcService` rewrite; it is a registration change plus a lowering-
  site change (`story-loader/src/runtime.ts:1406-1465`).
- `processPluginEvents` already stamps per-batch transactions
  (`txn:${turn}:plugin:${pluginId}`, `game-engine.ts:2183`). The multi-turn problem is
  therefore *identical* ids across sub-turns, not one merged id — worse, because the
  stamping asserts a grouping that is false. Fixed in ADR-316.
- `processPluginEvents` also runs its own enrichment and perception filtering, so those are
  duplicated inline in two places today rather than being single steps. This is evidence
  for ADR-317, not against it.

## Next

Two ADRs are unwritten against the stated requirements — R1 (daemon identity and lifecycle
reachable from Chord) and R3 (four-phase over daemons and stages, written last). Before
either, ADR-317's Q1 — what the Chord surface for ordering looks like without control flow —
because R1's surface and R3's shape both inherit from whatever answer it gets.

Nothing here is committed yet.
