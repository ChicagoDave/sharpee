# Known Issues (List 04)

Catalog of known bugs and issues to be addressed.
Continued from [issues-list-03.md](issues-list-03.md) (closed 2026-02-16).

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | - | - |
| ISSUE-048 | Zifmia not updated to latest platform | Medium | client-zifmia | 2026-02-04 | - | - |
| ISSUE-049 | `$seed` directive for deterministic randomization testing | Low | transcript-tester | 2026-02-07 | - | - |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | - | - |
| ISSUE-052 | Capability registry uses module-level Map; not shared across require() | High | world-model | 2026-02-08 | - | 2026-02-13 |
| ISSUE-053 | Grating/skeleton key wiring broken — duplicate entities, no keyId, exits bypass lock | High | dungeo, parser | 2026-03-23 | - | 2026-03-23 |
| ISSUE-054 | Multi-word aliases don't resolve in the parser | Medium | parser-en-us | 2026-03-23 | - | - |
| ISSUE-055 | Entity creation is excessively repetitive — needs builder/helper API | Low | world-model | 2026-03-23 | - | - |

---

## Open Issues

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test

**Description**:
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling). The "DUNGEO" spelling was a nostalgia reference to the PDP-11 era filename limit, but the game title should use the full spelling.

**Resolution**: Update test to expect "DUNGEON" instead of "DUNGEO v".

---

### ISSUE-047: Zifmia client needs console output panel without full Dev Tools

**Reported**: 2026-02-01
**Severity**: Medium
**Component**: client-zifmia

**Description**:
When debugging issues in the Zifmia client, there is no way to see console output (console.log, console.warn, errors) without enabling the full browser Dev Tools. A lightweight console/log panel built into the Zifmia UI would make debugging much easier.

**Expected**: A toggleable panel in the Zifmia client that displays console output, errors, and warnings without requiring Dev Tools.

---

### ISSUE-048: Zifmia not updated to latest platform

**Reported**: 2026-02-04
**Severity**: Medium
**Component**: client-zifmia

**Description**:
Zifmia client was out of sync with the latest platform build, causing import errors like:

```
The requested module '@sharpee/world-model' does not provide an export named 'StoryInfoTrait'
```

**Resolution**: Rebuild Zifmia after platform changes using `./build.sh -s dungeo -c zifmia` followed by `tauri build` in PowerShell.

**Notes**: This is a workflow reminder - Zifmia's Tauri app must be rebuilt separately after platform/runner changes.

---

### ISSUE-049: Transcript tester needs `$seed` directive for deterministic randomization testing

**Reported**: 2026-02-07
**Severity**: Low
**Component**: Platform (transcript-tester)

**Description**:
Games rely on randomization (carousel exits, combat damage, thief behavior) and death/restore puzzle cycles. Currently walkthroughs work around randomization using GDT teleport, extra combat rounds, and path avoidance. A `$seed` directive would make randomized sections deterministic.

**Proposed design**:
- `$seed <value>` — Sets the RNG seed before the next command, making randomized outcomes deterministic
- Implementation: `world.setStateValue('rng.seed', value)` or a dedicated RNG service
- The game's `Math.random()` calls would need to route through a seedable PRNG
- Walkthroughs stay golden-path only; death/randomization scenarios go in unit transcripts

**Other considered approaches**:
- `[OK: matches_any "Pattern1" "Pattern2"]` — Accept multiple valid outputs for non-deterministic results
- `$retry <N>` — Repeat a command block until assertions pass (for combat)

**Priority**: Low — current workarounds (GDT teleport, extra attacks, avoiding carousel) are functional. Implement when more puzzles depend on randomization.

---

### ISSUE-050: Consolidate all Dungeo text into dungeo-en-us.ts for i18n

**Reported**: 2026-02-07
**Severity**: Low
**Component**: dungeo (story)

**Description**:
All English text strings in the Dungeo story are currently spread across multiple files (melee-messages.ts, npc-messages.ts, object-messages.ts, action-messages.ts, puzzle-messages.ts, etc.). To enable future translation to other languages, all story text should be consolidated into a single `dungeo-en-us.ts` file (or a `dungeo-en-us/` directory) that serves as the single source of truth for all player-facing strings.

**Scope**:
- Melee combat messages (sword, knife, troll, thief, cyclops tables)
- NPC messages (thief, troll, cyclops, robot, dungeon master)
- Action messages (say, ring, break, burn, pray, diagnose, etc.)
- Puzzle messages (royal puzzle, mirror, laser, exorcism, etc.)
- Object messages (cakes, boat, dam, etc.)
- Scheduler messages (lantern, candles, dam, balloon)
- Room descriptions and entity descriptions

