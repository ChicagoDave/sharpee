# Issues Raised by @ember.pet on Bluesky (2026-04-03)

Source: Bluesky thread reviewing Sharpee public repo and documentation screenshots.

## 1. `createEntityWithTraits` is dead code

**Status:** Valid — should be removed

`WorldModel.createEntityWithTraits(type)` is only used by `packages/engine/tests/stories/minimal-test-story.ts`. No real story code calls it. The `EntityType.DOOR` case is a no-op (empty `break` with a comment). It also doesn't add `IdentityTrait`, which rooms require.

Real stories use `createEntity(id, type)` and add traits explicitly. This method was an early convenience that was superseded and never cleaned up.

**Fix:** Remove `createEntityWithTraits` from `WorldModel` interface and implementation. Update `minimal-test-story.ts` to use `createEntity()`. Remove from docs and genai-api.

## 2. Silent mutation without events

**Status:** By design, but worth documenting better

Ember noted you can mutate entities without emitting events. This is intentional — `AuthorModel` wraps `WorldModel` for setup code that bypasses validation and events. During gameplay, mutations go through actions which always emit events.

The concern is valid from a public API review — nothing prevents story code from calling `world.moveEntity()` directly during gameplay instead of going through an action. But enforcing that at the type level would require splitting WorldModel into read/write interfaces, which is a larger refactor.

**Fix:** No code change needed. Consider documenting the AuthorModel vs gameplay mutation distinction more prominently.

## 3. `sharedData` is untyped

**Status:** Intentional tradeoff

`ActionContext.sharedData` is `Record<string, unknown>` — the communication channel between action phases (validate stores data, execute reads it). It's scoped to a single action invocation and discarded after.

Typing it would require threading generics through every action definition for data that lives for one function call chain. The tradeoff is reasonable.

**Fix:** None needed.

## 4. Hardcoded item name lookups in story code

**Status:** Expected for story code

She's referencing Dungeo game logic that has puzzle-specific special cases. Story code is *supposed* to have game-specific logic — that's what stories are. The platform code doesn't do name-based lookups.

**Fix:** None needed.

## 5. ECS vs Sharpee's entity-trait system

**Status:** Architectural discussion, not a bug

Ember argues the industry has moved to ECS. Sharpee's entity-trait-behavior system is architecturally similar to ECS (entities + components/traits + systems/behaviors) without the cache-friendly data layout optimization, because a text game processing one command per second doesn't need it.

**Fix:** None needed.

## 6. TADS/Inform patterns are outdated

**Status:** Disagree

The internal architecture is modern TypeScript. The authoring surface is intentionally familiar to IF authors. TADS and Inform are models for *authoring experience*, not internal architecture.

**Fix:** None needed.
