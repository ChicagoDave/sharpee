# Refactoring survey — the remaining packages (2026-11-02, session 99293e, main at 2fd7336b5)

The September survey (ADR-334..340, GH #382, #385; plan archived at
`docs/work/archive/refactoring-survey/`) covered engine, story-loader, chord, stdlib,
world-model, character, transcript-tester, branch-tester, lang-en-us and parser-en-us.
This pass measures the packages it left in its queue. Every count below was produced
this session by `grep`/`find`/`git log` against the commit named above; the dead-export
scan counts files outside the package (`packages/*/src`, `tools/*/src`, `stories/*/src`)
that mention each top-level exported symbol by whole word. Type-only consumers that
reach a symbol through declaration merging are called out where they matter.

## Size, tests, churn

| package | src lines | src files | test files | skips | barrel shape | commits since 2026-06-01 |
|---|---|---|---|---|---|---|
| devkit | 5715 | 27 | 31 | 4 (all fixture-conditional) | curated, 8 export lines | 106 |
| platform-browser | 5593 | 30 | 20 | 2 | curated + `export *` channels | 30 |
| if-domain | 5216 | 30 | 7 | 0 | 14 × `export *` | 61 |
| core | 4951 | 46 | 13 | 0 | 8 × `export *` + one named block | 15 |
| event-processor | 2071 | 17 | 7 | 0 | 5 × `export *` | 9 |
| ide-protocol | 1865 | 9 | 6 | 0 | — | — |
| channel-service | 1753 | 11 | 9 | 2 | curated | 8 |
| plugin-state-machine | 1129 | 7 | **0, no test script** | — | 4 × `export *` | 10 |
| media | 935 | 7 | 3 | 0 | — | — |
| helpers | 887 | 7 | 5 | 1 | curated | 11 |
| bridge | 765 | 4 | **0, no test script** | — | re-exports runtime-surface | 7 |
| bootstrap | 726 | 4 | 6 | 0 | curated | 41 |
| plugin-scheduler | 714 | 5 | **0, no test script** | — | 4 × `export *` | 6 |
| queries | 641 | 3 | 2 | 0 | curated | 2 |
| runtime | 615 | 4 | **0, no test script** | — | re-exports runtime-surface | 8 |
| plugins | 535 | 6 | 2 | 0 | curated | 9 |
| text-blocks | 412 | 3 | 0, no test script | — | — | — |
| if-services | 138 | 2 | 0, no test script | — | — | — |
| world-index | 23267 (12474 generated) | — | 3+ | — | curated | — |

Ruled out quickly:

- **runtime vs bridge** share nothing to deduplicate: `protocol.ts` differs on every
  line (318-line diff for ~200-line files) and the shared engine surface already lives
  in `@sharpee/sharpee/runtime-surface`, which both re-export.
- **devkit** already has an inside (a curated 8-line barrel; `cli.ts` is the product).
  Its churn is feature work. The `standalone/` vs `commands/` split is historical naming
  rather than a concept (`standalone/build.ts` and `commands/test.ts` are both CLI
  commands), which is a rename, not a refactor.
- **world-index, channel-service, helpers, queries, plugins** are small, curated,
  low-churn.

## core — the target

Fan-in: **32** `package.json` files depend on `@sharpee/core`. Suite: 13 files,
176 passing (`pnpm --filter '@sharpee/core' test`, 2026-11-02).

**Live contract.** Other packages import **71 distinct symbols** from `@sharpee/core`.
The package exports **241**. **143 exports have no consumer outside the package**
(src or test); 121 of those are referenced by nothing inside the package either, beyond
their own definition.

Per file, external-used / total exports:

