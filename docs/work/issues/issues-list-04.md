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
| ISSUE-052 | Capability registry uses module-level Map; not shared across require() | High | world-model | 2026-02-08 | - | - |

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

### ISSUE-052: Capability registry uses module-level Map; not shared across require() boundaries

**Reported**: 2026-02-08
**Severity**: High
**Component**: Platform (world-model / capability-registry.ts)

**Description**:
`capability-registry.ts` stores registered capability behaviors in a module-level `const Map`. When the CLI bundle loads a story via dynamic `require()`, the story module gets its own copy of `@sharpee/world-model`. Capability behaviors registered by the story are stored in the story's Map instance, invisible to the platform's dispatch code (which reads from its own Map instance).

In contrast, `interceptor-registry.ts` uses `globalThis` for storage, which IS shared across `require()` boundaries. This is why interceptors work correctly while capabilities do not.

**Reproduction**:
```typescript
// Story code (loaded via require())
import { registerCapabilityBehavior } from '@sharpee/world-model';
registerCapabilityBehavior('my.trait', 'if.action.foo', myBehavior);
// → Stored in story module's Map instance

// Platform code (different module instance)
import { findCapabilityBehavior } from '@sharpee/world-model';
findCapabilityBehavior('my.trait', 'if.action.foo');
// → Returns undefined (reads from platform's Map instance)
```

**Impact**: Any story that registers capability behaviors will silently fail. The platform falls back to stdlib action default behavior, so the game works but entity-specific behavior is lost.

**Workaround**: Use action interceptors (registered via `registerActionInterceptor()` which uses `globalThis`) instead of capability behaviors. This was applied for the troll in Phase 7.

**Proposed Fix**: Change `capability-registry.ts` to use `globalThis` for storage, matching the pattern in `interceptor-registry.ts`:
```typescript
// Before (broken):
const capabilityBehaviors = new Map<string, Map<string, CapabilityBehavior>>();

// After (fixed):
const GLOBAL_KEY = '__sharpee_capability_behaviors__';
function getRegistry(): Map<string, Map<string, CapabilityBehavior>> {
  if (!(globalThis as any)[GLOBAL_KEY]) {
    (globalThis as any)[GLOBAL_KEY] = new Map();
  }
  return (globalThis as any)[GLOBAL_KEY];
}
```

**Priority**: High — this affects all stories using capability dispatch. Currently only the troll was affected (worked around), but future entities using capability behaviors will hit the same issue.
