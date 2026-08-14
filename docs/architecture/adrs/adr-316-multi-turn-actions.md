# ADR-316: Multi-Turn Actions — Elapsed Time Is Not an Activity Model

**Umbrella**: Sharpee and Chord Temporal Controls — `docs/work/temporal-controls/README.md`

**Status**: DRAFT — **DEFERRED ("future maybe", 2026-08-14, session 3da25e)**. Nothing here
is authorized for implementation. Depends on ADR-315, which is itself deferred. Open
questions below are unresolved; this ADR must not be flipped to ACCEPTED while they remain.
**Date**: 2026-08-14 (session 3da25e)
**Depends on**: ADR-315 (when a command costs time), whose Decision is superseded by
ADR-317 (turn sequence as declared stages). This ADR is unaffected by that supersession —
under ADR-317 model A becomes "repeat `react`…`resolve`", and the four collisions below
hold either way.
**Related**: issue #263 (the `takes no time` Chord surface)
**Touches**: ADR-071 (scheduler), ADR-120 (turn plugin loop), ADR-163 (channel packets),
ADR-172 (sound buffer), ADR-224 (player death), ADR-296 D1 (transaction stamping),
ADR-300 D8/D9 (transcript recording shape)

---

## Context

ADR-315 proposes that the turn cost become a number rather than a boolean: 0 for a
timeless action, 1 by default, N for an action that takes a while. Zero is the easy half —
the engine already has that shape, because `executeMetaCommand` is a path that runs an
action and skips the clock.

**N > 1 is not the mirror image.** It is a concept the engine has no shape for anywhere,
and this ADR is the research into what it collides with. The question that prompted it:
if `dig` costs three turns, does the player see three rounds of daemon output, do NPCs get
three moves, and can something interrupt the dig partway?

### Sharpee has no multi-turn precedent

Chord's only time-passage surface is `define sequence` with `at turn N` / `N turns later`
step anchors (`chord.ebnf:651-652`). It lowers to a **scheduler daemon**
(`story-loader/src/runtime.ts:1364-1400`) whose `shouldRun` compares the step's anchor
against `ctx.turn` and fires at most one step per tick. Time passes *while the player keeps
typing*. Nothing anywhere lets one command consume several turns.

### Everything after the action is keyed to a single `turn`

Tracing the post-action path in `game-engine.ts`, one command produces exactly one of each:

| Step | Site |
|---|---|
| Plugin tick loop — one pass over NPC, state machines, scheduler | `:1218` |
| Sound dispatch over the per-turn buffer | `:1232` |
| `updateContext` — one `currentTurn++`, one history entry | `:1257`, `:2324` |
| Text render of one `turnEvents` bucket | `:1276` |
| One channel packet | `:1289` |
| One player-death check | `:1298` |

The naive implementation — loop the plugin tick N times — piles N turns of daemon events
into one bucket, renders them as one block list, and ships one channel packet. The counter
advances by N and nothing else in the system observes the intervening turns as turns.

Transaction stamping (ADR-296 D1) degrades in a subtler way than "one id for everything":
`processPluginEvents` already stamps each plugin batch separately as
`txn:${turn}:plugin:${pluginId}` (`game-engine.ts:2183`), distinct from the action's
`txn:${turn}:action`. Under a multi-turn command the three scheduler batches would each be
stamped `txn:${turn}:plugin:sharpee.plugin.scheduler` — **identical ids for three distinct
turns' worth of work**, which is worse than a single merged id because the stamping now
claims a grouping that is false.

### Four collisions

**1. The player sees a wall.** Three ticks of a lamp daemon, a hunger daemon, and an NPC's
movement land in one render in emission order, with no turn boundary between them: *"Your
lamp flickers. Your lamp flickers. Your lamp flickers."* There is nowhere to put a
*"Time passes."* separator, because the prose pipeline composes a turn, not a run of turns.

**2. Daemons do their own turn arithmetic, so sub-ticks need real turn numbers.**
`SchedulerService.tick` assigns `this.currentTurn = turn` (`scheduler-service.ts:204`) and
that value is persisted in `getState()` (`:356`) for save/restore. More importantly, daemon
bodies read `ctx.turn` — a Chord sequence's `stepReady` is called with it directly
(`runtime.ts:1394`). Ticking three times with the same turn number means a sequence
anchored at *turn 12* evaluates against a stale clock on sub-ticks 2 and 3 and fires late
or on the wrong sub-tick. So the engine must advance `currentTurn` **between** sub-ticks,
not once after the loop — which is a change to `updateContext`, not a wrapper around it.

*(The fuse-decrement path is fine as-is: `skipNextTick` is a per-fuse boolean consumed on
the first tick after the fuse is lit, `scheduler-service.ts:253-257`, so a fuse lit during
a multi-turn action correctly gets one turn of grace and then decrements normally.)*

