# Findings — @sharpee/event-processor

## Author-relevance
Mostly extension-facing, lightly author-facing. The book's relevant surface is the ADR-075 effects pattern: a `StoryEventHandler` receives a read-only `WorldQuery` and returns `Effect[]`. Authors writing story-level event handlers care about `Effect` (the union), `WorldQuery`, and `IGameEvent`. The `EventProcessor` class itself is reached via `engine.getEventProcessor()` to call `registerHandler`. `EffectProcessor`, `registerStandardHandlers`, and `createWorldQuery` are platform-internal.

## Naming
Clean and consistent. The `Effect` union members are all spelled-out, suffixed `…Effect` (`ScoreEffect`, `MoveEntityEffect`, `UpdateExitsEffect`) — uniform convention. Discriminant strings are snake_case (`'move_entity'`, `'set_state'`, `'update_exits'`) while the TS type names are PascalCase — a minor inconsistency, but the wire-level discriminants being snake_case is at least internally uniform. `I`-prefix used only for the cross-package contract `IGameEvent`. No abbreviations.

## Should-be-internal
- `EffectProcessor` — its own doc says "This is the ONLY place effects become mutations"; it is constructed and owned by `EventProcessor`. Authors never instantiate it. Exposing it invites misuse.
- `registerStandardHandlers` — platform bootstrap (engine/host calls it once), not story API.
- `EventEmitCallback` (the effects variant, `(events: ISemanticEvent[]) => void`) — internal wiring between EventProcessor and EffectProcessor. Also note it shares its name with a *different-shaped* `EventEmitCallback` in `@sharpee/engine`.

## API shape
- `IGameEvent.data: Record<string, any>` — `any` in the handler's input type; every story handler reads untyped `data`. This is the one notable loose type and it sits on the hot path authors touch.
- Re-export duplication / leak: `index.d.ts` re-exports `WorldModel` and `WorldChange` from `@sharpee/world-model` and `ISemanticEvent` from `@sharpee/core` (cross-package surface leak, flagged in inventory). Separately, `types.d.ts` re-exports `WorldChange` *again* from if-domain plus `EventHandler` from world-model — `WorldChange` is therefore exported by two paths, and `EventHandler` is surfaced here despite ISSUE-068 removing entity `on` handlers, making it a likely stale export.
- `EffectResult.emittedEvents?` is optional while `errors`/`applied` are required — fine, but the optionality is undocumented as to when it's populated.
- Otherwise return types are explicit and effects are well-shaped (intents, not mutations).

## Documentation (TSDoc)
Good — roughly 80%. Module headers all cite ADR-075. Every `Effect` member, every `WorldQuery` method, and the `EventProcessor`/`EffectProcessor` public methods have doc comments. Gaps: `EffectError`, `EffectResult` fields are lightly documented; `StoryEventHandler` is documented; the re-export lines in `types.d.ts` carry no rationale.

## Book highlights
- `StoryEventHandler` type, `WorldQuery` interface, `Effect` union (+ members) — the ADR-075 story-handler programming model. This is the chapter on reacting to events.
- `IGameEvent` — the event shape handlers receive.
- `EventProcessor.registerHandler` / `unregisterHandler` — accessed via `engine.getEventProcessor()`.
- `createWorldQuery` — relevant only if the book shows handler unit-testing.
- `EffectProcessor`, `registerStandardHandlers` — n/a, platform-internal.
