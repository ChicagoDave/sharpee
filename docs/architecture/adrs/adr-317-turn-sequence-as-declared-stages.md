# ADR-317: The Turn Sequence as Declared Stages, Not a Hard-Coded Thirteen

**Umbrella**: Sharpee and Chord Temporal Controls — `docs/work/temporal-controls/README.md`

**Status**: DRAFT (2026-08-14, session 3da25e) — design in progress, **no implementation
authorized**. Open questions below are unresolved; this ADR must not be flipped to ACCEPTED
while they remain.
**Date**: 2026-08-14 (session 3da25e)
**Supersedes**: ADR-315's *Decision* section (its Context stands as this ADR's motivation)
**Related**: ADR-316 (multi-turn actions — unaffected by this ADR), issue #263
**Touches**: ADR-118 / ADR-208 / ADR-228 (action interceptor stages), ADR-120 (turn plugin
priorities), ADR-071 (scheduler), ADR-163 (channel packets), ADR-172 (sound buffer),
ADR-224 (player death), ADR-296 D1 (transaction stamping)

---

## Context

ADR-315 diagnosed a specific defect: Sharpee decides whether a command costs time from the
**action id, before the command is validated** (`game-engine.ts:1070`), where Inform decides
inside the turn sequence after the action ran. ADR-315 proposed moving that one decision to
after `report`.

That is a point fix to a general condition. **The turn is a fixed statement sequence with
exactly one extension point.** Everything in `executeTurn` runs in hard-coded order:

| Implicit stage | Site |
|---|---|
| `snapshot` (undo) | `:996` |
| `parse` | `:1067` |
| `route` (meta vs. regular) | `:1070` |
| `act` (validate/execute/report + interceptors + chains) | `:1097` |
| `enrich` → `perceive` → `record` | inline after `:1097` |
| `react` (NPC, state machines, scheduler) | `:1218` |
| `hear` (sound dispatch) | `:1232` |
| `advance` (clock + history) | `:1257` |
| platform ops | `:1265` |
| `compose` (text render) | `:1276` |
| `emit` (channel packet) | `:1289` |
| `resolve` (death check) | `:1298` |
| `clear` | after `:1298` |

The one extension point is `TurnPlugin.onAfterAction`, ordered by a bare number
(`plugins/src/turn-plugin.ts:23` — NPC 100, state machines 75, scheduler 50).

**The pattern already exists one level down.** `ActionInterceptor` exposes five named,
published, author-addressable stages — `preValidate` (`world-model/src/capabilities/action-interceptor.ts:351`),
`postValidate` (`:378`), `postExecute` (`:401`), `postReport` (`:445`), `onBlocked` (`:483`)
— driven by the ADR-228 lifecycle engine with first-veto-wins semantics. Sharpee believes in
staged hooks. It simply stops believing at the action boundary.

### Three symptoms of the sequence being implicit

1. **Enrichment and perception filtering are duplicated.** The action path enriches and
   filters inline after `:1097`; `processPluginEvents` does its own
   (`game-engine.ts:2172-2194`). Two copies of one policy, because no stage owns it.
2. **A Chord author cannot order themselves against NPCs.** Every form of `on every turn` —
   entity clauses (`story-loader/src/runtime.ts:1406-1412`), story-header (`:1436-1442`),
   region (`:1465`) — lowers to a **scheduler daemon**, so author rules run at priority 50:
   after NPC behaviour at 100 and state machines at 75, always. "My rule runs before the
   troll moves" is the most common use of Inform's turn sequence rulebook and is
   unreachable here.
3. **The undo snapshot fires before the parse**, gated by
   `MetaCommandRegistry.isNonUndoable(input)` (`meta-registry.ts:215-219`, called at
   `:996`), which string-matches the command's first word because no action id exists yet.

## Decision (proposed — not adopted)

**The turn sequence is a declared list of named stages with per-stage ordering constraints.
The thirteen above are the platform's default sequence, not a floor.**

### D1 — Stages are named and declared

The engine ships a default sequence. A story may declare its own. Naming them is what makes
the rest possible; today they exist only as the order statements happen to appear in.

### D2 — Mobility is emergent from constraints, never a hand-maintained flag

Each stage declares what it **requires to have run** and what it **must precede**. The
engine topologically validates a story's declared order at load and rejects a violation with
a message naming the constraint that failed. "Immovable" is then a derived property — a
stage with tight constraints has nowhere to go — and the error explains *why* instead of
asserting that a stage is fixed. Applying that to the current thirteen:

**Anchored** — the sequence is meaningless otherwise:

| Stage | Why |
|---|---|
| `parse` | nothing needing a command can precede it |
| `act` | the anchor everything else is defined relative to |
| `clear` | must be last; every later reader consumes `turnEvents` |

**Constrained pairs** — movable together, not apart:

| Pair | Why |
|---|---|
| `enrich` → `record` | enrich stamps turn/player/location/transactionId; record cannot precede it |
| `compose` → `emit` | deliberately co-emitted so both paths see the same turn boundary (`:1289`) |

**Free** — each with a real reason an author would move it:

