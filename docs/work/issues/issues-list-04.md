# Known Issues (List 04)

Catalog of known bugs and issues to be addressed.
Continued from [issues-list-03.md](issues-list-03.md) (closed 2026-02-16).

**Numbering note**: Issues 031-056 were assigned in lists 01-03. This list
starts new issues at 057. Carried-over issues from list-03 keep their
original numbers.

## Summary

| Issue | Description | Severity | Component | Identified | Fixed |
|-------|-------------|----------|-----------|------------|-------|
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | test | 2026-01-22 | - |
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | 2026-03-26 |
| ISSUE-048 | Zifmia not updated to latest platform | Medium | client-zifmia | 2026-02-04 | 2026-03-26 (closed — ongoing release workflow, not a tracked issue) |
| ISSUE-049 | `$seed` directive for deterministic randomization testing | Low | transcript-tester | 2026-02-07 | 2026-03-26 (deferred — logic gates in transcript-tester cover this) |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | - |
| ISSUE-052 | Capability registry module-level Map not shared across require() | High | world-model | 2026-02-08 | 2026-02-13 |
| ISSUE-053 | Grating/skeleton key wiring broken | High | dungeo | 2026-03-23 | 2026-03-23 |
| ISSUE-057 | Multi-word aliases don't resolve in the parser | Medium | parser-en-us, stdlib | 2026-03-23 | 2026-03-26 |
| ISSUE-058 | Entity creation is excessively repetitive — needs builder/helper API | Low | world-model | 2026-03-23 | - |
| ISSUE-059 | Transcript tester `story:` header field is metadata-only | Low | transcript-tester | 2026-03-24 | - |
| ISSUE-060 | No "execute but don't assert" transcript assertion | Low | transcript-tester | 2026-03-24 | - |
| ISSUE-061 | Multi-word entity names fail in story grammar `:thing` slots | Medium | parser-en-us | 2026-03-24 | 2026-03-26 (same root cause as ISSUE-057) |
| ISSUE-062 | Fuse `skipNextTick` behavior undocumented at API level | Low | plugin-scheduler | 2026-03-24 | - |
| ISSUE-063 | `as any` regression — 1,035 occurrences across 203 files | High | platform-wide | 2026-03-26 | - |
| ISSUE-064 | VisibilityBehavior has 3 duplicate container-walk traversals | Medium | world-model | 2026-03-26 | - |
| ISSUE-065 | Two disconnected scope evaluation systems (world-model vs parser) | Medium | world-model, parser-en-us | 2026-03-26 | - |
| ISSUE-066 | Entering/exiting grammar explosion — 14+ patterns for 2 actions | Low | parser-en-us | 2026-03-26 | - |
| ISSUE-067 | Trace commands defined as 10 individual literal patterns | Low | parser-en-us | 2026-03-26 | - |

---

## Fixed Issues

### ISSUE-052: Capability registry uses module-level Map; not shared across require() boundaries

**Reported**: 2026-02-08
**Severity**: High
**Component**: Platform (world-model / capability-registry.ts)
**Status**: Fixed 2026-02-13

`capability-registry.ts` now uses `globalThis` storage via `__sharpee_capability_behaviors__` key, matching the pattern in `interceptor-registry.ts`.

---

### ISSUE-053: Grating/skeleton key wiring broken

**Reported**: 2026-03-23
**Severity**: High
**Component**: dungeo (story)
**Status**: Fixed 2026-03-23

Four problems made the grating puzzle non-functional: duplicate grating entities (forest.ts and maze.ts), `key.attributes.unlocksId` is a no-op, `LockableTrait` has no `keyId`, and exits don't use `via` to check the grating's open/locked state.

**Details**: See [issue-053-grating-key-wiring.md](issue-053-grating-key-wiring.md)

### ISSUE-057: Multi-word aliases don't resolve in the parser

