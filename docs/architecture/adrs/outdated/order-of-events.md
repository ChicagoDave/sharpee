# Order of Events

## Description
The precise sequence of operations from user input to text output. Each phase must complete before the next begins.

## Sequence
1. **User Input** - Player enters command
2. **Parser Phase** - Extract tokens from vocabulary/grammar OR emit parse error event
3. **Scope Update** - Calculate what's visible/reachable (may add implicit objects)
4. **Validation Phase** - Check parsed command against world model state
5. **Execution Phase** - Run command (state changes, events fired)
6. **Turn Completion** - All events processed, world model stable
7. **Text Generation** - Text service queries final state and emits output

## Scenarios
- "take lamp" → Parse → Add lamp to scope → Validate lamp is takeable → Execute take → Complete turn → Generate "You take the lamp."
- "take glowing orb" → Parse → Scope has "orb" → Match "glowing" during validation → Execute → Complete → Generate text
- Parser error: "take asdfgh" → Parse fails → Emit error event → Skip to text generation → "I don't understand that."
- Scope addition: "take" (no object) → Parse → Scope adds likely object → Validate → Execute
- Never: State changes during text generation
- Never: Text emitted before turn completes
- Never: Validation after execution starts
