# Undo ADR-123 Typed Daemon Hierarchy (Keep Serialization)

## Rationale

The class hierarchy (DaemonRunner, WatchdogDaemon, LocationDaemon, AmbienceDaemon, CountdownDaemon) is over-engineering. Each daemon is quirky enough that base classes provide minimal reuse. The factory functions were simpler and equally clear.

The serialization hooks on the `Daemon` interface ARE valuable and should be kept. Daemon state must survive save/restore.

## What to Keep

- `Daemon` interface additions: `getRunnerState?`, `restoreRunnerState?` (in `types.ts`)
- `DaemonState.runnerState?: Record<string, unknown>` (in `types.ts`)
- `SchedulerService.getState()` capturing runner state
- `SchedulerService.setState()` restoring runner state

## What to Delete

- `packages/plugin-scheduler/src/daemons/` (entire directory — all 5 base classes + barrel)
- Remove `export * from './daemons'` from `packages/plugin-scheduler/src/index.ts`

## What to Revert (restore original factory-function files)

All files below need to be restored from git history (commit `ae82c95` — last commit before ADR-123 work).

### 1. Restore `stories/dungeo/src/handlers/endgame-trigger-handler.ts`
- Delete `stories/dungeo/src/handlers/crypt-ritual-daemon.ts`

### 2. Restore `stories/dungeo/src/handlers/bat-handler.ts`
- Delete `stories/dungeo/src/handlers/bat-room-runner.ts`

### 3. Restore `stories/dungeo/src/handlers/exorcism-handler.ts`
- Delete `stories/dungeo/src/handlers/exorcism-runner.ts`

### 4. Restore `stories/dungeo/src/scheduler/troll-daemon.ts`
- Delete `stories/dungeo/src/scheduler/troll-recovery-runner.ts`

### 5. Restore `stories/dungeo/src/scheduler/forest-daemon.ts`
- Delete `stories/dungeo/src/scheduler/forest-ambience-runner.ts`

### 6. Restore `stories/dungeo/src/scheduler/sword-glow-daemon.ts`
- Delete `stories/dungeo/src/scheduler/sword-glow-runner.ts`

### 7. Restore barrel exports and registration wiring

Restore from `ae82c95`:
- `stories/dungeo/src/handlers/index.ts`
- `stories/dungeo/src/scheduler/index.ts`
- `stories/dungeo/src/orchestration/scheduler-setup.ts`
- `stories/dungeo/src/index.ts`

## After Revert: Add Serialization to Factory Daemons

Add `getRunnerState` / `restoreRunnerState` to factory daemons that have mutable state:

- **endgame-trigger-handler.ts**: Serialize `cryptWaitTurns` (currently uses world state — already survives save/restore, no change needed)
- **sword-glow-daemon.ts**: Serialize `currentGlowLevel` (module-level variable, needs hook)
- **bat-handler.ts**: State tracked via world state keys — already survives save/restore
- **troll-daemon.ts**: State on `CombatantTrait.recoveryTurns` — already survives save/restore
- **forest-daemon.ts**: No mutable state — probability-based, no hook needed

Only sword-glow-daemon.ts actually needs serialization hooks added.

## ADR-123 Status

Change from ACCEPTED back to PROPOSED. Update to note that the serialization infrastructure was adopted but the class hierarchy was rejected as over-engineering.

## Verification

- `./build.sh -s dungeo`
- `node dist/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`
- Expect 148/148 pass
