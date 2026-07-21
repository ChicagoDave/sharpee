# Proposal: RESTART on the Chord path (investigation + fix plan)

**Status**: PROPOSED — investigation complete, no implementation (David's ruling
2026-07-20, session 17e36e: "investigate + plan fix, bring proposal before
implementing"). Supersedes the paused Phase 6 verbs-entry fix, whose diagnosis
was overturned last session (restart parses fine).

## Reproduction

`stories/fernhill/fernhill.story`, play mode, `restart` → the player sees
"I don't understand that." Under the hood the engine's restart story-reload
throws `assignRoom: room 'r01' not found` (WorldModel.ts:1840).

## Root cause (two defects)

### 1. `ChordStory.initializeWorld` is not re-entrant (story-loader)

`GameEngine.restartGame()` does `world.clear()` → `setStory(this.story)` →
`createPlayer`/`initializeWorld` **on the same ChordStory instance**. But the
instance keeps per-build state from the first load:

- `worldIds` (IR id → world entity id, `loader.ts:179`) still maps every
  entity to its **first-build** world id.
- Pass 1 (`loader.ts:356`) skips any IR entity already in `worldIds` — after
  a first build, that is *all* of them — so **no rooms/things are recreated**
  in the cleared world.
- Pass 0 rebuilds regions unconditionally (fresh ids), then pass 2 wires
  members: `world.assignRoom(requireWorldId(member.id), region.id)`
  (`loader.ts:378`) resolves the member room to its **stale** first-build id,
  which no longer exists in the cleared world → the observed throw (and it
  correctly names a room id, e.g. `r01`).

The TS story path restarts fine because hand-written stories reassign their
per-world state inside `initializeWorld` each call (dungeo re-runs
`createXRegion(world)` and reassigns `this.*Ids`). ChordStory must honor the
same contract: *all per-world state is derived fresh per `initializeWorld`.*

(Adjacent, same disease class as the batch-runner fix landed this session:
TS-story module-level daemon `let`s also survive restart and only work
because `world.clear()` resets id counters so re-built ids coincide. Not part
of this fix; noted for completeness.)

### 2. The engine masks the failure as a parse error (engine)

Both `restartGame()` call sites (`game-engine.ts` ~1573/1580 in
`processMetaPlatformOperation`, ~2447 in `processPlatformOperations`) invoke
it without a try/catch. The LoadError propagates up the turn pipeline and
degrades into the generic "I don't understand that." fallback — a world-build
crash rendered as a parse failure, which is what sent the original triage
down the verbs-entry path.

## Proposed fix

**A. story-loader — make `initializeWorld` re-entrant.** At entry, drop stale
per-build state before building:

- Self-healing, order-agnostic filter: delete every `worldIds` entry whose
  world id no longer resolves in the target world
  (`world.getEntity(wid)` undefined). This preserves the player mapping that
  `createPlayer` already made in the new world (engine calls createPlayer
  FIRST) while flushing all first-build ids after a `world.clear()`.
- Reset the other per-build accumulators the same way (pending refs, built
  flags, any caches keyed to `this.world`) — audit the class fields once
  during implementation.

**B. engine — surface restart failures honestly.** Wrap both `restartGame()`
awaits; on throw, emit a real failure (`createRestartCompletedEvent(false)` +
a game.message with the load error text) instead of letting the exception
masquerade as a parse failure. Define the post-failure state explicitly (the
world is half-cleared at that point; at minimum the player must see the true
error).

## Test plan

- story-loader unit: build → `world.clear()` → `createPlayer` +
  `initializeWorld` again → rooms/regions/exits/player placement all present;
  cover both call orders (engine order and direct order).
- fernhill transcript: `restart` → confirm → opening text renders, `look`
  works.
- Regression: dungeo restart transcript (TS path) — note: a piped-REPL probe
  showed dungeo `restart` producing no visible output; verify whether that is
  a REPL/pipe artifact or a real TS-path issue while adding this test.

## Estimated scope

Story-loader ~40 lines + unit tests; engine ~20 lines + test. No grammar or
vocabulary changes (restart parses fine — verified last session).
