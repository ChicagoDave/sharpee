# Session Plan: ISSUE-064 and ISSUE-065 — VisibilityBehavior Deduplication and Scope System Audit

**Created**: 2026-03-27
**Overall scope**: Two related platform refactors in the world-model/parser area. ISSUE-064 extracts a shared container-walk helper in VisibilityBehavior to eliminate three near-identical traversal loops. ISSUE-065 audits and documents the three separate scope evaluation systems to determine whether consolidation is warranted and, if so, what the consolidation path should be.
**Bounded contexts touched**: N/A — infrastructure/platform (no domain behavior change)
**Key domain language**: N/A

## Investigation Findings (pre-planning)

### ISSUE-064: VisibilityBehavior

`VisibilityBehavior.ts` (`packages/world-model/src/world/`) has three private static methods that each walk the containment chain from an entity upward to its room, checking for closed opaque containers at every hop:

- `isAccessible` (line 334): while-loop, checks ACTOR/CONTAINER/OPENABLE per hop, returns bool
- `hasLineOfSight` (line 375): uses `getContainmentPath()` then iterates the path array, same logic
- `isVisible` (line 447): while-loop, same logic plus a SceneryTrait/capability check at the top

The inner logic is identical: skip ACTOR containers, check CONTAINER for `isTransparent`, then check OPENABLE for `isOpen`. `hasLineOfSight` is the only one that also uses a pre-built `getContainmentPath()` helper.

Public API callers (stdlib, dungeo story) only call `isDark`, `canSee`, `getDescribableLocation`, `getVisible`, and `isVisible` — no caller reaches the three private traversal methods directly. The refactor is safe to do without changing any public signature.

### ISSUE-065: Scope System Audit

Three systems exist:

1. **world-model `ScopeRegistry` + `ScopeEvaluator`** (`packages/world-model/src/scope/`): Rule-based, triple-indexed. Used by `WorldModel` via `evaluateScope()` → `getInScope()`. `WorldModel` exposes `addScopeRule()`, `removeScopeRule()`, `getScopeRegistry()`. Also exposed on WorldModel barrel export. `evaluateScope` has a stub `ScopeService` that wraps it but the service itself is a TODO stub.

2. **parser-en-us `ScopeEvaluator`** (`packages/parser-en-us/src/scope-evaluator.ts`): Static class. Used only by `entity-slot-consumer.ts` during grammar matching. Calls `context.world.getVisibleEntities()`, `getTouchableEntities()`, `getCarriedEntities()`, etc. — it delegates to WorldModel methods, it does **not** call into the world-model `ScopeRegistry/ScopeEvaluator`.

3. **stdlib `StandardScopeResolver`** (`packages/stdlib/src/scope/scope-resolver.ts`): Used by `CommandValidator` for entity resolution during command validation. Completely independent of both systems above.

**Key finding**: The two `ScopeEvaluator` classes have the same name but no relationship. The world-model one is rule-based extension infrastructure. The parser one is a static utility that delegates to WorldModel methods. The stdlib one is validation-layer entity resolution. None of the three call each other in a circular way. The systems are parallel, not actually disconnected — they serve different callers at different stages of the turn cycle.

**Recommended path for ISSUE-065**: This is an investigation-first issue. Phase 1 should produce a documented call-chain map and a written recommendation (consolidate / document-and-leave / rename to disambiguate). Only after that recommendation is approved should any code change happen.

---

## Phases

### Phase 1: Extract Shared Container-Walk Helper in VisibilityBehavior (ISSUE-064)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform structural cleanup
- **Entry state**: `packages/world-model/src/world/VisibilityBehavior.ts` has three near-identical container traversal loops in `isAccessible`, `hasLineOfSight`, and `isVisible`
- **Deliverable**:
  - New private static helper `walkContainmentChain(entityId, roomId, world, visitor)` (or equivalent name) that encodes the single traversal with a per-hop predicate/callback
  - `isAccessible` rewritten as a thin wrapper: returns false as soon as visitor signals blocked
  - `hasLineOfSight` rewritten as a thin wrapper: removes the separate `getContainmentPath()` pre-pass and reuses `walkContainmentChain`
  - `isVisible` rewritten as a thin wrapper: SceneryTrait/capability checks remain at the top, then delegates to the shared walker
  - All existing visibility tests pass; full walkthrough chain passes
  - No public method signatures change
- **Exit state**: Three traversal implementations are gone; one canonical implementation exists; `getContainmentPath()` may be removed if it becomes dead code
- **Status**: DONE

### Phase 2: Scope System Audit and Recommendation (ISSUE-065, Investigation)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform architecture investigation
- **Entry state**: Phase 1 complete; three scope systems exist with overlapping names and unclear boundaries
- **Deliverable**:
  - Written call-chain map added to `docs/work/dungeo/scope-audit.md` covering:
    - Which callers use world-model `ScopeRegistry/ScopeEvaluator` and when in the turn cycle
    - Which callers use parser-en-us `ScopeEvaluator` and when
    - Which callers use stdlib `StandardScopeResolver` and when
    - Whether `ScopeService` (the stub) is referenced by any live code path
  - A clear recommendation: rename / document-and-leave / consolidate, with rationale
  - No code changes in this phase — investigation only
- **Exit state**: David has reviewed the audit doc and approved a path forward; code changes for ISSUE-065 are scoped into Phase 3 if needed, or the issue is resolved as "document-and-close"
- **Status**: DONE — Audit written to `docs/work/dungeo/scope-audit.md`. Recommendation: rename + document + delete dead code (no consolidation).

