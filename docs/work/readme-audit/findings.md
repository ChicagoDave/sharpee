# Package README Accuracy Audit — 2026-07-25

Scope: all 27 existing package READMEs, each verified against package.json, the
src barrel, and spot-checked source. Ten parallel review agents, 3 packages each.
Relevant because tsf stages README.md into every npm tarball — these are the
public npm pages for the imminent 3.7.0 CI publish.

**Missing READMEs** (published packages, no README at all): `chord`,
`story-loader`, `ext-scoring`. (`bridge`, `interpreter` have no `publishConfig`;
`extension-conversation` pending §10.1 decision. `ext-hunger` written this
session.)

## Clean (6)

`if-services`, `helpers`, `media`, `platform-browser`, `story-runtime-baseline`,
`text-blocks` — every claim verified against code.

## Cross-cutting patterns

1. **`engine.plugins.register(...)` in all three plugin READMEs** — the engine
   has no `plugins` property. Real API: `engine.getPluginRegistry().register(...)`
   (`packages/engine/src/game-engine.ts:1757`).
   - `plugin-npc/README.md:29`, `plugin-scheduler/README.md:27`,
     `plugin-state-machine/README.md:28`.
2. **Stale "48 standard actions"** in `sharpee/README.md:81` and
   `stdlib/README.md:3,117` — actual count is 57
   (`stdlib/src/actions/standard/index.ts:161-225`).
3. **"Types only / contracts only / pure / immutable" claims now false**:
   `plugins` (ships ADR-262 band-crossing runtime), `ide-protocol` (runtime dep
   on `@sharpee/chord` via `IR_FORMAT` value re-export), `if-domain` (exports
   runtime classes), `world-model` ("immutable world state" — it mutates in
   place), `stdlib` ("pure functions" contradicts the four-phase execute-mutates
   contract).
4. **Uncompilable / wrong API examples** in: `core`, `world-model`,
   `event-processor`, `channel-service`, `character`, `transcript-tester`,
   `queries`, `stdlib`, `ext-basic-combat`.
5. **Docs predating refactors**: `devkit` (pre-ADR-187 split), `engine`
   (EventSequencer, three-phase, pre-ADR-248 story singleton), `transcript-tester`
   (fast-cli), `map-editor` (multiple), `runtime` (dead build/dist paths).

## Per-package findings

### engine (6 findings)
- `EventSequencer` / `SequencedEvent` documented (L19, L140-156, L268-279) but do
  not exist anywhere in the repo; `TurnResult.events` is `ISemanticEvent[]`
  (`engine/src/types.ts:88`) and `TurnResult` is missing documented-adjacent real
  fields `type?: 'turn'`, `blocks?`.
- L211 `export const story: Story = {…}` violates the ADR-248 factory-only
  contract (`engine/src/story.ts:176-179`; bootstrap throws on it).
- L31 diagram says "Three-Phase Pattern"; code and the README's own L41-48 are
  four-phase (validate/execute/report/blocked).
- L18 "CommandExecutor (177 lines)" — it's 500 lines.
- Test list names `event-sequencer.test.ts` and `types.test.ts`, which don't exist.

### devkit (10 findings — pre-ADR-187 split throughout)
- Claims `verify`, `test:npm`, `clean`, `bundle`, `--zifmia`, `--skip`, and
  in-repo platform builds — all moved to repokit or removed; `cli.ts` rejects
  workspace stories with a "use ./repokit" error.
- Documents programmatic exports `runBuild`/`runVerify`/`runTestNpm` that don't
  exist (barrel exports `runRegister`, `runList`, browser-core surface).
- Commands table omits shipped `compose`, `test`, `play`, `--version`.

### world-model (4)
- Headline example wrong end-to-end: `createEntity(displayName, type, opts?)`
  (`WorldModel.ts:856`) — no options object, no caller `id`, no `traits` array;
  traits attach via `entity.add(new OpenableTrait())`.
- `getContents`/`getLocation` take ID strings, not entities.
- L18 "Immutable world state" is false.

### stdlib (6)
- "48 actions" → 57; category list omits several.
- `validator.validate(parsedCommand, {…})` — real signature is one argument,
  returning `Result<ValidatedCommand, IValidationError>`; no "validation score"
  field exists.
