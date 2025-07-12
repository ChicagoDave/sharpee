# ADR-024: Score Data Storage

Date: 2025-07-12

## Status

Proposed

## Context

We need to determine where and how to store scoring data in the Sharpee platform. Key considerations:

1. Support for multiple player characters (swappable PCs)
2. Domain-driven design principles (aggregate boundaries, data ownership)
3. Score often depends on world events (puzzles solved, treasures found)
4. Score might be derived data rather than stored state

The discussion revealed tension between storing score on PC entities vs. treating it as a projection of game events.

## Decision

Score will be treated as a **read model/projection** calculated from domain events rather than stored directly on entities.

## Implementation Approach

### Event-Sourced Scoring

```typescript
// Domain events track what happened
{ type: 'PUZZLE_SOLVED', puzzle: 'sphinx', solver: 'alice', points: 50 }
{ type: 'TREASURE_TAKEN', item: 'crown', taker: 'bob', value: 30 }
{ type: 'SECRET_DISCOVERED', location: 'hidden-room', finder: 'alice', points: 25 }

// Scoring service calculates from events
interface ScoringService {
  getTotalScore(): number;
  getPCScore(pcId: string): number;
  getScoreBreakdown(): ScoreBreakdown;
}
```

### Scoring Policies

Different games can implement different scoring policies:

```typescript
interface ScoringPolicy {
  calculateScore(events: Event[]): ScoreData;
  calculatePCScore(events: Event[], pcId: string): ScoreData;
}

class StandardScoringPolicy implements ScoringPolicy {
  // Traditional IF scoring - all points go to active PC
}

class TeamScoringPolicy implements ScoringPolicy {
  // Points shared among party members
}

class CompetitiveScoringPolicy implements ScoringPolicy {
  // Track individual scores for competition
}
```

### Score Display

The SCORE action queries the scoring service:

```typescript
execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
  const scoringService = context.world.getService('scoring');
  const policy = context.world.getScoringPolicy();
  
  const events = context.world.getEventsSince(0);
  const scoreData = policy.calculateScore(events);
  
  return [createEvent(IFEvents.SCORE_DISPLAYED, {
    messageKey: 'scoring.report.basic',
    ...scoreData
  })];
}
```

## Why Not Store on PC Entity?

1. **Aggregate boundaries** - Score depends on world state outside PC aggregate
2. **Derived data** - Score is calculated from events, not inherent PC property
3. **Consistency** - Avoids synchronization issues with shared accomplishments
4. **Flexibility** - Different scoring policies without changing entity structure

## Migration Path

For games that need simple score storage:

```typescript
// Convenience method that stores last calculated score
worldModel.cacheScore(pcId: string, score: number): void {
  // Stores in world state for quick access
  // But source of truth remains events
}
```

## Consequences

### Positive
- Clean domain boundaries (DDD-compliant)
- Flexible scoring policies
- Natural support for multiplayer/party scoring
- Score history can be reconstructed
- No synchronization issues

### Negative
- More complex than simple property storage
- May need caching for performance
- Requires event sourcing infrastructure

## Related

- ADR-010: Event-driven architecture
- ADR-022: Extension architecture (scoring as standard action)