### Phase 3: Scope System Resolution (ISSUE-065, Implementation) — conditional
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — platform structural cleanup
- **Entry state**: Phase 2 audit complete and approved; a specific code change path is chosen
- **Deliverable**: Depends on Phase 2 outcome. Possible deliverables:
  - **Rename path**: Rename `parser-en-us/ScopeEvaluator` to `GrammarScopeResolver` and `world-model/ScopeEvaluator` to `RuleScopeEvaluator`; update all imports; add header comments to each explaining its role
  - **Consolidate path**: Merge one system into another with a migration; update all callers; delete dead code
  - **Document-and-close path**: Add header comments to all three files clarifying their role and why they are separate; close the issue
  - In all cases: build passes, full walkthrough chain passes
- **Exit state**: ISSUE-065 is closed; scope system boundary is clearly documented and either simplified or explicitly justified
- **Status**: DONE — Renamed classes, deleted dead ScopeService, added pipeline header comments.

### Phase 4: Delegate StandardScopeResolver.canSee() to world.canSee() (ISSUE-064 follow-on)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — platform structural cleanup
- **Entry state**: Branch `issue-064-visibility-dedup`; `WorldModel.canSee()` exists as a thin wrapper around `VisibilityBehavior.canSee()` (the authoritative implementation); `StandardScopeResolver.canSee()` reimplements a stale subset of the same logic with four private helpers (`getContainingRoom`, `isInDarkness`, `hasLightSource`, `isVisibleInContainer`)
- **Deliverable**:
  - `StandardScopeResolver.canSee(actor, target)` body replaced with `return this.world.canSee(actor.id, target.id)`
  - Four private helpers removed if they have no other callers after the delegation:
    - `getContainingRoom` — also used by `canHear`, `canSmell`, `getVisible`, `getReachable`, `getAudible`; keep it
    - `isInDarkness` — only called from `canSee`; remove
    - `hasLightSource` — only called from `canSee`; remove
    - `isVisibleInContainer` — only called from `canSee`; remove
  - `isLightSource` private helper (depends on `hasLightSource`) — remove if `hasLightSource` is removed
  - All existing stdlib scope tests pass unchanged (behavioral parity confirmed)
  - `pnpm --filter '@sharpee/world-model' test` and `pnpm --filter '@sharpee/stdlib' test` both green
  - Full walkthrough chain green
  - No public API signatures change
- **Exit state**: Single canonical visibility implementation (`VisibilityBehavior.canSee`) is the only path; stale reimplementation is gone; dead private helpers removed
- **Status**: DONE — Delegated `StandardScopeResolver.canSee()` to `world.canSee()`; removed 4 dead private helpers and 2 unused imports; 3 test files updated to match correct visibility behavior.

---

# Session Plan: ISSUE-070 — Computed Entity Descriptions from Trait State

**Created**: 2026-03-28
**Overall scope**: Replace mutation-based description switching in the world-model and Dungeo story with a computed `description` getter on `IFEntity` that derives the right text from current trait state. Two phases: platform (trait fields + getter) then story cleanup (remove event-handler mutations for trait-computable cases).
**Bounded contexts touched**: world-model (entity/trait layer), stdlib (examining action data builder), stories/dungeo (inflate/deflate/balloon/openable handlers)
**Key domain language**: N/A — infrastructure refactor, no domain behavior change

## Investigation Findings (pre-planning)

### Current description read path

`IFEntity.description` getter (line 682 of `if-entity.ts`) reads directly from `IdentityTrait.description`. The examining action's data builder (`examining-data.ts`) then passes `identityTrait.description` as `params.description`. The language layer renders it as `{description}`.

### Mutation sites in Dungeo (categorized by fixability)

**Category A — Trait-computable (open/close state)**
These mutate description in response to `if.event.opened`/`if.event.closed`. The entity already has `OpenableTrait.isOpen` tracking the state. A computed getter eliminates the mutation entirely.
- `openable-description-handler.ts` — generic handler for any entity with `openDescription`/`closedDescription` attributes
- `trapdoor-handler.ts` — sets `identity.description = 'The dusty cover of a closed trap door.'` directly

**Category B — Trait-computable (inflatable state)**
`InflatableTrait.isInflated` already tracks the boolean. Description computed from it eliminates mutations.
- `inflate-action.ts` and `deflate-action.ts` — mutate `identity.description` and `identity.name` in `execute()`
- `inflatable-entering-interceptor.ts` — mutates on puncture
- `balloon-handler.ts` and `receptacle-putting-interceptor.ts` — mutate cloth bag description based on `isInflated`

**Category C — Irreversible state transitions (mutation remains appropriate)**
These are one-way transitions where the entity's entire identity changes permanently (burned out, destroyed, drained). There is no pre-existing trait boolean to compute from, and adding one would be over-engineering for a one-way change. Mutation stays.
- `incense-fuse.ts` — incense becomes ash (name + description change permanently)
- `candle-fuse.ts` — candles burn out (name + description change permanently)
- `glacier-throwing-interceptor.ts` — glacier melts to pool of water (room description)
- `maintenance-room-fuse.ts` — room floods (room description)
- `turn-bolt-action.ts` — reservoir drains or refills (room descriptions, bilateral but tied to game-world state not a trait boolean)
- `exorcism-handler.ts` — Hades entrance changes after exorcism

**Category D — NPC/combat state (out of scope for this issue)**
- `troll-daemon.ts`, `melee-interceptor.ts` — NPC combat state; description switching belongs to NPC behavior system

