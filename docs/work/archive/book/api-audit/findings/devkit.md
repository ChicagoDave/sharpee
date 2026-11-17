# Findings — @sharpee/devkit

## Author-relevance
Author-facing tooling (Part I/VIII): the build/test/verify orchestrator behind the `./sharpee` CLI. The book would cite the `runBuild`/`BuildOptions` programmatic surface, the story registry (`registerStory`/`listStories`/`lookupStory`), and `runTestNpm` (npm-consumer smoke test). Most authors use the CLI, not these functions — book relevance is "how the build works," not day-to-day API.

## Naming
Mostly clean and verb-first (`runBuild`, `buildPlatform`, `stampVersions`, `resolveStory`). Some abbreviations against the no-abbreviation standard: `tsfBin` (`bin`), `genai`/`generateGenaiApi` and `BUNDLE_DTS` (`dts`), `pkg` in `ResolvedStory.pkg`. The `run*` vs bare-verb split is a real inconsistency: `runBuild`/`runBundle`/`runClean`/`runVerify`/`runRegister`/`runList`/`runTestNpm` are CLI-handler wrappers, while `buildPlatform`/`buildStory`/`stampVersions`/`generateConsumer` are the library primitives — both are public with no naming signal distinguishing them. No `I`-prefix interfaces here (diverges from core/world-model convention, but internally consistent).

## Should-be-internal
Several look like build.sh-port internals unlikely to be a stable author API:
- `BUNDLE_DTS`, `BUNDLE_ALIASES`, `PLATFORM_PACKAGES`, `DEFAULT_STAGING` — hardcoded build constants ("verbatim from build.sh"); fragile to expose.
- `scanStaging`, `computeClosure`, `stagingDepsOf`, `readSharpeeSeed`, `generateConsumer` — the npm-consumer-generation plumbing; pure helpers but implementation detail of `runTestNpm`.
- `runRegister`/`runList`/`runBuild` etc. — argv-parsing CLI handlers (`runRegister(args: string[])`); these are entry points, not a programmatic API, and leak `string[]` argv into the public surface.
- `storyVersionFile`, `readVersion`, `tsfBin`, `registryPath` — low-level path/exec helpers.

## API shape
Generally well-typed; option bags are explicit interfaces (`BuildOptions`, `TestNpmOptions`, `GenerateConsumerOptions`). Notes:
- `runRegister(args: string[])` takes raw argv — loose for a library function.
- `StagingMap = Record<string, string>` is an unlabeled string→string map; opaque without docs.
- `computeClosure(seed, depsOf)` takes a `depsOf` callback — clean FP design but unusual in this surface.
- Most `run*` functions return `void` (side-effecting build steps); `runTestNpm`/`generateConsumer` return result objects — inconsistent return discipline across siblings.
- `detectMode`/`findMonorepoRoot` return string-literal unions / nullable — good.

## Documentation (TSDoc)
Strong — roughly 85-90% of exported symbols carry a doc comment, many with rationale (e.g. `findMonorepoRoot`, `generateConsumer`, `resolveStory` cite ADR-180 decisions and behavior notes). `index.d.ts` has a module header. Undocumented: `runBuild` (`/** Run the full build pipeline. */` is terse), `readVersion`, and the `Registry`/`RegistryEntry` field-level docs are partial. Best-documented of the four packages.

## Book highlights
- `runBuild(opts?: BuildOptions)` + `BuildOptions` — the programmatic build entry; book's build chapter should reference its flags (story, skipTo, browser, zifmia, noVersion).
- `buildPlatform` / `buildStory` / `stampVersions` / `generateGenaiApi` — the named pipeline stages, useful to explain what `./sharpee build` does.
- Registry API: `registerStory` / `listStories` / `lookupStory` / `registryPath` — standalone-author story registry (`~/.sharpee/devkit`).
- `runTestNpm` + `TestNpmOptions`/`TestNpmResult` — npm-consumer verification (local vs registry mode); relevant to a "publishing your story" chapter.
- `detectMode` (`'monorepo' | 'standalone'`) — explains the location-aware CLI split.
