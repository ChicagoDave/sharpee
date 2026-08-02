# Session Plan: ADR-189 entity-default-traits registry + formatter doc fix (#167)

**Created**: 2026-06-24
**Branch**: `feature/adr-189-entity-default-traits`
**Overall scope**: Two platform fixes that surfaced during the book copy-edit pass:
(1) ADR-189 — declarative entity-type → default-trait registry in world-model, prerequisite
`IFEntity.add()` replace-on-same-type change, and SCENERY auto-trait; (2) GH #167 — formatter
placeholder syntax documented backwards in five source files and one book chapter (`{items:list}`
shown where `{list:items}` is required).
**Deferred (out of this plan)**: GH #166 (`countFormatter` hardcodes `"items"` for count > 1). The
pluralization contract needs its own decision, and the existing `pluralize()` helper
(`language-provider.ts:545`) plus the existing "caller pluralizes" comment (`list.ts:90`) should be
weighed first. Handle in a separate session.
**Bounded contexts touched**: N/A — platform/infrastructure work (world-model, lang-en-us packages and tests)
**Key domain language**: N/A

## References consulted

- `docs/architecture/adrs/adr-189-entity-type-default-traits-registry.md` — ACCEPTED; defines the
  registry contract, `add()` replace-on-same-type prerequisite, SCENERY-only initial mapping, opt-out
  flag, and AC-1…AC-7 acceptance criteria that must become tests.
- `docs/context/project-profile.md` — world-model, stdlib, and lang-en-us are publishable packages;
  `tsf build --npm` regression is required after changes to any of them. Test convention: a separate
  `tests/` dir per package, `*.test.ts`.
