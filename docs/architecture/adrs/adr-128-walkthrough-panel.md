# ADR-128: Walkthrough Panel for Zifmia

## Status: PROPOSED

## Date: 2026-02-11

## Context

Sharpee's transcript format (`*.transcript`) serves double duty as both automated test suite and walkthrough documentation. The `--chain` flag allows walkthroughs to be run sequentially with persistent state, and `$save`/`$restore` directives enable checkpoint management.

Currently, walkthroughs can only be run headlessly via the CLI transcript tester. Authors have no way to visually step through a walkthrough, observe game output at each step, or branch off into interactive play at any point.

Inform 7's Skein provides a tree-based visualization of play sessions that can be replayed and extended. It is widely regarded as one of the best authoring tools in interactive fiction. However, the Skein is tightly coupled to Inform's IDE and is not interactive — you cannot type commands mid-replay.

### Goals

1. **Step-through replay**: Authors can load a walkthrough transcript and step through it one command at a time, seeing full game output at each step.
2. **Interactive branching**: At any point during replay, the author can stop stepping and type commands manually, branching off the walkthrough into exploratory play.
3. **State snapshots**: The panel captures world state at each step, enabling instant "rewind" to any previous point without re-executing the entire chain.
4. **Assertion visibility**: Transcript assertions (`[OK: contains "foo"]`, `[ENSURES: ...]`) are displayed alongside output, showing pass/fail status visually.
5. **Chain support**: Authors can load a walkthrough chain (wt-01 through wt-12) and navigate between segments.

### Non-Goals (for initial version)

- Tree visualization (Skein-style branching graph) — useful but complex; defer to a later version
- Editing transcripts in-place from the panel — transcripts remain source files edited in an IDE
- Recording new walkthroughs from interactive play — future enhancement

## Decision

Add a **Walkthrough Panel** as a Zifmia panel add-on. The panel integrates with the existing transcript format and the Zifmia panel system.

### Architecture

```
┌─────────────────────────────────────────────────┐
│ Zifmia Client                                   │
│ ┌──────────────────────┐ ┌────────────────────┐ │
│ │ Game Transcript      │ │ Walkthrough Panel  │ │
│ │ (main play area)     │ │                    │ │
│ │                      │ │ [wt-11] ▼ segment  │ │
│ │ > take egg           │ │                    │ │
│ │ Taken.               │ │ ☑ > take egg       │ │
│ │                      │ │   [OK: "Taken"] ✓  │ │
│ │ > give egg to thief  │ │ ☑ > give egg...    │ │
│ │ You give jewel-enc...│ │   [OK: "egg"] ✓    │ │
│ │                      │ │ ▶ > down           │ │
│ │                      │ │   > wait           │ │
│ │                      │ │   > wait           │ │
│ │                      │ │   > up             │ │
│ │                      │ │   ...              │ │
│ │                      │ │                    │ │
│ │                      │ │ [⏪] [◀] [▶] [⏩]  │ │
│ │                      │ │ [Branch]           │ │
│ └──────────────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Panel Components

| Component | Responsibility |
|---|---|
| **Segment Selector** | Dropdown to select walkthrough segment (wt-01 through wt-12). Loading a segment restores from its `$restore` checkpoint. |
| **Command List** | Scrollable list of commands from the transcript. Each shows: command text, assertion(s), pass/fail status, execution state (pending/executed/skipped). |
| **Transport Controls** | Rewind (⏪ go back one step), Step Back (◀ undo last command), Step Forward (▶ execute next command), Fast Forward (⏩ run to end or next failure), Branch (detach from walkthrough and enter free play). |
| **State Inspector** | Optional sub-panel showing entity locations, trait values, and inventory at the current step. Useful for debugging puzzle state. |

### Data Flow

```
Transcript File (.transcript)
    │
    ▼
TranscriptParser (existing)
    │ parses to Command[]
    ▼
WalkthroughPanelState
    │ manages: currentIndex, snapshots[], branchPoint
    ▼
GameEngine.executeTurn()
    │ executes one command
    ▼
Snapshot captured (world.toJSON())
    │
    ▼