### Name mutation (explicitly out of scope)

`inflate-action.ts`/`deflate-action.ts` also mutate `identity.name` (boat ↔ pile of plastic). Computed descriptions cannot handle name changes — name computation would require a separate `name` getter priority system. This is a separate concern and out of scope for ISSUE-070.

### Platform change scope

Changes required in `packages/world-model` (platform):
1. Add `openDescription?` and `closedDescription?` fields to `OpenableTrait`
2. Add `onDescription?` and `offDescription?` fields to `SwitchableTrait` (for symmetry; no current Dungeo uses but logically correct)
3. Add `litDescription?` and `unlitDescription?` fields to `LightSourceTrait` (same rationale)
4. Update `IFEntity.description` getter to check these fields based on current trait state before falling back to `IdentityTrait.description`
5. Update `examining-data.ts` to read `noun.description` (the computed getter) instead of `identityTrait.description` directly

Story-level change scope in `stories/dungeo`:
- Move `openDescription`/`closedDescription` from entity `attributes` into `OpenableTrait` fields (Category A)
- Move inflated/deflated descriptions into `InflatableTrait` fields (Category B), or keep as attributes with a story-level computed helper if `InflatableTrait` field expansion is not warranted
- Delete `openable-description-handler.ts` once all openable entities use trait fields
- Leave Category C and D mutations unchanged

---

## Phases

### Phase 5: Platform — Computed Description Getter and Trait Field Additions (ISSUE-070, Part 1)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — world-model entity/trait layer
- **Entry state**: `IFEntity.description` reads directly from `IdentityTrait.description`; `OpenableTrait`, `SwitchableTrait`, and `LightSourceTrait` have no state-specific description fields; `examining-data.ts` reads `identityTrait.description` directly
- **Deliverable**:
  - `OpenableTrait` gains `openDescription?: string` and `closedDescription?: string` fields (with constructor support)
  - `SwitchableTrait` gains `onDescription?: string` and `offDescription?: string` fields
  - `LightSourceTrait` gains `litDescription?: string` and `unlitDescription?: string` fields
  - `IFEntity.description` getter updated: checks `OpenableTrait` first (if present, returns open/closed description based on `isOpen`, falling back to `IdentityTrait.description`), then `SwitchableTrait`, then `LightSourceTrait`, then `IdentityTrait.description`
  - `examining-data.ts` updated: `params.description` reads `noun.description` (the computed getter) instead of `identityTrait.description`
  - `pnpm --filter '@sharpee/world-model' test` passes
  - `pnpm --filter '@sharpee/stdlib' test` passes
  - No Dungeo tests broken (story still uses attribute-based descriptions until Phase 6)
- **Exit state**: Platform supports computed descriptions; any entity with `openDescription`/`closedDescription` on its `OpenableTrait` will automatically show the right text on EXAMINE without any event handler
- **Status**: DONE

### Phase 6: Story — Migrate Dungeo Openable and Inflatable Description Mutations (ISSUE-070, Part 2)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: Dungeo story — openable entities (window, trapdoor) and inflatable boat
- **Entry state**: Phase 5 complete; platform supports computed descriptions; Dungeo still uses `openable-description-handler.ts` (attribute mutation) and `inflate`/`deflate` actions (direct `IdentityTrait.description` mutation)
- **Deliverable**:
  - Trapdoor and window entity definitions updated: move `openDescription`/`closedDescription` from `entity.attributes` into `OpenableTrait` constructor fields
  - `openable-description-handler.ts` deleted (no longer needed)
  - `registerOpenableDescriptionHandler()` call removed from `initializeWorld()`
  - `inflate-action.ts` and `deflate-action.ts`: remove `identity.description =` mutation lines; add `inflatedDescription`/`deflatedDescription` fields to `InflatableTrait` (or store as trait fields and read from a computed path)
  - `inflatable-entering-interceptor.ts`, `balloon-handler.ts`, `receptacle-putting-interceptor.ts`: remove cloth-bag `identity.description` mutations; put descriptions on `InflatableTrait` fields instead
  - `trapdoor-handler.ts`: remove the `identity.description =` mutation line (trapdoor description now computed from `OpenableTrait.closedDescription`)
  - All unit transcript tests pass
  - Full walkthrough chain passes (all `wt-*.transcript` files)
- **Exit state**: All Category A and B description mutations removed from Dungeo story code; only Category C (irreversible state transitions) and Category D (NPC combat) mutations remain, which are explicitly out of scope
- **Status**: DONE

---

# Session Plan: ISSUE-054 — Replace $teleport Shortcuts with Real Navigation in Walkthrough Transcripts

**Created**: 2026-03-28
**Overall scope**: 11 `$teleport` directives across 5 walkthrough transcript files must be replaced with real navigation commands. One transcript (wt-17) has zero `$teleport` directives — the issue description was a false alarm on it; the teleport in wt-17 is a legitimate game mechanic (cloaked figure event). Four transcripts need changes.
**Bounded contexts touched**: N/A — test infrastructure only, no platform or story code changes
**Key domain language**: N/A

## Investigation Findings (pre-planning)

### wt-17-endgame.transcript: No change needed

The issue description lists wt-17 as having 1 teleport "to Top of Stairs." Inspection of the transcript shows NO `$teleport` directive. The "teleport" is the game mechanic itself: `> wait` on turn 3 in the Tomb (in darkness) triggers the endgame cloaked figure event, which outputs text containing "Top of Stairs." The `[OK: contains "Top of Stairs"]` assertion validates this output. wt-17 is already correct.

