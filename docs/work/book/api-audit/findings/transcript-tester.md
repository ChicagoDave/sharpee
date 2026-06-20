# Findings — @sharpee/transcript-tester

## Author-relevance
Author-facing testing (Part VIII): the `.transcript` test-file engine. The book's testing chapter would cite the transcript file format (directives, assertions, goals) and the programmatic runner (`parseTranscriptFile` → `runTranscript` → `reportTranscript`). Most authors invoke it via `node dist/cli/sharpee.js --test`, so the data types (`Transcript`, `Assertion`, `Directive`, `TranscriptResult`) matter more than the functions.

## Naming
Clean, verb-first functions (`parseTranscript`, `runTranscript`, `reportTranscript`, `validateTranscript`, `findTranscripts`). Types are noun-clear (`Transcript`, `Directive`, `GoalDefinition`, `AssertionResult`). No `I`-prefix convention (diverges from core but internally consistent). One naming nit: `WorldModelLike` and `TestableGame` use `-Like`/`Testable-` adjectival suffixes where the rest of the surface is plain nouns. No abbreviations of note.

## Should-be-internal
- `WorldModelLike` (runner.d.ts) — a structural subset of WorldModel used internally by the condition evaluator/navigator; exported but author-irrelevant.
- `TestingExtensionInterface` — a hand-rolled duck-typed mirror of `@sharpee/ext-testing`'s `ITestingExtension` to avoid a hard dependency; this is a wire-type duplication smell (two definitions of the same contract in co-located packages) and looks internal.
- `formatEntityTraitLines` / `formatTraitProse` / `generateTimestamp` / `writeResultsToJson` / `writeReportToFile` — CLI-display/output plumbing, not test-authoring API.
- `getExitCode` — CLI process-exit helper.

## API shape
The pervasive `any` is the headline issue:
- `Assertion.eventData: Record<string, any>`, `TestEventInfo.data: Record<string, any>`, `EntityTraitSnapshot.traits: Record<string, Record<string, any>>`.
- `StoryLoader = (storyPath) => Promise<{ engine: any; story: any }>` — both fields `any`.
- `TestingExtensionInterface.executeTestCommand(input, world: any)` and `addAnnotation(..., world: any): any`.
- `createTestableGame(story: any)` takes `any`.
- The internal `GameEngine`/`WorldModel` interfaces in runner.d.ts are almost entirely optional methods returning `any` (`getEntity?(id): any`), so the runner's contract with the engine is effectively untyped.
This is acceptable for a test harness that must accept heterogeneous story shapes, but it means the public types provide little compile-time guidance. Param ordering is consistent (`(transcript, engine, options?)`, `(result, options?)`).

## Documentation (TSDoc)
Good coverage — roughly 80% of exported symbols have a doc comment; nearly every interface and field in `types.d.ts` is documented inline. Module headers present on index, parser, runner, reporter, story-loader. `RunnerOptions` is undocumented at the symbol level (its fields are self-describing). The `entry:` header field and `--emit-traits` interplay are well-annotated.

## Book highlights
- `Transcript` / `TranscriptCommand` / `Assertion` (the `type` union: `ok`, `ok-contains`, `ok-matches`, `fail`, `event-assert`, `state-assert`, etc.) — the canonical reference for the assertion vocabulary a transcript author writes.
- `Directive` / `DirectiveType` — control-flow vocabulary (`goal`/`requires`/`ensures`/`if`/`while`/`navigate`/`save`/`restore`); the book should document each.
- `parseTranscriptFile` → `runTranscript` → `reportTranscript` / `getExitCode` — the programmatic pipeline for embedding the tester.
- `loadStory(storyPath, entry?)` / `createTestableGame` / `TestableGame` — loading a story for testing (now a facade over `@sharpee/bootstrap`).
- `TranscriptResult` / `TestRunResult` — the result shape (passed/failed/expectedFailures/skipped) for CI-style reporting.