Panel UI updates (command list, assertions, output)
```

### Key Behaviors

**Step Forward (▶)**: Execute the next command:
1. Takes the next command from the parsed transcript
2. Calls `engine.executeTurn(command)`
3. Captures a world state snapshot via `world.toJSON()`
4. Evaluates any assertions on the command
5. Updates the panel UI with results

**Step Back (◀)**: Undo the last command:
1. Loads the snapshot from the previous step via `world.loadJSON(snapshot)`
2. Decrements the current index
3. The undone step reverts to "pending" state

**Rewind (⏪)**: Jump to any previously-executed step:
1. Loads the snapshot for that step via `world.loadJSON(snapshot)`
2. Resets the panel's current index to that step
3. All subsequent steps revert to "pending" state
4. Also available by clicking any executed step in the command list

**Fast Forward (⏩)**: Run multiple commands automatically:
1. Executes commands sequentially from current position
2. Stops at: end of transcript, first assertion failure, or `[GOAL]` boundary (configurable)
3. Captures snapshots at intervals per the snapshot strategy
4. Updates the panel UI after each command (with optional animation delay for visibility)

**Branch**: Clicking "Branch" at any point:
1. Marks the current position as a branch point
2. Disables further walkthrough stepping
3. The main transcript area accepts free-form input
4. A "Return to Walkthrough" button re-loads the branch point snapshot and resumes stepping

**Chain navigation**: Selecting a different segment:
1. Loads the `$restore` save for that segment (from `stories/{story}/saves/`)
2. Parses the new transcript
3. Resets all panel state

### Snapshot Strategy

Full `world.toJSON()` at every step would be expensive for large worlds. Options:

1. **Snapshot every N steps** (e.g., every 5) and replay intermediate commands on rewind
2. **Delta snapshots** (like `SaveManager.captureDelta()`) — store only changes from previous snapshot
3. **Lazy snapshots** — only capture when the user clicks a "bookmark" button

Recommendation: Start with option 1 (snapshot every 5 steps). A 450KB JSON snapshot every 5 turns is manageable for a browser session. Rewind replays at most 4 commands, which is nearly instant.

### Transcript Format Compatibility

The walkthrough panel consumes the existing `.transcript` format without modification:
- `$save`/`$restore` directives control segment boundaries
- `$teleport` directives execute as normal
- `[OK: ...]`, `[ENSURES: ...]` assertions display pass/fail in the panel
- `[RETRY]`/`[DO]`/`[UNTIL]` blocks show retry state visually
- `[GOAL: ...]`/`[END GOAL]` sections provide natural grouping headers
- Comments (`#`) display as section dividers

### Panel API Integration

The walkthrough panel registers with the Zifmia panel system:

```typescript
interface WalkthroughPanelConfig {
  /** Story path for locating transcripts and saves */
  storyPath: string;
  /** Transcript files available for selection */
  transcripts: TranscriptDescriptor[];
  /** Engine instance for command execution */
  engine: GameEngine;
  /** World model for snapshots */
  world: WorldModel;
}

// Registration
panels.register('walkthrough', WalkthroughPanel, config);
```

## Consequences

### Positive
- Authors get visual, interactive walkthrough debugging — a major quality-of-life improvement
- Reuses existing transcript format with no changes required
- Snapshot + rewind enables rapid iteration on puzzle sequences
- Branch mode lets authors explore "what if" scenarios mid-walkthrough
- Natural complement to the existing CLI transcript tester

### Negative
- Memory usage: snapshots accumulate during a session (mitigated by snapshot-every-N strategy)
- `world.loadJSON()` after deserialization means trait methods are lost — the panel must account for the same serialization pitfalls as the rest of the system
- Adds complexity to the Zifmia client — should be an optional add-on panel, not required

### Risks
- Panel system design isn't finalized yet — this ADR may need revision once the panel API stabilizes
- Large walkthrough chains (12+ segments, 300+ commands) may need pagination or virtualized scrolling

## References

- Inform 7 Skein: Tree-based play session visualization
- ADR-071: Daemons and Fuses (timed events that run between steps)
- Transcript tester: `packages/transcript-tester/src/` (parser, runner, reporter)
- Save system: `packages/platform-browser/src/managers/SaveManager.ts`
- CLI `--restore` flag: `packages/transcript-tester/src/fast-cli.ts`
