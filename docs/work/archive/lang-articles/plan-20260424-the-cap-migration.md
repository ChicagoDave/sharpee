# Plan: Article-Aware Message Templates (`{the:cap:item}` Migration)

**Branch**: `lang-articles-migration`
**Started**: 2026-04-24
**Related**: ADR-089 (perspective), ADR-095 (formatters), ADR-107 (nameId), white-house bug report

---

## Problem Statement

Scenery and other entities render in player output without their articles. Example reproduced from Dungeo:

> `> take white house`
> `white house is fixed in place.`

The expected rendering is `The white house is fixed in place.`

Root cause is a bug class affecting ~130 templates across `packages/lang-en-us/`:

1. ~80 templates in `packages/lang-en-us/src/actions/*.ts` start a sentence with a raw `{item}` / `{target}` / `{recipient}` placeholder and no article.
2. ~50 templates in `packages/lang-en-us/src/data/templates.ts` use `{item:cap}` / `{target:cap}` — capitalizing the string but still dropping the article.

Both render wrong for common nouns. Proper-named entities render correctly today because their name reads as a sentence-start noun ("John is fixed in place.").

The language layer already has the right machinery: ADR-095 `the` / `a` / `some` formatters respect `nounType` and `properName` to choose (or skip) the correct article. But every stdlib callsite passes `noun.name` (a bare string) in `params`, so the formatters have no metadata to consult. `setEntityLookup` exists on the provider API but is never wired by the engine.

## Goal

Every player-facing template that names an entity renders with a correct, perspective-invariant article that honors the entity's declared `IdentityTrait` (`article`, `properName`, `nounType`). Proper-named entities skip the article; mass nouns render `some X`; unique/common nouns render `the X`/`The X`.

## Non-Goals

- **No perspective-aware article logic.** English definite/indefinite articles do not vary by narrator person; possessives (`my`/`your`/`her`) are already handled by ADR-089 and remain a separate concern.
- **No `nameId` resolution changes.** ADR-107 localized-name resolution is a parallel issue; out of scope here. If a template we migrate uses an entity whose name flows through `nameId`, we note the gap but do not fix it in this work.
- **No new `setEntityLookup` wiring.** We solve the missing-metadata problem by passing `EntityInfo` explicitly in `params`, not by lookup indirection. Keeps the flow one-way and testable.
- **No story-side changes.** Stories already populate `IdentityTrait.article` / `.properName` / `.nounType` correctly. The helper reads what stories write today.

## Architectural Principle

Per CLAUDE.md "Always Trust the Architecture": ADR-095 already defines the pattern. We are not inventing anything — we are wiring the existing formatter system end-to-end.

The responsibility split:
- **stdlib actions** produce `params` containing `EntityInfo` for every entity-valued placeholder.
- **lang templates** use `{the:cap:item}` / `{a:cap:item}` / `{the:item}` / etc. as appropriate for the sentence context.
- **lang formatters** remain unchanged — they already branch on `nounType`/`properName`.

## Phased Rollout

### Phase 1 — Helper + unit tests

**Goal**: single source of truth for converting `IFEntity` → `EntityInfo` as the formatters consume it.

**Helper location**: `packages/stdlib/src/utils/entity-info.ts`. stdlib is the natural junction — it already depends on both `@sharpee/world-model` (source of `IFEntity`) and `@sharpee/lang-en-us` (source of `EntityInfo`). Placing the helper in `world-model` would force a `world-model → lang-en-us` dep that inverts the domain-vs-presentation direction. If a future non-stdlib consumer needs `EntityInfo`, the right move at that point is extracting the type to `if-domain` (separate ADR), not relocating the helper now.

**Work**:
1. Add `packages/stdlib/src/utils/entity-info.ts`:
   ```ts
   export function entityInfoFrom(entity: IFEntity): EntityInfo;
   ```
   Reads `IdentityTrait` fields: `name`, `article`, `properName`, `nounType`, `adjectives`. Falls back to `{ name: entity.name }` if no `IdentityTrait` is present.
2. Re-export from `packages/stdlib/src/utils/index.ts` and package barrel.
3. Unit tests in `packages/stdlib/tests/unit/utils/entity-info.test.ts`:
   - Common noun with explicit article
   - Proper name — skips article
   - Unique noun (nounType: 'unique') — formatter emits "the"
   - Mass noun (nounType: 'mass') — formatter emits "some"
   - Plural noun (nounType: 'plural') — formatter emits name alone
   - Missing IdentityTrait — returns `{ name: entity.name }`
   - Aliases / adjectives preserved
