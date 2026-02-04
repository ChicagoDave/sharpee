# Known Issues

Catalog of known bugs and issues to be addressed.

## Summary

| Issue | Description | Severity | Component | Identified | Deferred | Fixed |
|-------|-------------|----------|-----------|------------|----------|-------|
| ISSUE-031 | UNDO command not implemented | Medium | Platform | 2026-01-22 | - | - |
| ISSUE-032 | Version transcript needs update for DUNGEON name | Low | Test | 2026-01-22 | - | - |
| ISSUE-047 | Zifmia client needs console output panel without full Dev Tools | Medium | client-zifmia | 2026-02-01 | - | - |
| ISSUE-048 | Zifmia needs graceful handling for breaking platform changes | Medium | client-zifmia | 2026-02-04 | - | - |

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

### ISSUE-048: Zifmia needs graceful handling for breaking platform changes

**Reported**: 2026-02-04
**Severity**: Medium
**Component**: client-zifmia

**Description**:
When the platform bundle introduces breaking changes (renamed/removed exports), the Zifmia client crashes with unhelpful errors like:

```
The requested module '@sharpee/world-model' does not provide an export named 'StoryInfoTrait'
```

**Expected**: Zifmia should detect version mismatches or missing exports and display a user-friendly message indicating the platform bundle needs to be rebuilt, rather than crashing with a raw module error.

**Notes**: This is a developer experience issue. When iterating on platform code, stale Zifmia bundles break silently. Consider version checking or try/catch wrappers around dynamic imports.

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
