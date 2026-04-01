# GamePrompt + GDT Input Mode — Implementation Plan

**ADR**: [ADR-137: Input Modes](../../architecture/adrs/adr-137-input-modes.md)

## Scope

Implement the immediate GDT needs from ADR-137 Section 6:
- `GamePrompt` type and world model API
- Engine emits `PROMPT` text block each turn
- Platforms consume the block
- GDT sets/resets its prompt
- GDT blocks normal commands while active

The full `InputMode` interface, mode stack, and `handleInput()` contract are deferred per the ADR.

## Design

The prompt is a **channel primitive** (FyreVM heritage):

1. **Type**: `GamePrompt` — `{ messageId, params? }`
2. **State**: World model holds the current `GamePrompt` (survives save/restore)
3. **Delivery**: Engine emits a `PROMPT` text block each turn; platforms consume it

```typescript
interface GamePrompt {
  readonly messageId: string;
  readonly params?: Record<string, unknown>;
}

const DefaultPrompt: GamePrompt = { messageId: 'if.platform.prompt' };
const GDTPrompt: GamePrompt = { messageId: 'dungeo.gdt.prompt' };
```

## Phases

### Phase 1: GamePrompt Type and World Model API

**`packages/if-domain/src/prompt.ts`** (new)
- Define `GamePrompt` interface
- Export `DefaultPrompt` constant
- Export `PROMPT_STATE_KEY` for world state storage

**`packages/if-domain/src/index.ts`**
- Re-export from `prompt.ts`

**`packages/world-model/src/world/WorldModel.ts`**
- Add `getPrompt(): GamePrompt` — reads from state, returns `DefaultPrompt` if unset
- Add `setPrompt(prompt: GamePrompt): void` — writes to state
- Both use `getStateValue`/`setStateValue` with `PROMPT_STATE_KEY`

### Phase 2: Language Registration

**`packages/lang-en-us/src/language-provider.ts`**
- Register `if.platform.prompt` → `'> '` in `loadCoreMessages()`

**`stories/dungeo/src/messages/object-messages.ts`**
- Register `dungeo.gdt.prompt` → `'GDT>'`

### Phase 3: Engine Emission

**`packages/engine/src/game-engine.ts`**
- After `textService.processTurn()` produces blocks (~line 723), append a PROMPT block:
  1. Read `world.getPrompt()`
  2. Resolve `prompt.messageId` through `languageProvider.getMessage()`
  3. Append `{ key: BLOCK_KEYS.PROMPT, content: [resolvedText] }` to blocks
- Same for `processMetaEvents()` (~line 940)

### Phase 4: Platform Consumption

**`packages/platforms/cli-en-us/src/cli-input.ts`**
- `getCommand(prompt?: string)` — accept prompt parameter, default `'> '`

**`packages/platforms/cli-en-us/src/cli-platform.ts`**
- Extract `PROMPT` block from `text:output` blocks, store latest prompt text
- Pass to `CLIInput.getCommand()`

**`packages/platforms/browser-en-us/src/browser-platform.ts`**
- Extract `PROMPT` block, update input placeholder/label

**`packages/zifmia/src/types/game-state.ts`**
- Add `prompt?: string` to `GameState`; runner extracts from PROMPT block

### Phase 5: GDT Prompt Hookup

**`stories/dungeo/src/actions/gdt/types.ts`**
- Define `GDTPrompt: GamePrompt = { messageId: 'dungeo.gdt.prompt' }`

**`stories/dungeo/src/actions/gdt/gdt-action.ts`**
- In `execute()`: `world.setPrompt(GDTPrompt)`

**`stories/dungeo/src/actions/gdt/commands/exit.ts`**
- `context.world.setPrompt(DefaultPrompt)` after deactivating GDT flag

### Phase 6: GDT Input Routing

While GDT is active, normal game commands must be blocked. The engine checks `isGDTActive(world)` before entering the standard parser pipeline and routes all input to `gdtCommandAction` instead.

**`packages/engine/src/game-engine.ts`**
- In `executeTurn()`, before parsing: check for active alternate input mode
- If GDT active, bypass parser and dispatch directly to GDT command action
- GDT turn should NOT advance the game clock, fire daemons, or run NPC turns

This is the minimal "input mode routing" that the full InputMode interface will generalize later. For now it's a GDT-specific check.

## Dependencies

```
Phase 1 (type + world API)
  ├── Phase 2 (lang registration) — parallel with Phase 1
  ├── Phase 3 (engine emission) — needs Phase 1
  │     └── Phase 4 (platform consumption) — needs Phase 3
  └── Phase 5 (GDT hookup) — needs Phase 1 + Phase 2
Phase 6 (GDT routing) — needs Phase 1, independent of 3/4
```

### Also in scope (already done)

GDT messageId fix: `gdt-action.ts` and `gdt-command-action.ts` updated to use `GDTEventTypes` constants and `params` for proper text service resolution. These changes complement this plan.

## Open Questions

1. **GDT routing location**: The check in `executeTurn()` is expedient but puts GDT awareness in the engine. Acceptable as interim? The full InputMode interface removes this.
2. **Transcript tester**: Does the test harness need to handle PROMPT blocks? Probably not — verify.
3. **Save during GDT**: If the player saves while in GDT mode, the prompt and GDT-active flag both live in world state, so restore brings them back. The engine routing check (Phase 6) also reads from world state. Should work — verify.

## Test Plan

- Unit: `world.setPrompt(X)` / `world.getPrompt()` round-trips
- Unit: Default prompt resolves to `'> '` through language provider
- Unit: Engine emits PROMPT block after turn processing
- Integration: GDT entry sets prompt, exit resets it
- Integration: Normal commands blocked during GDT mode
- Transcript: Enter GDT, run commands, exit, verify prompt changes and command routing
