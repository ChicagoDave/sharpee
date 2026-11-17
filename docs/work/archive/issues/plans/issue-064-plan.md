# Plan: ISSUE-064 — VisibilityBehavior duplicate container-walk traversals

## Problem
Three methods in `VisibilityBehavior` implement nearly identical walk-up-the-containment-tree algorithms with minor variations.

## Scope
- Severity: Medium
- Component: world-model (VisibilityBehavior.ts)
- Blast radius: Internal refactor — public API unchanged. 8 Dungeo files, 14 call sites.

## Steps

1. **Read the three methods**
   - `hasLineOfSight` (line ~369) — walks up, returns boolean, builds path array
   - `isAccessible` (line ~328) — walks up, returns boolean
   - `isVisible` (line ~441) — walks up, returns boolean
   - Document the exact differences between them

2. **Design the shared traversal helper**
   - `walkToRoom(entityId, world, options?)` or `walkContainerChain(entityId, world, predicate)`
   - Options/predicate to control: actors pass through, path tracking, transparency rules
   - Return type: boolean (simple) or `{ reachable: boolean, path?: EntityId[] }` (rich)

3. **Implement the shared helper**
   - Extract the common container-walk logic
   - Type it properly (addresses ISSUE-063 overlap — 21 `as any` casts in this file)
   - Use generic `getTrait` from ISSUE-063 Phase 1 if available

4. **Refactor the three methods to use the helper**
   - `hasLineOfSight` -> `walkToRoom(entity, world, { trackPath: true })`
   - `isAccessible` -> `walkToRoom(entity, world, { actorsPassThrough: true })`
   - `isVisible` -> `walkToRoom(entity, world, {})`
   - Each method becomes a thin wrapper

5. **Test**
   - Run existing VisibilityBehavior unit tests: `pnpm --filter '@sharpee/world-model' test visibility`
   - Run integration tests: room-navigation, visibility-chains, door-mechanics
   - Run Dungeo grue-related transcripts (grue handler depends on `isDark()`)
   - Run troll combat transcripts (TrollAxeVisibilityBehavior uses visibility capability)

6. **Verify public API unchanged**
   - `isDark`, `canSee`, `getVisible`, `isVisible` signatures must not change
   - No story code should need modification

## Effort Estimate
Medium — 1 session. Self-contained refactor with good test coverage.

## Dependencies
- Ideally done after ISSUE-063 Phase 1 (getTrait typing) to avoid re-fixing `as any` casts
- Can be done independently if Phase 1 is delayed

## Risks
- Subtle behavioral differences between the three methods could be load-bearing
- The `TrollAxeVisibilityBehavior` uses capability dispatch that interacts with `canSee` — must test
- Grue handler is the most critical consumer — incorrect darkness checks break a core game mechanic
