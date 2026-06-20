# Findings — @sharpee/interpreter

## Author-relevance
Internal/legacy — confirmed. The package is internally named `@sharpee/zifmia` ("Zifmia - Sharpee story runner") and is a React + Tauri runner UI: exported symbols are React components (`GameShell`, `Transcript`, `CommandInput`, `StatusLine`, `ZifmiaRunner`, `ChatOverlay`), React hooks (`useGameContext`, `useGameState`, `useGameDispatch`, `useTranscript`, `useCommandHistory`, `usePreferences`, …), a React context provider (`GameProvider`, `PreferencesProvider`), a reducer (`gameReducer`/`initialGameState`/`GameAction`), bundle loading (`loadBundle`/`releaseBundle`/`LoadedBundle`), and storage providers (`BrowserStorageProvider`, `TauriStorageProvider`). Per CLAUDE.md the legacy Tauri `--runner` is no longer built (ADR-180); source remains "for reference only." The book should not document this package as author API. The framework-free `@sharpee/platform-browser` is the current client surface.

## Naming
Clean within React conventions. Components are PascalCase, hooks are `use`-prefixed camelCase, the reducer/action follow Redux idiom (`gameReducer`, `GameAction`, `ENGINE_READY`/`TURN_COMPLETED` SCREAMING_CASE action types). Storage providers are suffixed `…StorageProvider`. No abbreviations. One cross-package name collision: `StoryMetadata`, `GameState`, `CommandResult`, `AnnotationType`, `CurrentRoom` duplicate names that also exist in core/engine/world-model — here they are deliberately re-declared local "generic" shapes (the game-state header notes types are re-declared "to avoid bundling issues with esbuild" rather than importing `@sharpee/engine`), which violates the co-located wire-type sharing principle but is consistent with the package's standalone-bundle intent.

## Should-be-internal
The whole package reads as an application, not a library — but if it were kept, these are clearly internal: `gameReducer`, `initialGameState`, `GameAction` (Redux internals), `GameContext`/`useGameDispatch` (provider plumbing), `RestoreDialog`/`SaveDialog`/`StoryLibrary` runner sub-components (not in the public index but present in dist). `isTauri`, `useAssetMap`, `FONT_FAMILIES`/`FONT_SIZES`/`ILLUSTRATION_SIZES` constants are UI-detail.

## API shape
- `GameState.engine: unknown | null` and `GameAction` variants `{ type: 'ENGINE_READY'; engine: unknown }` / `{ type:'ROOM_CHANGED'; … }` — `engine` is deliberately `unknown` (the comment: engine passed in at runtime to dodge esbuild bundling). This severs all type safety with `@sharpee/engine` — the runner has no compile-time knowledge of the engine it drives.
- `GameEvent.data?: unknown` — loose, by design ("matches ISemanticEvent shape" but re-declared rather than imported).
- `StorageProvider.save(storyId, slotName, data: unknown)` / `restore(): Promise<unknown | null>` — opaque blob storage; `unknown` is defensible here since storage is format-agnostic.
- Public signatures return `import("react/jsx-runtime").JSX.Element` (e.g. `ZifmiaRunner`) — leaks a React runtime type into the public surface, reinforcing that this is a UI app, not a portable library.
- Re-declared wire types (`GameEvent`, `StoryMetadata`, `GameState`) duplicate concepts owned by core/engine — drift risk.

## Documentation (TSDoc)
Moderate — roughly 50-60%. File/module headers are present and explanatory (game-state, storage-provider, bundle-loader, ZifmiaRunner each have a header explaining purpose). Interface fields are partially documented (`TranscriptEntry`, `RoomExit`, `CurrentRoom` have per-field comments citing ADRs 109/113/124/133). Hooks and most components have little or no TSDoc on the exported function itself.

## Book highlights
n/a — internal/legacy. The book should reference `@sharpee/platform-browser` for the web client instead. Mention this package, if at all, only as historical context (the former Tauri/Zifmia runner, dropped from the build in ADR-180).