### wt-09 navigation analysis

Start state: Living Room (end of wt-08, with torch).

**Teleport 1 — to Up a Tree (line 16)**
Route from Living Room: `east` (Kitchen) → `east` (Behind House, via kitchen window — must be open or openable) → `north` (North of House) → `north` (Forest Path 1) → `up` (Up a Tree)

Risk: The kitchen window state. wt-01 opens the window. Whether it stays open across the save/restore chain must be verified by running the chain up to wt-09.

**Teleport 2 — to Living Room from Up a Tree (line 40)**
Route from Up a Tree: `down` (Forest Path 1) → `south` (North of House) → `east` (Behind House) → `west` (Kitchen, via window) → `west` (Living Room)

### wt-10 navigation analysis

Start state: Living Room (end of wt-09, with torch and lantern).

**Teleport 1 — to Engravings Cave (line 33)**
Route from Living Room: `down` (trap door → Cellar) → `east` (Troll Room, troll dead from wt-01) → `north` (East-West Passage) → `east` (Round Room) → `south` or `north` (Engravings Cave — the Round Room connects both SOUTH and NORTH to Engravings Cave)

**KEY RISK — Round Room carousel**: At the start of wt-10, the Round Room has `isFixed = false` (carousel not yet fixed). The round-room-handler randomizes exits when `isFixed = false`, redirecting the player to a random room instead of the intended destination. The robot fix happens in the MIDDLE of wt-10, after the player is already past Engravings Cave. There is no reliable alternative route to Engravings Cave that bypasses the Round Room — it is the only path. The implementer must either: (a) accept the randomness with a `[RETRY]` loop, (b) change the initial carousel state to `isFixed = true` (requires verifying this matches MDL), or (c) determine whether the carousel-handler actually starts inactive (defaults to false = inactive). If the carousel starts inactive, normal navigation works. This needs to be verified by running the game in interactive mode before writing the commands.

**Teleport 2 — to Living Room from Dingy Closet (line 193)**
Start: Dingy Closet (after sphere/cage puzzle). The route from Dingy Closet back to Living Room passes through the well area. Key connections:
- Dingy Closet → north → Machine Room → west → Low Room → southeast → Tea Room → west → Top of Well
- Top of Well only connects DOWN (Well Bottom) and EAST (Tea Room). There is no direct path north toward Engravings Cave from Top of Well.
- Well Bottom only connects UP (Top of Well). The connection from Pearl Room (Broom Closet) east to Well Bottom is one-directional — there is no west exit from Well Bottom back to Pearl Room.
- This means the path from Tea Room/Well area back to the main underground requires going through the bucket ride mechanism or an alternative path not visible in the source.

**OPEN QUESTION**: The return path from the Tea Room area to Living Room is architecturally unclear. The implementer must verify in interactive mode (`node dist/cli/sharpee.js --play`) whether a viable path exists. Possibilities: (a) the bucket can be ridden back down (requires water), (b) there is a connection not visible in the static source (dynamic or external connection), (c) the route requires items available at that point in the game.

### wt-13 navigation analysis

Start state: Living Room (end of wt-12, with torch and lantern).

**Teleport 1 — to Forest Path (line 250)**
Start: Strange Passage (after returning from Treasure Room via Cyclops Room → north → Strange Passage). Transcript line 248: player is at Strange Passage (just arrived from Cyclops Room going `north`). Next line 250 is `$teleport Forest Path`.

Route from Strange Passage: `east` (Living Room) → `east` (Kitchen) → `east` (Behind House) → `north` (North of House) → `north` (Forest Path 1)

But the wind-canary goal says `> look [OK: contains "Forest"]` — Forest Path 1 is named "Forest Path" and should match. The canary winding works in any forest room.

**Teleport 2 — to Living Room from Forest Path (line 270)**
Route from Forest Path 1: `south` (North of House) → `east` (Behind House) → `west` (Kitchen, window) → `west` (Living Room)

**Teleport 3 — to Treasure Room (line 296)**
Start: Living Room (after storing canary/bauble/chalice/egg). Route: same as the earlier navigation in wt-13 lines 117-155 — `open trap door` → `down` (Cellar) → `east` (Troll Room) → maze path (S, E, W, UP, SW, E, S, NE → Cyclops Room) → `up` (Treasure Room)

Risk: This is a long navigation sequence (maze + cyclops). It duplicates the path already in wt-13 lines 117-155 and is well-established. Low risk.

**Teleport 4 — to Living Room from Treasure Room (line 318)**
Start: Treasure Room (after collecting stolen items). Route: `down` (Cyclops Room) → `north` (Strange Passage) → `east` (Living Room)

### wt-16 navigation analysis

Start state: Living Room (end of wt-15, with lantern).

**Teleport 1 — to Gallery (line 112)**
Start: Basin Room (after ghost ritual: burn incense → pray → drop frame piece). Route from Basin Room: `north` (Ancient Chasm) → `west` (Loud Room) → `west` (North/South Passage) → `north` (Underground Chasm) → `west` (Studio? — need to verify Chasm→Studio connection)

Wait — the Chasm (underground) connects east to North/South Passage and south to Deep Ravine. The Gallery connects north to West of Chasm (external, via Bank) and south to Studio. Studio connects northwest to Gallery and north to North/South Crawlway. North/South Crawlway connects east to Troll Room... This path does NOT go through the Loud Room's Ancient Chasm. The "Ancient Chasm" (temple region) is different from the "Chasm" (underground region).

