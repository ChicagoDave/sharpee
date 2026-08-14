# ADR-315: When a Command Costs Time — Deciding After the Action, Not Before the Parse

**Umbrella**: Sharpee and Chord Temporal Controls — `docs/work/temporal-controls/README.md`

**Status**: DRAFT — **Decision section SUPERSEDED by ADR-317** (2026-08-14, same session);
Context retained as ADR-317's motivation. Nothing here is authorized for implementation.
Open questions below are unresolved and this ADR must not be flipped to ACCEPTED while
they remain.
**Date**: 2026-08-14 (session 3da25e)
**Related**: issue #263 (the `takes no time` Chord surface — ships independently of this ADR)
**Consumed by**: ADR-316 (multi-turn actions — what the N > 1 half of this decision means)
**Touches**: ADR-051 (four-phase actions), ADR-070 (NPC phase), ADR-071 (scheduler),
ADR-120 (turn plugin loop), ADR-172 (per-turn sound buffer), ADR-296 D1 (per-turn
transaction stamping)

---

## Context

Every parser IF system needs an answer to "does this command advance the clock?" Sharpee
and Inform answer it at opposite ends of the turn.

**Sharpee decides from the action id, before the command is validated.**
`game-engine.ts:1070` tests `MetaCommandRegistry.isMeta(actionId)` against the parse
result and routes matches to `executeMetaCommand` (`game-engine.ts:1354`), a second,
thinner turn implementation. It builds its own `ActionContext`, runs the action's
validate/execute/report, and renders through `processMetaEvents`. The regular path
(`game-engine.ts:1097`) goes through `commandExecutor.execute` instead, and then does
four things the meta path does not:

| Step | Site |
|---|---|
| Turn increment | `updateContext`, `game-engine.ts:2324` |
| Plugin tick loop (NPC, state machines, scheduler) | `game-engine.ts:1184` |
| Undo snapshot | `game-engine.ts:2122` |
| Command history | `updateCommandHistory`, `game-engine.ts:1147` |

**Inform decides inside the turn sequence, after the action ran.** *Writing with Inform*
Example 408 ("Timeless") inserts a rule before the every-turn stage rule and has it
succeed, terminating the sequence early. Because the decision happens mid-sequence, the
condition can name the specific noun that was acted on.

That ordering difference is most of the ADR. Three consequences follow from it.

**1. In Sharpee, "costs time" is a property of the verb and can never be a property of
the situation.** An author can say *examining is free*. They cannot say *examining
something you are already holding is free, but examining something across the room costs
a turn* — the phrasing from the 2026-08-14 "time trap" post that prompted this. By the
time the resolved noun exists, the routing decision was already made. There is no hook
at any layer, TypeScript included.

**2. The meta path is a duplicate turn cycle that drifts.** Every feature added to the
main path has to be remembered a second time or it silently does not apply to meta
commands: perception filtering, `transactionId` stamping (ADR-296 D1), the per-turn sound
buffer (ADR-172), `turnEvents` storage. One drift symptom is already recorded — a
zero-block meta command never fires `text:output`, because `processMetaEvents` only emits
when `blocks.length > 0`, so cleanup hung off that emission never runs for restart.

**3. Time cannot be spent, only skipped.** The counter is incremented by exactly one,
unconditionally (`game-engine.ts:2324`). No action can cost more than a turn, so *digging
out the pit takes three turns* or *the long climb costs five* is not expressible at any
layer. The only `advancesTurn` in the codebase is a boolean on `InputModeHandler`
(`engine/src/types.ts:169`, ADR-137 alternate input modes) — actions have no equivalent.
This is a separate gap from the first two, but it lands on the same decision point, which
is why it belongs here: an engine that asks "did this cost time?" after report is one
question away from asking "how much?"

Taken together: a Chord author has rich control over **what happens as time passes** —
`on every turn` on entities and region blocks, `define sequence` with `at turn N` /
`N turns later` anchors, scheduler daemons, counters, hunger's `grows N each turn` — and
no control at all over **the clock itself**.

Issue #263 gives Chord a `takes no time` line reaching the existing mechanism. It is
worth shipping on its own and does not depend on this ADR. It also does not fix either
consequence above.

## Decision (proposed — not adopted)

> **SUPERSEDED by ADR-317** (2026-08-14, same session). The decision below is a point fix
> to a general condition: the turn has no stages at all, only a fixed statement sequence
> with one extension point. ADR-317 makes the sequence a declared list of named stages with
> per-stage ordering constraints, and this decision falls out of it — *timeless* becomes
> "the sequence ends before `advance`", conditional for free because termination happens
> inside the turn with the resolved noun in hand. The **Context** section above stands and
> is ADR-317's motivation. Read this section as the narrower alternative that was
> considered first.