**Priority**: Low — the language layer architecture already supports this via message IDs. This is a refactoring task to group all text in one place, not a functional change.

---

### ISSUE-053: Grating/skeleton key wiring broken

**Reported**: 2026-03-23
**Severity**: High
**Component**: dungeo (story)

**Description**:
Four problems make the grating puzzle non-functional: duplicate grating entities (forest.ts and maze.ts), `key.attributes.unlocksId` is a no-op, `LockableTrait` has no `keyId`, and exits don't use `via` to check the grating's open/locked state.

**Details**: See [issue-053-grating-key-wiring.md](issue-053-grating-key-wiring.md)

---

### ISSUE-055: Entity creation is excessively repetitive — needs builder/helper API

**Reported**: 2026-03-23
**Severity**: Low (DX improvement, not a bug)
**Component**: Platform (world-model)
**Type**: Enhancement

**Description**:
Creating entities requires 3-4 separate calls every time, which becomes extremely repetitive in story code:

```typescript
// Current: 4 calls per entity
const fence = world.createEntity('iron fence', EntityType.SCENERY);
fence.add(new IdentityTrait({ name: 'iron fence', description: '...', aliases: ['fence'], properName: false, article: 'an' }));
fence.add(new SceneryTrait());
world.moveEntity(fence.id, entrance.id);
```

The Family Zoo tutorial V8 has ~30 entities, each requiring this pattern. The repetition is:
- `createEntity` + `IdentityTrait` (every entity)
- `SceneryTrait` (most environmental objects)
- `moveEntity` (every entity)
- Name appears in both `createEntity()` and `IdentityTrait.name` (always duplicated)

**Possible approaches** (needs discussion):

**A. Factory helpers on WorldModel:**
```typescript
// Scenery: create + identity + scenery + place in one call
const fence = world.createScenery('iron fence', entrance.id, {
  description: '...',
  aliases: ['fence'],
  article: 'an',
});

// Portable item: create + identity + place
const map = world.createItem('zoo map', entrance.id, {
  description: '...',
  aliases: ['map'],
});

// Room: create + room trait + identity
const hall = world.createRoom('Great Hall', {
  description: '...',
  isDark: false,
});
```

**B. Builder/fluent API:**
```typescript
const fence = world.build('iron fence', EntityType.SCENERY)
  .description('A tall wrought-iron fence.')
  .aliases('fence', 'railing')
  .article('an')
  .scenery()
  .placeIn(entrance)
  .done();
```

**C. Story-level helpers (no platform change):**
```typescript
// Helpers defined in the story file or a shared module
function scenery(world, name, room, opts) { ... }
function item(world, name, room, opts) { ... }
```

**Trade-offs**:
- (A) is the most ergonomic but adds API surface to WorldModel
- (B) is flexible but may be over-engineered for what's essentially sugar
- (C) requires no platform changes and can ship in the tutorial itself

**Priority**: Low — the verbose pattern works, is explicit, and teaches well. But it's a paper cut for experienced authors writing real stories.

**Discovered during**: Family Zoo tutorial development — the pattern repeats 30+ times in a single file.

---

### ISSUE-054: Multi-word aliases don't resolve in the parser

**Reported**: 2026-03-23
**Severity**: Medium
**Component**: Platform (parser-en-us)

**Description**:
Entity aliases with spaces (multi-word aliases) don't resolve when used in player commands. For example, an entity with `aliases: ['bush babies', 'bush baby', 'galagos']` can be referenced by `examine galagos` but NOT by `examine bush babies`.

**Reproduction**:
```typescript
const bushBabies = world.createEntity('bush babies', EntityType.SCENERY);
bushBabies.add(new IdentityTrait({
  name: 'bush babies',
  aliases: ['bush babies', 'bush baby', 'galagos'],
}));
```
- `examine galagos` → works (single-word alias)
- `examine bush babies` → "You can't see any such thing." (multi-word alias fails)
- `examine bush baby` → needs testing

**Impact**: Authors must provide single-word aliases as workarounds. Multi-word names like "flower beds", "hay bale", "rope perches" also fail as aliases (but work as the primary `name` in some contexts). Discovered during Family Zoo tutorial development.

**Workaround**: Always include at least one single-word alias for every entity.

---

### ISSUE-052: Capability registry uses module-level Map; not shared across require() boundaries

**Reported**: 2026-02-08
**Severity**: High
**Component**: Platform (world-model / capability-registry.ts)
**Status**: Fixed 2026-02-13 — `capability-registry.ts` now uses `globalThis` storage via `__sharpee_capability_behaviors__` key, matching the pattern in `interceptor-registry.ts`.
