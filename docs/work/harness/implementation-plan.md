# Implementation Plan: ADR-109 & ADR-110 Testing Extension

**Branch**: `ext-testing`
**Date**: 2026-01-23
**Last Updated**: 2026-01-23

## Overview

Create `@sharpee/ext-testing` package that provides:

- Interactive debug mode (GDT-style)
- Test commands ($teleport, $take, $assert, etc.)
- Save/restore checkpoints
- Playtester annotations (#comments, $bug, $note)

## Status Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 0 | **DONE** | $save/$restore in transcript-tester |
| 1 | **DONE** | Package structure created |
| 2 | **DONE** | Commands implemented in ext-testing |
| 3 | **DONE** | Checkpoint system via SaveRestoreService |
| 4 | **PENDING** | Wire ext-testing $commands to transcript-tester |
| 5 | **CANCELLED** | Dungeo keeps its own GDT system |
| 6 | **PENDING** | Playtester annotations |

---

## Phased Implementation

### Phase 0: Quick Save/Restore (Unblock Walkthroughs) - DONE

**Status**: Completed 2026-01-23

**Implemented**:
- `packages/transcript-tester/src/parser.ts` - Parses $save/$restore directives
- `packages/transcript-tester/src/runner.ts` - Executes save/restore
- `packages/transcript-tester/src/types.ts` - DirectiveType includes 'save' | 'restore'

**Usage in transcripts**:
```
$save before-combat
> attack troll
$restore before-combat
```

---

### Phase 1: Create ext-testing Package Structure - DONE

**Status**: Completed 2026-01-23

**Created**: `packages/extensions/testing/`

```
packages/extensions/testing/
├── package.json           # @sharpee/ext-testing
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts           # Main exports
│   ├── extension.ts       # TestingExtension class
│   ├── types.ts           # DebugContext, DebugCommand interfaces
│   ├── context/
│   │   └── debug-context.ts
│   ├── checkpoints/
│   │   ├── serializer.ts
│   │   └── store.ts
│   └── commands/
│       └── registry.ts
```

**Package built and available** at `@sharpee/ext-testing`.

---

### Phase 2: Port Debug Commands from GDT - DONE

**Status**: Completed 2026-01-23

**Commands implemented in ext-testing**:

| Code | Test Syntax | Name | Category |
|------|-------------|------|----------|
| HE | $help | Help | utility |
| AH | $teleport | Teleport | alter |
| TK | $take | Take Item | alter |
| AO | $move | Move Object | alter |
| RO | $remove | Remove Object | alter |
| DA | $player | Display Adventurer | display |
| DR | $room | Display Room | display |
| DO | $object | Display Object | display |
| DE | $describe | Describe Entity | display |
| DS | $state | Display State | display |
| DX | $exits | Display Exits | display |
| ND | $immortal | No Deaths | toggle |
| RD | $mortal | Restore Deaths | toggle |
| KL | $kill | Kill Entity | alter |
| EX | $exit | Exit Debug | utility |
| SL | $saves | List Saves | utility |

---

### Phase 3: Full Checkpoint System - DONE

**Status**: Completed (via existing SaveRestoreService)

**Implementation**: Uses `packages/engine/src/save-restore-service.ts`

The transcript-tester's $save/$restore already uses SaveRestoreService which handles:
- WorldModel state serialization
- Entity positions and traits
- Game flags and turn count

**Note**: Scheduler state (daemons/fuses) is NOT currently serialized. This is a known limitation but doesn't block walkthrough testing.

---

### Phase 4: Transcript-Tester Integration - PENDING

**Goal**: Wire ext-testing $commands into transcript runner

**Current state**:
- Transcript-tester has $save/$restore (Phase 0)
- ext-testing has executeTestCommand() API
- NOT YET CONNECTED

**To implement**:

1. Add ext-testing as optional dependency to transcript-tester
2. In runner.ts, detect $command syntax and route to ext-testing:

```typescript
// In command execution
if (input.startsWith('$') && !['$save', '$restore'].includes(input.split(' ')[0])) {
  if (testingExtension) {
    const result = testingExtension.executeTestCommand(input, world);
    return createResult(result);
  }
}
```

3. New $commands available in transcripts:
   - `$teleport <room>` - instant travel
   - `$take <item>` - give item to player
   - `$move <obj> <loc>` - move object
   - `$kill <entity>` - kill NPC
   - `$immortal` / `$mortal` - toggle death
   - `$state` - show game state
   - `$describe <entity>` - full entity dump

**Effort**: 2-4 hours

---

### Phase 5: Dungeo Migration - CANCELLED

**Status**: Cancelled 2026-01-23

**Reason**: Dungeo has its own sophisticated GDT system that predates ext-testing and includes Dungeo-specific features:

- `PZ` - Puzzle state debug
- `TQ` - Trivia question debug
- `DL` - Dial puzzle debug
- `NR`/`RR` - Thief (robber) control
- `DC` - Daemon/scheduler display
- `KO`/`WU` - Knock out/wake up NPCs
- `FO` - Force open containers

**Decision**: Dungeo keeps its own GDT at `stories/dungeo/src/actions/gdt/`. The ext-testing package is available for other stories that don't have their own debug tooling.

**Test coverage**: Created `stories/dungeo/tests/transcripts/gdt-commands.transcript` that verifies 24 GDT commands work correctly (25/25 tests pass).

---

### Phase 6: Playtester Annotations (ADR-109) - PENDING

**Goal**: Add annotation support for playtester feedback

**Features**:

- `# comment` - Silent comment with context logging
- `$bug text` - Flag a bug
- `$note text` - General note
- `$confusing` - Mark confusion
- `$bookmark name` - Named save point
- `$session start/end` - Session management
- `$export` - Export annotations

**New files** (to create in ext-testing):

```
src/annotations/
├── types.ts
├── parser.ts
├── store.ts
└── export.ts
```

**Effort**: 4-6 hours

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `packages/extensions/testing/src/extension.ts` | TestingExtension class |
| `packages/transcript-tester/src/runner.ts` | Main test execution loop |
| `packages/engine/src/save-restore-service.ts` | State serialization |
| `stories/dungeo/src/actions/gdt/` | Dungeo's GDT (reference) |

## Verification

After each phase:

1. Build succeeds: `./scripts/build.sh -s dungeo`
2. GDT tests pass: `node dist/sharpee.js --test stories/dungeo/tests/transcripts/gdt-commands.transcript`
3. Walkthrough passes: `node dist/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript`

## Remaining Work

**Phase 4** (2-4 hours):
- Wire ext-testing to transcript-tester for $command syntax

**Phase 6** (4-6 hours):
- Implement playtester annotation system

**Total remaining**: 6-10 hours