4. Integration test: `packages/stdlib/tests/integration/entity-info-formatter.test.ts` passes the new helper output through `theFormatter`, `aFormatter`, `someFormatter`, and confirms rendering matches expectations for each noun type.

**Behavior Statement** (rule 11):
- **entityInfoFrom**
- DOES: returns an EntityInfo object populated from the entity's IdentityTrait
- WHEN: called with any IFEntity
- BECAUSE: formatters need nounType/properName/article metadata; passing raw name strings drops this
- REJECTS WHEN: never rejects; missing IdentityTrait returns a minimal `{ name }` so callers do not need guard clauses

**Exit criteria**: all world-model and lang-en-us tests green.

### Phase 2 — Pilot one action end-to-end (taking)

**Goal**: prove the migration on a single action, across all its templates, including a regression transcript.

**Work**:
1. Update `packages/stdlib/src/actions/standard/taking/taking.ts`: every `params: { item: noun.name, ... }` becomes `params: { item: entityInfoFrom(noun), ... }`. Same for `container`, `surface`, etc., wherever they are entities.
2. Update `packages/lang-en-us/src/actions/taking.ts` templates: every sentence-start `{item}` / `{item:cap}` becomes `{the:cap:item}`. Mid-sentence `{item}` becomes `{the:item}`. Template-by-template review; no blind replace.
3. Update `packages/lang-en-us/src/data/templates.ts` `taking.*` entries the same way.
4. Update existing `taking` unit tests in stdlib to assert on the rendered strings (not just event shapes).
5. Add transcript test `stories/dungeo/tests/transcripts/article-rendering.transcript`:
   - `> take white house` → asserts contains `"The white house is fixed in place."`
   - `> take ground` or similar common-noun scenery → asserts contains `"The "`
   - Where a proper-named NPC exists (cyclops, troll if addressable by TAKE), assert output does NOT contain `"The cyclops"` (a proper-name regression sentinel).

**Behavior Statement for migrated templates** (rule 11):
- **taking.fixed_in_place rendering**
- DOES: emits player-visible text `"<Article><Name> is fixed in place."` where article is chosen by formatter from nounType/properName/article
- WHEN: action validation fails with FIXED_IN_PLACE on a scenery entity
- BECAUSE: suppressing the article produces ungrammatical output ("white house is fixed in place"); the existing formatter respects entity configuration
- REJECTS WHEN: N/A (pure rendering path)

**Exit criteria**: taking tests green; new transcript passes; full walkthrough chain (`wt-*`) passes without modification (no walkthrough may be silently depending on broken output).

### Phase 3 — Roll out per action

**Cadence**: one action per commit. Each commit contains (a) callsite migration in stdlib, (b) template updates in lang-en-us, (c) test updates. Allows any single action's migration to be reverted if it introduces a subtle regression.

**Order** (by blast radius, most-used first):
1. pushing
2. pulling
3. opening, closing
4. locking, unlocking
5. examining
6. putting, inserting, removing
7. switching_on, switching_off
8. entering, exiting
9. throwing, attacking
10. giving, showing
11. talking, asking, telling
12. smelling, listening, touching
13. turning, climbing, searching
14. using, dropping
15. wearing, taking_off
16. reading, eating, drinking

For each action:
- Audit every `params:` shape in the action file.
- Every value that is an entity's name gets replaced with `entityInfoFrom(entity)`.
- Every template referencing that placeholder at sentence start gets `{the:cap:placeholder}`; mid-sentence gets `{the:placeholder}`; indefinite contexts get `{a:placeholder}` or `{a:cap:placeholder}`.
- Update the action's unit tests to assert on rendered output where applicable.
- Run the walkthrough chain after each action; update any transcript `[OK: contains "..."]` matchers whose expected text was written around the broken rendering. Flag these in the commit message so the test expectation change is visible.

**Behavior Statement per action**: same shape as Phase 2, adapted per action.

**Exit criteria for Phase 3**: every action migrated; stdlib test suite green; Dungeo walkthrough chain green.

### Phase 4 — Regression lock-in + ADR