- `pnpm coverage:view` / `coverage:badge` scripts don't exist.
- Test-tree listing wrong (`tests/unit/language/` doesn't exist).
- L176 "Pure Functions — actions return events, don't mutate" contradicts the
  four-phase contract and the README's own L107.

### transcript-tester (3)
- `src/fast-cli.ts` doesn't exist (bundle builds from `scripts/bundle-entry.js`).
- `TranscriptRunner` class doesn't exist — real API `runTranscript(transcript,
  engine, options)` (`runner.ts:102`).
- Structure table omits exported `story-loader.ts` / `trait-formatter.ts`.

### parser-en-us (5)
- `VERB_PREP_NOUN` pattern never emitted ("look at painting" parses as
  `VERB_NOUN`); real emitted set also includes undocumented `VERB_NOUN_NOUN`.
  Stale `metadata.supportedPatterns` (`src/index.ts:42`, `parserVersion: '1.0.0'`)
  repeats the error.
- `ParsedCommand` type not exported (it's `IParsedCommand` from world-model).
- Example `confidence: 0.7` unreachable (1.0 or ~0.81).
- "ball that is red" postposed-adjective support doesn't exist.

### character (4)
- `ThreatLevel.NONE`/`HIGH` — `ThreatLevel` is a string union
  (`'safe'|'uneasy'|…`), not an enum/value.
- `'afraid of'` not a `DispositionWord` (nearest: `'wary of'`).
- `.mood('wary')` — 'wary' is not a platform `Mood`; unresolved without a
  vocabulary extension.
- "Conversation … tick-phase handler" — no conversation tick phase exists.

### ext-testing (2)
- `$assert` doesn't exist (also claimed in `src/index.ts:8`, `src/types.ts:33`).
- "Deterministic testing — seeded randomness" not implemented:
  `deterministicRandom` is a config flag read by nothing.

### map-editor (6)
- Install is npm-in-package-dir (excluded from pnpm workspace).
- `./build.sh -s dungeo` dead (also echoed in `electron/main.ts:126` at runtime).
- "createEditorSession (platform change required)" — already landed
  (`scripts/bundle-entry.js:46`).
- "File → Open Project" menu doesn't exist (welcome-screen button).
- Canvas is React Flow (`@xyflow/react`), not SVG.
- `docs/work/maphints/editor-plan.md` dead link (live: ADR-113).

### runtime (6)
- `./build.sh --runtime` doesn't exist; no bundling step produces the described
  `dist/runtime/sharpee-runtime.js` (~745K figure from a 2026-03 session doc).
- Test-harness path wrong (`packages/runtime/test-harness.html`, not
  `dist/runtime/`).
- `ClothingTrait` doesn't exist; `registerCapabilityBehavior` is an instance
  method, not an export; `Story`/`StoryConfig` are type-only, absent at runtime.
- (README honestly banners itself Draft/Untested.)

### if-domain (5 + notes)
- "Sequencing (`sequencing.ts`)" section entirely dead (no file, no
  `TurnPhase`/`EventSequence`/`SequencedEvent`/`EventSequencer`).
- `EventHandler`/`EventValidator`/`EventPreviewer` don't exist; usage example
  imports `EventHandler`.
- `changes.ts` section lists 4 types that live in `contracts.ts`.
- "Only depends on @sharpee/core" stale (also `@sharpee/text-blocks`).
- "No runtime code" false (VocabularyRegistry, ParserFactory, GrammarEngine, …).

### core (2)
- `SemanticEvent` not exported (it's `ISemanticEvent`); example doesn't compile.
- `createTypedEvent('game.started', { timestamp })` — excess property;
  `timestamp` is a factory-set top-level field, not data.

### event-processor (2 + omissions)
- `processor.apply(events)` doesn't exist; `processEvents()` returns
  `ProcessedEvents` and mutates the world in place.
- Effects system (ADR-075), `registerStandardHandlers`, options arg undocumented.

### channel-service (2)
- `decoder.decode(packet)` → real API `ingest()` then read `state`/`lastTurn`.
- `renderer.apply(decoded)` → real API `applyCmgt()`/`applyTurnPacket()`.

### ext-basic-combat (2)
- `combat.resolve(context)` → `resolveAttack(context)`.
- `applyCombatResult(result, info)` → `(target, result, world)`, returns the info.

### queries (1)
- `world.objects.having(...)` — `having()` is a WorldModel entry point only;
  chainable equivalent is `.withTrait()`. Example throws as written.

### plugins (2)
- "called once after each successful player action" — also runs after refused
  actions (gate on `actionResult.success`).
- "contracts-only" false: ships ADR-262 band-crossing runtime; 10+ exports
  undocumented.

### plugin-npc / plugin-scheduler / plugin-state-machine (1 each)
- `engine.plugins.register(...)` → `engine.getPluginRegistry().register(...)`.
  Everything else in all three verified accurate.

### lang-en-us (1)
- "Full English parser with tokenization/POS/grammar analysis" — package
  contains no command parser (contradicts its own L46; only `lemmatize` is real).

### sharpee (3)
- "48 standard IF actions" → 57.
- `new GameEngine({ world, … })` not writable from this package alone —
  `WorldModel`/`IFEntity` re-exported type-only; authors must import
  `@sharpee/world-model` for a constructible world.
- "TypeScript 5.2+" vs devDep `^5.3.3` (minor).

### bootstrap (4 minor)
- Exports table omits `purgeStoryModuleCache`, `moduleFreshStory`;
  `LoadedGame` list omits `reviveEngine()`.
- `buildManifest(world, storyId, generatedFrom)` — projects a built world, takes
  a story id, not "introspects a story".
- `assembleGame(story)` one-arg form: without `opts.freshStory`, RESTART is
  unsupported at runtime (documented as equivalent).

### ide-protocol (3)
- "Types only — no runtime dependencies" false: runtime dep on `@sharpee/chord`
  (`IR_FORMAT` value re-export) plus runtime guard functions.
- Omits the entire Story IR surface (`export * from './story-ir.js'` — ~26 types).
- `ProjectManifest` missing `hatchContextVersion?`.

Sub-finding worth a code fix, not a README fix: `parser-en-us`'s exported
`metadata` (`src/index.ts:33-49`) is itself stale (`parserVersion: '1.0.0'`,
wrong `supportedPatterns`), and ext-testing's `$assert` claim is duplicated in
its own source doc comments.