**Reported**: 2026-03-23
**Severity**: Medium
**Component**: Platform (stdlib / command-validator, world-model / scope-resolver)
**Status**: Fixed 2026-03-26

**Root cause**: The command validator searched by `ref.head` (last token, e.g., "babies" from "bush babies") instead of `ref.text` (full phrase "bush babies"). The parser's slot consumer already built multi-word phrases correctly — the validator just wasn't using them.

**Fix**: Maximal munch in `resolveEntity()` — try full `ref.text` first, fall back to `ref.head`. Also added full-text scoring tiers in `scoreEntities()` (15/12 for full text vs 10/8/6/4 for head-only).

**Also exposed**: NPC inventory items were treated as REACHABLE by default, causing disambiguation when player and NPC both carried items with the same alias ("knife"). Fixed by adding `OpenInventoryTrait` — NPC inventory defaults to VISIBLE-only, authors opt in to REACHABLE with the trait.

**Also fixes**: ISSUE-061 (multi-word names in story grammar `:thing` slots) — same root cause.

**Details**: See [plans/issue-057-plan.md](plans/issue-057-plan.md) for full root cause analysis.

---

### ISSUE-061: Multi-word entity names fail in story grammar `:thing` slots

**Reported**: 2026-03-24
**Severity**: Medium
**Component**: Platform (parser-en-us)
**Status**: Fixed 2026-03-26 (same root cause as ISSUE-057)

Same root cause as ISSUE-057. The maximal munch fix in the command validator resolves both stdlib grammar and story grammar `:thing` slots.

---

### ISSUE-047: Zifmia console output panel

**Reported**: 2026-02-01
**Severity**: Medium
**Component**: client-zifmia
**Status**: Fixed 2026-03-26

Console output panel was implemented in the Zifmia client.

---

### ISSUE-048: Zifmia not updated to latest platform

**Reported**: 2026-02-04
**Severity**: Medium
**Component**: client-zifmia
**Status**: Closed 2026-03-26

Closed — this is an ongoing release workflow concern, not a tracked issue. Zifmia must be rebuilt after platform changes using `./build.sh -s dungeo -c zifmia` followed by `tauri build`.

### ISSUE-049: `$seed` directive for deterministic randomization testing

**Reported**: 2026-02-07
**Severity**: Low
**Component**: Platform (transcript-tester)
**Status**: Deferred 2026-03-26

Deferred — the transcript-tester's logic gates (DO-UNTIL, WHILE, ENSURES) handle randomness and alternate paths as live tests, which is a better approach than seeding a PRNG. Revisit only if logic gates prove insufficient.

---

## Open Issues — Carried Over

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test

**Description**:
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling). The "DUNGEO" spelling was a nostalgia reference to the PDP-11 era filename limit, but the game title should use the full spelling.

**Resolution**: Update test to expect "DUNGEON" instead of "DUNGEO v".

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

## Open Issues — Parser

### ISSUE-066: Entering/exiting grammar explosion — 14+ patterns for 2 actions

**Reported**: 2026-03-26
**Severity**: Low
**Component**: Platform (parser-en-us / grammar.ts)
**Type**: Enhancement

**Description**:
The entering and exiting actions require 14+ individual `.define()` patterns because `.forAction()` does not support phrasal verbs (multi-word verb phrases):

**Entering** (7 patterns):
- `enter :portal`
- `get in :portal`
- `get into :portal`
- `climb in :portal`
- `climb into :portal`
- `go in :portal`
- `go into :portal`

Plus vehicle variants: `board :vehicle`, `get on :vehicle`

**Exiting** (7 patterns):
- `exit`, `exit :container`
- `get out`
- `leave`
- `climb out`
- `disembark`, `disembark :vehicle`
- `get off :vehicle`
- `alight`

All entering patterns have the same constraint (`hasTrait ENTERABLE`) and map to the same action. All exiting patterns similarly converge.

