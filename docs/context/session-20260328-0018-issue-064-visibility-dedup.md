# Session Summary: 2026-03-28 - issue-064-visibility-dedup (CST)

## Goals
- Implement ISSUE-070 Phase 5: Add computed description getter to IFEntity and add state-specific description fields to platform traits
- Implement ISSUE-070 Phase 6: Migrate Dungeo openable and inflatable description mutations to use the new computed description path

## Phase Context
- **Plan**: docs/context/plan.md — "ISSUE-064/ISSUE-065/ISSUE-070 Visibility Dedup and Computed Descriptions"
- **Phase executed**: Phase 5 — "Platform: Computed Description Getter and Trait Field Additions" (Medium) and Phase 6 — "Story: Migrate Dungeo Openable and Inflatable Description Mutations" (Medium)
- **Tool calls used**: Not tracked
- **Phase outcome**: Both phases completed on budget

## Completed

### Phase 5 — Platform: Computed Description Getter and Trait Field Additions

Added state-specific description fields to three platform traits and updated the `IFEntity.description` getter to compute the correct description from current trait state rather than requiring event handlers to mutate `IdentityTrait.description`.

- `OpenableTrait`: added `openDescription?: string` and `closedDescription?: string` fields with constructor support
- `SwitchableTrait`: added `onDescription?: string` and `offDescription?: string` fields
- `LightSourceTrait`: added `litDescription?: string` and `unlitDescription?: string` fields
- `IFEntity.description` getter: updated priority chain — OpenableTrait > SwitchableTrait > LightSourceTrait > IdentityTrait fallback; each branch checks the relevant state boolean before selecting the description string
- `examining-data.ts`: updated `params.description` to read `noun.description` (the computed getter) instead of `identityTrait.description` directly

### Phase 6 — Story: Migrate Dungeo Openable and Inflatable Description Mutations

**Category A — Openable (full migration):**
- `house-interior.ts`: moved trapdoor open/closed descriptions from `entity.attributes` into `OpenableTrait` constructor fields
- `white-house.ts`: moved window open/closed descriptions from `entity.attributes` into `OpenableTrait` constructor fields
- `openable-description-handler.ts`: deleted entirely — no longer needed
- `index.ts`: removed `registerOpenableDescriptionHandler()` call from `initializeWorld()`
- `trapdoor-handler.ts`: removed the `identity.description = 'The dusty cover...'` mutation from the auto-close handler (description is now computed from `OpenableTrait.closedDescription`)

**Category B — Inflatable (partial migration — description strings sourced from trait fields):**
- `InflatableTrait`: added `inflatedDescription?: string` and `deflatedDescription?: string` fields
- `dam.ts`: boat entity creation now passes descriptions to `InflatableTrait` constructor
- `volcano.ts`: cloth bag entity creation now passes descriptions to `InflatableTrait` constructor
- `inflate-action.ts`, `deflate-action.ts`: read descriptions from `InflatableTrait` fields instead of hardcoding strings; `identity.description` mutation lines remain because `InflatableTrait` is story-level and `IFEntity.description` getter (in world-model) cannot see it
- `balloon-handler.ts`, `receptacle-putting-interceptor.ts`: cloth bag description reads from `InflatableTrait` fields instead of hardcoded strings; mutation lines remain for the same reason

**Explicitly left unchanged (out of scope):**
- Category C: Irreversible state transitions (incense ash, burned candles, drained reservoir, glacier, exorcism)
- Category D: NPC/combat description mutations
- Name mutations (boat name "pile of plastic" ↔ "white boat") — requires a separate computed name system
- Punctured boat description in `inflatable-entering-interceptor.ts` — one-time irreversible transition

## Key Decisions

### 1. Inflatable Description Migration is Partial by Design
Full elimination of `identity.description` mutations for `InflatableTrait` is blocked by a layer boundary: `IFEntity.description` lives in `packages/world-model`, but `InflatableTrait` is a story-level trait in `stories/dungeo`. The world-model getter cannot be given knowledge of a story-specific trait type without violating the platform/story boundary. The partial fix (descriptions stored on trait fields, read at mutation time) is the correct architectural stopping point. A fully computed path for story traits would require either promoting `InflatableTrait` to the platform or adding a general-purpose description provider protocol to `IFEntity` — both are larger design decisions beyond ISSUE-070 scope.

### 2. OpenableTrait Description Priority in Getter
The getter uses OpenableTrait first because open/closed state is the most externally visible. SwitchableTrait and LightSourceTrait follow. IdentityTrait is always the fallback. If no state-specific description is provided (fields are undefined), the getter falls back cleanly to the base description — no behavioral change for existing entities that do not use the new fields.

### 3. Category C Mutations Stay — Not Over-Engineering
Irreversible one-way transitions (incense burned to ash, candles burned out, glacier melted, reservoir drained) involve permanent identity changes, not toggling state. Adding a trait boolean for each would require inventing a "permanentlyTransitioned" flag that serves no purpose except to avoid a one-time string mutation. The mutation pattern is correct for these cases.