**Work**:
1. Grep for any remaining sentence-start `{item}` / `{target}` / `{recipient}` / `{viewer}` / `{container}` / `{surface}` / `{destination}` / `{object}` / `{key}` patterns and the `{*:cap}` variants in `packages/lang-en-us/src/`. Confirm zero hits, or document any intentional holdouts and why.
2. Add an **advisory** scanner script at `scripts/audit-templates.ts` (or `.sh`) that scans every template file and prints any sentence-start raw-entity placeholders with the suggested fix. **Not wired into CI.** A developer or maintainer can run `pnpm audit:templates` (or equivalent) on demand. The output names the offending message IDs and recommends `{the:cap:…}` / `{a:cap:…}`. Includes an inline allowlist comment for known-intentional exceptions (e.g., list-label patterns like `{item}: Taken.`).
3. Write ADR: `docs/architecture/adrs/adr-158-entity-info-in-message-params.md`. *(Already drafted alongside this plan.)*
4. Update CLAUDE.md's "Language Layer Separation" subsection with a one-line rule: "Entity-valued template parameters pass `entityInfoFrom(entity)`, not `entity.name`."

**Exit criteria**: ADR merged; advisory scanner runs cleanly (or only flags allowlisted entries); CLAUDE.md updated.

**Note on enforcement** (per user decision): the guardrail is intentionally **advisory-only**, not blocking in CI. The choice trades mechanical prevention for lower friction on legitimate template additions and stories that may want to extend the system in unforeseen ways. ADR-158 + CLAUDE.md + the manual scanner are the durable artifacts. If the bug class recurs, future maintainers may revisit this decision and promote the scanner to a blocking test.

## Files Touched (estimate)

- **New**: 1 helper, 1 helper test, 1 integration test, 1 guardrail test, 1 transcript, 1 ADR ≈ 6 files.
- **Modified**: ~30 stdlib action files, ~30 lang-en-us action template files, 1 `data/templates.ts`, stdlib test updates, ~5-10 walkthrough transcripts (assertions rewording), CLAUDE.md ≈ ~80 files.

## Risks

1. **Walkthrough expectation drift.** Any transcript that matches a broken-output substring ("white house is fixed") needs updating. We will discover these during Phase 3 per-action runs. Mitigation: document every transcript change in its commit; `pattern-recurrence-detector` run at the end flags if this becomes widespread.
2. **NPC message templates.** Actions like `giving` / `talking` reference NPCs by name. Proper-named NPCs (Cyclops, Troll) must render WITHOUT "The" — this is the proper-name sentinel and is the single highest-value test case, covered in Phase 2 transcript and again per-action.
3. **Story-specific templates** (e.g., `stories/dungeo/src/messages/*-messages.ts` and interceptor messages) may have the same pattern. Plan here does not touch them; if any Dungeo-side renderings are wrong after Phase 3, they get a follow-up issue (not scope creep into this branch).
4. **`nameId` (ADR-107) interaction.** If an entity uses `nameId` for localized naming, `entityInfoFrom` returns the literal `name`, which may render raw untranslated text. Out of scope — flagged as follow-up.

## Test Strategy Summary

- **Unit**: entity-info helper; each formatter round-trip (already covered in lang-en-us tests).
- **Integration**: entity-info → formatter rendering for all five nounType cases.
- **Action-level**: each migrated action's existing unit tests updated to assert on rendered strings where possible.
- **Transcript regression**: `article-rendering.transcript` in Phase 2, asserting both common-noun ("The white house") and proper-noun (no "The" prefix) paths.
- **Guardrail**: Phase 4 template-static-scan test prevents reintroduction.

## Commit / Branch Discipline

- Branch `lang-articles-migration` (created).
- Phase 1: one commit for helper + tests.
- Phase 2: one commit for pilot action + transcript.
- Phase 3: one commit per action.
- Phase 4: one commit for ADR + CLAUDE.md + guardrail test.
- Merge to main only after full Dungeo walkthrough chain passes.

## Open Questions for User (resolved)

1. ~~Helper location~~ — **Resolved: Option B** (helper in stdlib). See Phase 1 "Helper location" note.
2. ~~Phase 3 cadence~~ — **Resolved: one commit per action.**
3. ~~ADR numbering~~ — **158** (drafted alongside this plan).
4. ~~Phase 4 guardrail~~ — **Resolved: advisory-only, no CI triggers.** Manual scanner script + ADR + CLAUDE.md rule. See Phase 4 "Note on enforcement."
