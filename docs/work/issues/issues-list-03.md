# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-031 | UNDO command not implemented | Medium | Platform | 2026-01-22 | - | 2026-02-04 |
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | - | - |
| ISSUE-048 | Zifmia not updated to latest platform | Medium | client-zifmia | 2026-02-04 | - | - |
| ISSUE-049 | `$seed` directive for deterministic randomization testing | Low | transcript-tester | 2026-02-07 | - | - |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | - | - |
| ISSUE-051 | TrollTrait capability declaration stale after melee interceptor | Low | dungeo | 2026-02-08 | - | - |

---

## Open Issues

### ISSUE-031: UNDO command not implemented

**Reported**: 2026-01-22
**Severity**: Medium
**Component**: Platform (Engine)

**Description**:
The UNDO command does not emit a `platform.undo_completed` event. The feature appears to be unimplemented.

**Reproduction**:
```
> look
> north
> undo
[no output]
```

**Expected**: Previous game state restored, confirmation message.

**Affected transcripts**: undo-basic.transcript

**Status**: Fixed 2026-02-04 — UNDO was implemented in Jan 2026. Test passes. Snapshot-based restoration working correctly.

---

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

### ISSUE-051: TrollTrait capability declaration stale after melee interceptor

**Reported**: 2026-02-08
**Severity**: Low
**Component**: dungeo (story)

**Description**:
`TrollTrait` still declares `capabilities: ['if.action.attacking']` but no corresponding capability behavior is registered. The melee interceptor now handles all combat resolution, making this declaration vestigial. On each troll attack, stderr logs: `Universal dispatch: trait "dungeo.trait.troll" claims "if.action.attacking" but no behavior registered. Falling back to stdlib action.`

**Resolution**: Remove the stale `capabilities` declaration from `TrollTrait`, or remove the entire capability dispatch registration if no longer needed.

**Priority**: Low — cosmetic. The melee interceptor correctly handles combat; the warning is harmless noise.

---

## Deferred Issues

*Issues deferred because they test features not yet implemented.*

### Features Not Yet Implemented (Blocking Tests)

The following transcripts test features that are not yet implemented in Dungeo. These are not bugs - they are roadmap items:

| Transcript | Feature Needed |
|------------|----------------|
| boat-inflate-deflate | Boat/raft mechanics |
| boat-stick-puncture | Boat puncture |
| balloon-flight | Balloon mechanics |
| balloon-actions | Balloon mechanics |
| basket-elevator | Elevator mechanics |
| robot-commands | Robot NPC |
| maze-navigation | Maze rooms |
| maze-loops | Maze rooms |
| frigid-river-full | River/boat mechanics |
| flooding | Dam flooding |
| dam-puzzle | Dam mechanics |
| bucket-well | Well/bucket mechanics |
| coal-machine | Coal machine puzzle |
| mirror-room-toggle | Mirror room mechanics |
| royal-puzzle-* | Royal Puzzle Box |
| tiny-room-puzzle | Bank puzzle |
| bank-puzzle | Bank puzzle |
| exorcism-ritual | Exorcism puzzle |
| cyclops-magic-word | Cyclops NPC |
| coffin-* | Coffin/Egyptian area |
| endgame-* | Endgame content |
