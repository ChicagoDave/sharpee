# Implementation Plan: ADR-109 & ADR-110 Testing Extension

**Branch**: `ext-testing`
**Date**: 2026-01-23
**Last Updated**: 2026-01-23 18:00

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
| 4 | **DONE** | ext-testing $commands wired to transcript-tester |
| 5 | **CANCELLED** | Dungeo keeps its own GDT system |
| 6 | **DONE** | Playtester annotations (ADR-109) |

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

### Phase 4: Transcript-Tester Integration - DONE

**Status**: Completed 2026-01-23

**Goal**: Wire ext-testing $commands into transcript runner

**Issues Fixed**:

1. **ESM/CommonJS Module Conflict**
   - Removed `"type": "module"` from `packages/extensions/testing/package.json`
   - Bundle builder outputs CommonJS; package.json must match

2. **Multi-Word Entity Names**
   - Changed `args[0]` to `args.join(' ')` in cmdTake, cmdRemove, cmdDisplayObject
   - Now `$take brass lantern` works correctly

3. **Hyphen vs Space Name Matching**
   - Added normalization in `findEntity()`: `query.replace(/-/g, ' ')`
   - Matches natural language (`brass lantern`) against IDs (`brass-lantern`)

**Files Modified**:
- `packages/extensions/testing/package.json` - Removed ESM declaration
- `packages/extensions/testing/src/context/debug-context.ts` - Hyphen normalization
- `packages/extensions/testing/src/extension.ts` - Multi-word arg joining

**Verified $commands** (all working in transcripts):
- `$teleport <room>` - instant travel
- `$take <item>` - give item to player (multi-word support)
- `$remove <item>` - remove from inventory
- `$kill <entity>` - kill NPC
- `$immortal` / `$mortal` - toggle death
- `$state` - show game state
- `$describe <entity>` - full entity dump
- `$exits` - list room exits
- `$light` / `$extinguish` - light source control
- `$open` / `$close` - openable control
- `$lock` / `$unlock` - lockable control
- `$break` - break breakable entities

**Test Coverage**:
- `stories/dungeo/tests/transcripts/ext-testing-commands.transcript` - 5/5 pass
- `stories/dungeo/tests/transcripts/gdt-commands.transcript` - 25/25 pass

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

### Phase 6: Playtester Annotations (ADR-109) - DONE

**Status**: Completed 2026-01-23

**Goal**: Add annotation support for playtester feedback

**Implemented** (all 3 tiers from ADR-109):

**Tier 1: Silent Comments**
- `# comment` lines in transcripts are now captured with game context
- Context includes: room, turn, score, last command, last response, inventory

**Tier 2: Annotation Commands**
- `$bug <text>` - Flag a bug with context
- `$note <text>` - General note
- `$confusing` - Mark last interaction as confusing
- `$expected <text>` - Document expected behavior
- `$bookmark <name>` - Named save point (also saves checkpoint)

**Tier 3: Session Management**
- `$session start <name>` - Begin named session
- `$session end` - End session with summary
- `$review` - Show current session annotations
- `$export` - Export as markdown report

**Files Created**:
- `packages/extensions/testing/src/annotations/store.ts` - Annotation storage with export
- `packages/extensions/testing/src/annotations/context.ts` - Context capture utility
- `packages/extensions/testing/src/annotations/index.ts` - Module exports

**Files Modified**:
- `packages/extensions/testing/src/types.ts` - Added annotation types
- `packages/extensions/testing/src/extension.ts` - Added 8 annotation commands
- `packages/extensions/testing/src/index.ts` - Export annotation module
- `packages/transcript-tester/src/types.ts` - Added 'comment' to TranscriptItem
- `packages/transcript-tester/src/parser.ts` - Comments added to items array
- `packages/transcript-tester/src/runner.ts` - Handle comments, context tracking

**Test Coverage**:
- `stories/dungeo/tests/transcripts/annotations.transcript` - 5/5 pass

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `packages/extensions/testing/src/extension.ts` | TestingExtension class, all command handlers |
| `packages/extensions/testing/src/context/debug-context.ts` | Entity resolution with normalization |
| `packages/extensions/testing/src/annotations/store.ts` | Annotation storage and export |
| `packages/extensions/testing/src/annotations/context.ts` | Game state capture for annotations |
| `packages/transcript-tester/src/runner.ts` | Main test execution loop |
| `packages/transcript-tester/src/parser.ts` | Transcript parsing with comment support |
| `packages/engine/src/save-restore-service.ts` | State serialization |
| `stories/dungeo/src/actions/gdt/` | Dungeo's GDT (reference) |
| `stories/dungeo/tests/transcripts/ext-testing-commands.transcript` | ext-testing validation tests |
| `stories/dungeo/tests/transcripts/annotations.transcript` | Annotation system tests |

## Verification

All tests should pass:

1. Build succeeds: `./scripts/build.sh -s dungeo`
2. ext-testing tests pass: `node dist/sharpee.js --test stories/dungeo/tests/transcripts/ext-testing-commands.transcript`
3. GDT tests pass: `node dist/sharpee.js --test stories/dungeo/tests/transcripts/gdt-commands.transcript`
4. Annotation tests pass: `node dist/sharpee.js --test stories/dungeo/tests/transcripts/annotations.transcript`
5. Walkthrough passes: `node dist/sharpee.js --test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript`

## Remaining Work

**All phases complete!** The ext-testing package now provides:

- 16+ debug commands ($teleport, $take, $kill, $immortal, etc.)
- 8 annotation commands ($bug, $note, $confusing, $expected, $bookmark, $session, $review, $export)
- Tier 1-3 playtester annotation support per ADR-109
- Checkpoint save/restore integration
- Session management with markdown export

## Completion Notes

**Phases 0-6**: All testing infrastructure complete. The ext-testing extension provides 24+ commands accessible via `$command` syntax in transcript tests.

**Key Architecture Insights**:

1. **Module format consistency**: The bundle uses CommonJS, so all packages including extensions must avoid `"type": "module"` in package.json to prevent silent load failures.

2. **Context tracking**: Annotations capture game state at the moment of creation, providing valuable debugging context (room, turn, last command/response, inventory).

3. **Three-tier annotation design**: Separates silent comments (# lines), structured feedback ($commands), and session management for flexible playtesting workflows.

## Future Enhancements (Optional)

- Privacy modes for public beta testing
- Integration with bug tracking systems (GitHub Issues, Linear)
- Analytics/heatmaps for confusion points
- Voice note support
