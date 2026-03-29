# Dungeo Known Issues (List 01)

Story-specific issues for Project Dungeo. Platform issues are tracked separately
in [docs/work/issues/issues-list-04.md](../../issues/issues-list-04.md).

## Summary

| Issue | Description | Severity | Component | Identified | Fixed |
|-------|-------------|----------|-----------|------------|-------|
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | test | 2026-01-22 | 2026-03-28 |
| ISSUE-050 | Consolidate all Dungeo text into dungeo-en-us.ts for i18n | Low | dungeo | 2026-02-07 | 2026-03-28 (closed — not pursuing i18n for this port) |
| ISSUE-053 | Grating/skeleton key wiring broken | High | dungeo | 2026-03-23 | 2026-03-23 |
| ISSUE-054 | Walkthrough transcripts use $teleport shortcuts instead of real navigation | Medium | walkthroughs | 2026-03-27 | 2026-03-28 |

---

## Open Issues

## Fixed Issues

### ISSUE-050: Consolidate all Dungeo text into dungeo-en-us.ts for i18n

**Reported**: 2026-02-07
**Severity**: Low
**Component**: dungeo (story)
**Status**: Closed 2026-03-28 — not pursuing i18n for this port; left to future contributors.

---

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test
**Status**: Fixed 2026-03-28

Updated all transcript assertions from "DUNGEO" to "DUNGEON" (`help-commands`, `mailbox`, `implicit-inference`). Fixed browser help text in `browser-entry.ts`. The `version.transcript` already expected "DUNGEON" — the stale references were in other transcripts.

---

### ISSUE-054: Walkthrough transcripts use $teleport shortcuts instead of real navigation

**Reported**: 2026-03-27
**Severity**: Medium
**Component**: walkthroughs
**Status**: Fixed 2026-03-28

All 11 `$teleport` directives replaced with real navigation commands across 5 walkthrough transcripts.

### ISSUE-053: Grating/skeleton key wiring broken

**Reported**: 2026-03-23
**Severity**: High
**Component**: dungeo (story)
**Status**: Fixed 2026-03-23

Four problems made the grating puzzle non-functional: duplicate grating entities (forest.ts and maze.ts), `key.attributes.unlocksId` is a no-op, `LockableTrait` has no `keyId`, and exits don't use `via` to check the grating's open/locked state.

**Details**: See [../../issues/issue-053-grating-key-wiring.md](../../issues/issue-053-grating-key-wiring.md)

---
