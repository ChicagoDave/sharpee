# Session Summary: 2026-07-21 - chord-foundations (session 99aee6, continuation #3)

## Goals
- Amend ADR-247's Q2 full-census audit clause per David's ruling, then implement the ADR in full on his go-ahead.
- Flip `WorldModel.getContents()`/`getAllContents()` to include worn items unconditionally and migrate every affected consumer.

## Phase Context
- **Plan**: `docs/work/adr-247-getcontents-worn-default/plan.md` — "Implement ADR-247 in full: commit a per-site call audit, flip the worn-items default, add `getCarriedAndWorn()`, migrate every consumer, delete `ContentsOptions.includeWorn` and `ClothingTrait`, land a green full regression."
- **Phase executed**: Phases 1, 3, 4, 5, 6 (Phase 2 was removed by the amendment) — all now marked COMPLETE in plan.md.
- **Tool calls used**: not tracked in `.session-state.json` for this session id (file reflects a later session's Phase 1 armoured/thealandarman work); this session ran to full plan completion regardless.
- **Phase outcome**: Completed — all five executed phases closed, ADR Status flipped to ACCEPTED + IMPLEMENTED.

## Completed

### ADR-247 amendment (Q2 superseded)
David ruled (2026-07-21, "a") that Q2's full-census audit clause is SUPERSEDED: worn state exists only on actors, so the flip is a no-op by construction for room/container/supporter holders. Only actor-scoped `getContents` sites needed the committed audit; the rest is covered by the regression surface. The amendment was prompted by re-grounding: the real call-site count is 176 (102 files), not the ADR's originally cited 64 — recorded in plan.md's "Grounding" section rather than silently absorbed.

### Phase 1 — targeted audit
`docs/work/adr-247-getcontents-worn-default/audit.md`: 60 actor-scoped sites classified (everything 40, fixed-by-flip 10, held-only 9, doc-only 1). A broad grep surfaced 20 sites beyond the initially-listed 40, including a caller-missed site at `giving.ts:204` (recipient-capacity check) that would have been a runtime bug if left unmigrated. Only 9 sites needed real code changes — the low number is read as vindicating the targeted-audit amendment over the original full-census plan.

### Phase 3 — world-model API flip
- `WorldModel.getContents()`/`getAllContents()`: the `includeWorn` filter block deleted outright; worn items are now always included. `getAllContents`'s root-vs-recursive special-case collapsed since it's no longer needed.
- `getCarriedAndWorn(holderId): { carried, worn }` added to `IWorldModel`, `WorldModel`, `AuthorModel` (delegate), and `IWorldQuery` (so `containerBehavior` callers can reach it too).
- `ContentsOptions.includeWorn` deleted from `packages/if-domain/src/contracts.ts`.

### Phase 4 — platform consumer migration
Held-only sites moved to `.carried`: `actorBehavior.ts` `canCarry`/`getCarriedWeight`/`getCarriedVolume`/`getRemainingCapacity` (4 sites — fixes all capacity consumers transitively; no external capacity-method callers exist) plus a `canTakeItem` inline-filter cleanup; `giving.ts` recipient capacity; `multi-object-handler.ts` carried-scope (2 sites — drop-all intentionally excludes worn, matching IF convention); `taking.ts` container count. Deleted-option cleanup: `inventory.ts` adopts `getCarriedAndWorn` and drops its hand-rolled worn/held split (`totalItems`/`isEmpty` recomputed); `transcript-tester`'s `condition-evaluator.ts` and `runner.ts` drop the now-dead option; `VisibilityBehavior.ts` (2 sites, fixed-by-flip — worn items now appear in LOOK/EXAMINE contents) plus its stale doc comment.

### Phase 5 — story consumer migration
No story code changes needed: every story actor-scoped site was already classified 'everything' or fixed-by-flip; dungeo has no worn items in active play, so the flip is behaviorally inert there.

### Phase 6 — `ClothingTrait` deletion + full regression
David-authorized via ADR Q3 plus an explicit go-ahead after the plan's confirm-gate inventory was presented. Deleted `clothingTrait.ts` + its `index.ts`, and five world-model touchpoints: `src/index.ts` barrel, `traits/index.ts` barrel, `trait-types.ts` (enum + category), `implementations.ts` (import + rehydration + list), `all-traits.ts` (import + array + union + `isClothingTrait` guard) — plus the dungeo GDT `do.ts` bare-`'clothing'`-string case. Zero external references confirmed before deletion.

### Test migration
Rewrote `trait-rehydration.test.ts` (worn-filtered assertion replaced with an ADR-mandated partition-survives-roundtrip assertion). New `getcontents-worn.test.ts` covering the flip, visible-contents, and the `getCarriedAndWorn` partition — including a self-caught bug (asserted on the literal `'lamp'` instead of `lamp.id`) fixed during authoring. Agent-migrated the world-model fixture plus `clothing.test.ts`/`wearable-clothing.test.ts`/`trait-combinations.test.ts` from `ClothingTrait` to `WearableTrait`, with 3 assertions inverted to the new worn-included semantics — all three inversions confirmed correct on review.

## Key Decisions

### 1. ADR-247 amended to a targeted actor-scoped audit, superseding Q2's full census
Worn state is actor-only by construction, so non-actor `getContents` call sites cannot change behavior under the flip — auditing all 176 sites would have been busywork. See `docs/architecture/adrs/adr-247-getcontents-worn-default.md`, Status line.

### 2. drop-all / multi-object carried-scope stays held-only
`multi-object-handler.ts`'s drop-all path intentionally excludes worn items post-flip, preserving current IF convention (you don't "drop all" your worn armor) rather than adopting the new unconditional default there.

