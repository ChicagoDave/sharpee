# Implementation Plan: ADR-109 & ADR-110 Testing Extension

**Branch**: `ext-testing`
**Date**: 2026-01-23

## Overview

Create `@sharpee/ext-testing` package that provides:
- Interactive debug mode (GDT-style)
- Test commands ($teleport, $take, $assert, etc.)
- Save/restore checkpoints
- Playtester annotations (#comments, $bug, $note)

## Phased Implementation

### Phase 0: Quick Save/Restore (Unblock Walkthroughs)
**Goal**: Add minimal $save/$restore to transcript-tester to unblock wt-04+

**Files to modify**:
- `packages/transcript-tester/src/parser.ts` - Parse $save/$restore
- `packages/transcript-tester/src/runner.ts` - Execute save/restore
- `packages/transcript-tester/src/types.ts` - Add directive types

**Implementation**:
```typescript
// parser.ts - detect $ commands
if (trimmedLine.startsWith('$save ')) {
  return { type: 'directive', directive: { type: 'save', name: trimmedLine.slice(6).trim() } };
}
if (trimmedLine.startsWith('$restore ')) {
  return { type: 'directive', directive: { type: 'restore', name: trimmedLine.slice(9).trim() } };
}

// runner.ts - execute save/restore using existing SaveRestoreService
case 'save':
  const state = saveRestoreService.createSaveState(engine);
  fs.writeFileSync(`saves/${directive.name}.json`, JSON.stringify(state));
  break;
case 'restore':
  const data = JSON.parse(fs.readFileSync(`saves/${directive.name}.json`));
  saveRestoreService.restoreState(engine, data);
  break;
```

**Effort**: 1-2 hours

---

### Phase 1: Create ext-testing Package Structure
**Goal**: Package scaffold with shared types and extension class

**Create**: `packages/ext-testing/`
```
packages/ext-testing/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Main exports
│   ├── extension.ts          # TestingExtension class
│   ├── types.ts              # DebugContext, DebugCommand interfaces
│   ├── context/
│   │   └── debug-context.ts  # Generalized from GDTContext
│   ├── checkpoints/
│   │   ├── serializer.ts     # Full state serialization
│   │   └── store.ts          # File-based checkpoint storage
│   └── commands/
│       └── registry.ts       # Command handler registry
```

**Key interfaces**:
```typescript
interface TestingExtensionConfig {
  debugMode?: { enabled?: boolean; prefix?: string; };
  testMode?: { enabled?: boolean; deterministicRandom?: boolean; };
  checkpoints?: { directory?: string; };
  commands?: DebugCommand[];  // Story-specific commands
}

interface DebugContext {
  world: WorldModel;
  player: IFEntity;
  flags: Map<string, boolean>;
  findEntity(idOrName: string): IFEntity | undefined;
  teleportPlayer(roomId: string): boolean;
  moveObject(objectId: string, locationId: string): boolean;
  takeObject(objectId: string): boolean;
}

interface DebugCommand {
  code: string;           // GDT code: "AH"
  testSyntax?: string;    // Test syntax: "teleport"
  name: string;
  category: 'display' | 'alter' | 'toggle' | 'utility';
  execute(context: DebugContext, args: string[]): { success: boolean; output: string[]; };
}
```

**Effort**: 4-6 hours

---

### Phase 2: Port Debug Commands from GDT
**Goal**: Extract and generalize GDT commands

**Source**: `stories/dungeo/src/actions/gdt/commands/`

**Commands to port**:
| Code | Test Syntax | Name | Category |
|------|-------------|------|----------|
| DA | $player | Display Adventurer | display |
| DR | $room | Display Room | display |
| DO | $object | Display Object | display |
| DX | $exits | Display Exits | display |
| AH | $teleport | Teleport | alter |
| TK | $take | Take Item | alter |
| AO | $move | Move Object | alter |
| ND/RD | $immortal | Toggle Deaths | toggle |
| HE | $help | Help | utility |
| EX | $exit | Exit Debug | utility |

**File structure**:
```
src/commands/
├── index.ts           # Registry
├── display/
│   ├── adventurer.ts  # DA/$player
│   ├── room.ts        # DR/$room
│   └── exits.ts       # DX/$exits
├── alter/
│   ├── teleport.ts    # AH/$teleport
│   ├── take.ts        # TK/$take
│   └── move.ts        # AO/$move
└── toggle/
    └── immortal.ts    # ND/RD/$immortal
```

**Effort**: 6-8 hours

---

### Phase 3: Full Checkpoint System
**Goal**: Serialize complete game state including scheduler

**Checkpoint data structure**:
```typescript
interface CheckpointData {
  version: '1.0.0';
  timestamp: number;
  metadata: { name?: string; turn: number; };
  worldState: string;  // WorldModel.toJSON()
  schedulerState: {
    turn: number;
    daemons: SerializedDaemon[];
    fuses: SerializedFuse[];
  };
}
```

**Key file**: `packages/engine/src/save-restore-service.ts` already has most of this - extend it.

**Effort**: 4-6 hours

---

### Phase 4: Transcript-Tester Integration
**Goal**: Wire $commands into transcript runner

**Modify**: `packages/transcript-tester/src/runner.ts`

```typescript
// In command execution
if (input.startsWith('$') && testingExtension) {
  const result = testingExtension.executeTestCommand(input, world);
  return createResult(result);
}
```

**New $commands**:
- $teleport, $take, $move, $spawn, $remove
- $immortal, $disable, $enable
- $save, $restore, $saves
- $assert, $find, $seed

**Effort**: 4-6 hours

---

### Phase 5: Dungeo Migration
**Goal**: Remove duplicated GDT code, use ext-testing

**Steps**:
1. Install ext-testing in Dungeo
2. Keep only story-specific commands (PZ, TQ, KL)
3. Delete generic GDT implementation
4. Verify all transcripts still pass

**Files to delete**:
- `stories/dungeo/src/actions/gdt/gdt-action.ts`
- `stories/dungeo/src/actions/gdt/gdt-command-action.ts`
- `stories/dungeo/src/actions/gdt/gdt-context.ts`
- `stories/dungeo/src/actions/gdt/gdt-parser.ts`
- Most of `stories/dungeo/src/actions/gdt/commands/`

**Effort**: 4-6 hours

---

### Phase 6: Playtester Annotations (ADR-109)
**Goal**: Add annotation support

**Features**:
- `# comment` - Silent comment with context logging
- `$ bug text` - Flag a bug
- `$ note text` - General note
- `$ confusing` - Mark confusion
- `$ bookmark name` - Named save point
- `$ session start/end` - Session management
- `$ export` - Export annotations

**New files**:
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
| `packages/transcript-tester/src/runner.ts` | Main test execution loop |
| `stories/dungeo/src/actions/gdt/gdt-context.ts` | Pattern for DebugContext |
| `packages/engine/src/save-restore-service.ts` | Existing serialization |
| `packages/world-model/src/world/WorldModel.ts` | toJSON()/loadJSON() |
| `packages/engine/src/story.ts` | Story interface, onEngineReady |

## Verification

After each phase:
1. Run existing transcript tests: `node packages/transcript-tester/dist/fast-cli.js stories/dungeo/tests/transcripts/*.transcript`
2. Run walkthrough chain: `node packages/transcript-tester/dist/fast-cli.js --chain stories/dungeo/walkthroughs/wt-0[1-3].transcript`
3. Build succeeds: `./scripts/build.sh -s dungeo`

After Phase 0:
- wt-04 can use $save/$restore and pass

After full implementation:
- All Dungeo GDT commands work via ext-testing
- Walkthroughs use checkpoints for independent testing
- Playtesters can annotate sessions

## Recommended Order

**For immediate unblock**: Phase 0 only (1-2 hours)

**For full implementation**: 0 → 1 → 3 → 2 → 4 → 5 → 6

Total estimated effort: 27-40 hours