- `docs/context/session-20260624-0230-main.md` — Open Items: GH #167 (placeholder order backwards) is
  the direct source of Phase 2. (GH #166 was also filed there; deferred out of this plan.)

---

## Phases

### Phase 1: `IFEntity.add()` replace-on-same-type + ADR-189 default-trait registry (world-model + stdlib)

- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `packages/world-model` (entity/trait layer) and `packages/stdlib` (taking action test)
- **Entry state**: Clean branch `feature/adr-189-entity-default-traits`; `packages/world-model` builds and passes its current tests; `packages/stdlib` taking tests pass.
- **Deliverable**:
  1. `packages/world-model/src/entities/if-entity.ts` — `add()` changed from first-wins-ignore (with `console.warn`) to **silent replace-on-same-type**: if a trait of the same `TraitType` is already present, it is silently overwritten with the new trait instance and params; no warning emitted. Audit all `.add(` call sites in `packages/` to confirm none relied on first-wins behavior.
  2. `packages/world-model/src/world/WorldModel.ts` — `createEntity` gains optional third parameter `opts?: { defaultTraits?: boolean }` (default `true`). After the entity is constructed, consult the registry and call `entity.add(factory())` for each registered factory for the entity's type.
  3. `packages/world-model/src/world/default-trait-registry.ts` (new file) — exports `DEFAULT_TRAITS: Map<string, DefaultTraitFactory[]>` with the single mapping `EntityType.SCENERY → [() => new SceneryTrait()]`. Exported as package-internal; not part of the public API surface.
  4. World-model tests covering AC-1, AC-3, AC-4, AC-5, AC-6, AC-7 (see ADR-189). Each AC maps to at least one `*.test.ts` in `packages/world-model/tests/` (per the project's separate-`tests/`-dir convention).
  5. Stdlib taking test (`packages/stdlib/tests/`) covering AC-2: a `SCENERY`-typed entity created with no explicit `SceneryTrait` add is refused by the taking action with `fixed_in_place`.
  6. `docs/reference/core-concepts.md` — note that `createEntity` consults the default-trait registry; link to ADR-189.
- **Exit state**: All world-model tests pass; stdlib taking tests pass; `pnpm --filter '@sharpee/world-model' test` and `pnpm --filter '@sharpee/stdlib' test taking` both green; AC-1 through AC-7 each have a named, passing test. The `console.warn` duplicate-trait path is gone.
- **Status**: CURRENT

---

### Phase 2: Fix backwards `{items:list}` placeholder examples in docs and source (GH #167)

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `packages/lang-en-us` (comment-only changes to 4 source files) + book chapter
- **Entry state**: Phase 1 complete and committed; no build change required for this phase (comment
  fixes only in source; prose fix in book chapter).
- **Deliverable**:
  1. Five source-file comment fixes — every occurrence of `{items:list}` in a doc-comment example
     changed to `{list:items}` (correct order: formatters first, placeholder last):
     - `packages/lang-en-us/src/formatters/types.ts` — header comment example (line 8)
     - `packages/lang-en-us/src/formatters/index.ts` — header comment example (line 8–9)
     - `packages/lang-en-us/src/formatters/list.ts` — JSDoc on `countFormatter` (line 79)
     - `packages/lang-en-us/src/formatters/registry.ts` — `formatMessage` JSDoc (line 116) and
       `parsePlaceholder` example
     - `packages/lang-en-us/src/language-provider.ts` — two comment occurrences (lines 44, 165)
  2. Book chapter fix: `docs/book/parts/part-5/19-the-formatter-chain.md` — line 90 and any other
     `{items:list}` example replaced with `{list:items}`.
  3. Verify no other source or book files contain the backwards form: `grep -rn "{items:list}"
     packages/ docs/book/` should return zero hits after the fix.
  4. No code behavior changes; no new tests needed (the formatter logic is unchanged; only comments
     and docs are touched).
- **Exit state**: `grep -rn "{items:list}" packages/ docs/book/` returns zero hits; GH #167 can be
  closed; `pnpm --filter '@sharpee/lang-en-us' test` still passes (no regressions).
- **Status**: PENDING

---

### Phase 3: Build regression + book follow-up note

- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: Build verification and documentation follow-up
- **Entry state**: Phases 1–2 complete and committed.
- **Deliverable**:
  1. `tsf build --npm` regression run (per feedback `npm_build_regression`): verifies no
     publishable-package regressions were introduced. Packages to verify: `@sharpee/world-model`,
     `@sharpee/stdlib`, `@sharpee/lang-en-us`.
  2. `./repokit build dungeo` end-to-end build confirms the story still compiles with the updated
     world-model.
  3. Book chapter follow-up (out-of-scope for this branch, documented only): the *Scenery & Portable
     Objects* chapter (ch05) — note that the warning paragraph ("EntityType.SCENERY without
     SceneryTrait is still takeable…") can be softened or removed once this branch lands. Do NOT edit
     the chapter in this branch; the note is for the next book-editorial session.
  4. Session work summary written.
- **Exit state**: `tsf build --npm` exits 0 for all three packages; `./repokit build dungeo` exits
  0; work summary committed alongside code changes.
- **Status**: PENDING

---

## Verification Commands (reference)

```bash
# Phase 1
pnpm --filter '@sharpee/world-model' test
pnpm --filter '@sharpee/stdlib' test taking

# Phase 2 (#167 — zero-hit + no-regression)
grep -rn "{items:list}" packages/ docs/book/
pnpm --filter '@sharpee/lang-en-us' test

# Phase 3 (build regression)
tsf build --npm --package world-model
tsf build --npm --package stdlib
tsf build --npm --package lang-en-us
./repokit build dungeo
```

## Key Files

- `packages/world-model/src/entities/if-entity.ts` — `add()` change (Phase 1)
- `packages/world-model/src/world/WorldModel.ts` — `createEntity` opts + registry consult (Phase 1)
- `packages/world-model/src/world/default-trait-registry.ts` — new registry file (Phase 1)
- `packages/world-model/tests/` — AC-1, AC-3..AC-7 tests (Phase 1)
- `packages/stdlib/src/actions/standard/taking/taking.ts` — AC-2 test target; test in `packages/stdlib/tests/` (Phase 1)
- `docs/reference/core-concepts.md` — registry note (Phase 1)
- `packages/lang-en-us/src/formatters/list.ts` — `{items:list}` JSDoc fix (Phase 2)
- `packages/lang-en-us/src/formatters/types.ts` — doc fix (Phase 2)
- `packages/lang-en-us/src/formatters/index.ts` — doc fix (Phase 2)
- `packages/lang-en-us/src/formatters/registry.ts` — doc fix (Phase 2)
- `packages/lang-en-us/src/language-provider.ts` — doc fix (Phase 2)
- `docs/book/parts/part-5/19-the-formatter-chain.md` — doc fix (Phase 2)
