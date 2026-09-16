# Phase 2a — ADR-341 D5's protocol-type generator

**Session**: 33ba00 · **Date**: 2026-09-16 · **Plan**: `docs/work/chord-writer-avalonia-production/plan.md`

David's sign-off to start was given this session; it is the platform-change discussion
CLAUDE.md requires, and the phase used it to touch `tools/`, never `packages/` source.

## What was built

`repokit protocol` reads the protocol's TypeScript **source** — not a built `.d.ts`, so a
stale `dist/` cannot make the gate report freshness against yesterday's contract — and emits
both native shells' types from one model.

| File | Role |
| --- | --- |
| `tools/repokit/src/commands/protocol-projection.ts` | The IDE's declared narrowing of `StoryIR`, with a compile-time assertion that the real `StoryIR` satisfies it |
| `tools/repokit/src/commands/protocol-spec.ts` | The emission list: sources, roots, native names, nesting, and the two narrow escape hatches |
| `tools/repokit/src/commands/protocol-model.ts` | TypeScript declarations → a language-neutral model, via the compiler API |
| `tools/repokit/src/commands/protocol-swift.ts` | Model → Swift `Codable` value types |
| `tools/repokit/src/commands/protocol-csharp.ts` | Model → C# `record` types with explicit `[JsonPropertyName]` |
| `tools/repokit/src/commands/protocol.ts` | The command, the two output paths, and the freshness gate |

Emitted targets, both committed:

- `tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift` — 245 lines
- `tools/ide/PaneHost/Generated/SharpeeProtocol.cs` — 426 lines

The gate is wired into `repokit verify` beside the ADR-269 grammar, ADR-276 manifest and
ADR-335 alias gates.

## Where the projection lives, and why not in `packages/`

The shells decode about twenty fields of a 1,700-line IR schema. That subset had to be
declared somewhere a type checker could see it, and it is declared in the build tool rather
than in `@sharpee/ide-protocol`: **no platform code produces or consumes it.** The platform
emits the whole `StoryIR`; narrowing is a consumer-side concern belonging to the generator
that serves those consumers, and a type in a published package that nothing imports is weight
without a reader. ADR-341's Scope ("no `packages/` change beyond the generator's read of
`ide-protocol`") therefore holds exactly as written — the only dependency edit is
`tools/repokit/package.json` gaining `@sharpee/chord` and `typescript`.

## The drift guarantee, demonstrated rather than asserted

The memory note *IDE decoder follows IR fields* recorded that a Chord IR rename breaks
`ComposeDiagnostics.swift` silently. It no longer can. Renaming `isPlayable` in the projection
and running `npx tsc -p tools/repokit/tsconfig.json --noEmit`:

```
tools/repokit/src/commands/protocol-projection.ts(149,14): error TS2322: Type 'boolean' is not
assignable to type '{ PROJECTION_IS_NOT_A_NARROWING_OF: StoryIR; }'.
```

Restored, the same command is clean. A rename is now a red TypeScript build in the same commit
rather than a runtime decode failure in an author's hands.

## The generator refuses rather than drops

Every construct the reader cannot translate throws with the type and field named, and nothing
is written — the whole model is built before the first write. Three refusals are pinned by
test: a reachable type the spec does not name, a spec root nothing exports or references, and
an index signature the spec has not accounted for. This is the GH #435 posture: a generator
that silently omits what it cannot translate produces a decoder wrong in exactly the way
hand-mirroring was.

## Results

| Gate | Result |
| --- | --- |
| `npx tsc -p tools/repokit/tsconfig.json --noEmit` | clean |
| `pnpm --filter '@sharpee/repokit' test` | **119 passed, 1 skipped, 0 failures** (14 of them the generator's own) |
| `repokit protocol --check` | exit 0 — both targets fresh |
| `xcodebuild -scheme SharpeeIDE build` | **BUILD SUCCEEDED** |
| `xcodebuild -scheme SharpeeIDE test` | **593 tests, 0 failures** — the same count as before the migration |
| `dotnet build PaneHost.sln` | **succeeded, 0 warnings, 0 errors** |
| `dotnet test --filter ProtocolTypeTests` | **4 passed, 0 failed** |

## AC-6, and the one place it was not met

ADR-341 AC-6 asks that `SharpeeIDETests` pass after the migration "with no test change beyond
the type source." Two sites needed a change, both the same shape and both approved by David
before the edit:

- `StoryIndexTests.swift:50` and `SplitDividerTests.swift:55` built a phrasebook through the
  hand-written `PhraseSet(names: [PhraseName(key:span:)])`. The generated type is the map the
  wire actually carries, `[String: [String: PhraseEntry]]`, so the phrase key is the
  dictionary key rather than a struct field.

The alternative — generating a `PhraseSet` shim so the old call sites compiled unchanged —
would have put back a custom decoder this phase removed. The deviation is recorded here
rather than waived.

No other app or test source changed. `ProjectManifest.swift` and `ComposeDiagnostics.swift`
now hold only extensions: the schema-version gates, `decode(from:)`, `allEntities`/`hasKind`/
`defaultLocaleNames`, and a `DiagnosticSpan` convenience initialiser that keeps all 31
existing `DiagnosticSpan(line:column:endLine:endColumn:)` call sites compiling now that the
generated type carries the wire's `file` field.

## What the generated types gained that the mirrors had lost

Two fields existed on the wire and in neither hand-written mirror: `ProjectManifest`'s
`hatchContextVersion` and `Span`'s `file`. Both are now present in both shells. That is the
drift the mirrors had already accumulated, found by generating rather than by review.

## The two shells are proven against identical bytes

`PaneHost.Tests/ProtocolTypeTests.cs` decodes the same fixture payloads as
`SharpeeIDETests/ComposeDiagnosticsTests.swift`. A compiler can only prove the generated C# is
valid C#; these prove the `[JsonPropertyName]` mapping reads the wire's camelCase names, that
closed string sets reach the right enum member, and that unknown wire fields pass through.

## Not done here

- **PaneHost's 8 capability tests did not run.** They require `SHARPEE_IDE_TOOLCHAIN` and
  `SHARPEE_IDE_CAPABILITY_FIXTURE`, which are unset in this session's environment, and they
  fail loudly rather than skipping (by design, Phase 2). Unrelated to this phase: the
  exception fires before any protocol type is touched, and no PaneHost production code
  references the generated types yet. The other 12 pass.
- **`repokit verify` was not run end to end** — it runs a publish dry run costing minutes. The
  protocol gate itself was run directly (`protocol --check`, exit 0) and its wiring into
  `verify` is covered by the command's unit tests.
- **ADR-341 was not amended.** Its own text says it is "deliberately not edited while ADR-351
  is DRAFT," and ADR-351 still carries Q-2, Q-4 and Q-6.
