# Session Plan: ADR-192 — Phrase Algebra: Phrase Model & Assembler Core

**Created**: 2026-06-26
**Overall scope**: Implement the foundational phrase algebra on the v2 branch: language-neutral Phrase contracts in `@sharpee/if-domain`, the English Assembler with its six authorities in `@sharpee/lang-en-us`, `parsePhraseTemplate` replacing `parsePlaceholder`, `nounPhraseFor` replacing `entityInfoFrom`, and the new report pipeline. The formatter chain, `parsePlaceholder`, and `EntityInfo` are deleted; every `lang-en-us` message and stdlib action re-authors to the new grammar. ADR-190's List/EntityInfo work is ported in, not discarded — its 14 ACs must pass through the new phrase path. Nothing ships to `main`.
**Bounded contexts touched**: N/A — infrastructure/tooling (language pipeline refactor, no domain behavior change)
**Archive note**: This is the corrected plan archive (post-plan-review). See docs/context/plan.md for the live version.
**Key domain language**: N/A — the work is platform infrastructure; DDD framing does not apply

## References consulted

- `docs/architecture/adrs/adr-192-phrase-algebra-phrase-model-assembler-core.md` — The 11 Acceptance Criteria and the Scope/Consequences section define what the plan must deliver and what is explicitly out of scope (ADR-193–198 atoms stay out); the Resolved Decisions (kind extensibility = closed union, error handling = parse-time, producer binding = in scope for this ADR) constrain implementation choices.
- `docs/work/dynamic-text/phrase-algebra-design.md` — D3 establishes the v2 branch strategy (long-lived v2 branch, v2_phaseN naming, nothing cut until first breaking commit); D4 establishes EntityInfo→NounPhrase as a replace-not-extend; D5 establishes `@sharpee/if-domain` as the home for language-neutral phrase contracts (a new `@sharpee/text` package was explicitly rejected).
- `docs/architecture/adrs/adr-190-natural-language-list-rendering.md` — ACCEPTED; its 14 ACs must still pass through the phrase path (ADR-192 Consequences: "ADR-190 preserved, not discarded"). The List formatter logic is ported into the Assembler's PhraseList case rather than duplicated or deleted.
- `docs/architecture/adrs/adr-158-entity-info-in-message-params.md` — ACCEPTED; established `entityInfoFrom` and the rule that entity-valued params carry full metadata (not bare names). ADR-192 absorbs this: `entityInfoFrom` becomes `nounPhraseFor`, the metadata contract is preserved at the NounPhrase level. No bare-name regression is permitted.
- `docs/context/project-profile.md` — Vitest + pnpm workspace; strict TypeScript (noImplicitAny, noFallthroughCasesInSwitch); language-layer separation is a standing convention (no English strings in engine/stdlib/world-model). The plan's boundary between `if-domain` (language-neutral) and `lang-en-us` (English realization) must enforce this.
- `docs/context/session-20260626-0849-main.md` — ADR-192 is PROPOSED (not yet accepted); implementation requires explicit user approval before any phase begins. The stale Playwright E2E Phase 1 was the previous CURRENT phase and is superseded by this plan.

## AC Coverage Map

Every Acceptance Criteria from ADR-192 maps to at least one phase:

| AC | Description | Covered in Phase(s) |
|----|-------------|---------------------|
| AC-1 | Literal-only template renders byte-identical through the tree path | 2 |
| AC-2 | `{the item}` → "the cabinet" via NounPhrase + Assembler article authority | 2 |
| AC-3 | `{a item}` agrees a/an over the **rendered head** ("an owl", "an hour") | 2 |
| AC-4 | NounPhrase with static `IdentityTrait.adjectives` renders them; article agrees over leading adjective | 2 |
| AC-5 | List of NounPhrases groups, pluralizes, serial-comma — ADR-190 parity through phrase path | 2 + 4 |
| AC-6 | Empty inside Sequence/List leaves no dangling comma or whitespace | 2 |
| AC-7 | Assembler emits `ITextBlock[]`; `@sharpee/text-blocks` consumer unchanged | 2 + 4 |
| AC-8 | New parser rejects legacy `:`-chain syntax (`{cap:the:item}`) at parse time | 3 |
| AC-9 | Determinism: identical `(tree, world, ctx)` → identical output across repeated runs | 2 + 4 |
| AC-10 | `if-domain` Phrase types contain no locale logic; all realization in `lang-en-us` Assembler | 1 + 2 |
| AC-11 | Unknown kind-prefix or unbound param raises named error at parse time, not silent Empty at realize time | 3 |

