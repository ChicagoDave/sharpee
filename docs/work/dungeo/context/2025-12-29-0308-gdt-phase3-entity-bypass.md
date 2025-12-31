# Work Summary: GDT Phase 3 - Entity Validation Bypass

**Date:** 2025-12-29
**Branch:** dungeo

## Problem

GDT commands like `TK sword` and `AO lantern kitchen` were failing because:
1. Parser created `directObject` from entity arguments
2. CommandValidator tried to resolve entities before action ran
3. If entity wasn't visible from player's location, validation failed
4. GDT action never got a chance to use its global `findEntity()`

## Solution Architecture

Followed the same pattern as `WorldModel`/`AuthorModel` (ADR-014):
- **Engine provides mechanism** (hooks)
- **Story provides policy** (how to use hooks)

### Engine Changes (Generic, Reusable)

1. **`CommandExecutor.ts`**
   - Added `ParsedCommandTransformer` type
   - Added `registerParsedCommandTransformer()` method
   - Transformers called after parse, before validate

2. **`GameEngine.ts`**
   - Exposed transformer registration via `registerParsedCommandTransformer()`

3. **`story.ts`**
   - Added optional `onEngineReady(engine: GameEngine)` lifecycle hook
   - Called after engine fully initialized

### Story Changes (Dungeo-specific)

1. **`index.ts`** - `onEngineReady()` implementation
   - Registers transformer that clears `directObject`/`indirectObject` for GDT commands
   - Only active when `gdtMode=true`
   - CommandValidator sees no entity references to validate

2. **`gdt-context.ts`** - AuthorModel integration
   - Creates `AuthorModel` from world's data store
   - `teleportPlayer()` uses `authorModel.moveEntity()`
   - `moveObject()` uses `authorModel.moveEntity()`
   - Bypasses all game rules (closed containers, etc.)

3. **`tk.ts`** - Multi-word argument fix
   - Joins all args: `tk brass lantern` → finds "brass lantern"

4. **`ao.ts`** - Multi-word argument fix
   - Last arg is location, rest is object name
   - `ao brass lantern kitchen` → moves "brass lantern" to "kitchen"

## Test Coverage

New transcript: `gdt-unrestricted-access.transcript`
- Tests TK with entity not visible from starting location
- Tests AO moving entity to remote location
- Tests AO with special `player` location
- Verifies entity in inventory after exiting GDT

**Total:** 138 tests, 137 passing, 1 expected failure

## Key Design Decisions

1. **No GDT-specific code in engine** - Engine provides generic hook mechanism
2. **Story owns the policy** - Dungeo decides when/how to bypass validation
3. **AuthorModel for mutations** - Consistent with ADR-014 pattern
4. **Transformer clears slots** - Rather than skipping validation entirely

## Files Changed

### Engine Package
- `packages/engine/src/command-executor.ts` - Transformer infrastructure
- `packages/engine/src/game-engine.ts` - Expose registration method
- `packages/engine/src/story.ts` - `onEngineReady` hook

### Story Package
- `stories/dungeo/src/index.ts` - Transformer registration
- `stories/dungeo/src/actions/gdt/gdt-context.ts` - AuthorModel usage
- `stories/dungeo/src/actions/gdt/commands/tk.ts` - Multi-word args
- `stories/dungeo/src/actions/gdt/commands/ao.ts` - Multi-word args
- `stories/dungeo/tests/transcripts/gdt-unrestricted-access.transcript` - New test

## Next Steps

GDT Phase 3+ remaining:
- `AF`/`DF` - Alter/Display Flags (no dependencies)
- `DC` - Display Clock (needs ADR-071 Daemons/Fuses)
- `DV` - Display Villains (needs ADR-070 NPC System)
- NPC toggle commands (needs ADR-070)
