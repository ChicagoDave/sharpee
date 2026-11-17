# Sharpee API Surface Audit — Findings (Synthesis)

Date: 2026-06-20
Companion to `inventory.md` (mechanical) and the per-package files in `findings/`.
Scope: judgment review of the public `.d.ts` surface of all 28 built, non-umbrella `@sharpee/*`
packages (the `@sharpee/sharpee` umbrella is a pure re-export barrel; `bridge`, `runtime`,
`map-editor`, `extension-conversation` are unbuilt and unaudited).

> Read first: the raw symbol counts (≈1,540) **massively overstate the author-facing surface**.
> Across the big packages, roughly half of all exports are internal plumbing that leaks through the
> public barrel (see Finding 2). The genuine author-facing API is a few hundred symbols.

## Systemic findings (recurring across packages)

### 1. `any` / loose types on the hottest author-facing paths
The payloads authors touch most are untyped. This is the single biggest issue for a book whose
programmer layer shows real signatures — it would print `data: any` everywhere.
- `event-processor`: `IGameEvent.data: Record<string, any>` — read by **every** event handler.
- `stdlib`: `ActionContext.event(type, data: any)`, `sharedData`, `ValidationResult.data`, `params`.
- `world-model`: `getStateValue`/`setStateValue`, `toJSON`, `setWorldContext`.
- `engine`: `Story.getCustomActions?(): any[]`, `StoryConfig.custom: Record<string, any>`.
- `core`: `IExecutionContext`/`IQueryContext` are `[key: string]: any`; `IAction`/`ICommandHandler`
  default generics to `any`.
- `lang-en-us`: `getMessage(..., Record<string, any>)`, `getEntityName(entity: any)`.
- `parser-en-us`: `setWorldContext(world: any)`. `transcript-tester`: pervasive `any`.

### 2. Internal plumbing leaks into the public surface (large)
Half the surface of the big packages is implementation detail no author imports:
- `core` (204): ~40 `GameLifecycle*Data` + ~30 `createGame*Event`/`isGame*Event` + all `ISerialized*`
  save internals + `IDebug*`.
- `world-model` (329): command-pipeline/registry (`IParser`, `ICommandValidator`, `TraitRegistry`,
  `extensionRegistry`), obstructor-protocol cluster, cognitive internals (`MOOD_AXES`).
- `character` (134): ~80 are runtime/evaluator/save-restore internals.
- `lang-en-us` (61): 35 are data tables (`takingLanguage`, `englishWords`…) leaked via `export *`.
- `stdlib` (170): ~40 channel consts, witness system, NPC lucidity functions, query handlers.
- `engine`: ~13 "Phase 4 remediation" extracted services.
- **Recommendation:** curate with sub-entry-points (`/runtime`, `/internal`) or `@internal` tags. This
  is good platform hygiene *and* it gives the book a clean, small surface to teach.

### 3. `I`-prefix convention is applied inconsistently
`world-model` (`IWorldModel`/`ITrait` vs `RegionOptions`/`Annotation`/`Goal`), `if-domain`
(`IActionRegistry` vs `VocabularyRegistry`), `channel-service`, `media` (none at all). Only `core`
and `text-blocks` are internally consistent. Pick one rule platform-wide.

### 4. Same-name-different-thing collisions & duplicate concepts
- `CommandValidator` is both an interface and a class (`stdlib`); same for `Renderer` (`channel-service`).
- `Parser` collides three ways: `parser-en-us` exports impl as both `EnglishParser` and `Parser`;
  `if-domain` has its own `Parser`/`BaseParser`; re-exported as `ParserInterface`.
- `EventEmitCallback` — same name, different shape in `engine` vs `event-processor`.
- `CommandResult` duplicated with different shapes in `transcript-tester` and `ext-testing`.
- `PronounSet`/`PRONOUNS` triplicated across `lang-en-us`, `world-model`, `parser-en-us`.
- `IFActions` in both `stdlib` and `lang-en-us`; two event-source lineages in `core`.

