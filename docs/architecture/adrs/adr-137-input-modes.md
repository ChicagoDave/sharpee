# ADR-137: Input Modes

## Status

Proposed

## Date

2026-04-01

## Context

Sharpee currently has a single input pipeline: raw text enters the parser, which tokenizes it, matches grammar patterns, resolves entities, and produces a validated command. The engine dispatches the command to an action, which runs the four-phase pattern (validate/execute/report/blocked), advances the turn counter, and fires NPC turns and daemons.

This pipeline assumes all input is natural-language parser commands. But several real scenarios require fundamentally different input handling:

**GDT (Game Debugging Tool)** — Dungeo's debug interface expects two-letter codes (`DA`, `DR`, `DS`), not natural language. Input should not advance the game clock, fire daemons, or run NPC turns. The prompt should display `GDT>` instead of `>`.

**Conversation mode** — An NPC dialogue system might present numbered choices or keyword responses. The "parser" is trivial (match a number or keyword), the command set is restricted, and turn semantics may differ.

**Combat mode** — A tactical combat system might restrict input to combat verbs, use a different turn cadence, or present a menu of actions.

**Cutscene/menu mode** — Input reduced to "press any key" or numbered selections. No parsing at all.

Each of these is not just "extra commands added to the standard parser." They are **alternate input modes** where the entire input→processing→output pipeline behaves differently: different parsing, different command sets, different turn semantics, and a different prompt.

Today, GDT works around this by registering its commands as story-specific actions and routing through the standard parser. This creates problems:
- Normal game commands still work during GDT mode (they shouldn't)
- The prompt is hardcoded as `> ` with no mechanism to change it
- GDT input advances the turn counter when it shouldn't
- The parser attempts entity resolution on two-letter codes (wasteful and error-prone)

### FyreVM Heritage

In FyreVM (Sharpee's predecessor), the prompt was a **channel primitive** — a named output channel alongside main text, location, score, etc. The prompt value was part of the game state and survived save/restore. Sharpee's `BLOCK_KEYS.PROMPT` already exists in `text-blocks` but is never emitted.

## Decision

### 1. Input Mode as a First-Class Concept

An **input mode** is a self-contained module that fully encapsulates how input is handled during a particular game state. Each mode owns:

| Concern | Standard Mode | GDT Mode | Conversation Mode |
|---------|--------------|----------|-------------------|
| Prompt | `> ` | `GDT>` | `NPC name> ` |
| Parsing | Full NL parser | Two-letter code split | Number/keyword match |
| Entity resolution | Yes | No | No |
| Turn advancement | Yes | No | Varies |
| NPC/daemon firing | Yes | No | Varies |
| Available commands | All registered actions | GDT command set | Dialogue choices |

### 2. InputMode Interface

```typescript
/**
 * An input mode encapsulates the full input handling cycle
 * for a particular game state.
 */
interface InputMode {
  /** Unique identifier (e.g., 'if.mode.standard', 'dungeo.mode.gdt') */
  readonly id: string;

  /** The prompt to display while this mode is active */
  readonly prompt: GamePrompt;

  /** Whether commands in this mode advance the game clock */
  readonly advancesTurn: boolean;

  /**
   * Handle raw input text.
   * The mode owns parsing, validation, execution, and output.
   * Returns semantic events for the text service to render.
   */
  handleInput(input: string, context: InputModeContext): InputModeResult;
}

interface GamePrompt {
  readonly messageId: string;
  readonly params?: Record<string, unknown>;
}

interface InputModeResult {
  /** Semantic events to process through the text service */
  events: ISemanticEvent[];
  /** Whether the mode is finished (pop back to previous mode) */
  done?: boolean;
}
```

### 3. Engine Is the Standard Mode

The existing parser→command executor→action pipeline is deeply integrated with the engine and works well. Extracting it behind the `InputMode` interface would be a large refactor with no immediate benefit.

Instead:
- The engine **is** the standard mode. Its current behavior is unchanged.
- Alternate modes implement `InputMode` and are registered by stories.
- The engine checks: **is an alternate mode active?** If yes, route input to it. If no, run the standard pipeline.

This avoids refactoring the existing pipeline while giving authors a clean extension point for alternate modes.

### 4. Mode Stack (Push/Pop)

Modes form a stack. The standard mode is always at the bottom.

```
[Standard] ← always present, never popped
[Combat]   ← pushed by combat encounter
[GDT]      ← pushed on top of combat (debug during combat)
```

- `engine.pushMode(mode)` — activate a new mode on top of the stack
- `engine.popMode()` — return to the previous mode
- The topmost mode handles input and determines the prompt
- Popping the last alternate mode returns to standard mode

Push/pop handles nesting naturally: entering GDT during a conversation returns to the conversation when GDT exits, not to standard mode.

### 5. GamePrompt as a Channel Primitive

The prompt is a property of the active input mode, delivered as a text block:

1. World state stores the current `GamePrompt` (survives save/restore)
2. When a mode is pushed/popped, the engine updates the stored prompt
3. After each turn, the engine resolves the prompt's `messageId` through the language provider and emits a `BLOCK_KEYS.PROMPT` text block
4. Platforms extract the PROMPT block and use it for the next input cycle
5. Default registration in lang-en-us: `if.platform.prompt` → `'> '`

### 6. Immediate Implementation Scope (GDT Only)

This ADR describes the full input mode architecture. The immediate implementation covers only what GDT needs:

- `GamePrompt` type in `if-domain`
- `world.getPrompt()` / `world.setPrompt()` on WorldModel
- Engine emits `PROMPT` text block after each turn
- Platforms consume the PROMPT block
- GDT sets its prompt on enter, resets on exit
- Engine routes input to GDT when GDT mode is active (simple flag check, not the full mode stack)

The `InputMode` interface, mode stack, and `handleInput()` contract are deferred until a second use case (e.g., conversation plugin) motivates the full abstraction. GDT's current implementation (story action with custom parser) is adequate as an interim approach — the mode flag and prompt are the immediate gaps.

## Consequences

### Positive

- **Clean separation**: Each mode encapsulates its own input semantics. The engine doesn't need to know about GDT's two-letter codes or a conversation system's numbered choices.
- **Prompt as data**: The prompt survives save/restore and is delivered through the existing text block channel system. Platforms don't need special prompt APIs — they already consume text blocks.
- **Nesting**: The mode stack supports scenarios like debugging during combat or pausing a conversation for inventory management.
- **No refactor required**: The standard mode stays as-is. The engine only needs a thin routing check at the top of its input handling.

### Negative

- **Deferred abstraction**: Until the full `InputMode` interface is implemented, GDT mode is a special case in the engine rather than a generic extension point. A second mode will require extracting the pattern.
- **Mode stack complexity**: Nesting modes creates questions about save/restore (is the full stack serialized?), turn counting (who owns the counter?), and scope (which entities are visible in which mode?). These are deferred.

### Risks

- **Interface stability**: The `handleInput()` contract is speculative until tested with a real second mode. The interface may need revision when conversation or combat modes are implemented.
- **Standard mode extraction**: If a future use case requires the standard parser pipeline behind the `InputMode` interface, the extraction will be non-trivial. This is a known debt.

## References

- ADR-096: Text Service Architecture (text block channels)
- ADR-087: Action-Centric Grammar (standard parser patterns)
- ADR-090: Entity-Centric Action Dispatch (capability dispatch)
- `BLOCK_KEYS.PROMPT` already defined in `packages/text-blocks/src/types.ts`
- FyreVM channel I/O (2009) — prompt as an output channel