| Stage | Why someone moves it |
|---|---|
| `snapshot` | after `parse` it gets a real action id instead of the first-word string match. Moving it is a **fix**, not a preference. |
| `perceive` | runs twice today with no shared policy; one stage or two is a genuine choice |
| `react` vs `advance` | Sharpee reacts then advances; Inform advances time *after* every-turn rules. Both defensible. |
| `hear` | sits after `react` so NPC-emitted sounds land in the buffer (`:1223-1231`); a story with no sound-emitting NPCs can pull it earlier |
| `advance` | the entire subject of ADR-315 |
| `resolve` | deliberately late so story policy gets first crack at vetoing death; an author wanting death to short-circuit the render moves it before `compose` |

**Deleted rather than moved:** `route` — see D4.

### D3 — Stage identity replaces numeric priority

ADR-120's 100/75/50 become three stages. Chord's `on every turn` lowers to its own stage
rather than a scheduler daemon, making author rules orderable against NPC movement. This is
a change at the lowering site (`story-loader/src/runtime.ts:1406-1465`) and in the three
plugin **adapters** — `NpcService`, `StateMachineRegistry`, and `SchedulerService` are not
touched. Each adapter is a thin wrapper (`state-machine-plugin.ts:33-52` builds a context
and calls `registry.evaluate`; `scheduler-plugin.ts:25` is one line).

### D4 — A stage may end the sequence

Early termination is what ADR-315 was reaching for. *Timeless* becomes "the sequence ends
before `advance`", and it is conditional for free, because termination happens inside the
turn with the resolved noun in hand. `route` (`:1070`) and `executeMetaCommand` (`:1354`)
are deleted: a meta-command is a turn that ends early, not a second turn implementation.

### D5 — Relationship to the deferred ADRs

This supersedes ADR-315's Decision. ADR-315's Context — the ordering diagnosis and the three
author-facing gaps — stands as the motivation above. **ADR-316 is unaffected**: whether a
multi-turn action is interruptible is orthogonal to whether the turn is staged, though a
staged turn makes ADR-316's model A expressible as "repeat `react`…`resolve`."

## Consequences

**Gained.** ADR-315 falls out of the general mechanism rather than needing its own machinery.
`enrich`/`perceive` get one owner and stop being two copies. Authors can order their rules
against NPC movement. Numeric priorities — a weak ordering vocabulary that says *when* only
relative to other numbers — disappear rather than being migrated.

**Constrained going forward.** Stage names and the constraint graph become the compatibility
surface a story writes against. The repo does not carry backward-compatibility obligations,
but a Chord story naming stages is a new kind of coupling to platform internals, and the
constraint graph has to be right: too loose and authors break the platform silently, too
tight and legitimate reorderings are rejected.

**Risk.** Three plugin adapters, the Chord lowering site, and `executeTurn` itself change
together. The migration is wide but shallow — no service internals move.

**Not a rewrite.** `NpcService`, `SchedulerService`, and `StateMachineRegistry` are
untouched, and they already tolerate not running: `turn-plugin.ts:10-11` states plugins skip
meta-commands and failed actions, enforced at `:1187`. Early termination is a condition they
were built for. Fuse aging is per-tick (`turnsRemaining--`, `scheduler-service.ts:265`), not
a turn-number delta, so a sequence ending before `react` simply does not age fuses — exactly
what "no time passed" should mean.

## Session

Session 3da25e, 2026-08-14 (branch `main`). Arrived at by working backwards: a "time trap"
post on topexpert.blog (2026-08-14, via planet-if.com) asked how to stop the clock for
selected actions in Inform 7; the Sharpee equivalent turned out to be unreachable from Chord
(issue #263), which exposed an ordering problem (ADR-315), which exposed a multi-turn
question (ADR-316), which exposed the fact that the turn has no stages at all. The decision
that stages should be **defaults with per-stage mobility rather than a fixed list** is
David's, made in session; the classification above is the working-out of it.

## Open Questions

1. **What is the Chord surface?** Reordering is inherently a list, and Inform's answer —
   listing rules into a rulebook relative to named rules — is imperative. Chord has no
   control flow by design. A story-header `turn sequence` block naming stages in order is
   the obvious shape, but "obvious" is not "decided," and this is the hard part of the whole
   ADR.
2. **Does the declared order belong in the save file?** A save made under one sequence and
   restored under another is a different game. Persisting it means saves pin a platform
   behaviour; not persisting it means silent divergence.
3. **Can a story *add* a stage, or only reorder and remove?** Adding is Inform's actual
   model — the rulebook is an insertion point. Reorder-only is materially weaker and may not
   be worth the machinery.
4. **What may terminate?** Any stage, or only designated ones? Unrestricted termination lets
   a story skip `clear` and leak `turnEvents` into the next turn.
5. **Does `act` decompose too?** The ADR-228 interceptor hooks are already stages one level
   down. Two staging vocabularies in one system is a smell; merging them is a much larger
   change than this ADR describes.
6. **How does a transcript record a non-default sequence?** Golden recordings are
   order-sensitive, so a story's declared sequence is part of what a recording assumes.