### 5. Abbreviations against the no-abbreviation standard
- `world-model`: `Npc`, `IPrepPhrase`. `devkit`: `tsfBin`, `genai`, `BUNDLE_DTS`.
- `ext-testing`: **GDT** acronym across the public API (`executeGdtCommand`, `parseGdtInput`).

### 6. TSDoc coverage is wildly uneven (0% → 100%)
Worst where it hurts the book most: `plugins` **~0%** (the turn-cycle contract is undocumented),
`plugin-state-machine` ~10–20% (author-facing, ADR-119). Best: `text-blocks`, `character`, `media`,
`ide-protocol`, `ext-basic-combat` (~95–100%). The programmer layer can only quote what's documented.

### 7. Deprecated / stale symbols still exported
`stdlib` (`EnhancedActionContext`, `ScopeLevelStrings`, `Action.canExecute`), `parser-en-us`
(`registerGrammar`), `event-processor` (`EventHandler`, after ISSUE-068 removed entity handlers).
The book must avoid these; better to remove them.

### 8. Hardcoded version literals (vs the versioned-reader preference)
`ext-testing`: `CheckpointData.version: '1.0.0'` as a literal type — a breaking type change on every
bump. Same anti-pattern the save-format work moved away from.

### 9. Cross-package re-export leakage
`engine`←plugins; `event-processor`←world-model/core/if-domain; `stdlib`←core/if-domain;
`parser-en-us`←if-domain. Inflates counts and blurs ownership. The book should anchor each type to its
**canonical home** (e.g. wire/channel types → `if-domain`, not the presentation packages).

## Author-facing vs internal (what the book actually teaches)

**Author-facing (book targets):** `world-model`, `stdlib`, `engine` (Story/GameEngine), `helpers`
(fluent builder DSL), `queries` (EntityQuery), `lang-en-us`, `parser-en-us` (grammar extension),
`character` (NPCs), `plugin-scheduler` (daemons/fuses), `plugin-state-machine`, `plugin-npc`,
`platform-browser` (web client), `channel-service` (renderer contract), `media` (audio), `devkit`
(build/CLI), `transcript-tester` (testing), `ext-basic-combat`.

**Extension-facing (Part-IV/V depth only):** `if-domain` (contracts), `event-processor` (effects),
`plugins` (turn-cycle contract).

**Internal / legacy (NOT book material):** `core` (foundation), `bootstrap` (build loader),
`story-runtime-baseline` (bundle manifest), `interpreter` (legacy Tauri/React runner — historical),
`ide-protocol` (IDE wire), `sharpee` (umbrella).

## Clean, exemplary surfaces (use as models / lead with these)
`text-blocks` (immutable wire contract, full TSDoc), `media`, `ext-basic-combat`, `helpers`,
`queries` (clean activation-by-import), `character` (best docs — just needs surface trimming).

## Implications for the book

1. **genai-api coverage must be extended** to author-facing undocumented packages before their
   chapters can anchor to it: `character`, `platform-browser`, `media`, `channel-service`, `devkit`,
   `transcript-tester`, `helpers`, `queries` (8 packages). `plugin-scheduler` and
   `plugin-state-machine` are **already** documented in `plugins.md`. One-line additions to the
   generator's `PACKAGE_GROUPS`, then rebuild.
2. **The programmer layer needs a curated surface.** Pointing it at the raw 329-symbol world-model is
   wrong; the book needs the ~author-facing subset. Findings 2 + 7 say the platform should curate
   (sub-entry-points / `@internal`); short of that, the book curates manually per chapter.
3. **The `any` hot paths (Finding 1) will show in the book as `data: any`.** Worth deciding whether to
   improve typing first or write around it.
4. **Two clean topics to feature:** `helpers` (fluent builder) and `queries` (EntityQuery) are
   author-facing, well-documented, activation-by-import — natural showcases.

## Note on acting

Findings 1–9 are **platform observations**, not changes. Per project rules, any platform change is a
separate discussion. This document is the audit output; remediation (if any) is a decision for David.
