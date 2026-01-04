# ADR-085: Event-Based Scoring System

## Status

Accepted (Implemented 2026-01-04)

## Context

Dungeo implementation exposed a fundamental issue with scoring architecture:

1. **Handler collision** - Trophy case scoring and balloon receptacle both register handlers for `if.event.put_in`. Since `registerEventHandler` uses a Map (one handler per event type), the second handler overwrites the first. Trophy case scoring silently breaks.

2. **Scattered scoring logic** - Scoring is currently ad-hoc:
   - Trophy case has its own `put_in` handler
   - Treasures have `treasureValue` properties checked inconsistently
   - No unified pattern for puzzle completion, exploration, or arbitrary scoring

3. **No opt-out mechanism** - Some IF has no scoring (literary fiction, puzzleless games). Currently no clean way to disable.

4. **Tight coupling** - Code that causes scoring (taking treasure, solving puzzle) directly manipulates score rather than emitting events.

### Scoring Sources in Classic IF

| Source | When | Example |
|--------|------|---------|
| Acquiring treasure | Take valuable item | Take the egg |
| Trophy case bonus | Deposit treasure | Put egg in case |
| Puzzle solved | Complete puzzle | Answer riddle correctly |
| Secret location | First visit to hidden area | Enter secret room |
| Arbitrary action | Story-specific triggers | Ring bell at right time |
| Point loss | Rare but exists | Die with treasure, item destroyed |

## Decision

Implement an event-based scoring system with these components:

### 1. Scoring Definitions

All scoring is defined in a central data structure. Point values and reason messages are looked up by `sourceId`:

```typescript
// In story configuration (e.g., stories/dungeo/src/scoring-definitions.ts)
interface ScoringDefinition {
  /** Points awarded for this source */
  points: number;

  /** Message ID for reason text (looked up via TextService) */
  reasonMessageId: string;

  /** Category for grouping/reporting */
  category: 'treasure' | 'puzzle' | 'exploration' | 'action';
}

const scoringDefinitions: Record<string, ScoringDefinition> = {
  // Treasures (acquiring)
  'treasure:egg': {
    points: 5,
    reasonMessageId: 'dungeo.score.treasure_acquired',
    category: 'treasure'
  },
  'treasure:chalice': {
    points: 10,
    reasonMessageId: 'dungeo.score.treasure_acquired',
    category: 'treasure'
  },

  // Trophy case deposits (bonus points)
  'trophy:egg': {
    points: 5,
    reasonMessageId: 'dungeo.score.trophy_deposit',
    category: 'treasure'
  },

  // Puzzles
  'puzzle:rainbow': {
    points: 10,
    reasonMessageId: 'dungeo.score.puzzle_solved',
    category: 'puzzle'
  },

  // Exploration
  'explore:cellar': {
    points: 2,
    reasonMessageId: 'dungeo.score.new_area',
    category: 'exploration'
  }
};
```

### 2. Scoring Events

Events are lightweight - just the `sourceId`. ScoringService looks up points and reason:

```typescript
// Points gained - just reference the sourceId
interface ScoreGainedEventData {
  /** Unique ID that maps to scoring definition */
  sourceId: string;
}

// Points lost - for rare cases (death with treasure, item destroyed)
interface ScoreLostEventData {
  /** Unique ID (if reversing a specific gain) or ad-hoc loss */
  sourceId: string;

  /** Override points if not reversing a defined gain */
  points?: number;

  /** Override reason if not using definition */
  reasonMessageId?: string;
}
```

Event types:
- `if.event.score_gained`
- `if.event.score_lost`

### 3. Scoring Capability

Scoring is an optional world capability that stories register:

```typescript
// Enable with defaults
world.registerCapability('scoring', {
  enabled: true,
  maxScore: 350
});

// Enable with custom service
world.registerCapability('scoring', {
  enabled: true,
  maxScore: 616,
  service: new DungeoScoringService()
});

// Disable entirely (literary IF, puzzleless games)
world.registerCapability('scoring', {
  enabled: false
});
```

When disabled:
- Scoring events are still valid but ignored
- SCORE command says "This story does not use scoring" (or similar)
- No runtime errors if code emits scoring events

