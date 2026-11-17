# Plan: ISSUE-058 — Entity creation builder/helper API

## Problem
Creating entities requires 3-4 separate calls every time (createEntity, IdentityTrait, optional traits, moveEntity). Name is duplicated between createEntity and IdentityTrait.

## Scope
- Severity: Low (DX improvement)
- Component: world-model
- Blast radius: API addition — no breaking changes

## Steps

1. **Survey current entity creation patterns**
   - Count occurrences of `createEntity` across story code and tests
   - Identify the most common patterns (scenery, item, container, NPC, room)
   - Measure the typical boilerplate per pattern

2. **Choose approach (requires discussion)**
   - **Option A: Factory helpers on WorldModel** — `world.createScenery(name, room, opts)`
   - **Option B: Builder/fluent API** — `world.build(name, type).description(...).done()`
   - **Option C: Story-level helpers** — no platform change, helpers in story code
   - Recommendation: Start with Option C (no platform change) and promote to Option A if the pattern proves stable

3. **Implement story-level helpers (Option C first)**
   - Create `stories/dungeo/src/helpers/entity-helpers.ts`
   - Helpers: `scenery()`, `item()`, `container()`, `supporter()`, `npc()`
   - Each helper wraps createEntity + IdentityTrait + type-specific traits + moveEntity

4. **Refactor a sample region to use helpers**
   - Pick one region (e.g., a smaller one) and refactor to use the helpers
   - Compare before/after line count and readability

5. **Evaluate for platform promotion**
   - If the helpers prove stable and useful, discuss promoting to WorldModel (Option A)
   - This would be a separate issue/PR

6. **Test**
   - Run affected region's transcripts
   - Verify entities behave identically to the verbose creation pattern

## Effort Estimate
Small — 1 session for story-level helpers. Additional session if promoting to platform.

## Dependencies
None.

## Risks
- Helpers might not cover all edge cases (entities with unusual trait combinations)
- Over-abstraction could make entity creation less transparent for new authors
- Platform promotion (Option A) requires discussion per CLAUDE.md rules
