# ADR-343: `StoryEngine` — what a story is handed at ready time

**Status**: **ACCEPTED** (David, 2026-09-09, session 42e176 — "accept" after `adr-review` returned 16/16 with nothing to fold. Written the same session on `main` after PR #397 merged and Sharpee 5.3.1 shipped; named by the residue plan's Phase 9 as the one edge its layering test allow-lists, and by ADR-342's Consequences as the amendment its D1 would need. Acceptance authorizes no implementation by itself: the implementation is its own plan, one phase, planned next.)

**Scope**: `packages/engine/src/install/story.ts` (the `Story` contract), `packages/engine/src/game-engine.ts` (one `implements` clause), `packages/engine/src/index.ts` (one added name, an ADR-342 D1 amendment), `packages/engine/tests/unit/module-layering.test.ts` (the allow-list emptied); the in-repo implementers that name the parameter type — `stories/dungeo`, `stories/family-zoo-tutorial`, `stories/channel-service-test`, `packages/devkit/fixtures/basic-story`, the book's `docs/book/v2.0.0` snippets, and `packages/story-loader/src/loader.ts`. No Chord change, no wire change, no `GameEngine` member change (ADR-334 AC-5), no behavior change. `tutorials/familyzoo/v2.0.0` is pinned to a published version and is not touched.

## Date: 2026-09-09

## Parent

ADR-342 (the engine's contract is a named list; D3 — a type a consumer must *name* is the trigger for adding it, recorded as an amendment on D1; Consequences — the `onEngineReady` role is that amendment). ADR-334 (D3 — `PlatformOperationHost` "is what an operation needs"; the residue plan's Phase 1 — `TurnEngine`, "the facade's turn-facing surface", `turn/context.ts:96-98`). **Related**: `docs/work/engine-refactor/diagram-notes.md` — "the story contract currently gets the whole engine, ~40 public members, when it needs maybe six … the only one that never got a role interface"; the residue plan's Phase 9 record (`docs/work/archive/game-engine-residue/plan.md`) — the 55-file strongly connected component is held by one remaining edge, `install/story.ts → game-engine.ts`; DevArch rule 8 (dependencies flow inward: a contract does not name the concrete thing that fulfils it).

## Context — verified, not assumed

Every file and line below was read this session at `ef0bbf49f`.

- **The hook names the class.** `Story.onEngineReady?(engine: GameEngine): void` (`install/story.ts:261`), documented as "Use this to register parsed command transformers or other engine hooks", with `import type { GameEngine } from '../game-engine.js'` at `:10`. It is called once, as the last act of `installStory` after the install result is adopted (`game-engine.ts:412`, "the one playthrough-side call in the sequence"; `install/context.ts:17-19` explains why it is not a step). Every other `Story` hook already receives a role, not the engine: `extendParser(parser: Parser)`, `extendLanguage(language: LanguageProvider)`, `registerChannels(registry: IChannelRegistry)`, `onWorldRestored(world, restoredTurn)`, `initializeWorld(world)`, `createPlayer(world)` (`story.ts:217-305`). `onEngineReady` is the one that hands over the whole facade.
- **The edge is the last cycle.** After Phase 9, `install/story.ts → game-engine.ts` is the only import into the facade from inside the package other than `index.ts`; `tests/unit/module-layering.test.ts:20-23` allow-lists exactly that edge with this ADR named as the reason, and requires the list entry to be removed the day the edge goes. With it gone the package's import graph is acyclic outright.
- **What implementers actually use** — every `engine.<member>` in the 32 files that implement or document the hook outside the engine (`packages/story-loader/src`, `packages/extensions`, `packages/devkit/fixtures`, `stories/`, `docs/book/v2.0.0`, `tutorials/familyzoo/v2.0.0`; `_archive` and `dist` excluded), counted this session:

  | member | uses | who |
  |---|---|---|
  | `getPluginRegistry()` | 18 | every story, the loader, the book |
  | `getWorld()` | 11 | stories, the book |
  | `registerSlotEntry()` | 6 | family-zoo, the book, the loader |
  | `getNpcService()` | 5 | stories, the loader |
  | `getRandomService()` | 3 | Dungeo's orchestration, the loader |
  | `getEventProcessor()` | 3 | Dungeo's audio handler, the book |
  | `registerParsedCommandTransformer()` | 2 | Dungeo, the loader |
  | `getContext()` | 2 | the loader (turn provider) |
  | `getClientCapabilities()` | 2 | the loader (`client has`) |
  | `executeAsActor()` | 2 | the loader (ADR-329 D4) |
  | `registerInputMode()` | 1 | Dungeo (GDT) |
  | `getLanguageProvider()` | 1 | family-zoo |

  Twelve members. `engine.on` and `engine.start` appear only in comments (`stories/dungeo/src/audio/audio-setup.ts:20`, `stories/dungeo/src/index.ts:770`). `registerSlotContributor` has no live caller, but its own doc says "Stories call this from `onEngineReady`" (`game-engine.ts:1009-1011`; ADR-195 §3) — a documented story entry point with zero users. Nothing a story does at ready time touches the lifecycle (`start`/`stop`/`resume`/`installStory`), save/restore/undo, `switchPlayer`, `setTextService`, `introspect`, `getHistory`, `emitPlatformEvent`, or the vocabulary refreshers — the other twenty-odd members are the host's and the turn's, and a story that reached them from the hook would be reaching past its role.
- **The Chord loader already wrote the role by hand.** `packages/story-loader/src/loader.ts:1053-1061` types its `onEngineReady` parameter as an inline structural object — `getPluginRegistry`, `getNpcService`, and six optional members (`registerSlotEntry?`, `registerParsedCommandTransformer?`, `getClientCapabilities?`, `getContext?(): { currentTurn: number }`, `getRandomService?(): RandomService`, `executeAsActor?`) — and probes each optional one before calling it. That is the role interface, written once, privately, in the one consumer that could not import the class without a wider dependency. Its `RandomService` is `@sharpee/core`'s interface (`loader.ts:75`), which `EngineRandomService` implements.
- **Fourteen implementers name the class.** `onEngineReady(engine: GameEngine)` in three stories (`stories/dungeo/src/index.ts:825`, `family-zoo-tutorial`, `channel-service-test`), the devkit fixture, three book v2.0.0 snippets, and eight files of the pinned tutorial edition. In `family-zoo-tutorial`, `channel-service-test`, and the devkit fixture the class is imported for that signature alone (two mentions each: the import and the parameter). Method parameters are bivariant, so a story that keeps typing the parameter as `GameEngine` still compiles against a `StoryEngine` contract — the class is assignable to the role — but it then names a class it never needed.
- **Where the role can live without a new cycle.** `install/story.ts` may import `types.ts`, `command/command-executor.ts` (for `ParsedCommandTransformer`), and `prose-pipeline/types.ts` (for `SlotEntry`, `SlotContributor`): none of `command/` or `prose-pipeline/` imports `install/` or the facade (checked this session), and `session/` is not needed once the random accessor is typed as core's interface. `game-engine.ts` already imports `install/story.ts` for `Story`, so an `implements` clause on the facade adds no edge.
- **The contract today** is 31 names (ADR-342 D1), pinned by `tests/unit/public-surface.test.ts`. `GameEngine` stays on it — hosts construct it — and `Story` stays on it.

## Decision

- **D1 — `StoryEngine` is the engine as a story sees it at ready time.** A new interface in `install/story.ts`, beside `Story`, declaring exactly the thirteen members a story registers on or reads from a finished engine, with the signatures the facade already has:
  - *Registration*: `getPluginRegistry(): PluginRegistry`, `getNpcService(): INpcService`, `registerSlotEntry(entry: SlotEntry): void`, `registerSlotContributor(contributor: SlotContributor): void`, `registerParsedCommandTransformer(transformer: ParsedCommandTransformer): void`, `registerInputMode(id: string, handler: InputModeHandler): void`.
  - *Reads*: `getWorld(): WorldModel`, `getContext(): GameContext`, `getLanguageProvider(): LanguageProvider`, `getEventProcessor(): EventProcessor`, `getRandomService(): RandomService` (core's interface; the facade's `EngineRandomService` satisfies it), `getClientCapabilities(): ClientCapabilities`.
  - *Acting*: `executeAsActor(actorId: string, actionId: string, slots?: ActSlots): ActResult`.

  Twelve are the measured union; `registerSlotContributor` is the thirteenth because the facade documents it as a story's ready-time call (ADR-195 §3) and a role that omits a documented entry point is wrong, not lean. Nothing else. The lifecycle, save/restore, player switching, the text service, introspection, history, platform events, and the event emitter stay on `GameEngine` for hosts and are not on the role.

- **D2 — The hook takes the role.** `Story.onEngineReady?(engine: StoryEngine): void`. `install/story.ts` stops importing `game-engine.ts`. `GameEngine` declares `implements StoryEngine`, so the compiler, not a comment, holds the facade to the role: a member renamed or narrowed on the facade fails the build at the class, and a member added to the role that the facade lacks fails there too. Nothing on the facade changes (ADR-334 AC-5).

- **D3 — `StoryEngine` joins the contract.** `index.ts` exports it as a type; ADR-342 D1 becomes 32 names and its D5 fixture gains the name, in the same commit, as ADR-342 D3 prescribes. The trigger is exactly D3's: fourteen implementers *name* the parameter type today, and after D2 the correct name is `StoryEngine`.

- **D4 — In-repo implementers name the role.** The three stories, the devkit fixture, and the book's v2.0.0 snippets change `engine: GameEngine` to `engine: StoryEngine` in the hook and drop the `GameEngine` import where the signature was its only use. The Chord loader replaces its inline structural type with `StoryEngine` and the six `if (engine.x)` probes with plain calls — the role makes every member present, the same move Phase 6 made for the parser. The pinned tutorial edition keeps `GameEngine`; it compiles against its own published version and, under bivariance, would compile against this one too.

- **D5 — The allow-list empties.** `ALLOWED_CYCLE_EDGES` in `module-layering.test.ts` becomes an empty list and stays as the place a future exception would be recorded; the "still exists" assertion then trivially passes and the acyclicity assertion runs over the whole graph. The 55-file component the Phase 9 record describes dissolves.

- **D6 — No behavior changes.** The hook is still called at the same point with the same object; every story's ready-time code runs unchanged. The gate is byte-identical (Dungeo chain, the three Chord trees); the engine and story-loader suites stay green; the generated reference gains one declaration under `install/story`.

## Consequences

- A story's compile-time view of the engine is thirteen members, not forty-two, and the six other hooks' pattern — a role per hook — holds for all seven. Adding a ready-time capability for stories is a change to `StoryEngine` first, which is where the question "should a story be able to do this" gets asked.
- The engine package's import graph is acyclic with no exceptions; the layering test enforces that without an allow-list, and Phase 7's directory layout is a real layering rather than a filing scheme.
- ADR-342 D1 is amended by one name (32); the amendment line lands with the code, per ADR-342 D3.
- The Chord loader loses eight lines of hand-written structural typing and six probes, and stops needing to know which of the engine's members are optional — none are.
- The book's v2.0.0 snippets change three signatures; the book text that shows them is checked in the plan phase (the book tracks HEAD, the tutorial edition does not).
- **As built (session 03237e):** the six probes were not defending against real engines lacking members — no engine lacks them, as D1's inventory shows — they were what let `packages/story-loader`'s own tests drive the hook with one- and two-member object literals. Removing them failed 14 test files / 68 tests on the first unconditional call. The resolution keeps the role non-optional and gives those tests one complete double, `tests/helpers/stub-story-engine.ts` (`stubStoryEngine`, plus `recordingPluginRegistry`, a real `PluginRegistry` that also records registration order for the tests that assert on install order). A test that needs a partial engine now says so by overriding one member of a whole one, which is the same shape a story sees.
- Not decided here: the deferred `Session` concept (assembly above `installStory`, playthrough below). `StoryEngine` is the playthrough-side view a story gets at the seam; a `Session` ADR would build on it, not replace it.

## Acceptance

- **AC-1 (the role)**: `grep -n 'onEngineReady' packages/engine/src/install/story.ts` shows `engine: StoryEngine`; `grep -c 'game-engine' packages/engine/src/install/story.ts` prints `0`; `grep -n 'implements StoryEngine' packages/engine/src/game-engine.ts` finds the class.
- **AC-2 (acyclic, no exceptions)**: `ALLOWED_CYCLE_EDGES` is empty and `module-layering.test.ts` passes; a scratch `import type { GameEngine } from '../game-engine.js'` in `install/story.ts` fails it naming `install/story.ts -> game-engine.ts`.
- **AC-3 (the contract)**: the public-surface test's fixture lists 32 names including `StoryEngine`, and ADR-342 D1 carries the amendment line; `./repokit build dungeo` and the three Chord trees build; every implementer in the Scope compiles with `StoryEngine` named, and `grep -rn 'onEngineReady(engine: GameEngine' stories packages/devkit docs/book/v2.0.0` prints nothing.
- **AC-4 (the loader)**: `packages/story-loader/src/loader.ts` imports `StoryEngine` from `@sharpee/engine` and its hook body contains no `if (engine.` probe; the story-loader suite count is unchanged.
- **AC-5 (byte-identical)**: the Dungeo chain and the three Chord trees are byte-identical to the run before the phase after stripping timings; the engine suite reports no failures.

## Session

Written 2026-09-09, session 42e176, on `main` at `ef0bbf49f` (`docs/context/session-20260909-1750-refactor-survey-adr-334-340.md`), after the residue plan closed and PR #397 merged; the last item that plan's Phase 9 left open.