### 4. Default Scoring Service (stdlib)

```typescript
interface IScoringService {
  /** Current score */
  getScore(): number;

  /** Maximum possible score (sum of all defined points) */
  getMaxScore(): number;

  /** Get rank message ID based on current score (TextService looks up actual text) */
  getRankMessageId(): string;

  /** Check if a source has already been scored */
  hasScored(sourceId: string): boolean;

  /** Process a score gain by sourceId (looks up points from definitions, returns false if already scored) */
  scorePoints(sourceId: string): boolean;

  /** Process a score loss by sourceId (or override with explicit points) */
  losePoints(sourceId: string, overridePoints?: number): void;

  /** Get scoring definition for a sourceId */
  getDefinition(sourceId: string): ScoringDefinition | undefined;

  /** Get all scored source IDs (for save/restore) */
  getScoredSources(): string[];

  /** Restore scored sources (for save/restore) */
  restoreScoredSources(sources: string[]): void;
}
```

Default implementation in stdlib:
- Tracks current score (starts at 0)
- Maintains Set of scored `sourceId`s (prevents double-scoring)
- Configurable rank thresholds and message IDs
- Serializable for save/restore

### 5. Author Customization Points

**Custom rank system:**
```typescript
// ScoringService uses message IDs, not hardcoded strings
const customService = new ScoringService({
  maxScore: 616,
  ranks: [
    { threshold: 0, messageId: 'if.rank.beginner' },
    { threshold: 50, messageId: 'if.rank.amateur' },
    { threshold: 200, messageId: 'if.rank.seasoned' },
    { threshold: 400, messageId: 'if.rank.master' },
    { threshold: 616, messageId: 'if.rank.winner' }
  ]
});

// Actual rank text is registered in lang-en-us (or story's language file)
```

**Custom scoring service:**
```typescript
class MyCustomScoringService implements IScoringService {
  // Completely custom implementation
  // Maybe score is time-based, or inverse (golf scoring), etc.
}
```

**Custom criteria:**
Stories emit `if.event.score_gained` from their own handlers/actions. The scoring system doesn't know or care what triggers points - it just processes the events.

### 6. Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **engine** | Event dispatch, capability registry |
| **world-model** | `IScoringService` interface |
| **stdlib** | Default `ScoringService` implementation |
| **lang-en-us** | Score change messages, SCORE command text |
| **story** | Custom service, what triggers scoring, ranks, max |

### 7. TextService Integration

The TextService looks up all message text from registered mappings. Language packages register their mappings at startup; they don't "return" messages directly.

**Message Registration** (in `lang-en-us`):
```typescript
// lang-en-us/src/scoring-messages.ts
export const scoringMessages = {
  // Score change messages
  'if.score.gained': (data) =>
    `Your score just increased by ${data.points} points.`,

  'if.score.lost': (data) =>
    `You just lost ${data.points} points!`,

  'if.score.display': (data) =>
    `You have scored ${data.score} out of ${data.maxScore}, earning you the rank of ${data.rank}.`,

  // When scoring is disabled, randomly pick a fun response
  // Stories can override by registering their own 'if.score.no_scoring'
  'if.score.no_scoring': () => {
    const responses = [
      'They shoot, they score!',
      "That's not really your thing.",
      'A smokey message appears, "OUT OF SERVICE"'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },

  // Default rank names (stories can override with their own message IDs)
  'if.rank.beginner': () => 'Beginner',
  'if.rank.amateur': () => 'Amateur Adventurer',
  'if.rank.seasoned': () => 'Seasoned Explorer',
  'if.rank.master': () => 'Master Adventurer',
  'if.rank.winner': () => 'Winner'
};

// Registered at startup
textService.registerMessages(scoringMessages);
```