## Phases

---

### Phase 1: v2 Branch Setup + `@sharpee/if-domain` Phrase Contracts
- **Branch**: `v2_phase1` (merges into `v2`)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: N/A — language-neutral type contracts only; no locale logic, no runtime code

- **Entry state**:
  - ADR-192 accepted by user
  - The current checkout is at `/home/dave/repos/sharpee_v2` on branch `main`. The `v2` branch does not yet exist. D3 prescribed `git worktree add ../sharpee_v2 -b v2` from a `repos/sharpee` primary checkout — but since this repo is already at `repos/sharpee_v2`, the worktree-add path would conflict with the current directory. The Phase 1 branch setup accounts for this reality.
  - `@sharpee/if-domain` has no Phrase types; `language-provider.ts` and `contracts.ts` exist as the adjacent contracts

- **Deliverable**:
  - `v2` branch created from `main` in the current repo (`git checkout -b v2`). This is the long-lived integration branch for all phrase-algebra work. Per D3 intent: `main`/1.x remains maintenance-only; all phrase-algebra work originates in phase branches (`v2_phase1`, `v2_phase2`, …) that merge into `v2`. **Note on worktree mechanics**: the D3 worktree-add (`git worktree add ../sharpee_v2 -b v2`) assumed a `repos/sharpee` primary checkout; since the current directory is already `repos/sharpee_v2`, the equivalent is creating the `v2` branch here. A separate `repos/sharpee_v1` worktree for the 1.x maintenance line can be created if needed at the time of first 1.x maintenance commit.
  - `packages/if-domain/src/phrase.ts` (or `phrase-types.ts`, placed beside `contracts.ts`) containing:
    - `PhraseBase` interface with `decorations?: Decoration[]`
    - Five concrete foundational kind interfaces: `Literal`, `NounPhrase`, `PhraseList`, `Sequence`, `Empty`
    - Seven stub kind interfaces for follow-on ADRs: `Pronoun`, `Numeral`, `Verbatim`, `Contents`, `Slot`, `Optional`, `Choice`
    - `Phrase` discriminated union (all 12 members — closed; extensible only additively per later ADR)
    - `PhraseProducer` type alias: `(ctx: RenderContext) => Phrase`
    - `RenderContext` interface with: read-only world, bound params, locale settings, and **declared seams**: `reference` (last-mentioned context), `textState` (per-`(entityId, messageKey)` store), `contribute(slotKey, phrase, opts)` (slot channel) — implementations deferred to ADR-195–197
    - `Assembler` interface: `realize(tree: Phrase, ctx: RenderContext): ITextBlock[]`
  - All existing `if-domain` barrel exports updated to include new types
  - TypeScript compiles with no errors across all packages that import `if-domain`
  - AC-10 boundary enforced structurally: `packages/if-domain/` contains no imports from `lang-en-us`; no locale strings (a/an/the/some) appear in `phrase.ts` — verified by TypeScript type checker and a `grep` assertion in the test suite

- **Test deliverable**:
  - Unit tests confirming kind type guards (`isLiteral`, `isNounPhrase`, etc.) work correctly
  - Compilation test: `pnpm --filter '@sharpee/if-domain' build` passes; no locale imports

- **Exit state**:
  - `@sharpee/if-domain` exports the complete Phrase union, PhraseProducer, RenderContext, and Assembler interface
  - No locale logic or locale strings in `if-domain`; the AC-10 boundary is structurally enforced
  - All downstream packages (lang-en-us, stdlib, engine) still compile against the updated if-domain (new exports are additive at this stage)
  - v2 branch exists and is the active worktree for all subsequent phases