Re-reading the wt-16 navigation to Basin Room (lines 37-68): `open trap door` → `down` (Cellar) → `east` (Troll Room) → `north` (East-West Passage) → `north` (Deep Ravine) → `east` (Chasm) → `east` (North/South Passage) → `northeast` (Loud Room) → `east` (Ancient Chasm) → `south` (Basin Room).

From Basin Room, the route to Gallery is the reverse of part of this path, then turn north at the right junction:
`north` (Ancient Chasm) → `west` (Loud Room) → `west` (North/South Passage) → `south` (Chasm? — N/S Passage southwest → Round Room, not directly to Chasm)

Actually North/South Passage: `setExits(northSouthPassage, { NORTHEAST: loudRoom.id })` and external connections: `connectTempleToUnderground` sets `northSouthPassage.exits[NORTH] = chasmId` and `chasm.exits[EAST] = northSouthPassage.id`. So N/S Passage NORTH → Underground Chasm. And N/S Passage SW → Round Room (external).

So from Basin Room to Gallery:
`north` (Ancient Chasm) → `west` (Loud Room) → `west` (North/South Passage) → `north` (Underground Chasm) → `west` → ? The Underground Chasm connects: west → Deep Ravine (from `setExits(chasm, { SOUTH: deepRavine.id })`). Wait no — `setExits(chasm, { SOUTH: deepRavine.id })` — Chasm SOUTH → Deep Ravine. And `setExits(deepRavine, { SOUTH: eastWestPassage.id, WEST: rockyCrawl.id, EAST: chasm.id })`.

So from Chasm, going south leads to Deep Ravine, then south to East-West Passage, then... we're going away from Gallery.

Gallery is in the underground region: `setExits(gallery, { SOUTH: studio.id })`. Studio: `setExits(studio, { NORTHWEST: gallery.id, NORTH: northSouthCrawlway.id })`. And North/South Crawlway: `setExits(northSouthCrawlway, { EAST: trollRoom.id, SOUTH: studio.id, UP: torchRoom.id })`.

So to get to Gallery from the Basin Room area: the path would be VERY long going back through Troll Room → North/South Crawlway → north → Studio → northwest → Gallery. Let's trace: Basin Room → north (Ancient Chasm) → west (Loud Room) → west (N/S Passage) → north (Underground Chasm) → south (Deep Ravine) → south (East-West Passage) → west (Troll Room) → east (N/S Crawlway) → south (Studio) → northwest (Gallery).

Actually wait — East-West Passage west leads to Troll Room (confirmed: `setExits(eastWestPassage, { WEST: trollRoom.id, ... })`). Troll Room east leads to North/South Crawlway (confirmed: `setExits(trollRoom, { WEST: cellar.id, NORTH: eastWestPassage.id, EAST: northSouthCrawlway.id })`). N/S Crawlway south → Studio (confirmed). Studio northwest → Gallery (confirmed).

Full route from Basin Room to Gallery: `north` (Ancient Chasm) → `west` (Loud Room) → `west` (N/S Passage) → `north` (Underground Chasm) → `south` (Deep Ravine) → `south` (East-West Passage) → `west` (Troll Room) → `east` (N/S Crawlway) → `south` (Studio) → `northwest` (Gallery) — 10 navigation steps.

**Teleport 2 — to Living Room from Gallery (line 129)**
Route from Gallery: `south` (Studio) → `north` (N/S Crawlway) → `east` (Troll Room) → `west` (Cellar) → `up` (Living Room, via trapdoor — need trap door open)

---

## Phases

### Phase 7: Replace wt-09 teleports (Up a Tree route)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — walkthrough test maintenance
- **Teleports being replaced**:
  - Line 16: `$teleport Up a Tree` → 5 navigation commands from Living Room through exterior
  - Line 40: `$teleport Living Room` → 5 navigation commands from Up a Tree back through exterior