**Story-specific messages** (e.g., in Dungeo):
```typescript
// stories/dungeo/src/messages/scoring-messages.ts
export const dungeoScoringMessages = {
  // Override no-scoring message with custom list
  'if.score.no_scoring': () => {
    const responses = [
      'The Great Underground Empire has no use for such things.',
      'Score? In a dungeon? How gauche.',
      'The grue ate your scoreboard.'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  },

  // Ranks
  'dungeo.rank.beginner': () => 'Beginner',
  'dungeo.rank.amateur': () => 'Amateur Adventurer',
  'dungeo.rank.junior': () => 'Junior Adventurer',
  'dungeo.rank.adventurer': () => 'Adventurer',
  'dungeo.rank.master': () => 'Master Adventurer',
  'dungeo.rank.wizard': () => 'Wizard',
  'dungeo.rank.master_secrets': () => 'Master of Secrets',

  // Scoring reasons (referenced by scoringDefinitions)
  'dungeo.score.treasure_acquired': (data) =>
    `You found the ${data.itemName}!`,
  'dungeo.score.trophy_deposit': (data) =>
    `The ${data.itemName} is now safely stored.`,
  'dungeo.score.puzzle_solved': () =>
    'You solved the puzzle!',
  'dungeo.score.new_area': () =>
    'You discovered a new area.'
};
```

**Message Lookup** (by TextService):
```typescript
// When score event is processed, engine calls:
const text = textService.lookup('if.score.gained', { points: 5 });
// TextService finds registered mapping, calls it with data, returns string

// Silent scoring: story can choose not to output score change messages
// by configuring the report service to skip score events
```

The flow is:
1. Action/handler emits `if.event.score_gained` with data
2. ScoringService processes the event (updates score, checks deduplication)
3. Report phase: TextService looks up message ID → registered text
4. Client renders the text

## Implementation

### Phase 1: Core Infrastructure
1. Define `IScoringService` interface in world-model
2. Create default `ScoringService` in stdlib
3. Add `scoring` capability type to engine
4. Define `if.event.score_gained` and `if.event.score_lost` events

### Phase 2: Integration
1. Update SCORE action to use scoring capability
2. Add score event handlers to lang-en-us
3. Update Dungeo to emit scoring events instead of direct manipulation

### Phase 3: Dungeo Migration
1. Remove direct scoring manipulation
2. Emit `if.event.score_gained` for treasure acquisition
3. Emit `if.event.score_gained` for trophy case deposits
4. Remove the conflicting `put_in` handler (now just emits event)
5. Add puzzle/exploration scoring events as needed

## Consequences

### Positive
- **No handler collision** - Scoring doesn't fight with other `put_in` handlers
- **Unified pattern** - All scoring goes through same events
- **Auditable** - Can log/replay all score changes
- **Flexible** - Stories can customize or disable entirely
- **Decoupled** - Actions don't know about scoring internals
- **Save/restore friendly** - Scored sources are serializable

### Negative
- **Migration effort** - Existing Dungeo scoring code needs refactoring
- **Indirection** - Score changes now go through event system (minimal overhead)
- **Learning curve** - Authors need to understand event-based pattern

### Neutral
- **No silent scoring** - Every score change is an event (could be logged, but doesn't have to produce visible output)

## Example: Trophy Case Scoring (After)

```typescript
// In putting action or a post-action handler
world.registerEventHandler('if.event.put_in', (event, world) => {
  const { itemId, targetId } = event.data;

  // Check if target is trophy case
  const target = world.getEntity(targetId);
  if (target.get('identity')?.name !== 'trophy case') return;

  // Check if item is treasure
  const item = world.getEntity(itemId);
  if (!item.isTreasure) return;

  // Emit scoring event - just the sourceId
  // ScoringService looks up points and reasonMessageId from definitions
  world.emitEvent('if.event.score_gained', {
    sourceId: `trophy:${itemId}`
  });
});
```

The key insights:
1. The `put_in` handler no longer needs to know about points or messages - just emit the sourceId
2. Points and reason text are defined centrally in `scoringDefinitions`
3. Other code can also listen to `put_in` without handler collision
4. All text goes through TextService

## Related ADRs

- ADR-052: Event Handler System (current limitation this addresses)
- ADR-071: Daemons and Fuses (timed scoring events)

## References

- Dungeo trophy case scoring bug (handler collision)
- Inform 7 scoring system (similar event-based approach)
- TADS scoring (capability-based)