| file | used / total | note |
|---|---|---|
| `constants/*` (220 lines, 5 files) | 0 / 11 | **not exported by `src/index.ts` at all** — unreachable |
| `extensions/registry.ts` | 0 / 2 | **not exported by `src/index.ts`** (only `extensions/types.js` is) — unreachable; one core test exercises it |
| `extensions/types.ts` | 0 / 7 | published; nothing implements `IExtension` anywhere (world-model's own extension system was deleted under ADR-338 D2) |
| `debug/types.ts` (78 lines) | 0 / 4 | published, unused |
| `execution/types.ts` (132 lines) | 1 / 6 | `ICommandHandler`, `IExecutionContext`, `ICommandRouter`, `ICommandHandlerFactory`, `ICommandExecutionOptions` unused |
| `events/typed-event.ts` | 0 / 3 | unused |
| `events/standard-events.ts` | 0 / 6 | unused (one core test) |
| `events/event-helpers.ts` | 1 / 7 | six helpers unused |
| `events/event-factory.ts` | 1 / 6 | `createEmptyEvent`, `createMessageEvent`, `resetEventCounter` used only by core tests |
| `events/game-events.ts` (516 lines) | 16 / 52 | the 36 unused: every `GameLifecycle*Data` type, every `isGame*` guard, `createGameEvent`, `GameState` |
| `events/event-registry.ts` | 1 / 23 | **not dead** — the 22 `*Data` types are `EventDataRegistry` entries, consumed by declaration merging (`media`, `stdlib/events/event-registry.ts`) |
| `types/attribute.ts`, `types/relationship.ts` | 0 / 8 | unused |
| `types/save-data.ts` | 13 / 17 | `ISerializedDaemonState`, `ISerializedFuseState`, `ISerializedSchedulerState`, `IStoryConfig` unused |
| `events/platform-events.ts` | 21 / 25 | live |
| `random/*`, `ifid/*` | 23 / 24 | live |
| `query/*` | 8 / 14 | live (engine, stdlib query handlers) |

Last commit touching `constants/`, `debug/`, `execution/`, `extensions/`: 2026-07-19,
and that commit was a cross-package sweep (ADR-242), not work on those directories.

**Shape of the finding.** This is ADR-338's world-model finding repeated on the package
every other package depends on: subsystems that nothing constructs
(`extensions/`, `execution/`, `debug/`, `constants/`), two directories the barrel does
not even reach, and a barrel of `export *` lines that publishes 241 symbols when the
contract is 71. Core has no inside. The remedy has the same two halves ADR-338 had:
a boundary decision (the barrel names the contract; everything else is internal or
gone) and a confirmed-deletion list (David confirms each directory before its phase).

## Runners-up, in order

1. **bootstrap** — `assembleGame(story: any, opts?: { freshStory?: () => any })`
   (`src/index.ts:229-231`) and `boot(s: any)` (`:324`) type the one story-loading seam
   as `any` while `engine/src/install/story.ts:269` exports the `Story` interface it
   should be. 267-line function; two importers (devkit's `author-game.ts`,
   transcript-tester's `story-loader.ts`). Small and concrete; a single-phase fix.
2. **event-processor** — 60 of 70 exports have no external consumer, but they are not
   dead: `processor.ts:58` calls `registerStandardHandlers(world)` internally. The five
   symbols anyone imports are `EventProcessor`, `Effect`, `WorldQuery`,
   `StoryEventHandler`, `IGameEvent`. Barrel narrowing only. Separate question for
   David: `handlers/movement.ts` `handleTaken` mutates `WearableTrait.worn` on
   `if.event.taken` with `world: any` — a second writer beside the taking action's
   behavior, which "behaviors own mutations" says should not exist.
3. **platform-browser** — `BrowserClient.ts` is a 1097-line orchestrator (35 methods,
   43 private members) over five managers; 85 of 92 exports are unused by the only
   consumers (story `browser-entry.ts` files import `BrowserClient`, `ThemeManager`,
   `BROWSER_CAPABILITIES`). Whether the manager exports are author-facing surface
   (the web client is author-customizable) or leak is a product decision, not a
   measurement.
4. **if-domain** — 24 of 183 exports unused (healthy). `BaseParser` has no importer
   anywhere, which is the type ADR-338 Amendment A2 cited as the reason `IParser` stays
   in world-model. `GrammarEngine` (abstract class, 435 lines) and `VocabularyRegistry`
   (class, 378 lines) are runtime code in a package documented as "pure types";
   parser-en-us is their only consumer. Boundary question, low urgency.
5. **Zero-test packages** — plugin-scheduler, plugin-state-machine, runtime, bridge,
   text-blocks, if-services ship with no `test` script. Scheduler and state-machine get
   indirect coverage from engine/story-loader tests (3 and 4 test files mention them);
   runtime and bridge have none anywhere. A testing gap, not a refactor target.