### 3. `ClothingTrait` deletion executed under ADR Q3 authorization
Not a new platform-change discussion — Q3's resolution plus the plan's Phase 6 confirm-gate (file-deletion inventory presented, go-ahead given) was treated as sufficient authorization per CLAUDE.md's "never delete files without confirmation."

## Next Phase
Plan complete — all phases done. ADR-247 Status is ACCEPTED + IMPLEMENTED.

## Open Items

### Short Term
- None — ADR-247 is fully implemented and regression-verified.

### Long Term
- Generalized import ADR (parked).
- Packaged-book distribution tooling (parked).
- ADR-243 story-person (parked).
- thealderman `.topic` port, cloak-of-darkness stale tests, repo-wide story-tsconfig DOM gap — all still parked from the prior open-items sweep, unchanged this session.

## Files Modified

**ADR / plan / audit** (4 files):
- `docs/architecture/adrs/adr-247-getcontents-worn-default.md` - amended Q2, status flipped to ACCEPTED + IMPLEMENTED
- `docs/work/adr-247-getcontents-worn-default/plan.md` - all executed phases marked COMPLETE
- `docs/work/adr-247-getcontents-worn-default/audit.md` (new) - 60-site actor-scoped audit table
- `docs/context/.current-plan` - pointer updated

**world-model API** (9 files):
- `packages/world-model/src/world/WorldModel.ts` - getContents/getAllContents flip, getCarriedAndWorn added
- `packages/world-model/src/world/AuthorModel.ts` - getCarriedAndWorn delegate
- `packages/world-model/src/world/VisibilityBehavior.ts` - drops redundant includeWorn arg (x2)
- `packages/world-model/src/traits/container/containerBehavior.ts` - IWorldQuery extended
- `packages/world-model/src/index.ts`, `traits/index.ts`, `traits/all-traits.ts`, `traits/implementations.ts`, `traits/trait-types.ts` - ClothingTrait removed from barrels/registry/rehydration
- `packages/world-model/src/traits/clothing/clothingTrait.ts`, `traits/clothing/index.ts` - deleted

**if-domain** (1 file):
- `packages/if-domain/src/contracts.ts` - ContentsOptions.includeWorn deleted

**stdlib consumers** (4 files):
- `packages/stdlib/src/actions/standard/giving/giving.ts` - recipient capacity migrated to .carried
- `packages/stdlib/src/actions/standard/inventory/inventory.ts` - adopts getCarriedAndWorn
- `packages/stdlib/src/actions/standard/taking/taking.ts` - container count migrated
- `packages/stdlib/src/helpers/multi-object-handler.ts` - carried-scope x2, held-only preserved
- `packages/world-model/src/traits/actor/actorBehavior.ts` - canCarry/getCarriedWeight/getCarriedVolume/getRemainingCapacity + canTakeItem