- **Status**: NOT STARTED

---

### Phase 2: English Assembler + Foundational Kind Realization
- **Branch**: `v2_phase2` (merges into `v2`)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: N/A — English realization in `lang-en-us`; ports ADR-190 list formatter into Assembler

- **Entry state**:
  - Phase 1 complete: `@sharpee/if-domain` exports the full Phrase union and Assembler interface
  - ADR-190 list formatter exists in `lang-en-us/src/formatters/list.ts` (the logic to be ported)
  - Old formatter chain (`applyFormatters`, registry) still intact — not yet deleted (deletion is Phase 3)

- **Deliverable**:
  - `EnglishAssembler` class in `packages/lang-en-us/src/assembler/` implementing the `Assembler` interface
  - Assembler cases for the five foundational kinds:
    - **`Literal`**: pass text through to `ITextBlock`; respect `whitespace: 'verbatim'` exemption from collapse (whitespace authority)
    - **`NounPhrase`**: article authority (a/an computed over rendered head including adjectives; the/some/∅ from `articleType`); adjective prefixing from `NounPhrase.adjectives` (sourced from `IdentityTrait.adjectives`); plural agreement for count-group rendering; sentence-start case authority
    - **`PhraseList`**: group identical items by rendered name; count-group with spelled-out 2–10, numeric 11+; serial-comma authority (configurable via locale settings, default on); `and`/`or` conjunctions; `Empty` items absorbed (no dangling comma); definite and indefinite variants; empty list → "nothing". This is the ADR-190 list formatter logic ported to a phrase case.
    - **`Sequence`**: ordered concatenation under one punctuation authority; whitespace collapse; `Empty` parts absorbed
    - **`Empty`**: returns nothing; leaves no comma, space, or whitespace artifact when inside Sequence or PhraseList
  - Assembler cases for the seven stub kinds: throw a `PhraseNotImplementedError` naming the kind and referencing the follow-on ADR
  - The Assembler's six named authorities established (Article, Agreement, Punctuation, Whitespace, Reference placeholder, Case)
  - ADR-190 list formatter logic **moved** into the PhraseList case (not duplicated); `lang-en-us/src/formatters/list.ts` is deprecated or deleted at this step
  - `@sharpee/text-blocks` downstream contract is unchanged — Assembler emits `ITextBlock[]` exactly as before (AC-7)

- **Test deliverable**:
  - AC-1: Literal round-trip test — `Literal { text: "You see a lamp." }` → `ITextBlock` with identical text
  - AC-2: NounPhrase definite — entity with name "cabinet", articleType "definite" → "the cabinet"
  - AC-3: a/an agreement — "owl" → "an owl"; "goat" → "a goat"; "hour" → "an hour" (leading sound agreement)
  - AC-4: Static adjectives — NounPhrase with `adjectives: ['small', 'iron']` + name "chest" + articleType "indefinite" → "a small iron chest"
  - AC-5 (ADR-190 parity): All 14 ADR-190 ACs exercised through the phrase path (not the old formatter path):
    - AC-1: `[]` → "nothing"
    - AC-2: `[goat]` → "a goat"; `[apple]` → "an apple"
    - AC-3: two items, no serial comma
    - AC-4: three items, Oxford comma on
    - AC-5: identical items group → "two goats and a parrot"
    - AC-6: proper names → no article
    - AC-7: mass noun → "some sand"
    - AC-8: definite variant `{the-list}` equivalent
    - AC-9: end-to-end room-contents message
    - AC-10–14: count threshold, plural override, serial-comma toggle, count formatter
  - AC-6: Empty in PhraseList — `[NounPhrase, Empty, NounPhrase]` → no dangling comma between items
  - AC-6: Empty in Sequence — `[Literal "You see ", Empty, Literal "."]` → "You see ."  with no double space
  - AC-7: Return type assertion — `realize(...)` return type is `ITextBlock[]`; TypeScript compilation confirms
  - AC-9: Determinism — same phrase tree + same ctx → byte-identical output across 3 consecutive runs
  - AC-10: No locale strings in `if-domain` (regression guard via grep in test setup)

