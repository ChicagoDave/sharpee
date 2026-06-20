# Findings — @sharpee/engine

## Author-relevance
Author-facing AND extension-facing — this is the most book-relevant runtime package. Authors implement the `Story` interface (`config`, `initializeWorld`, `createPlayer`, optional `extendParser`/`extendLanguage`/`onEngineReady`/`registerChannels`) and the book's programmer layer drives `GameEngine` (`setStory`, `start`, `executeTurn`, save/restore, undo, `switchPlayer`, input modes). The remaining symbols (TurnEventProcessor, PlatformOperationHandler, VocabularyManager, SaveRestoreService, capability-dispatch helpers, sound dispatcher) are engine-internal plumbing extracted during refactors and exposed but not author-targeted.

## Naming
Mostly clean and spelled-out. Conventions are consistent: `I`-prefix reserved for cross-package contracts (`ISaveRestoreStateProvider`, `IEngineAwareParser`), plain names for engine-local types (`GameEngine`, `Story`, `StoryConfig`, `TurnResult`, `MetaCommandResult`). No abbreviations in identifiers. One mild casing wart: `CMGT`/`CmgtPacket` is an opaque acronym in the `GameEngineEvents['channel:manifest']` signature — author won't know what CMGT means without ADR-163. Event names use a `domain:phase` string convention (`turn:start`, `channel:packet`) which is consistent. Type aliases `Perspective`/`Tense` (narrative) collide by name with same-named aliases in `@sharpee/lang-en-us` — a duplicate-concept naming risk across packages.

## Should-be-internal
Several extracted-service symbols read as implementation detail rather than public API:
- `TurnEventProcessor` / `createTurnEventProcessor`, `PlatformOperationHandler` / `createPlatformOperationHandler`, `VocabularyManager` / `createVocabularyManager` — all doc-commented "Extracted from GameEngine as part of Phase 4 remediation." These are internal collaborators owned by GameEngine; an author never constructs them.
- `EngineCallbacks`, `PlatformOperationContext`, `EventProcessingContext`, `EnrichmentContext`, `ProcessedEventsResult`, `ISaveRestoreStateProvider` — internal wiring contracts between the extracted services.
- `checkCapabilityDispatch`, `checkCapabilityDispatchMulti`, `executeCapabilityValidate/Execute/Report/Blocked`, `CapabilityClaim`, `CapabilityDispatchCheck`, `CapabilityDispatchData` — capability-dispatch is invoked by stdlib actions, not story code; these belong to the action pipeline internals.
- `processEvent`, `propagate`, `clarityToTier`, `SoundDispatcher`, `AUDIBILITY_HEARD_EVENT_TYPE` — sound subsystem internals (doc explicitly says `clarityToTier` is "exposed for testability").
- `SharedDataKeys` / `EngineSharedData` / `SharedDataKeyType` — phase-to-phase plumbing for actions.

## API shape
- `Story.getCustomActions?(): any[]` — `any[]` return in the headline author interface; should be a typed action array.
- `StoryConfig.custom?: Record<string, any>` — `any` value type.
- `GameEngine.stop(reason?, details?: any)` and `StoryWithEvents` event plumbing leak `any`.
- `ISaveRestoreStateProvider.getParser(): unknown | undefined` — loose `unknown` where `IParser | undefined` is available elsewhere in the same package.
- `TurnResult.type?: 'turn'` is optional "for backward compatibility" while `MetaCommandResult.type: 'meta'` is required — the discriminated union `CommandResult` has an optional discriminant on one arm, which weakens narrowing.
- Naming/shape duplication: `EventProcessingContext` and `EnrichmentContext` are near-identical context types (one has all-optional fields, the other all-required) — duplicate concept.
- `EventEmitCallback` is declared in both turn-event-processor (`(event) => void`) and event-processor's effects (`(events[]) => void`) with the same name but different shapes — collision risk for anyone importing both.

## Documentation (TSDoc)
Strong — roughly 90%+ of public symbols carry doc comments, many citing the governing ADR (089, 090, 104, 132, 137, 148, 163, 172). `Story`, `StoryConfig`, `GameEngine` and its methods are thoroughly documented with `@example` blocks. Gaps: the introspection summary interfaces (`ActionSummary` etc.) are field-documented; `GameEngineEvents` members are documented for channel events but the basic ones (`turn:start`, `event`) are bare. Overall the best-documented package of the three.

## Book highlights
- `Story` interface and `StoryConfig` — the canonical author entry point (lifecycle hooks, narrative/implicit-action config).
- `StoryWithEvents` — base class for stories needing daemon/event handling (`on`/`off`/`emit`).
- `GameEngine` — the runtime: `setStory`, `start({capabilities})`, `executeTurn`, `save`/`restore`, `undo`/`canUndo`, `switchPlayer` (ADR-132 PC switching), `registerInputMode` (ADR-137), `getPluginRegistry`, `getEventProcessor`, `on/off` typed events.
- `TurnResult` / `MetaCommandResult` / `CommandResult` — the shape returned per turn.
- `NarrativeConfig` / `NarrativeSettings` / `Perspective` / `Tense` — perspective/tense control (ADR-089).
- `validateStoryConfig`, `CustomVocabulary` — story setup helpers.
