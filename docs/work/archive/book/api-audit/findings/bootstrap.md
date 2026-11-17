# Findings — @sharpee/bootstrap

## Author-relevance
Platform-internal (build/test devkit layer, ADR-180). The book would reference it only when explaining how the CLI / transcript-tester / devkit load and assemble a story; authors do not call `loadStory`/`assembleGame` directly when writing a game. Of interest at most to tool builders. `LoadedGame` is a useful conceptual anchor (engine + world + testingExtension + command execution) for an "anatomy of a running game" sidebar.

## Naming
Clean. `resolveStoryModulePath`, `loadStory`, `assembleGame`, `buildManifest`, `LoadedGame`, `CLI_CAPABILITIES` — all spelled out, consistent verb-phrase function names, no abbreviations, no `I`-prefix interfaces. `CLI` acronym in `CLI_CAPABILITIES` is a standard acronym and acceptable.

## Should-be-internal
- `buildManifest` (introspect.d.ts) — exists to feed the Sharpee IDE project tree (ADR-184), with a `generatedFrom: 'cli' | 'bridge'` discriminator that is pure tooling concern. Reasonable to keep out of the book's public-API narrative.
- `resolveStoryModulePath` — a path-resolution helper; public mostly so the CLI/devkit can share it. Not author-facing.

## API shape
- **`assembleGame(story: any)`** — the `story` parameter is typed `any`. This is the one loose signature; it should take a `Story`/`StoryConfig` type (available from `@sharpee/engine`). Cite: `assembleGame`.
- `LoadedGame.getPluginRegistry()` returns an inline structural type `{ getStates(): Record<string, unknown>; setStates(...): void }` rather than a named interface — minor, but `Record<string, unknown>` for plugin state is loose.
- `loadStory` return type and options (`{ entry?: string }`) are explicit and clean; `executeCommand(input): Promise<string>` is well-typed.
- Param ordering consistent (location-first).

## Documentation (TSDoc)
Excellent — effectively **100%**. The package header, `CLI_CAPABILITIES`, `LoadedGame` and every member, `loadStory`, `assembleGame`, `resolveStoryModulePath`, and `buildManifest` all carry doc comments with `@param`/`@throws`/`@see ADR` references. Among the best-documented packages in the audit.

## Book highlights
n/a — internal. At most, `LoadedGame` can illustrate the runtime composition (engine + world + parser + language + perception wired to the ADR-163 channel-packet output) in a "how a story runs" aside.