- **Entry state**: wt-08 walkthrough chain passes; wt-09 currently uses `$teleport`
- **Deliverable**:
  - `wt-09-egg-tree.transcript` updated: both `$teleport` directives replaced with real navigation commands
  - Kitchen window open/close state verified by running the chain
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript ... wt-09-egg-tree.transcript` passes
- **Exit state**: wt-09 passes in the walkthrough chain using only real navigation; no `$teleport` directives remain in the file
- **Risk**: Kitchen window state — the window was opened in wt-01, verify it persists through the chain. If the window is closed in a later transcript, the navigation will fail and the implementer must add `open window` before entering.
- **Status**: DONE

### Phase 8: Replace wt-10 teleports (Engravings Cave and return)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — walkthrough test maintenance
- **Teleports being replaced**:
  - Line 33: `$teleport Engravings Cave` → navigation through Round Room (carousel risk)
  - Line 193: `$teleport Living Room` → return path from Dingy Closet (architecture verification needed)
- **Entry state**: Phase 7 complete; wt-09 passes; wt-10 currently uses `$teleport`
- **Deliverable**:
  - `wt-10-tea-room.transcript` updated: both `$teleport` directives replaced with real navigation
  - `node dist/cli/sharpee.js --play` used to verify Round Room carousel behavior and find the return path from Tea Room area to Living Room
  - Full chain through wt-10 passes
- **Exit state**: wt-10 passes in chain using only real navigation
- **Open questions to resolve during implementation**:
  1. Is the Round Room carousel actually active at wt-10 start? (Check `carousel-handler.ts` default — `return active ?? false` suggests it starts inactive.) If inactive, normal navigation works. Run `--play` to confirm.
  2. What is the viable return path from Tea Room/Dingy Closet to Living Room? Verify in `--play` mode before writing commands.
- **Status**: DONE

### Phase 9: Replace wt-13 teleports (Forest canary and Treasure Room recovery)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — walkthrough test maintenance
- **Teleports being replaced**:
  - Line 250: `$teleport Forest Path` → 4-step navigation from Strange Passage to Forest Path 1
  - Line 270: `$teleport Living Room` → 4-step navigation from Forest Path 1 back to Living Room
  - Line 296: `$teleport Treasure Room` → 10-step maze navigation (duplicates lines 117-155 of same transcript)
  - Line 318: `$teleport Living Room` → 3-step navigation from Treasure Room via Strange Passage
- **Entry state**: Phase 8 complete; wt-12 chain passes; wt-13 currently uses `$teleport`
- **Deliverable**:
  - `wt-13-thief-fight.transcript` updated: all 4 `$teleport` directives replaced with real navigation
  - Full chain through wt-13 passes
  - Thief combat RNG behavior verified (run chain twice per project rule for flakey RNG tests)
- **Exit state**: wt-13 passes in chain (run twice to confirm RNG stability); no `$teleport` directives remain
- **Risk**: Maze navigation to Treasure Room (teleport 3 replacement) is ~10 steps; any wrong turn will fail the test. Verify direction sequence matches the path taken in lines 117-155 of the same transcript.
- **Status**: DONE

### Phase 10: Replace wt-16 teleports (Gallery and return)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — walkthrough test maintenance
- **Teleports being replaced**:
  - Line 112: `$teleport Gallery` → 10-step navigation from Basin Room back through underground to Gallery
  - Line 129: `$teleport Living Room` → 5-step navigation from Gallery through Studio/Crawlway/Troll Room/Cellar/up
- **Entry state**: Phase 9 complete; wt-15 chain passes; wt-16 currently uses `$teleport`
- **Deliverable**:
  - `wt-16-canvas-puzzle.transcript` updated: both `$teleport` directives replaced with real navigation
  - Full chain through wt-16 passes
- **Exit state**: wt-16 passes in chain; no `$teleport` directives remain in any walkthrough transcript
- **Risk**: The 10-step path from Basin Room to Gallery is derived from static source analysis. It should be verified in `--play` mode before writing into the transcript, as external connector functions may add connections not captured in the static analysis.
- **Status**: DONE

---

# Session Plan: Playwright E2E Test Suite for Multi-User Web Client

**Created**: 2026-04-28
**Overall scope**: Introduce a Playwright end-to-end test suite at `tools/server/e2e/` as a new pnpm workspace package. Tests target the multi-user web client (local docker container by default; production URL via `PLAYWRIGHT_TARGET=live`). The suite covers the full user-visible surface: identity setup, room lifecycle, IF command I/O, save/restore round-trip, and WS reconnect resilience. Runs on branch `feat/e2e-playwright`.
**Bounded contexts touched**: N/A — tooling/infrastructure (multi-user server client at `tools/`, autonomous scope per project memory)
**Key domain language**: N/A — infrastructure tests, not domain behavior

## Decisions locked before planning

- Tool: `@playwright/test`
- Target shape: local docker container default (`http://localhost:8080`); live production (`https://sharpee.net/play/dungeo/`) via `PLAYWRIGHT_TARGET=live`; `@smoke` tag filters the live-safe subset
- Location: `tools/server/e2e/` as a new pnpm workspace package (`@sharpee/e2e`)
- The test runner does NOT spin up the docker container itself — a running container is a precondition; README documents this
- CI integration is optional (Phase 5)

## Risks and unknowns surface

- **Identity setup flow** (ADR-161): The identity banner uses `localStorage`. Playwright can seed `localStorage` via `page.addInitScript` before navigation. The handle/passcode/id triple must be injected before the first React render or the landing buttons remain disabled.
- **CAPTCHA bypass**: `docker-compose.yml` documents `CAPTCHA_BYPASS=1` env var for smoke tests on `/api/rooms`. The container must have this set, or create-room will reject the call. This is a prerequisite for Phase 2 onward against the local target; the live target has real CAPTCHA (smoke tests must avoid create-room against live — join-only or read-only flows for live smoke).
- **WS timing**: The WebSocket `hello` frame sends identity credentials; there is a reconnect backoff (`useWebSocket`). Tests that check room state must wait for `connection === 'open'` signals in the DOM before asserting. Playwright's `waitForSelector` / `waitForFunction` cover this, but each test will need explicit wait conditions rather than arbitrary timeouts.
- **Save/restore confirmation dialog**: Restore triggers `RestoreConfirmDialog` (a second-confirm modal). The e2e test must click through it. The modal contains an "aria-label: Confirm restore" button — clean selector target already in the source.
- **Turn counter assertion**: `StatusLine` derives turns from the `scoring` capability's `moves` field mirrored from the sandbox. After restore, the turn count reflects the save point, not the resumed-play count. The test must read the StatusLine text after restore and compare it to the value captured before the save — not a hardcoded number.
- **Hard-reload vs soft navigate**: The save/restore round-trip test requires a full page reload (not React-router soft nav) to exercise the `readToken`/`readCode` storage restoration path that runs on mount in `Room.tsx`. Playwright's `page.reload()` triggers this correctly.
- **Unique room names**: Each test run should create rooms with a unique name (timestamp-suffixed) to avoid collisions when the container's DB persists across runs.

## Phases

