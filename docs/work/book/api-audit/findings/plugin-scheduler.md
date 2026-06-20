# Findings — @sharpee/plugin-scheduler

## Author-relevance
Author-facing. This is the timed-events API: authors register **daemons** (run every turn) and **fuses** (countdown timers) to drive background/temporal events. The book's programmer layer should teach `Daemon`/`Fuse` definitions and `SchedulerPlugin.getScheduler()` → `ISchedulerService`. Clean, focused, 14 symbols.

## Naming
Clean. `Daemon`/`Fuse` are the established IF terms (ADR-071) and used consistently. `SchedulerService`/`ISchedulerService`, `SchedulerPlugin`, `SchedulerContext`, `SchedulerResult`, `SchedulerState`, `DaemonState`/`FuseState`, `DaemonInfo`/`FuseInfo`, `SchedulerEventType` — consistent `Scheduler*`/`Daemon*`/`Fuse*` prefixes. The `I`-prefix appears on `ISchedulerService` (service contract) but NOT on the data interfaces (`Daemon`, `Fuse`, `SchedulerContext`) — this matches the project's convention (I = behavioral contract) and is internally consistent. No abbreviations.

## Should-be-internal
- `DaemonState` / `FuseState` (runtime mutable state with `runnerState`, `skipNextTick`, `turnsRemaining`) are serialization internals; authors read `DaemonInfo`/`FuseInfo` for introspection instead. Borderline — `SchedulerState` (which contains them) is legitimately public for save/restore.
- `SeededRandom` is re-exported from `@sharpee/core` here (and again via `seeded-random.d.ts`) — a cross-package re-export the inventory already flags. Surfacing core's type from a plugin package is a minor leak; the book should cite it from core.
Otherwise none obvious.

## API shape
- Strong shape overall. `ISchedulerService` is a clean, fully-typed contract; `SchedulerService implements ISchedulerService` mirrors it exactly (good).
- `Daemon`/`Fuse` callbacks are well-typed (`(context: SchedulerContext) => ISemanticEvent[]`). The optional `getRunnerState?: () => Record<string, unknown>` / `restoreRunnerState?` use `Record<string, unknown>` — intentional opaque per-runner state, the only loose typing.
- `SchedulerPlugin.getState(): unknown` / `setState(state: unknown)` are the inherited `TurnPlugin` opaque-state contract (vs the precisely-typed `SchedulerService.getState(): SchedulerState`) — a deliberate erasure at the plugin boundary, but the same concept is typed two ways. Worth a one-line book note.
- Param ordering consistent (`tick(world, turn, playerId)`); return types present everywhere.
- Duplicate concept: `Daemon`/`Fuse` (definitions) vs `DaemonState`/`FuseState` (runtime) vs `DaemonInfo`/`FuseInfo` (introspection) — three views of the same entity. Reasonable separation but the book should clarify which is which.

## Documentation (TSDoc)
Good for the types, thin for the service. `types.d.ts` is ~100% documented (module header + per-field doc comments on every interface, including the turn-cycle ordering note). `SchedulerService`/`ISchedulerService` have file/interface headers but the individual methods (`registerDaemon`, `setFuse`, `adjustFuse`, `tick`, etc.) are undocumented — they're name-clear, but a reference book would want one line each. `SchedulerPlugin` has a header explaining priority 50. Overall ~70%.

## Book highlights
- `Daemon` — per-turn background process: `id`, `name`, optional `condition`, `run(ctx) => events`, `priority`, `runOnce`, typed-runner save hooks.
- `Fuse` — countdown timer: `turns`, `trigger(ctx) => events`, optional `tickCondition`, `onCancel`, `repeat`/`originalTurns`, `entityId` for auto-cleanup.
- `SchedulerContext` — what handlers receive: `world`, `turn`, `random` (`SeededRandom`), `playerLocation`, `playerId`.
- `ISchedulerService` — the runtime API: `registerDaemon`/`removeDaemon`/`pause`/`resume`, `setFuse`/`cancelFuse`/`adjustFuse`/`getFuseRemaining`, `tick`, `getActiveDaemons`/`getActiveFuses` (→ `DaemonInfo`/`FuseInfo`), `cleanupEntity`, `getRandom`, `getState`/`setState`.
- `SchedulerPlugin` + `getScheduler()` — how the scheduler is installed (priority 50) and how authors reach the service to register daemons/fuses.
- `createSchedulerService(seed?)` — standalone construction (useful for tests/examples).