**3. Death and interruption have no seam.** `playerDeathCauseThisTurn` runs once, after the
whole block (`:1298`). A player killed by a hunger daemon on sub-turn 1 of a 3-turn dig
finishes the dig and *then* dies. The same holds for any interruption — an NPC arriving, a
fuse ending the scene. The cost is decided before the sub-turns run and there is no point
at which the engine asks whether to continue.

**4. The recording format equates command with turn.** `GoldenTurn = { command, output,
events, channels }` (`transcript-tester/src/runner.ts:356`) — one command, one entry. A
3-turn command becomes one `GoldenTurn` whose `output` holds three turns of prose, so the
type's name stops being true and per-turn channel assertions cannot address the intervening
turns.

## Decision (proposed — not adopted)

**Two models are available, and they should not be conflated. Adopt A; name B so it cannot
be smuggled in as an implementation detail of A.**

**Model A — elapsed time.** `takes N turns` means: advance the clock N, tick the schedule N
(with real, distinct turn numbers, per collision 2), render once. The action is atomic and
uninterruptible; the player is never *doing* anything, time simply passed. Fits the existing
pipeline. Accepts collisions 1 and 3 as stated limitations rather than fixing them.

**Model B — multi-turn activity.** The player is *engaged* in an action across several
turns. Each sub-turn is a full turn with its own render, packet, and death check; NPCs act
against the player mid-action; the activity can be interrupted and abandoned; player input
during it is consumed or refused. This is the TADS-shaped answer, and it is what most
authors picture when they read *"digging takes three turns."*

**B is not a turn-cost feature.** It is an interruptible-activity feature that happens to
consume turns, and it needs the player-agency questions answered before any of it makes
sense — is it a mode (ADR-137)? does the prompt change? what does `UNDO` undo? Building it
behind a `takes 3 turns` line would answer those questions by accident.

**Language consequence, and the reason this matters now.** Under model A the phrasing
`takes 3 turns` is a lie — it reads as *the player is busy for three turns*, which is model
B. If ADR-315 ships model A, the Chord surface should say what actually happens to the
clock rather than what the character is doing. The wording is not decided here, but the
constraint is: **ADR-315 must not adopt a phrasing that promises interruptibility it does
not deliver.**

## Consequences

**Gained.** Multi-turn cost becomes reachable at all, and the cheap version does not
foreclose the expensive one — model B can be added later as a distinct feature with its own
surface, because model A never claimed to be it.

**Constrained going forward.** Three things become load-bearing the moment N > 1 ships:
`updateContext` must be splittable so the clock can advance between sub-ticks; the
scheduler's persisted `currentTurn` must match the engine's after a multi-turn command, or
save/restore diverges; and the Chord phrasing for turn cost is now bounded by which model
is underneath it.

**Accepted limitations of model A**, to be stated in author docs rather than discovered:
merged output with no turn separator, and no interruption or death check until the action
completes. The second is the one likely to draw a bug report — a player who starves during
a long climb dies at the top of it.

**Risk of doing nothing.** Low. No author has asked for this; it surfaced from a code
trace, not a request. The cost of deferring is that ADR-315 might ship a phrasing that
commits us to model B by implication.

## Session

Session 3da25e, 2026-08-14 (branch `main`). Written after ADR-315's sixth open question —
"what does a multi-turn action look like from inside?" — turned out to have a large enough
answer to need its own record. Prompted originally by the "time trap" post on
topexpert.blog (2026-08-14, via planet-if.com).

## Open Questions

1. **Does the merged render need a separator at all?** Model A could emit a story-supplied
   line between sub-turn event groups ("Time passes.") without becoming model B. That is a
   prose-pipeline question — whether `processTurn` can compose a run of turns — and it may
   be cheap enough to remove collision 1 outright.
2. **Death mid-action.** Even under model A, is running the death check per sub-turn worth
   it? It is a much smaller change than full interruption and removes the worst symptom.
   If yes, the "atomic and uninterruptible" framing above needs softening.
3. **What does the recording format become?** Rename `GoldenTurn` to `GoldenCommand`, or
   give it a `turns` array? The first is honest and cheap; the second is what per-turn
   channel assertions would need.
4. **Is N author-declared or computed?** `takes 3 turns` is static. *Digging takes a turn
   per foot of depth* wants an expression, which Chord deliberately does not have (no
   arithmetic). A static number may be the only thing Chord can ever express here.
5. **Does model B belong to Sharpee at all?** It may be a story-level concern built from
   existing pieces — an input mode plus a daemon — rather than an engine feature. Nobody
   has tried to build it that way, so the question is open rather than answered.
