# ADR-092: Smart Transcript Directives

## Status
Accepted

## Context

The current transcript testing system is linear and brittle:
- Fixed command sequences break when navigation diverges from expected paths
- Combat randomness (troll, thief) can't be handled - tests may pass or fail randomly
- No way to express "keep doing X until Y" for variable-length interactions
- Full walkthrough tests require tedious manual path debugging

The Dungeo full walkthrough test (650+ commands) fails catastrophically when a single navigation step goes wrong, cascading into hundreds of failures.

## Decision

Extend the transcript tester with goal-segmented directives that enable state-aware, adaptive testing.

### Goal-Segmented Design

Full walkthroughs are organized as a sequence of **goals**. Each goal:
- Has preconditions (REQUIRES) that must be true to start
- Contains commands and control flow to achieve the objective
- Has postconditions (ENSURES) verified after completion

This handles randomness naturally:
- **Combat**: WHILE loops until enemy dead
- **Carousel**: Check location, NAVIGATE to correct room if wrong
- **Thief**: Kill before treasure-deposit goals (thief only steals treasures, not puzzle items)

### 1. GOAL/END GOAL - Named Segments
```transcript
[GOAL: Get the torch]
# ... commands to achieve goal ...
[END GOAL]
```

### 2. REQUIRES - Preconditions
```transcript
[GOAL: Perform exorcism]
[REQUIRES: inventory contains "bell"]
[REQUIRES: inventory contains "book"]
[REQUIRES: inventory contains "candles"]
[REQUIRES: inventory contains "matchbook"]
# ... exorcism commands ...
[END GOAL]
```

### 3. ENSURES - Postconditions
```transcript
[GOAL: Kill the troll]
[ENSURES: not room contains "troll"]
# ... combat commands ...
[END GOAL]
```

### 4. IF/END IF - Conditional Execution
```transcript
[IF: location = "Troll Room"]
> kill troll with sword
[END IF]
```

### 5. WHILE/END WHILE - Loop Until Condition False
```transcript
[WHILE: room contains "troll"]
> kill troll with sword
[END WHILE]
```

### 6. NAVIGATE TO - Auto-Pathfinding
```transcript
[NAVIGATE TO: "Torch Room"]
```

### Full Example: Troll Combat Goal
```transcript
[GOAL: Kill the troll]
[REQUIRES: inventory contains "sword"]
[ENSURES: not room contains "troll"]

[NAVIGATE TO: "Troll Room"]
[WHILE: room contains "troll"]
> kill troll with sword
[END WHILE]

[END GOAL]

[GOAL: Get the torch]
[REQUIRES: not room contains "troll"]
[ENSURES: inventory contains "torch"]

[NAVIGATE TO: "Torch Room"]
> take torch
[OK: contains "Taken"]
> turn on torch
> turn off lantern

[END GOAL]
```

## Condition Expression DSL

Simple expressions for common state queries:

| Expression | Meaning |
|------------|---------|
| `location = "Room Name"` | Player is in room with that name |
| `room contains "entity"` | Entity with that name is in current room |
| `inventory contains "item"` | Player has item with that name |
| `not inventory contains "item"` | Player does NOT have item |
| `entity "X" in "Room"` | Entity X is in specified room |

## Implementation

### Files Modified/Created

1. **`packages/transcript-tester/src/types.ts`** - Add directive types
2. **`packages/transcript-tester/src/parser.ts`** - Parse directives
3. **`packages/transcript-tester/src/runner.ts`** - Execute directives
4. **`packages/transcript-tester/src/condition-evaluator.ts`** (new) - Evaluate conditions
5. **`packages/transcript-tester/src/navigator.ts`** (new) - Pathfinding execution

### Key Components

**Condition Evaluator**: Parses condition strings and evaluates them against WorldModel state using existing methods (`getLocation`, `getContents`, `findWhere`).

**Navigator**: Uses existing `world.findPath()` BFS algorithm to find routes, then maps room transitions to direction commands via RoomTrait exits.

**Block State**: Runner maintains a stack of active IF/WHILE blocks to handle nesting and conditional execution.

### Safety Measures

- WHILE max iterations: 100 (prevents infinite loops)
- NAVIGATE timeout: Fail if path not found
- Nested depth limit: 10 blocks
- Verbose logging of condition evaluations

## Consequences

### Positive
- Robust walkthrough tests that handle randomness
- Less brittle navigation (auto-pathfinding)
- Combat loops handle variable outcomes
- Reusable patterns across stories
- Foundation for full agent-based testing in future IDE

### Negative
- More complex transcript syntax to learn
- Condition evaluation adds runtime overhead
- Debugging failed conditions requires understanding DSL

### Backward Compatible
Existing transcripts work unchanged. Directives are opt-in syntax.

## Future Extensions

This lays groundwork for full agent mode in the IDE:
- Goal-directed testing: `[GOAL: score = 650]`
- Automatic puzzle solving
- State exploration and verification
- Integration with AI reasoning

## Integration with ext-testing

The `@sharpee/ext-testing` package provides additional testing capabilities:

### Debug Commands
Test commands (`$teleport`, `$take`, `$kill`, etc.) are routed to ext-testing for execution, enabling quick state manipulation during tests.

### Annotation Commands (ADR-109)
Playtester feedback commands (`$bug`, `$note`, `$confusing`, etc.) capture context and generate reports.

### Context Tracking
The runner calls `testingExtension.setCommandContext()` after each command, enabling annotations to capture the last command/response context.

## References

- Existing transcript tester: `packages/transcript-tester/src/`
- Testing extension: `packages/extensions/testing/src/`
- WorldModel pathfinding: `packages/world-model/src/world/WorldModel.ts`
- GDT introspection patterns: `stories/dungeo/src/actions/gdt/`
- ADR-073: Transcript Story Testing
- ADR-109: Playtester Annotation System
