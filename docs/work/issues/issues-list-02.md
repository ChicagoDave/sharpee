# Known Issues

Catalog of known bugs and issues to be addressed.

**Test Summary (2026-01-22):** 599 passed, 756 failed, 11 expected failures, 49 skipped across 89 transcripts.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-029 | GDT TK (telekinesis) command produces no output | Critical | GDT/Story | 2026-01-22 | - | - |
| ISSUE-030 | GDT AH (teleport) command produces no output | Critical | GDT/Story | 2026-01-22 | - | - |
| ISSUE-031 | UNDO command not implemented | Medium | Platform | 2026-01-22 | - | - |
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-033 | AGAIN command fails after second NORTH | Low | Platform | 2026-01-22 | - | - |
| ISSUE-034 | Inventory message test expects different format | Low | Test | 2026-01-22 | - | - |

---

## Open Issues

### ISSUE-029: GDT TK (telekinesis) command produces no output

**Reported**: 2026-01-22
**Severity**: Critical
**Component**: GDT / Story

**Description**:
The GDT `tk` (telekinesis/take) command produces empty output instead of taking items. This blocks approximately 50% of transcript tests that rely on GDT for setup.

**Reproduction**:
```
> gdt
[GDT enabled]
> tk brass lantern
[no output]
```

**Expected**: "Taken." or similar confirmation.

**Impact**: Blocks ~400+ test assertions across 50+ transcripts.

**Affected transcripts**: wind-canary, weight-capacity, wave-rainbow, troll-visibility, troll-recovery, and many more.

---

### ISSUE-030: GDT AH (teleport) command produces no output

**Reported**: 2026-01-22
**Severity**: Critical
**Component**: GDT / Story

**Description**:
The GDT `ah` (teleport) command produces empty output instead of teleporting the player. This blocks many transcript tests that use AH to set up test scenarios.

**Reproduction**:
```
> gdt
[GDT enabled]
> ah Troll Room
[no output]
> look
West of House [still at starting location]
```

**Expected**: "Teleported to Troll Room." and player moves to that room.

**Impact**: Blocks ~300+ test assertions across 40+ transcripts.

---

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

---

### ISSUE-032: Version transcript needs update for DUNGEON name

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test

**Description**:
The version.transcript test expects "DUNGEO v" but the story was renamed to "DUNGEON" (full spelling). The "DUNGEO" spelling was a nostalgia reference to the PDP-11 era filename limit, but the game title should use the full spelling.

**Resolution**: Update test to expect "DUNGEON" instead of "DUNGEO v".

---

### ISSUE-033: AGAIN command fails after second NORTH

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Platform (Engine)

**Description**:
In again.transcript, after going NORTH twice, the `g` (again) command goes to "Forest Path" instead of "Clearing".

**Reproduction**:
```
> north       → Forest
> g           → Forest Path (should repeat NORTH to Clearing)
```

**Notes**: May be correct behavior if NORTH from Forest leads to Forest Path, not Clearing. Needs verification against map.

---

### ISSUE-034: Inventory message test expects different format

**Reported**: 2026-01-22
**Severity**: Low
**Component**: Test / Lang

**Description**:
The inventory-message.transcript expects specific inventory format that doesn't match current output.

**Resolution**: Update test or update inventory message format.

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

---

## Passing Transcripts (20)

These transcripts pass completely:

- again-minimal
- again-simple
- attic-dark
- debug-trapdoor
- drop-all-empty
- endgame-laser-puzzle
- endgame-mirror
- grue-mechanics
- implicit-take-test
- light-reveals-room
- mailbox
- multi-object-format
- navigation
- room-contents-on-entry
- take-all-filter
- trophy-case-scoring
- troll-combat
- troll-interactions
- save-test
- bucket-well

---

## Test Statistics

**By failure category:**
- GDT command failures: ~500 assertions
- Unimplemented features: ~200 assertions
- Minor format/message issues: ~50 assertions

**Priority order:**
1. Fix ISSUE-029 and ISSUE-030 (GDT commands) - unblocks majority of tests
2. Implement remaining story features
3. Update test assertions for format changes