**transcript-tester** (2 files):
- `packages/transcript-tester/src/condition-evaluator.ts`, `runner.ts` - drop deleted includeWorn option

**dungeo story** (2 files):
- `stories/dungeo/src/actions/gdt/commands/do.ts` - bare 'clothing' string case removed
- `stories/dungeo/src/version.ts` - version bump

**tests** (6 files):
- `packages/world-model/tests/unit/entities/trait-rehydration.test.ts` - worn-filtered assertion → partition-survives-roundtrip
- `packages/world-model/tests/unit/world/getcontents-worn.test.ts` (new) - flip + visible-contents + partition
- `packages/world-model/tests/fixtures/test-entities.ts`, `tests/unit/traits/clothing.test.ts`, `tests/integration/wearable-clothing.test.ts`, `tests/integration/trait-combinations.test.ts` - ClothingTrait → WearableTrait, 3 assertions inverted to worn-included semantics

**generated docs** (4 files, regenerated):
- `packages/sharpee/docs/genai-api/if-domain.md`, `index.md`, `tooling.md`, `world-model.md`

## Notes

**Session duration**: full session (continuation #3 of session 99aee6).

**Approach**: audit-first, API-flip-second, migrate-third, delete-last — matched the plan's own phase sequencing exactly, with each phase's exit gated on its own suite going green before the next started.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert — all work uncommitted atop `b1f770e3` at write time; no push has occurred.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-247 ACCEPTED status (session 17e36e), plan.md authored and gated with explicit platform-change go-ahead per CLAUDE.md, David's amendment ruling ("a") for Q2, David's Phase 6 file-deletion confirm.
- **Prerequisites discovered**: The ADR's original 64-site census understated the true call-site count (176 actual) — discovered during Phase 1 grounding, resolved by the amendment rather than blocking progress.

## Architectural Decisions

- ADR-247: `getContents()`/`getAllContents()` now include worn items unconditionally; `getCarriedAndWorn(holderId)` added as the held-only escape hatch; `ContentsOptions.includeWorn` and `ClothingTrait` deleted. Status ACCEPTED + IMPLEMENTED, amended 2026-07-21 to a targeted actor-scoped audit (Q2 superseded).
- Pattern applied: worn-state-is-actor-only invariant used to bound audit scope rather than tabulate all 176 sites — a domain invariant substituting for exhaustive enumeration.

## Mutation Audit

- Files with state-changing logic modified: `WorldModel.ts` (getContents/getAllContents/getCarriedAndWorn), `actorBehavior.ts` (capacity/weight/volume methods), `inventory.ts`, `giving.ts`, `taking.ts`, `multi-object-handler.ts`.
- Tests verify actual state mutations (not just events): YES — `getcontents-worn.test.ts` asserts on actual returned entity sets and the `getCarriedAndWorn` partition shape; `trait-rehydration.test.ts` asserts the partition survives a real save/restore roundtrip, not just that restore didn't throw.

## Recurrence Check

- Similar to past issue? NO — this is the first ADR-247 implementation session; no prior session reported a matching blocker or pattern.

## Test Coverage Delta

- Tests added: 1 new file (`getcontents-worn.test.ts`, flip + visible-contents + partition assertions) + 1 rewritten assertion in `trait-rehydration.test.ts` + 3 inverted assertions across `wearable-clothing.test.ts`/`trait-combinations.test.ts`.
- Tests passing before: n/a (pre-session baseline not separately captured this session) → after: world-model 1400, stdlib 1559, engine 524, story-loader 308, lang-en-us 430, platform-browser 86, dungeo unit 1782 (+9 expected from new tests), dungeo chain 887/887 (one troll-RNG-flake re-run per the one-good-run rule), fernhill 503 — all clean; `./repokit build dungeo --browser` clean.
- Known untested areas: none flagged — Phase 6's full regression was explicitly the ADR's acceptance gate and all named suites passed.

---

**Progressive update**: Session completed 2026-07-21 12:00
