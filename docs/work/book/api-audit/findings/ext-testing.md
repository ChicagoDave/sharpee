# Findings — @sharpee/ext-testing

## Author-relevance
Author/playtester-facing extension (Part VIII): the in-game debug/test command layer (GDT-style codes, `$`-prefixed test commands, checkpoints, playtester annotations). The book would cite `TestingExtension` construction + config, the test/GDT command model (`DebugCommand`, `DebugContext`), and the checkpoint/annotation stores. Pairs with transcript-tester (which calls `executeTestCommand`).

## Naming
Mostly clean. Notable abbreviation against the no-abbreviation standard: **GDT** throughout (`executeGdtCommand`, `parseGdtInput`, `DebugContext`'s GDT-code concept) — an unexpanded acronym in the public API. `cmd*` private methods are internal (not surface). Factory functions are consistent (`createDebugContext`, `createCommandRegistry`, `createFileStore`/`createMemoryStore`/`createLocalStorageStore`, `createAnnotationStore`). Interfaces are plain nouns; only `ITestingExtension` uses the `I`-prefix (matches core/world-model convention but is the lone `I` here). `DebugCommand.code` (the GDT short code, e.g. "AH") is cryptically named — "code" alone is ambiguous.

## Should-be-internal
- `SerializedDaemon` / `SerializedFuse` — scheduler-state serialization detail of the checkpoint format; leak of plugin-scheduler internals into this surface.
- `captureContext` / `createEmptyContext` — annotation-context plumbing; likely internal to the annotation store.
- `parseGdtInput` / `parseTestInput` — input-string parsers; implementation detail behind `executeGdtCommand`/`executeTestCommand`.
- `deserializeCheckpoint` / `validateCheckpoint` — checkpoint internals (serialize is the only one an embedder needs, and even that is usually via the store).
- `formatEntity` / `formatLocationChain` — display helpers.

## API shape
Generally well-typed against `@sharpee/world-model` (`WorldModel`, `IFEntity`, `AuthorModel`). Loose spots:
- `CommandResult.data?: Record<string, unknown>` — opaque escape hatch (acceptable).
- `CheckpointData.version: '1.0.0'` — hardcoded literal; a single-value union means any future format bump is a breaking type change rather than a versioned reader (the project's stated preference is versioned readers).
- `DebugCommand` mixes two dispatch keys (`code` for GDT, `testSyntax` for `$`-commands) on one interface — two concepts in one type; a command may define either/both with no type-level guarantee one exists.
- Config uses nested optional sub-objects (`debugMode?`, `testMode?`, `checkpoints?`) — fine, but every field optional means no compile-time "you must enable something."
- `CommandResult` name collides conceptually with transcript-tester's `CommandResult` (different shape) — duplicate concept across the two test packages.

## Documentation (TSDoc)
Excellent — roughly 95% of exported symbols and nearly every interface field carry a doc comment. `index.d.ts` has a worked `@example`. `types.d.ts` is thoroughly annotated field-by-field. Best-documented of the four. Undocumented items are limited to a few re-export-only function names whose docs live on the source declaration.

## Book highlights
- `TestingExtension` + `TestingExtensionConfig` — construction and the three config blocks (debugMode/testMode/checkpoints); the `@example` in index.d.ts is book-ready.
- `DebugCommand` / `DebugContext` / `CommandRegistry` / `CommandCategory` — the model for authoring custom debug/test commands (state-inspection + mutation API: `teleportPlayer`, `moveObject`, `spawnObject`, `setFlag`).
- `executeGdtCommand` vs `executeTestCommand` — the two invocation modes (interactive GDT vs transcript `$`-commands).
- `CheckpointStore` + `createFileStore`/`createMemoryStore`/`createLocalStorageStore` + `CheckpointData` — save/restore for tests across environments.
- `AnnotationStore` / `Annotation` / `AnnotationType` — playtester feedback capture (exportMarkdown/exportJson).