**Root cause**: `.forAction()` only accepts single-word verbs. Phrasal verbs like "get in", "climb into", "get off" require individual `.define()` calls. Every new synonym (e.g., "hop in", "step into", "jump in") requires another `.define()` block.

**Proposed fix**: Extend `.forAction()` (or add a `.phrasalVerbs()` method) to accept multi-word verb phrases:

```typescript
grammar
  .forAction('if.action.entering')
  .verbs(['enter'])
  .phrasalVerbs(['get in', 'get into', 'climb in', 'climb into', 'go in', 'go into'])
  .pattern(':portal')
  .hasTrait('portal', TraitType.ENTERABLE)
  .build();
// Generates 7 rules from one declaration
```

**Priority**: Low — the current patterns work. This is a DX improvement that would reduce grammar.ts line count and make it easier to add synonyms. Relevant if stories frequently need entering/exiting variants (vehicles, portals, etc.).

**Dungeo blast radius**: Dungeo uses `EnterableTrait` on 3 entities: the magic boat (`inflate-action.ts`), the basket (`coal-mine.ts`), and the balloon (`volcano.ts`). The bucket in the well room also has `EnterableTrait`. Walkthroughs and transcripts use entering/exiting commands in **51 transcript files** (141 occurrences total) — these include `enter`, `get in`, `board`, `exit`, `get out`, `climb in`, etc. A grammar refactor here would not change behavior but must not break these transcript assertions. The inflatable entering interceptor (`inflatable-entering-interceptor.ts`) also dynamically adds/removes `EnterableTrait` when the boat is inflated/deflated, so testing must cover that path.

---

### ISSUE-067: Trace commands defined as 10 individual literal patterns

**Reported**: 2026-03-26
**Severity**: Low
**Component**: Platform (parser-en-us / grammar.ts)
**Type**: Enhancement

**Description**:
The debug trace system has 10 individual grammar rules for what is essentially one command with two optional parameters:

```
trace
trace on
trace off
trace parser on
trace parser off
trace validation on
trace validation off
trace system on
trace system off
trace all on
trace all off
```

Each is a separate `.define()` with the same action mapping (`author.trace`). Adding a new trace subsystem (e.g., `trace scope on`) requires adding two more grammar rules.

**Proposed fix**: Replace with a single parameterized pattern using vocabulary or text slots:

```typescript
grammar
  .define('trace [:subsystem] [:state]')
  .mapsTo('author.trace')
  .withPriority(100)
  .build();
```

Where `:subsystem` is a vocabulary slot matching `parser`, `validation`, `system`, `all` (or empty for default), and `:state` matches `on`, `off` (or empty for toggle).

This reduces 10 rules to 1, and new subsystems require only a vocabulary entry rather than new grammar rules.

**Priority**: Low — the current rules work fine. This is a maintainability improvement. The trace system is rarely modified.

**Dungeo blast radius**: None. No Dungeo transcripts use trace commands. The trace system is author/debug-only and not exercised by walkthroughs or unit transcripts. Safe to refactor without story-side testing.

---

## Open Issues — Platform Type Safety

### ISSUE-063: `as any` regression — 1,035 occurrences across 203 files

**Reported**: 2026-03-26
**Severity**: High
**Component**: Platform-wide (all packages)
**Type**: Tech debt / type safety regression

**Description**:
A previous refactor removed all `as any` casts from the codebase. They have regressed significantly — there are now **1,035 occurrences across 203 files** in `packages/`. This undermines TypeScript's type safety guarantees and has been a source of bugs (the "dropping bug" was caused by actions that appeared to work because types weren't enforced).

**Worst offenders (source files)**:

| File | Count | Notes |
|------|-------|-------|
| `engine/src/game-engine.ts` | 32 | Core engine |
| `stdlib/src/actions/standard/drinking/drinking.ts` | 22 | Action implementation |
| `world-model/src/world/VisibilityBehavior.ts` | 21 | Visibility system |
| `transcript-tester/src/runner.ts` | 16 | Test runner |
| `stdlib/src/actions/base/snapshot-utils.ts` | 15 | Action utilities |
| `world-model/src/traits/edible/edibleBehavior.ts` | 13 | Trait behavior |
| `world-model/src/entities/if-entity.ts` | 12 | Entity core |
| `world-model/src/world/WorldModel.ts` | 12 | World model core |
| `stdlib/src/scope/scope-resolver.ts` | 12 | Scope resolution |
| `parser-en-us/src/english-parser.ts` | 11 | Parser core |
| `world-model/src/world/AuthorModel.ts` | 8 | Author model |

**Worst offenders (test files)** — tests are lower priority but should still be typed:

| File | Count |
|------|-------|
| `world-model/tests/integration/room-navigation.test.ts` | 53 |
| `world-model/tests/integration/door-mechanics.test.ts` | 50 |
| `world-model/tests/integration/trait-combinations.test.ts` | 46 |
| `world-model/tests/integration/visibility-chains.test.ts` | 23 |
| `stdlib/tests/unit/actions/taking-golden.test.ts.template` | 21 |
| `stdlib/tests/unit/actions/report-helpers.test.ts` | 21 |
| `parser-en-us/tests/adr-080-grammar-enhancements.test.ts` | 17 |
| `world-model/tests/unit/world/visibility-behavior.test.ts` | 17 |

**Root cause**: Most `as any` casts are for trait property access — `getTrait()` returns a base `ITrait` and callers cast to access typed properties. A generic `getTrait<T extends ITrait>(type): T | undefined` would eliminate most of these structurally.

**Approach**: This should be tackled in phases:
1. **Phase 1**: Fix `getTrait` typing so trait access doesn't require casts (structural fix, biggest impact)
2. **Phase 2**: Clean up source files by count — game-engine.ts, VisibilityBehavior.ts, drinking.ts, WorldModel.ts
3. **Phase 3**: Clean up test files (lower priority, but prevents regression)
4. **Phase 4**: Add a CI lint rule to prevent new `as any` introductions

**CLAUDE.md note**: The project already prohibits `as any`. This issue tracks the enforcement gap.

**Dungeo blast radius**: **73 occurrences across 42 story files**. Categories:

| Pattern | Count | Files | Examples |
|---------|-------|-------|----------|
| Trait property access via cast | ~20 | behaviors, handlers, interceptors | `(openable as any).isOpen`, `(npcTrait as any).customProperties` |
| `sharedData as any` in actions | ~10 | puzzle-move, puzzle-take-card, gdt, say | Passing data between action phases |
| Direct attribute mutation | ~8 | inflate, deflate, interceptors | `(boat as any).attributes.displayName` |
| GDT debug entity inspection | ~10 | gdt/commands/de.ts, kl.ts | `(entity as any).isOpen`, `(entity as any).portable` |
| Ad-hoc state via `as any` | ~15 | traits (comment-only, replaced by proper traits) | Comments documenting old anti-patterns |
| `world as any` | ~3 | press-button, commanding | Passing world to untyped functions |

The story-side `as any` casts fall into two groups: (1) casts that exist because the platform's `getTrait()` isn't generic (same root cause as platform), and (2) casts that set ad-hoc properties on entities — most of these were already refactored into proper traits (the `as any` references in trait files are in doc comments showing the old anti-pattern). The GDT debug commands (`de.ts`) are the worst offender with 10 casts for entity property inspection.

---

## Open Issues — Platform Refactoring