**Collapse to one turn path, and move the time decision to after `report`.**

1. Every accepted command runs `commandExecutor.execute`. `executeMetaCommand` is deleted.
2. After report, the engine reads a per-turn **cost decision** — a *number of turns*, not
   a free/not-free flag. Default 1. Zero skips the same four steps `executeMetaCommand`
   skips today; N > 1 advances the counter N times and ticks the plugin loop N times, so
   daemons and NPCs get the turns they are owed.
3. The cost decision has ordered sources, first match winning:
   - a condition declared on the action, evaluated with the resolved command in hand —
     this is the capability that does not exist today;
   - an unconditional declaration on the action (`takes no time`, issue #263);
   - `MetaCommandRegistry`, which stops being a routing switch and becomes the default
     source of the flag for `save`/`restore`/`quit`/`undo` and friends.

The Chord surface this unlocks, extending issue #263's line with a `when` clause:

```chord
extend action examining
  takes no time when the target is carried
```

and the cost side of the same dial, which issue #263's surface does not reach at all —
**wording illustrative only**, see ADR-316 for why `takes 3 turns` may be the wrong phrase:

```chord
define action digging
  grammar
    dig :target with :instrument
  takes 3 turns
```

## Consequences

**Gained.** Conditional time cost becomes expressible for the first time, at the language
level rather than only in TypeScript, and multi-turn actions become expressible at all.
The turn cycle has one implementation, so every future turn-cycle feature applies
uniformly without a second site to remember.

**Constrained going forward.** "Free" stops being one boolean. The four suppressions are
not always wanted together: `undo` must not take an undo snapshot, `save` must not stamp a
transaction, but a free `examine` probably *should* appear in command history for `AGAIN`
to work sensibly. Whatever this ADR becomes has to carry per-suppression granularity, and
that granularity then constrains the Chord surface — `takes no time` cannot stay a bare
flag if the engine underneath it has four dials.

**Risk.** Seventeen default meta commands plus Dungeo's six registrations
(`stories/dungeo/src/index.ts:225-231`) change execution path. Each needs auditing for
behavior it currently gets by *not* being on the main path — events landing in
`turnEvents`, perception filtering applied to `VERSION` output, sound-buffer interaction.
This is the reason the ADR is deferred rather than planned: the migration is wider than
the feature.

**Not blocking.** Issue #263 ships without any of this. Nothing else is waiting on it.

## Session

Session 3da25e, 2026-08-14 (branch `main`). Prompted by the "time trap" post on
topexpert.blog (2026-08-14, surfaced via planet-if.com), which asked how to keep the clock
from advancing on selected actions in Inform 7. Investigating the Sharpee equivalent
surfaced the Chord gap (issue #263) and, underneath it, this ordering question.

## Open Questions

1. **Per-suppression granularity** — do turn increment, plugin ticks, undo snapshot, and
   command history become four independently controllable dials, or two groupings ("costs
   no time" vs. "is not part of the story")? The second is simpler and may cover every
   real case; nobody has enumerated the real cases.
2. **What can a cost condition see?** The resolved command and world state, presumably.
   Can it see events the action just emitted — i.e. is it evaluated after `report`
   returns, or after `execute`? Post-report is more expressive and harder to reason about.
3. **Refused actions.** A blocked command currently still costs a turn on the main path.
   Should a refusal be free by default? Inform's answer is no; several modern games say
   yes. This ADR does not need to settle it, but the single-path change makes it cheap to
   change and therefore tempting.
4. **Does `MetaCommandRegistry` survive?** As a default source of the flag it is a Set
   doing a job a per-action declaration could do. Keeping it is the smaller change;
   folding it into action metadata is the cleaner end state.
5. **`AGAIN` and free commands.** If a free `examine` is excluded from command history,
   `AGAIN` after it repeats the wrong thing. This is already true today for meta commands
   and nobody has complained, which may mean it is fine or may mean nobody tried.
6. **What does a multi-turn action look like from inside?** ~~Open~~ — **split out to
   ADR-316** (same session), which traces the four things N > 1 collides with and
   proposes elapsed-time semantics over an activity model. One finding folds back here:
   ADR-316 argues the phrasing `takes 3 turns` promises interruptibility that elapsed-time
   semantics do not deliver, so **the Chord surface wording for turn cost is not settled by
   this ADR and must not be fixed ahead of ADR-316.**
