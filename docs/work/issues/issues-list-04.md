# Platform Known Issues (List 04)

Catalog of known platform bugs and issues to be addressed.
Continued from [issues-list-03.md](issues-list-03.md) (closed 2026-02-16).

**Dungeo-specific issues** are tracked separately in
[docs/work/dungeo/issues/issues-list-01.md](../dungeo/issues/issues-list-01.md).

**Numbering note**: Issues 031-056 were assigned in lists 01-03. This list
starts new issues at 057. Carried-over issues from list-03 keep their
original numbers.

## Summary

| Issue | Description | Severity | Component | Identified | Fixed |
|-------|-------------|----------|-----------|------------|-------|
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | 2026-03-26 |
| ISSUE-048 | Zifmia not updated to latest platform | Medium | client-zifmia | 2026-02-04 | 2026-03-26 (closed — ongoing release workflow, not a tracked issue) |
| ISSUE-049 | `$seed` directive for deterministic randomization testing | Low | transcript-tester | 2026-02-07 | 2026-03-26 (deferred — logic gates in transcript-tester cover this) |
| ISSUE-052 | Capability registry module-level Map not shared across require() | High | world-model | 2026-02-08 | 2026-02-13 |
| ISSUE-057 | Multi-word aliases don't resolve in the parser | Medium | parser-en-us, stdlib | 2026-03-23 | 2026-03-26 |
| ISSUE-058 | Entity creation is excessively repetitive — needs builder/helper API | Low | world-model | 2026-03-23 | - |
| ISSUE-059 | Transcript tester `story:` header field is metadata-only | Low | transcript-tester | 2026-03-24 | - |
| ISSUE-060 | No "execute but don't assert" transcript assertion | Low | transcript-tester | 2026-03-24 | - |
| ISSUE-061 | Multi-word entity names fail in story grammar `:thing` slots | Medium | parser-en-us | 2026-03-24 | 2026-03-26 (same root cause as ISSUE-057) |
| ISSUE-062 | Fuse `skipNextTick` behavior undocumented at API level | Low | plugin-scheduler | 2026-03-24 | - |
| ISSUE-063 | ~~`as any` elimination — all source + test files clean, ESLint guard added~~ | High | platform-wide | 2026-03-26 | **DONE** 2026-03-27 (PR #64, #66) |
| ISSUE-064 | VisibilityBehavior has 3 duplicate container-walk traversals | Medium | world-model | 2026-03-26 | - |
| ISSUE-065 | Two disconnected scope evaluation systems (world-model vs parser) | Medium | world-model, parser-en-us | 2026-03-26 | - |
| ISSUE-066 | Entering/exiting grammar explosion — 14+ patterns for 2 actions | Low | parser-en-us | 2026-03-26 | - |
| ISSUE-067 | Trace commands defined as 10 individual literal patterns | Low | parser-en-us | 2026-03-26 | - |
| ISSUE-068 | ~~Entity `on` handlers are vestigial — migrate to actions/capabilities, simplify type infrastructure~~ | Medium | world-model, event-processor, stories | 2026-03-27 | **DONE** 2026-03-27 |
| ISSUE-069 | `world.getStateValue`/`setStateValue` is a code smell — puzzle state belongs on entities/traits | Medium | world-model, stories | 2026-03-27 | - |
| ISSUE-070 | Entity descriptions should be computed from trait state, not mutated by event handlers | Medium | world-model | 2026-03-27 | - |

---

## Fixed Issues

### ISSUE-052: Capability registry uses module-level Map; not shared across require() boundaries

**Reported**: 2026-02-08
**Severity**: High
**Component**: Platform (world-model / capability-registry.ts)
**Status**: Fixed 2026-02-13

`capability-registry.ts` now uses `globalThis` storage via `__sharpee_capability_behaviors__` key, matching the pattern in `interceptor-registry.ts`.

---

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

### ISSUE-063: Eliminate all `as any` casts

**Reported**: 2026-03-26
**Severity**: High
**Component**: Platform-wide (all packages)
**Status**: Fixed 2026-03-27 (PRs #64, #66)

All `as any` casts eliminated from both source and test files across all packages. Completed in 9 phases. Source files: 0 unjustified casts (3 documented justified exceptions). Test files: 0 casts (527 eliminated in Phase 9). Dead `packages/core/src/rules/` subsystem removed. ESLint `no-explicit-any: "warn"` override added for regression prevention.

**Key fix**: `getTrait(TraitType.X) as any` → `getTrait(XTrait)!` (typed constructor pattern).

---

### ISSUE-068: Entity `on` handler system

**Reported**: 2026-03-27
**Severity**: Medium
**Component**: Platform (world-model, event-processor, engine) + stories
**Status**: Fixed 2026-03-27

The entire entity `on` handler system was removed. All 19 entity handlers were replaced by existing patterns (capability behaviors, action interceptors, story-level event handlers). Type infrastructure (`LegacyEntityEventHandler`, `AnyEventHandler`, `IEventHandlers`, `on?` on IFEntity) removed.

**Branch**: issue-068-event-handler-types

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

## Open Issues — Platform Refactoring

### ISSUE-070: Entity descriptions should be computed from trait state, not mutated by event handlers

**Reported**: 2026-03-27
**Severity**: Medium
**Component**: Platform (world-model)
**Type**: Architecture

**Description**:
Entity descriptions are stored as a mutable string on `IdentityTrait.description`. When entity state changes (opened/closed, inflated/deflated, lit/unlit), event handlers or action code manually overwrites the description. This is fragile and requires an event-driven callback system (entity `on` handlers) to keep descriptions in sync with state.

**Correct pattern**: The entity's `description` getter should compute from trait state. Traits that affect description (OpenableTrait, InflatableTrait, SwitchableTrait, etc.) provide state-specific descriptions. The entity returns the appropriate one based on current state.

**Example**:
```typescript
// OpenableTrait adds:
openDescription?: string;   // "The trap door is open, revealing a rickety staircase."
closedDescription?: string; // "The dusty cover of a closed trap door."

// Entity description getter checks trait state:
get description(): string {
  const openable = this.get(OpenableTrait);
  if (openable) {
    return openable.isOpen
      ? (openable.openDescription ?? this.identity.description)
      : (openable.closedDescription ?? this.identity.description);
  }
  return this.identity.description;
}
```

**Applies to**: Any trait that changes how an entity is described — openable, inflatable, switchable, lit/unlit light sources, broken/intact objects.

**Discovered during**: ISSUE-068 entity `on` handler audit. Window and trapdoor `opened`/`closed` handlers existed solely to mutate `IdentityTrait.description`.

**Current workaround** (ISSUE-068): Entity `on` handlers were removed. Description switching is now handled by story-level event handlers that read `openDescription`/`closedDescription` from entity attributes. This works but is still mutation-based — computed descriptions would be architecturally cleaner.

**Dungeo blast radius**: The inflate/deflate actions also manually switch `attributes.displayName`. A computed description pattern would replace all mutation-based description switching.

---

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
