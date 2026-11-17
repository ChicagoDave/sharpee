# Findings — @sharpee/core

## Author-relevance
Platform-internal foundation: `@sharpee/core` is the base layer of generic types (entities, events, results, save data, queries, RNG) consumed by engine/world-model/stdlib — story authors almost never import it directly. The few things the book's programmer layer might surface are `ISemanticEvent`/`createEvent` (the event shape underlying all handlers), `Result`/`Result.ok`/`fail`, and `createSeededRandom` for deterministic randomness; everything else is infrastructure.

## Naming
Mostly clean and disciplined, with a deliberate `I`-prefix convention for interfaces (`IEntity`, `ISemanticEvent`, `ISaveData`, `ICommandHandler`). The convention is applied consistently to interfaces but **types/aliases correctly omit it** (`EntityId`, `AttributeValue`, `Result`, `MessageVariant`) — that split is intentional, not inconsistency. No real abbreviations: `IfId` is spelled in identifiers as `Ifid`/`generateIfid`/`validateIfid` (IFID is a domain acronym, acceptable). Const/factory naming is consistent (`createEvent`, `createEventSource`, `createSeededRandom`, `createQueryManager`). One minor casing wrinkle: the `Result` symbol is both a type AND a const value (namespace-style helper object) — intentional but can confuse readers. `EventSource` is exported as a type alias for `ISemanticEventSource` (events/types.d.ts) AND `createGenericEventSource` aliases `createEventSource` — two overlapping "event source" naming lineages (see API shape).

## Should-be-internal
Heavy. The 204 count is dominated by per-event data interfaces and the lifecycle event zoo that only the engine produces/consumes:
- The ~40 `Game*Data` / `GameLifecycle*Data` interfaces (`GameLifecyclePcSwitchedData`, `GameLifecycleSessionRestoringData`, `GameLifecycleStoryLoadFailedData`, etc.) plus their ~30 `createGame*Event` factories and `isGame*Event` guards — engine lifecycle plumbing, no author touches these.
- Serialization interfaces: `ISerializedEvent`, `ISerializedTurn`, `ISerializedParserState`, `ISerializedSchedulerState`, `ISerializedDaemonState`, `ISerializedFuseState`, `IEngineState` — save-format internals (the save schema is owned by engine, never hand-authored).
- `IDebugEvent`, `IDebugContext`, `DebugEventTypes`, `DebugEventCallback` — diagnostic-only, explicitly "NOT part of the game's semantic event system."
- The generic execution interfaces `IAction`, `ICommandHandler`, `ICommandRouter`, `ICommandHandlerFactory`, `ICommandExecutionOptions`, `IExecutionContext` — these are abstract generics; stdlib defines the real IF `Action`/`ActionContext` authors use. The .d.ts comments even say "The IF-specific version ... is in stdlib." Same for the extension interfaces (`ICommandExtension`, `IAbilityExtension`, `IEventExtension`, `IParserExtension`, `ExtensionType`, `AnyExtension`).
- `SemanticEventSourceImpl`, `SimpleEventSource`, `EventSourceImpl` (impl classes), `resetEventCounter` (test helper) — implementation/test surface.

None of these are *wrong* to export (engine/stdlib need them across the package boundary), but for a book audit they are platform-internal, not author API.

## API shape
- `any` leaks in core public signatures: `IExecutionContext` is `[key: string]: any` (index signature, fully untyped); `IAction`/`ICommandHandler` default both generics to `any` (`<TCommand = any, TResult = any>`); `IAction.metadata?: any`; `ICommandResult<TEvent = any>`; `IQueryContext` is `[key: string]: any` plus typed fields; `IValidationResult.normalized?: any`; `IDebugEvent.data: any`; `IQueryResponse.response` is `string | number | boolean`. `Result.ok`/`fail` return `Result<T, any>` / `Result<any, E>`.
- `unknown` (the better choice, used well): `IEntity.attributes: Record<string, unknown>`, `ISemanticEvent.data?: unknown`, `getUntypedEventData` → `Record<string, unknown>`.
- Overlapping concepts: **two event-source lineages** — `ISemanticEventSource`/`SemanticEventSourceImpl`/`createSemanticEventSource` vs `IGenericEventSource`/`SimpleEventSource`/`createEventSource` (re-exported again as `createGenericEventSource`), plus `EventSource` aliased to `ISemanticEventSource`. Three create-functions and a type alias for "an event source" is confusing surface. Also `Event` is a back-compat alias for `ISemanticEvent` (comment says so) — dead-weight alias.
- Save/restore result types `ISaveResult`/`IRestoreResult` are near-duplicates (both `{success; error?}`, restore adds `refreshUI?`) — fine, just noting overlap.
- Return types are explicit throughout (good — these are .d.ts). No missing return types.

## Documentation (TSDoc)
Strong coverage on the hand-written core modules (~80–90%): `types/*`, `events/types`, `event-helpers` (every helper has an `@example`), `event-factory`, `query/types`, `debug`, `save-data` (per-field doc comments), `seeded-random`, `extensions/types`, `execution/types` all carry doc comments on interfaces and members. The weak spots are the bulk-generated lifecycle layer: the ~40 `Game*Data` interfaces and ~30 `createGame*Event`/`isGame*Event` functions are largely terse or undocumented, and `standard-events.d.ts` carries a `TODO: Move to proper location` on `StandardEventTypes`. Overall rough coverage ~70% by symbol count (high on author-relevant types, low on the internal event zoo).

## Book highlights
- `ISemanticEvent` + `createEvent` / `createTypedEvent` — the event shape every handler reads; worth one reference section.
- `isEventType` / `getEventData` (event-helpers) — the sanctioned typed way to read `event.data` without `as any` (ADR-082); good "do this not that" material.
- `Result` / `Result.ok` / `Result.fail` — the success/failure idiom that appears across the platform.
- `createSeededRandom` (`SeededRandom`) — deterministic RNG for testable randomness.
- Otherwise: n/a — internal foundation (entities, save data, queries, lifecycle events are reached through engine/world-model/stdlib, not core directly).
