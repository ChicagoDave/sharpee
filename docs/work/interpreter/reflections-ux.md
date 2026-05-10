# Reflections UX: iMessage-Style Multi-Actor Client

## Context

The Reflections story features three actors displayed in an iMessage-like chat interface. One of the three is the PC at any given time, and this changes throughout the story. The platform now supports the two key capabilities needed:

- **ADR-132 (PC Switching)**: `engine.switchPlayer(entityId)` with `game.pc_switched` event — fully implemented
- **ADR-133 (Structured Text Output)**: Engine emits `ITextBlock[]` with semantic keys (e.g., `narration.thief`, `narration.oldman`, `narration.girl`) — fully implemented

The question: how should the client be built?

## Platform Readiness

| Capability | Status | Notes |
|------------|--------|-------|
| PC switching | Implemented | `game.pc_switched` event with `previousPlayerId` / `newPlayerId` |
| Text block keys as channels | Implemented | `ITextBlock.key` routes output (e.g., `narration.thief`) |
| Panel system (ADR-125) | Proposed, not implemented | CSS Grid regions, story-declared panels, block routing by key |
| Zifmia layout | Single transcript | No panel routing, no per-actor rendering |

## iMessage UX Requirements

The chat interface differs fundamentally from a traditional IF transcript:

- **Chat bubbles** per message, not flowing prose
- **Left/right alignment** — PC messages on one side, NPC messages on the other
- **Character identity** — avatar, name, color per actor
- **PC switching changes alignment** — when the PC changes, which side is "mine" flips
- **Message grouping** — consecutive messages from the same actor group visually
- **Possible extras** — typing indicators, timestamps, read receipts (story-driven)

## Options Evaluated

### Option A: Custom Reflections Client (Fork Zifmia)

Fork Zifmia's runner/engine integration, replace GameShell with a chat-focused layout.

| Pro | Con |
|-----|-----|
| Ships fastest — no generalization needed | Two codebases to maintain |
| Chat UX built exactly to spec | Doesn't benefit other stories |
| Becomes a reference for future panel work | Runner/save/theme code diverges over time |

### Option B: Implement ADR-125 Panels in Zifmia First

Build the generic panel system, then implement Reflections as a "chat panel" type.

| Pro | Con |
|-----|-----|
| Benefits all stories (Dungeo map, commentary) | Significant upfront work before Reflections starts |
| Single codebase | Chat UX may not fit naturally into panel abstraction |
| ADR-125 already designed | Risk of over-engineering to accommodate chat semantics |

### Option C: Zifmia with Pluggable Layout Modes (Recommended)

Story declares a layout mode. Zifmia ships multiple layouts sharing the same infrastructure.

```
story.config = {
  layout: "chat"    // Reflections
  // vs
  layout: "transcript"  // Dungeo (default)
}
```

| Pro | Con |
|-----|-----|
| One codebase, shared runner/engine/save/theme | Need a clean layout abstraction boundary |
| Chat UX built without forcing panel abstraction | Layout modes are a new concept to design |
| Traditional transcript stays untouched | Not as flexible as full panel system |
| Natural path toward ADR-125 later | |

**How it works**:
- `GameShell` checks the story's layout mode and renders the appropriate layout component
- `TranscriptLayout` — current behavior (Dungeo, standard IF)
- `ChatLayout` — iMessage-style (Reflections)
- Both layouts consume the same `GameContext` (state, dispatch, executeCommand)
- Both layouts use the same theme CSS variables (chat bubbles styled via theme)
- Story-specific CSS can extend themes for character colors, avatars, etc.

## Recommendation

**Option C** — pluggable layout modes. It avoids maintaining a fork, avoids premature generalization of the panel system, and lets the chat UX be purpose-built without compromise. The layout mode concept is lightweight (a config field + a component switch) and could evolve into the ADR-125 panel system later if needed.

## Next Steps (When Ready)

1. Design the `ChatLayout` component interface — what props from GameContext does it need?
2. Define how story config declares layout mode and character metadata (names, colors, avatars)
3. Decide how `ITextBlock.key` maps to characters in the chat view (e.g., `narration.{characterId}`)
4. Build a minimal ChatLayout prototype with hardcoded Reflections characters
5. Wire up `game.pc_switched` event to flip alignment in the chat view