### ISSUE-058: Entity creation is excessively repetitive — needs builder/helper API

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
const fence = world.createScenery('iron fence', entrance.id, {
  description: '...',
  aliases: ['fence'],
  article: 'an',
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

### ISSUE-064: VisibilityBehavior has 3 duplicate container-walk traversals

**Reported**: 2026-03-26
**Severity**: Medium
**Component**: Platform (world-model / VisibilityBehavior.ts)
**Type**: Refactor

**Description**:
Three methods in `VisibilityBehavior` implement the same algorithm — walk up the containment tree from an entity to its room, checking for closed opaque containers at each step:

1. **`hasLineOfSight`** (line 369) — walks up from target, returns boolean
2. **`isAccessible`** (line 328) — walks up from entity, returns boolean
3. **`isVisible`** (line 441) — walks up from entity, returns boolean

The logic at each hop is nearly identical:
```typescript
if (container.hasTrait(TraitType.CONTAINER)) {
  const containerTrait = container.getTrait(TraitType.CONTAINER) as any;
  const isTransparent = containerTrait?.isTransparent ?? false;
  if (!isTransparent && container.hasTrait(TraitType.OPENABLE)) {
    const openable = container.getTrait(TraitType.OPENABLE) as any;
    const isOpen = openable?.isOpen ?? false;
    if (!isOpen) return false;
  }
}
```

This block appears three times with minor variations (actors pass through in some but not others; `hasLineOfSight` builds a path array while the others just return boolean).

**Proposed fix**: Extract a shared `walkToRoom(entityId, world, options?)` helper that traverses from entity to room and calls a predicate at each container. The three methods become thin wrappers that pass different predicates or options.

**Interaction with ISSUE-063**: This file also has 21 `as any` casts, almost all in these three methods. Fixing both issues together would be efficient — extract the shared traversal AND type the trait access properly in one pass.

**Dungeo blast radius**: Dungeo uses `VisibilityBehavior` directly in **8 files** (14 call sites):
- `grue-handler.ts` (4 calls) — checks `isDark()` to determine grue presence and danger on room transitions
- `event-handlers.ts` (1 call) — checks `isDark()` for light-dependent event handling
- `index.ts` (3 references) — imports `VisibilityBehavior` and registers `TrollAxeVisibilityBehavior`
- `troll-axe-behaviors.ts` (1) — custom visibility capability behavior for the troll's axe
- `commanding-action.ts` (1) — `context.canSee(npc)` which delegates to `VisibilityBehavior.canSee`
- `troll-daemon.ts`, `underground.ts` (comments only) — reference the visibility system

A refactor of `VisibilityBehavior`'s internal methods would not change its public API (`isDark`, `canSee`, `getVisible`, `isVisible`), so story code should be unaffected. However, the `TrollAxeVisibilityBehavior` uses the capability dispatch system to control axe visibility — any changes to how `VISIBILITY_CAPABILITY` is evaluated in `canSee` would need to be tested against the troll combat scenario. The grue handler is the most critical consumer — incorrect darkness checks break a core game mechanic.

---

### ISSUE-065: Two disconnected scope evaluation systems

**Reported**: 2026-03-26
**Severity**: Medium
**Component**: Platform (world-model, parser-en-us, stdlib)
**Type**: Architectural review

**Description**:
There are three systems that evaluate entity scope, with unclear boundaries:

1. **world-model `ScopeRegistry` + `ScopeEvaluator`** (`packages/world-model/src/scope/`)
   - Rule-based system with triple-indexed registry (by location, action, global)
   - Supports conditions, priorities, caching
   - Full `IScopeRule` interface with `fromLocations`, `forActions`, `includeEntities`

2. **parser-en-us `scope-evaluator.ts`** (`packages/parser-en-us/src/scope-evaluator.ts`)
   - Has its own `findEntitiesByName()` with base scope resolution (visible/touchable/carried/nearby)
   - Applies property constraints, function constraints, trait filters
   - Two-stage name matching (exact then partial)

3. **stdlib `command-validator.ts`** (`packages/stdlib/src/validation/command-validator.ts`)
   - Does its own entity search by name, type, synonym, adjective
   - Has its own scope level filtering (CARRIED/REACHABLE/VISIBLE/AWARE)
   - Has its own scoring and disambiguation

**Questions to resolve**:
- Is the world-model `ScopeRegistry` actively used by the parser, or has the parser evolved its own scope handling?
- Should the parser's scope-evaluator delegate to the world-model's, or are they solving different problems?
- The stdlib validator's entity resolution overlaps heavily with the parser's — is this intentional (two-pass design) or accidental duplication?

**This is not a bug** — the system works. But the architectural layering is unclear, which makes it hard to know where to add new scope rules (e.g., a magic telescope that lets you see into another room). An architectural review should determine whether these can be consolidated or whether the current separation has a reason.

**Recommended action**: Read through the actual call chains to determine which world-model scope APIs the parser and stdlib actually invoke at runtime. If the `ScopeRegistry` is unused, either integrate it or remove it. If it is used, document the boundary.

**Dungeo blast radius**: Dungeo references scope-related concepts in **9 source files** (13 occurrences). These are almost all action implementations that check scope indirectly via `context.currentLocation`, `context.canSee()`, or trait-based filtering — not direct `ScopeRegistry` or `ScopeEvaluator` calls. Story actions like `burn`, `lower`, `lift`, `ring`, and `break` use scope constraints in their grammar definitions (`.where('target', scope => scope.visible())`). The troll axe trait declares a `VISIBILITY_CAPABILITY` that affects scope indirectly. If scope systems were consolidated, the story-facing API (`context.canSee`, grammar `.where()` constraints) should remain stable. The risk is in edge cases where the parser's scope evaluation and the validator's scope evaluation disagree — currently these may silently compensate for each other, and consolidating could expose or change those behaviors. Recommend running the full walkthrough chain (`wt-01` through `wt-17`) after any scope refactor.

---

## Open Issues — Transcript Tester

### ISSUE-059: Transcript tester `story:` header field is metadata-only

**Reported**: 2026-03-24
**Severity**: Low (DX)
**Component**: Platform (transcript-tester / fast-cli.ts)

The `story:` field in transcript headers (e.g., `story: familyzoo`) is not used by the transcript runner to load the story at runtime. The runner always uses the `--story` CLI flag (default: `stories/dungeo`). Authors must remember to pass `--story tutorials/familyzoo` on every test invocation.

**Expected**: The runner should auto-resolve the story path from the `story:` header field when no `--story` flag is provided.

**Workaround**: Always pass `--story <path>` when running transcripts for non-default stories.

---

### ISSUE-060: No "execute but don't assert" transcript assertion

**Reported**: 2026-03-24
**Severity**: Low (DX)
**Component**: Platform (transcript-tester / parser.ts)

There is no assertion format that means "run the command but always pass." The available options:
- `[SKIP]` — skips execution entirely (needed for DO-UNTIL loop support, see commit `f80df965`)
- `[OK]` — requires exact match against expected output; fails when output exists but no expected output is given
- `[OK: contains "X"]` — requires specific text in output

Authors writing transcripts with "don't care" commands (e.g., `wait` to burn turns) must use `[OK: contains "Time passes"]` as a workaround. A `[RUN]` or `[OK: any]` assertion type would be useful.

**Workaround**: Use `[OK: contains "Time passes"]` or similar broad assertion.

---

## Open Issues — Documentation

### ISSUE-062: Fuse `skipNextTick` behavior undocumented at API level

**Reported**: 2026-03-24
**Severity**: Low (Documentation)
**Component**: Platform (plugin-scheduler)

When a fuse is set via `scheduler.setFuse()`, it internally sets `skipNextTick: true` on the `FuseState`. This means a fuse with `turns: 10` actually fires ~11 ticks after registration (10 countdown ticks + 1 skipped tick). The `skipNextTick` field exists on the `FuseState` interface with a brief comment, but this behavior is not documented in the API reference or the `Fuse` interface itself.

**Impact**: Authors setting fuses get off-by-one timing. Discovered during Family Zoo V15 implementation when timed events fired one turn later than expected.

**Workaround**: Account for the extra tick when setting fuse turn counts (use `turns: N-1` if you want the fuse to fire after N player turns).