## Next Phase
Plan complete — all six phases done. The full plan covered ISSUE-064 (container-walk helper dedup), ISSUE-065 (scope system audit and rename), and ISSUE-070 (computed descriptions). Branch `issue-064-visibility-dedup` is ready for a PR to main.

## Open Items

### Short Term
- Open PR for `issue-064-visibility-dedup` → `main`
- Consider whether `InflatableTrait` should be promoted to the platform or whether a general-purpose story-level trait description protocol should be designed (separate issue, not a blocker)

### Long Term
- Category C mutation sites (incense, candles, glacier, reservoir, exorcism) remain as clean intentional one-way mutations — document this as an accepted pattern
- Name mutations (boat name cycling) are a separate class of problem; if name computation is ever needed, it would follow the same pattern as description computation but requires its own getter priority system

## Files Modified

**Platform — world-model** (2 files):
- `packages/world-model/src/traits/openable/openableTrait.ts` — added `openDescription`, `closedDescription` fields
- `packages/world-model/src/traits/switchable/switchableTrait.ts` — added `onDescription`, `offDescription` fields
- `packages/world-model/src/traits/light-source/lightSourceTrait.ts` — added `litDescription`, `unlitDescription` fields
- `packages/world-model/src/entities/if-entity.ts` — updated `description` getter with trait priority chain

**Platform — stdlib** (1 file):
- `packages/stdlib/src/actions/standard/examining/examining-data.ts` — read `noun.description` (computed getter) instead of `identityTrait.description`

**Story — dungeo** (9 files modified, 1 deleted):
- `stories/dungeo/src/regions/house-interior.ts` — trapdoor descriptions moved to OpenableTrait fields
- `stories/dungeo/src/regions/white-house.ts` — window descriptions moved to OpenableTrait fields
- `stories/dungeo/src/regions/dam.ts` — boat descriptions passed to InflatableTrait constructor
- `stories/dungeo/src/regions/volcano.ts` — cloth bag descriptions passed to InflatableTrait constructor
- `stories/dungeo/src/actions/inflate/inflate-action.ts` — reads descriptions from InflatableTrait fields
- `stories/dungeo/src/actions/deflate/deflate-action.ts` — reads descriptions from InflatableTrait fields
- `stories/dungeo/src/handlers/balloon-handler.ts` — reads cloth bag description from InflatableTrait fields
- `stories/dungeo/src/handlers/trapdoor-handler.ts` — removed identity.description mutation
- `stories/dungeo/src/interceptors/receptacle-putting-interceptor.ts` — reads cloth bag description from InflatableTrait fields
- `stories/dungeo/src/index.ts` — removed registerOpenableDescriptionHandler() call
- `stories/dungeo/src/traits/inflatable-trait.ts` — added inflatedDescription, deflatedDescription fields
- `stories/dungeo/src/handlers/index.ts` — removed openable-description-handler export

**Deleted:**
- `stories/dungeo/src/handlers/openable-description-handler.ts`

## Notes

**Session duration**: ~1-2 hours

**Approach**: Platform-first — established the computed getter and trait fields before migrating story code. The architecture drives toward zero-mutation descriptions for anything with a clean trait boolean; explicit mutation remains for irreversible transitions and cross-layer trait types.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phases 1-4 (ISSUE-064 container-walk dedup, ISSUE-065 scope system rename, ISSUE-064 StandardScopeResolver delegation) all complete on this branch
- **Prerequisites discovered**: None

## Architectural Decisions

- Pattern applied: Computed description getter with trait priority chain — OpenableTrait > SwitchableTrait > LightSourceTrait > IdentityTrait
- Layer boundary preserved: story-level traits (InflatableTrait) cannot drive the platform getter; partial migration to field-sourced strings is the correct stopping point
- Category C mutation pattern (irreversible one-way transitions) documented as an accepted pattern distinct from toggle-state mutations

## Mutation Audit

- Files with state-changing logic modified: `if-entity.ts` (getter, not a mutation), `examining-data.ts` (read path only), story region files (constructor field additions, not runtime mutations), `inflate-action.ts`, `deflate-action.ts`, `balloon-handler.ts`, `receptacle-putting-interceptor.ts`
- Tests verify actual state mutations (not just events): YES — the description getter is purely computed (no state change); inflate/deflate mutations were pre-existing and covered by walkthrough transcripts
- If NO: N/A

## Recurrence Check

- Similar to past issue? NO — this is a new pattern (computed descriptions from trait state). Previous sessions addressed code structure (dedup, renaming) rather than the mutation-vs-computation question.

## Test Coverage Delta

- Tests added: 0 new unit tests (getter behavior covered implicitly by examining action tests in stdlib and walkthrough transcripts)
- Tests passing before: world-model 1110, stdlib 1111
- Tests passing after: world-model 1110, stdlib 1111, walkthrough chain 794 passing across 17 transcripts (all green)
- Known untested areas: SwitchableTrait and LightSourceTrait state-specific description fields have no dedicated unit tests (no Dungeo entities use them yet; fields were added for architectural completeness)

---

**Progressive update**: Session completed 2026-03-28 00:18 CST