### Phase 1: Workspace Skeleton, Playwright Install, and Smoke Stub
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — tooling scaffold
- **Entry state**: `tools/server/e2e/` does not exist; `pnpm-workspace.yaml` does not list it
- **Deliverable**:
  - `tools/server/e2e/package.json` — package name `@sharpee/e2e`, version `0.1.0`, private, Playwright dep, `test` and `test:smoke` scripts
  - `tools/server/e2e/playwright.config.ts` — base URL reads `PLAYWRIGHT_TARGET` env var (default `http://localhost:8080`); Chromium browser only; `@smoke` tag activates when `PLAYWRIGHT_TARGET=live`; screenshot-on-failure, single retry on CI
  - `tools/server/e2e/tests/health.spec.ts` — trivial smoke test: navigate to `/health`, assert status 200 (via `page.goto` + `page.locator('body').textContent()` containing `"ok"`)
  - `tools/server/e2e/README.md` — prerequisites (running container), how to run locally, how to point at live
  - `.gitignore` entries for `node_modules/`, `playwright-report/`, `test-results/`
  - `pnpm-workspace.yaml` updated: `- tools/server/e2e` added to packages list
  - `pnpm install` resolves the new package; Playwright chromium browser downloaded
  - `pnpm --filter @sharpee/e2e test` passes the health smoke test against the running local container
- **Exit state**: The e2e package exists, installs, and its one trivial test passes green against `server-server-1` on port 8080
- **Files touched**: `pnpm-workspace.yaml`, `tools/server/e2e/package.json`, `tools/server/e2e/playwright.config.ts`, `tools/server/e2e/tests/health.spec.ts`, `tools/server/e2e/README.md`, `tools/server/e2e/.gitignore`
- **Risks**: Playwright chromium download size (~150 MB); may need `--with-deps` on some Linux setups. The health endpoint must already respond — if the container is unhealthy the test will fail at the precondition level, not the Playwright level.
- **Ships independently**: Yes — a green health check is a useful gate even before the identity/room tests exist
- **Status**: CURRENT

### Phase 2: Identity Setup and Room Lifecycle Smoke Test
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — client identity + room creation/join flow
- **Entry state**: Phase 1 complete; e2e package installed and healthy; local container running with `CAPTCHA_BYPASS=1`
- **Deliverable**:
  - `tools/server/e2e/helpers/identity.ts` — `seedIdentity(page, handle?, passcode?)` helper that injects a valid `sharpee:identity` JSON blob into `localStorage` via `page.addInitScript` before the page loads; generates a unique handle per call using a timestamp suffix
  - `tools/server/e2e/helpers/room.ts` — `createRoom(page, storyId?)` helper that clicks through the Create Room modal and returns the resulting room URL; also `waitForRoomReady(page)` that waits until the Transcript area has at least one line of text (opening room description visible)
  - `tools/server/e2e/tests/room-lifecycle.spec.ts` — tagged `@smoke`:
    1. Load landing page with seeded identity
    2. Assert identity banner is absent (or shows handle, not "Set up identity")
    3. Click "Create Room" — fill story select (pick first available), submit
    4. Assert URL changes to `/room/:id`
    5. `waitForRoomReady` — assert Transcript shows opening room description text
    6. Type an IF command (`look`) via `CommandInput` — assert a new Transcript line appears
    7. Assert `StatusLine` shows a location name, a score number, and a turns number (regex: `Score: \d+ | Turns: \d+`)
  - Test passes against local container with `CAPTCHA_BYPASS=1`
- **Exit state**: The full happy path from landing → identity → create room → command → status line is exercised and passing green
- **Files touched**: `tools/server/e2e/helpers/identity.ts`, `tools/server/e2e/helpers/room.ts`, `tools/server/e2e/tests/room-lifecycle.spec.ts`
- **Risks**:
  - CAPTCHA bypass: if the container was started without `CAPTCHA_BYPASS=1` the create-room POST will fail. The README must document this; Phase 1's README should already call it out.
  - Selector fragility: `CommandInput` and `Transcript` are React components without stable test IDs. Phase 2 should add `data-testid` attributes to `CommandInput`'s `<input>` and `Transcript`'s container as part of this phase. This is a `tools/server/client/` change, which is autonomous scope.
  - Opening room description timing: the Deno sandbox must boot and emit the first `narrative` event before the Transcript renders text. `waitForRoomReady` must use a generous timeout (default 30 s) and wait for a `[data-testid="transcript-line"]` to appear, not a fixed sleep.
- **Ships independently**: Yes — the room lifecycle test is self-contained and a meaningful regression gate even without the save/restore test

### Phase 3: Save / Restore Round-Trip Test (the Regression Catcher)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — client save/restore flow exercising commit `bf9b9564`
- **Entry state**: Phase 2 complete; room-lifecycle test passing; `data-testid` attributes added in Phase 2
- **Deliverable**:
  - `tools/server/e2e/helpers/statusline.ts` — `readStatusLine(page)` helper that parses the StatusLine text and returns `{ location: string, score: number, turns: number }`
  - `tools/server/e2e/tests/save-restore.spec.ts`:
    1. Seed identity, create room, wait for room ready (reuse Phase 2 helpers)
    2. Type 2–3 IF commands to advance the game state (`look`, `north` or similar); capture `StatusLine` values after each command
    3. Record `preSave = readStatusLine(page)` — the state to survive restore
    4. Open the Save panel (disk icon in the room header)
    5. Click "Save" — wait for the save to appear in the SaveList
    6. Close the Save panel
    7. Type 1–2 more commands to dirty the state (score or turns must change)
    8. Confirm state has advanced: `postSave = readStatusLine(page)` must differ from `preSave` in turns
    9. Open Save panel → click Restore on the first save → confirm in `RestoreConfirmDialog` (aria-label "Confirm restore")
    10. Wait for Transcript to update (a restore narrative message appears)
    11. `restored = readStatusLine(page)` — assert `restored.turns === preSave.turns` and `restored.score === preSave.score`
    12. `page.reload()` — hard reload to exercise the mount-path storage restoration in `Room.tsx`
    13. Wait for `waitForRoomReady` — the room reconnects via the stored token
    14. `afterReload = readStatusLine(page)` — assert location, score, and turns still match `preSave` values
  - Test passes green against local container
