# ADR-109: Play-Tester Annotation System

**Status**: Proposed
**Date**: 2026-01-22
**Context**: Dungeo dog-fooding and beta testing

## Problem

Play-testers need a way to annotate their sessions with comments, bug reports, and feedback without interrupting gameplay. Currently there's no in-game mechanism for testers to:

1. Add notes while playing ("this room description is confusing")
2. Flag potential bugs ("I think the door should have opened here")
3. Mark moments for later review ("interesting interaction")
4. Provide real-time feedback without breaking immersion

External note-taking tools break flow and often lose context (which room? which command?).

## Decision

Implement a play-tester annotation system with three tiers:

### Tier 1: Silent Comments (Minimum Viable)

Lines starting with `#` are ignored by the parser but logged with full context:

```
> take lamp
Taken.
> # Why is the lamp called "brass lantern" here but "lamp" works?
> north
```

The comment is stored with:
- Timestamp
- Current room
- Previous command and response
- Game state snapshot (turn number, score, inventory)

### Tier 2: Annotation Commands

Special commands for structured feedback:

| Command | Purpose | Example |
|---------|---------|---------|
| `$ bug <text>` | Flag a bug | `$ bug door won't open after solving riddle` |
| `$ note <text>` | General note | `$ note great atmosphere in this room` |
| `$ confusing` | Mark confusion | `$ confusing` (flags last interaction) |
| `$ expected <text>` | Document expectation | `$ expected "take all" to work here` |
| `$ bookmark <name>` | Named save point | `$ bookmark before-troll-fight` |

### Tier 3: Session Management

Commands for managing test sessions:

| Command | Purpose |
|---------|---------|
| `$ session start <name>` | Begin named test session |
| `$ session end` | End session, generate report |
| `$ export` | Export annotations to file |
| `$ review` | Show annotations from current session |

## Implementation

### Parser Integration

The parser checks for annotation prefixes before normal parsing:

```typescript
// In parser preprocessing
if (input.startsWith('#')) {
  return { type: 'silent-comment', text: input.slice(1).trim() };
}
if (input.startsWith('$')) {
  return parseAnnotationCommand(input.slice(1).trim());
}
// Normal parsing continues...
```

### Annotation Storage

Annotations are stored in a separate annotation log (not game state):

```typescript
interface Annotation {
  id: string;
  timestamp: number;
  type: 'comment' | 'bug' | 'note' | 'confusing' | 'expected' | 'bookmark';
  text: string;
  context: {
    roomId: string;
    roomName: string;
    turn: number;
    score: number;
    lastCommand: string;
    lastResponse: string;
    inventory: string[];
  };
  sessionId?: string;
}
```

### Export Formats

Annotations can be exported as:
- **Markdown report**: Human-readable summary grouped by type
- **JSON**: Machine-readable for bug tracking integration
- **Annotated transcript**: Original session with annotations inline

### Privacy Modes

For public beta testing:
- `$ anonymous on` - Strip identifying info from exports
- Annotations stored locally by default
- Opt-in cloud sync for coordinated testing

## Examples

### Bug Report Flow

```
> unlock door with key
The key doesn't fit.
> $ bug I have the rusty key which should open this door per the hint in the library
> $ expected door to open, revealing the garden
> examine key
A rusty iron key.
> $ note maybe it's the wrong key? But library said "rusty key opens garden door"
```

### Session Report Output

```markdown
# Play Test Session: garden-puzzle-test
Date: 2026-01-22 14:30
Tester: anonymous
Duration: 45 minutes
Rooms visited: 12

## Bugs (2)
1. [Turn 34, Library] "rusty key should open garden door but doesn't"
   - Command: unlock door with key
   - Response: The key doesn't fit.

2. [Turn 45, Garden] "rose description mentions thorns but EXAMINE THORNS fails"
   - Command: examine thorns
   - Response: You can't see any such thing.

## Notes (3)
1. [Turn 12, Foyer] "great atmosphere in this room"
2. [Turn 28, Library] "maybe it's the wrong key?"
3. [Turn 41, Garden] "beautiful description"

## Confusion Points (1)
1. [Turn 34, Library] After: unlock door with key

## Bookmarks (1)
1. "before-garden" at Turn 30, Library
```

## Alternatives Considered

### External Tools Only

Using Discord/Slack/Google Forms for feedback:
- Loses game context
- Breaks immersion
- Hard to correlate feedback with specific moments

### Recording Full Sessions

Automatic transcript recording:
- Doesn't capture tester intent/confusion
- Massive data without signal
- Privacy concerns

### In-Game Menu System

Modal UI for feedback:
- Breaks text adventure immersion
- Requires client changes
- Doesn't work in terminal

## Future Extensions

1. **Heatmaps**: Visualize where testers get stuck
2. **A/B Testing**: Compare puzzle variants across tester groups
3. **Automated Triage**: ML classification of bug reports
4. **Integration**: GitHub Issues, Linear, Jira export
5. **Voice Notes**: `$ voice` starts audio recording (accessibility)

## Implementation Priority

1. **Phase 1**: `#` comments with context logging
2. **Phase 2**: `$ bug` and `$ note` commands
3. **Phase 3**: Session management and export
4. **Phase 4**: Analytics and integrations

## References

- Infocom's internal play-testing practices
- Modern game analytics (Unity Analytics, GameAnalytics)
- ADR-073: Transcript Story Testing (related testing infrastructure)