- **Exit state**:
  - `EnglishAssembler.realize()` handles all five foundational kinds and throws named errors for the seven stub kinds
  - All AC-1 through AC-7 and AC-9 pass
  - ADR-190's 14 ACs all pass through the phrase path
  - `lang-en-us` list formatter logic has migrated into the Assembler; no duplication
  - Old formatter chain (`applyFormatters`) still exists in `lang-en-us` but is not called by the Assembler (isolation test confirms this)

- **Status**: NOT STARTED

---

### Phase 3: `parsePhraseTemplate` + `nounPhraseFor` + Infrastructure Deletion
- **Branch**: `v2_phase3` (merges into `v2`)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: N/A — parser implementation, producer migration, and mass deletion of legacy infrastructure

- **Entry state**:
  - Phase 2 complete: EnglishAssembler handles all five foundational kinds
  - `parsePlaceholder` still exists in `lang-en-us`
  - `EntityInfo` and `entityInfoFrom` still exist in `stdlib/utils/entity-info.ts`
  - All `lang-en-us` message templates still use `:` chain syntax (`{the:item}`, `{cap:the:item}`)
  - All stdlib standard actions still pass `entityInfoFrom(e)` to message params

- **Deliverable**:
  - `parsePhraseTemplate(template: string, params: Record<string, unknown>): Phrase` in `lang-en-us/src/parser/`
    - Unprefixed bare reference (`{item}`) → `NounPhrase` (default kind)
    - Leading hint words (`{the item}`, `{a item}`, `{an item}`, `{some item}`, `{capitalize the item}`) → `NounPhrase` with corresponding `articleType` and/or capitalization hint
    - `kind:` head (`{pronoun:it}`, `{number:coins words}`, `{contents:box}`, `{slot:detail}`, `{verbatim:banner}`) → routes to correct stub kind (for follow-on ADRs)
    - Rejects `:` chain syntax: `{cap:the:item}` → throws `PhraseParseError` naming the offending token and template text (AC-8)
    - Unknown kind-prefix: `{unknownkind:foo}` → throws `PhraseParseError` at parse time, not a silent `Empty` at realize time (AC-11)
    - Unbound param: `{the missingParam}` where `missingParam` is not in `params` → throws `PhraseParseError` at parse time (AC-11)
  - `PhraseParseError` class with fields: `offendingToken: string`, `template: string`, `reason: string`
  - `nounPhraseFor(entity: IFEntity, ctx: RenderContext): NounPhrase` in `stdlib/utils/`
    - Applies the full IdentityTrait → NounPhrase field mapping from ADR-192 §3:
      - `name` → `name`
      - `adjectives` → `adjectives` (static; AC-4 source)
      - `plural` → `pluralForm`
      - `grammaticalNumber` → `number` (`mass` from `nounType: 'mass'`)
      - `properName` / `nounType: 'proper'` → `properName: true`
      - `nounType` → `articleType` default (`proper`→`none`, `mass`→`some`, else `indefinite`)
      - `entity.id` → `referableId`
      - `pronouns` (if present) → `pronounSet`
    - Template article hint overrides the `nounType`-derived default
    - The legacy `article: 'a'|'an'` literal from `EntityInfo` is **not** mapped (it is the Assembler's to compute — D4)
  - **Deleted**:
    - `parsePlaceholder` and its `:` chain parsing logic
    - `EntityInfo` type and `entityInfoFrom` function from `stdlib/utils/entity-info.ts`
    - `applyFormatters` and the formatter registry (`lang-en-us/src/formatters/registry.ts`)
    - Individual formatters that are now subsumed by the Assembler: `article.ts`, `list.ts` (already moved in Phase 2), `verb.ts`, `cap.ts` — each replaced by the corresponding Assembler authority
  - **Re-authored**: all `lang-en-us` message templates from `:` chain syntax to new phrase grammar (e.g., `{the:item}` → `{the item}`, `{cap:the:item}` → `{capitalize the item}`). Note: `{list:items}` is **not** a valid kind prefix in the new grammar — `list:` is not among the recognized kind prefixes (`pronoun:`, `number:`, `contents:`, `slot:`, `verbatim:`). Messages that formerly used `{list:items}` are re-authored: the report layer builds a `PhraseList` programmatically and binds it to a param name, which the template references as `{items}` (a bare NounPhrase default) or the action explicitly returns a PhraseList producer bound to the param key.
  - **Migrated**: all stdlib standard actions updated to call `nounPhraseFor(e, ctx)` instead of `entityInfoFrom(e)` for entity-valued params

- **Test deliverable**:
  - `parsePhraseTemplate` unit tests:
    - Round-trip: `{the item}` with `params.item` bound → produces correct `NounPhrase` tree
    - Round-trip: `{item}` (bare default) → produces `NounPhrase` with `articleType: 'indefinite'`
    - AC-8: `{cap:the:item}` → `PhraseParseError` with offending token `cap:the:item`
    - AC-11: `{unknownkind:foo}` → `PhraseParseError` at parse time, error names `unknownkind`
    - AC-11: `{the unbound_param}` with empty params → `PhraseParseError` at parse time, error names `unbound_param`
  - `nounPhraseFor` field-mapping tests:
    - Each IdentityTrait field maps to the correct NounPhrase field
    - `properName: true` → `articleType: 'none'`
    - `nounType: 'mass'` → `articleType: 'some'`
    - Template article hint (`{the item}`) overrides `nounType`-derived default
    - Legacy `article: 'a'|'an'` literal does NOT appear in NounPhrase output
  - Deletion verification: `grep -r 'parsePlaceholder\|entityInfoFrom\|EntityInfo\|applyFormatters' packages/` → zero hits in non-test source files

- **Stale ADR to amend in this phase**: ADR-158's "Constrains Future Sessions" section still reads "New stdlib actions must use `entityInfoFrom()` for entity-valued message params." Once `entityInfoFrom` is deleted in Phase 3, this constraint is superseded. Append a note to ADR-158 §Consequences: "Superseded on `v2` by ADR-192: `entityInfoFrom` is deleted; use `nounPhraseFor(entity, ctx)` instead." This is a documentation-only update and does not change the constraint's spirit — entity-valued params must still carry full metadata, now via `NounPhrase`.

- **Exit state**:
  - `parsePhraseTemplate` is the sole template parser in `lang-en-us`
  - `nounPhraseFor` is the sole entity-to-phrase producer in stdlib
  - The legacy formatter chain, `parsePlaceholder`, `EntityInfo`, and `entityInfoFrom` are deleted from source
  - All lang-en-us message templates use the new grammar
  - All stdlib standard actions use `nounPhraseFor`
  - ADR-158 §Consequences updated with the v2 supersession note
  - AC-8 and AC-11 pass

- **Status**: NOT STARTED

---

### Phase 4: Report Pipeline Integration + End-to-End Verification
- **Branch**: `v2_phase4` (merges into `v2`)
- **Tier**: Large
- **Budget**: 400 tool calls
- **Domain focus**: N/A — engine/report wiring; full integration test suite; walkthrough test migration

- **Entry state**:
  - Phase 3 complete: `parsePhraseTemplate`, `nounPhraseFor`, `EnglishAssembler` all implemented; legacy infrastructure deleted
  - Engine/report layer still uses the old event → formatter chain path (the last remaining caller of the deleted infrastructure — Phase 3 deletion may require temporary stubs or build-order management)
  - Walkthrough test transcripts assert on text strings produced by the old formatter chain

- **Deliverable**:
  - Engine/report layer wired to the phrase tree pipeline (per ADR-192 §6):
    - Event `(messageId, params)` → `parsePhraseTemplate` → `Phrase` tree
    - `RenderContext` runtime implemented with:
      - `reference` seam: placeholder implementation (returns `Empty`; full implementation deferred to ADR-197)
      - `textState` seam: placeholder implementation (empty store; full implementation deferred to ADR-196)
      - `contribute` seam: placeholder implementation (no-op; full implementation deferred to ADR-195)
    - `EnglishAssembler.realize(tree, ctx)` called at end of turn → `ITextBlock[]`
    - `@sharpee/text-blocks` downstream unchanged (AC-7 end-to-end)
  - Standard actions updated for phrase-native output:
    - `looking`, `going`, `switching_on`, and all other list-producing actions build `PhraseList` of `NounPhrase` items (not EntityInfo[])
    - Report services build `Sequence` trees from event streams
  - Full integration test suite covering all 11 ADR-192 ACs end-to-end through the pipeline
  - ADR-190 end-to-end parity (AC-5 + ADR-190 AC-9): the room-contents message "You can see a goat, a rabbit, and a parrot here." renders correctly through the phrase path
  - Determinism verified end-to-end: same world state + same turn → identical output across two separate runs (AC-9)
  - Walkthrough transcripts (`stories/dungeo/walkthroughs/wt-*.transcript`) updated to reflect new output format (articles, grouping, and Oxford comma where the old formatter chain produced different text)
  - `./repokit build dungeo` passes on the v2 branch
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` passes

- **Test deliverable**:
  - Integration test: each of AC-1 through AC-11 exercised via a full pipeline invocation (not just unit)
  - ADR-190 AC-9 integration: room-contents list in a live turn renders with articles + serial comma
  - Determinism integration: two successive runs of the same transcript produce byte-identical output (AC-9)
  - Boundary integration: a grep over the compiled `dist/cli/sharpee.js` confirms `parsePlaceholder` and `EntityInfo` are absent
  - Full walkthrough chain passes on v2 branch

- **Exit state**:
  - The phrase tree → Assembler pipeline is the sole text-production path in the engine; the formatter chain path does not exist
  - All 11 ADR-192 ACs pass in integration
  - All 14 ADR-190 ACs pass through the phrase path
  - Walkthrough chain passes on v2 branch
  - ADR-192 implementation is complete; ADR-193–198 are the next work items on v2

- **Status**: NOT STARTED

---

## Test Strategy Summary

**Layered verification** — each phase adds a test tier; later phases do not replace earlier ones:

| Phase | Test tier | What it guards |
|-------|-----------|----------------|
| 1 | TypeScript compilation + type guards | AC-10 boundary (no locale in if-domain); kind discriminators work |
| 2 | Assembler unit tests | AC-1–7, AC-9; ADR-190 14-AC parity through phrase path |
| 3 | Parser unit tests + deletion grep | AC-8, AC-11; legacy infrastructure is gone from source |
| 4 | Integration + walkthrough chain | All ACs end-to-end; determinism; ADR-190 AC-9 in pipeline; walkthrough parity |

**ADR-190 parity requirement**: The 14 ADR-190 ACs are verified twice — in Phase 2 (unit, through the Assembler's PhraseList case) and in Phase 4 (integration, through the full pipeline). Neither pass supersedes the other. ADR-190 is ACCEPTED and its criteria are non-negotiable; the phrase path must deliver them at least as faithfully as the formatter path did.

**Determinism guard (AC-9)**: The Assembler is a pure function of `(tree, world, ctx)`. Tests confirm identical inputs → byte-identical output across N runs. The seeded selectors and persistent `textState` store required to make `Choice`/`Optional` deterministic are specified in ADR-196; their placeholder implementations in Phase 4 must not introduce any non-determinism.

**Parse-time error contract (AC-11)**: Rejection tests confirm that `PhraseParseError` is thrown synchronously by `parsePhraseTemplate` — not by the Assembler at realize time and not as a silent `Empty`. Tests include the error message text asserting it names the offending token and template.

**Legacy syntax rejection (AC-8)**: Rejection tests confirm that any template using the old `:` chain (e.g., `{cap:the:item}`, `{the:item}`, `{a:item:list}`) throws `PhraseParseError`. This is the clean break per D2.

**No bare-name regression (ADR-158 constraint)**: Tests confirm `nounPhraseFor` produces full NounPhrase metadata (not bare strings) for every entity-valued param, matching the ADR-158 discipline.