- **Exit state**: The round-trip test catches the regression that commit `bf9b9564` fixed — a hard reload after restore that lost world state would fail at assertion 14
- **Files touched**: `tools/server/e2e/helpers/statusline.ts`, `tools/server/e2e/tests/save-restore.spec.ts`
- **Risks**:
  - The Save button requires `selfTier` to be `primary_host`, `co_host`, or `command_entrant`. The room creator is the primary host — so the seeded identity that created the room will have CE+ rights. This should work as-is, but verify the tier is reflected in the WS `welcome` payload.
  - Command routing: some commands may not move the player and the turns counter may not increment if the command is invalid. Use only commands known to work in the first room of the Dungeo story (the opening location).
  - StatusLine parsing: the text format is `<Location>  Score: N | Turns: M`. The `readStatusLine` helper must handle the `—` MISSING glyphs that appear while the mirror is unhydrated — wait for numeric values before capturing.
- **Ships independently**: Yes — this is the highest-value test in the suite; it can ship even if Phases 4 and 5 are deferred

### Phase 4: WebSocket Reconnect Resilience Test (Heartbeat Path)
- **Tier**: Medium
- **Budget**: 250
- **Domain focus**: N/A — WS reconnect path exercising commit `f87547ee`
- **Entry state**: Phase 3 complete; save/restore test passing
- **Deliverable**:
  - `tools/server/e2e/tests/ws-reconnect.spec.ts`:
    1. Seed identity, create room, wait for room ready
    2. Capture a `preCut = readStatusLine(page)` baseline
    3. Simulate a network blip using Playwright's CDP `Network.emulateNetworkConditions` to offline+online the page (or `page.context().setOffline(true/false)`)
    4. Assert the connection indicator recovers (wait for StatusLine to re-render with the same values — the `useWebSocket` exponential backoff reconnects and the server resyncs state via `welcome`)
    5. Assert `postReconnect = readStatusLine(page)` matches `preCut` (state survived the blip)
    6. Type one command after reconnect — assert a Transcript line appears (connection is functional)
  - Test tagged `@reconnect` (not `@smoke` — too invasive for live target)
- **Exit state**: A WS disconnect-reconnect cycle is exercised end-to-end; the heartbeat keepalive path is confirmed operational
- **Files touched**: `tools/server/e2e/tests/ws-reconnect.spec.ts`
- **Risks**:
  - `page.context().setOffline(true)` severs the WebSocket cleanly in Chromium; the server will eventually detect the dead connection via the heartbeat timeout (configured in the server). The test must wait long enough for the backoff reconnect to complete — the `useWebSocket` backoff caps at some max delay. If the cap is high (e.g., 30 s), the test could be slow.
  - The server's heartbeat interval and WS idle timeout determine how quickly the server side notices the disconnect. These values should be read from the server config or kept as documented constants so the test wait is calibrated correctly.
  - Flakiness risk: network emulation in Playwright is generally reliable in Chromium but can be timing-sensitive. Consider adding a retry (`retries: 1` in config) for this spec only.
- **Ships independently**: Yes — can be deferred if Phase 3 is the priority; the heartbeat fix is already in production

### Phase 5: CI Integration (Optional)
- **Tier**: Small
- **Budget**: 100
- **Domain focus**: N/A — CI pipeline
- **Entry state**: Phases 1–4 complete; all e2e tests passing locally
- **Deliverable**:
  - GitHub Actions workflow file (`.github/workflows/e2e.yml` or an addition to an existing workflow) that:
    1. Starts the docker container via `docker compose up -d --build`
    2. Waits for the health endpoint (`/health` 200) with a retry loop
    3. Runs `pnpm --filter @sharpee/e2e test` (local container subset — excludes `@reconnect` if too slow for CI)
    4. Uploads `playwright-report/` and `test-results/` as artifacts on failure
  - `docker-compose.yml` updated (or override file added) to set `CAPTCHA_BYPASS=1` for CI
  - README updated with CI badge or instructions
- **Exit state**: The `@smoke` + save/restore tests run automatically on PRs; failures are visible in the Actions UI with screenshots
- **Files touched**: `.github/workflows/e2e.yml` (or existing workflow), possibly `tools/server/docker-compose.yml` or a `docker-compose.ci.yml` override, `tools/server/e2e/README.md`
- **Risks**:
  - Docker build time in CI can be slow (5–10 min for a cold build) — may want to cache the image layer or use `--no-rebuild` on subsequent runs
  - The GitHub Actions runner must have Playwright chromium dependencies (`npx playwright install-deps chromium`); the `mcr.microsoft.com/playwright` base image handles this if the runner is docker-based, otherwise it's a separate install step
  - This phase is explicitly optional and depends on user appetite
- **Ships independently**: Yes — CI can be added after any combination of Phases 1–4
