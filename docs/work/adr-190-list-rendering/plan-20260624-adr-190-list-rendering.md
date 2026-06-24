# Session Plan: ADR-190 — Natural-Language List Rendering

**Created**: 2026-06-24
**Overall scope**: Implement ADR-190 end-to-end: rewrite the `list` formatter in `@sharpee/lang-en-us` to render per-element articles, count-grouping, and Oxford-comma joins over `EntityInfo[]`; fix the `count` formatter (GH #166); add `IdentityTrait.plural`; migrate list-producing actions from bare names to `EntityInfo[]`; correct documentation (GH #167); build and walkthrough regression.
**Bounded contexts touched**: N/A — language-layer and world-model infrastructure; no new domain concepts introduced.
**Key domain language**: N/A — this is platform infrastructure (formatter, trait field, producer migration).

## References consulted

- `docs/architecture/adrs/adr-190-natural-language-list-rendering.md` — all language/grammar logic must live in `@sharpee/lang-en-us`; no English prose in stdlib/world-model; producers must pass `EntityInfo[]` (not bare names); partial changes break rendering and are prohibited; `count` fix (GH #166) and doc fix (GH #167) fold into this ADR.
- `docs/architecture/adrs/adr-158-entity-info-in-message-params.md` — entity-valued message params must carry `EntityInfo` objects via `entityInfoFrom()`; bare name strings are a protocol violation; the helper is the only acceptable bridge between `IFEntity` and the language layer.
- `docs/context/project-profile.md` — tests go in separate `tests/` dir per package, `*.test.ts`; TypeScript strict mode; language layer separation enforced (lang-en-us owns all user-facing text).
- `docs/context/session-20260624-0230-main.md` — GH #166 (countFormatter hardcodes "items") and GH #167 (backwards placeholder examples) filed from book copy-edit; ADR-189 Phase 1 already committed on `feature/adr-189-entity-default-traits`; branch strategy for ADR-190 is an open decision.

## Branch decision (user input required before Phase 1)

ADR-189 Phase 1 is committed on `feature/adr-189-entity-default-traits`. ADR-190 touches `world-model` (adds `IdentityTrait.plural`) which may also be in scope for ADR-189. The user must decide before implementation starts:

- **Option A**: Continue on `feature/adr-189-entity-default-traits` — the `IdentityTrait.plural` addition is adjacent and the branch is clean.
- **Option B**: Branch `feature/adr-190-list-rendering` off `main` — cleaner isolation, but requires merging ADR-189 Phase 1 first (or rebasing).

---

## Phases

### Phase 1: Pluralization helper, `IdentityTrait.plural`, and `count` fix (GH #166)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `@sharpee/lang-en-us` shared pluralization infrastructure; `@sharpee/world-model` `IdentityTrait` data field.
- **Entry state**: Branch strategy decided; `feature/adr-189-entity-default-traits` or a fresh `feature/adr-190-list-rendering` branch is active; `packages/lang-en-us/src/formatters/list.ts` has the broken `countFormatter` (hardcodes `"items"`); `packages/world-model/src/traits/identity/identityTrait.ts` has no `plural` field.
- **Deliverable**:
  1. Confirm or extract a named export `pluralize(noun: string): string` in `packages/lang-en-us/src/` (currently at `language-provider.ts:545`); ensure it is importable from formatters.
  2. Add optional `plural?: string` field to `IdentityTrait` in `packages/world-model/src/traits/identity/identityTrait.ts` with a JSDoc note: "author-supplied plural override for irregular nouns; `list` formatter uses this when present, else falls back to the `pluralize()` heuristic."
  3. **Bridge the plural into the language layer (resolves the plan-review tension).** Extend the `EntityInfo` type (`packages/lang-en-us/src/formatters/types.ts`) with an optional `plural?: string`, and update `entityInfoFrom()` (`packages/stdlib/src/utils/entity-info.ts`) to populate it from `IdentityTrait.plural` when set. This is how the formatter reads the override **without importing world-model** (layer-clean). Must land here, before the Phase 2 formatter consumes it. ADR-158's `EntityInfo` shape gains this optional field as a consequence of ADR-190.
  4. Fix `countFormatter` in `packages/lang-en-us/src/formatters/list.ts`: replace the hardcoded `return \`${count} items\`` branch with logic that uses the real noun from the first `EntityInfo` (its `plural` when set, else `pluralize(name)`), falling back to `pluralize` of a bare string when the array holds plain strings.
  5. Tests in `packages/lang-en-us/tests/` covering AC-14 (`{count:coins}` with three → `"three coins"`); tests in `packages/world-model/tests/` confirming the `plural` field round-trips through trait serialization; a `packages/stdlib/tests/` test that `entityInfoFrom(e)` carries `plural` when the trait sets it.
- **Exit state**: `countFormatter` renders `"three coins"` (and `"1 coin"`, `"0 coins"`); `pluralize()` is a named export reachable from formatters; `IdentityTrait` carries an optional `plural` field; `EntityInfo` carries an optional `plural` that `entityInfoFrom()` populates; tests green; no build errors in `world-model`, `stdlib`, or `lang-en-us`.
- **Status**: PENDING

---

### Phase 2: Rewrite `list` formatter — natural-language renderer (AC-1…AC-13)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `@sharpee/lang-en-us` `list` formatter rewrite; `the-list` variant; `names` fallback.
- **Entry state**: Phase 1 done; `pluralize()` exported; `IdentityTrait.plural` present; `countFormatter` fixed.
- **Deliverable**:
  1. Rewrite `listFormatter` in `packages/lang-en-us/src/formatters/list.ts` to consume `EntityInfo[]`:
     - Per-element article: `a`/`an` for common nouns (vowel-sound aware using entity's `article` or first-sound heuristic), `some` for mass nouns, none for proper/unique.
     - Grouping by rendered name: count-group identical names; spell out 2–10, numeric 11+; proper names and mass nouns never group.
     - Pluralization: use `EntityInfo`-supplied `plural` override (sourced from `IdentityTrait.plural`) when present, else `pluralize()` heuristic.
     - Join: commas + "and"; serial (Oxford) comma author-configurable via story setting (read from `context.settings?.serialComma`, default `true` when absent); empty → `"nothing"`.
  2. Add `theListFormatter` (definite variant, `{the-list:items}`) alongside `listFormatter`.
  3. Rename or alias the old name-only join behavior as `namesFormatter` (`{names:items}`) for non-entity string lists; keep `orListFormatter` and `commaListFormatter` unchanged.
  4. Register `the-list` and `names` in `packages/lang-en-us/src/formatters/registry.ts`.
  5. Tests in `packages/lang-en-us/tests/` covering all 13 behavioral ACs (AC-1 through AC-13) as individual `it` blocks with descriptive names traceable to AC numbers.
- **Exit state**: All 13 formatter ACs pass; `list` renders articles + grouping + Oxford comma; `the-list` renders definite variant; `names` provides the plain-name joiner; formatter registry exports all three; `lang-en-us` build clean.
- **Status**: PENDING

---

### Phase 3: Producer migration — `looking`, `going`, `switching_on` pass `EntityInfo[]` (ADR-158 fix)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `@sharpee/stdlib` standard actions; `entityInfoFrom` helper.
- **Entry state**: Phase 2 done; `listFormatter` consumes `EntityInfo[]`; passing bare `string[]` now produces wrong output (names without articles).
- **Deliverable**:
  1. Audit `packages/stdlib/src/actions/standard/` for all actions that pass `items.map(e => e.name)` (or any bare-string array) into a list placeholder: confirm `looking`, `going`, `switching_on` are the primary culprits; identify any others.
  2. Change each identified producer to pass `items.map(e => entityInfoFrom(e))` (or the equivalent `EntityInfo[]`).
  3. Update golden tests in `packages/stdlib/tests/` for the changed actions: old assertions like `"lamp, sword, and coin"` become `"a lamp, a sword, and a coin"` (or the grouping form).
  4. Check walkthrough transcripts (`stories/dungeo/tests/transcripts/*.transcript` and `stories/dungeo/walkthroughs/wt-*.transcript`) for assertions that match old list output; update any that changed.
- **Exit state**: All three (or more) producer actions pass `EntityInfo[]`; no stdlib action sends bare name strings to a list placeholder; existing stdlib tests green with new article-rendered output; no new walkthrough failures attributable to this change.
- **Status**: PENDING

---

### Phase 4: AC-9 end-to-end showcase test

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Integration across `world-model`, `stdlib`, `lang-en-us` pipeline.
- **Entry state**: Phases 1–3 done; `list` formatter, `IdentityTrait.plural`, and producer migration all in place.
- **Deliverable**:
  1. A test (in `packages/lang-en-us/tests/` or `packages/stdlib/tests/` — whichever is a cleaner harness for the pipeline) that:
     - Creates three entities (goat, rabbit, parrot) with standard `IdentityTrait` data.
     - Routes the room-contents message ID through the real `LanguageProvider` pipeline (not mocked formatters).
     - Asserts the rendered output is exactly `"You can see a goat, a rabbit, and a parrot here."` (AC-9).
  2. Confirm the test exercises the actual format pipeline end-to-end (no formatter stubs).
- **Exit state**: AC-9 test passes; the pipeline is proven end-to-end at the `LanguageProvider` level.
- **Status**: PENDING

---

### Phase 5: Documentation corrections (GH #167) and book Ch 19

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `packages/lang-en-us` source comments; `docs/book/` Ch 19.
- **Entry state**: Phases 1–4 done; the formatter is working and tested; `{list:items}` is the correct form.
- **Deliverable**:
  1. Correct all source-comment examples in `packages/lang-en-us/src/` that show backwards `{items:list}` order to `{list:items}` (GH #167 sweep).
  2. Update `docs/book/parts/part-5/19-the-formatter-chain.md`:
     - Fix any backwards placeholder examples.
     - Replace the Ch 19 list example with the AC-9 showcase output: `"You can see a goat, a rabbit, and a parrot here."`.
     - Ensure the `count` formatter example now shows `"three coins"`, not the broken `"3 items"`.
  3. Note where `genai-api` auto-regeneration applies (it regenerates from `.d.ts`; the JSDoc on `listFormatter` and `countFormatter` should describe the real contract so the auto-generated docs are accurate).
- **Exit state**: No backwards `{items:list}` examples remain in source or book; Ch 19 list example renders a real, working sentence; source JSDoc describes the real formatter contract; GH #167 is closed.
- **Status**: PENDING

---

### Phase 6: Build regression and walkthrough chain

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Build integrity; walkthrough regression baseline.
- **Entry state**: All five prior phases done; all unit tests green.
- **Deliverable**:
  1. `tsf build --npm` for `world-model`, `lang-en-us`, `stdlib` — clean.
  2. `./repokit build dungeo` — clean bundle.
  3. Run the dungeo walkthrough chain (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`); confirm no new failures (expected: any list-output-asserting lines were already updated in Phase 3).
  4. Work summary written for this ADR; committed on the working branch.
- **Exit state**: All 14 ACs pass (unit tests); `tsf build --npm` clean; walkthrough chain green; work summary committed; ADR-190 implementation complete and ready for user review before merge.
- **Status**: PENDING

---

## AC Coverage Map

| AC | Phase | Description |
|----|-------|-------------|
| AC-1 | 2 | Empty → "nothing" |
| AC-2 | 2 | `a goat` / `an apple` |
| AC-3 | 2 | Two items, no serial comma |
| AC-4 | 2 | Three items, Oxford comma on |
| AC-5 | 2 | Identical items group + pluralize |
| AC-6 | 2 | Proper names take no article |
| AC-7 | 2 | Mass noun → "some sand" |
| AC-8 | 2 | `the-list` definite variant |
| AC-9 | 4 | End-to-end pipeline showcase |
| AC-10 | 5 | Placeholder order corrected (GH #167) |
| AC-11 | 2 | Serial-comma setting on/off |
| AC-12 | 2 | Count threshold (10 spelled, 11 numeric) |
| AC-13 | 2 | Plural override (`IdentityTrait.plural`) beats heuristic |
| AC-14 | 1 | `count` formatter renders real noun (GH #166) |
