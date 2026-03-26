# Dungeo Known Issues (List 01)

Story-specific issues for Project Dungeo. Platform issues are tracked separately
in [docs/work/issues/issues-list-04.md](../../issues/issues-list-04.md).

## Summary

| Issue | Description | Severity | Component | Identified | Fixed |
|-------|-------------|----------|-----------|------------|-------|
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | test | 2026-01-22 | - |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | - |
| ISSUE-053 | Grating/skeleton key wiring broken | High | dungeo | 2026-03-23 | 2026-03-23 |

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

## Fixed Issues

### ISSUE-053: Grating/skeleton key wiring broken

**Reported**: 2026-03-23
**Severity**: High
**Component**: dungeo (story)
**Status**: Fixed 2026-03-23

Four problems made the grating puzzle non-functional: duplicate grating entities (forest.ts and maze.ts), `key.attributes.unlocksId` is a no-op, `LockableTrait` has no `keyId`, and exits don't use `via` to check the grating's open/locked state.

**Details**: See [../../issues/issue-053-grating-key-wiring.md](../../issues/issue-053-grating-key-wiring.md)

---
