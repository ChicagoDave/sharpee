# ADR-076: Scoring System Architecture

## Status

Proposed

## Context

Interactive fiction games often include scoring systems to track player progress. The original Zork had a sophisticated system with:

- Points for placing treasures in the trophy case
- Points for achievements (defeating enemies, solving puzzles)
- Rank titles based on score thresholds
- Move counter

Sharpee needs a default scoring system that works out of the box, while allowing stories like Dungeo to customize or replace it entirely.

## Decision

### Two-Layer Architecture

**Layer 1: Sharpee Default (stdlib)**
A basic scoring service that stories can use without customization.

**Layer 2: Story Override**
Stories can extend or replace the default with custom logic.

### Layer 1: Default Scoring Service

```typescript
// packages/stdlib/src/services/scoring-service.ts

export interface ScoreEntry {
  points: number;
  reason: string;
  timestamp: number;
}

export interface RankDefinition {
  threshold: number;
  name: string;
}

export interface ScoringData {
  score: number;
  maxScore: number;
  moves: number;
  history: ScoreEntry[];
  ranks: RankDefinition[];
}

export const DEFAULT_RANKS: RankDefinition[] = [
  { threshold: 0, name: 'Beginner' },
  { threshold: 50, name: 'Novice' },
  { threshold: 100, name: 'Amateur' },
  { threshold: 200, name: 'Experienced' },
  { threshold: 350, name: 'Expert' },
  { threshold: 500, name: 'Master' },
];

export class ScoringService {
  constructor(private data: ScoringData) {}

  addPoints(points: number, reason?: string): void {
    this.data.score += points;
    if (reason) {
      this.data.history.push({
        points,
        reason,
        timestamp: Date.now()
      });
    }
  }

  getScore(): number {
    return this.data.score;
  }

  getMaxScore(): number {
    return this.data.maxScore;
  }

  getMoves(): number {
    return this.data.moves;
  }

  incrementMoves(): void {
    this.data.moves++;
  }

  getRank(): string {
    const ranks = this.data.ranks.sort((a, b) => b.threshold - a.threshold);
    for (const rank of ranks) {
      if (this.data.score >= rank.threshold) {
        return rank.name;
      }
    }
    return ranks[ranks.length - 1]?.name || 'Beginner';
  }

  formatScore(): string {
    return `Your score is ${this.data.score} of ${this.data.maxScore} points, in ${this.data.moves} moves. Rank: ${this.getRank()}`;
  }
}
```

### Layer 2: Story Override (Dungeo Example)

Dungeo extends the default with trophy case mechanics:

```typescript
// stories/dungeo/src/scoring/dungeo-scoring.ts

export interface DungeoScoringData extends ScoringData {
  scoredTreasures: string[];  // Treasures already counted
  achievements: string[];      // Named achievements
}

export const ZORK_RANKS: RankDefinition[] = [
  { threshold: 0, name: 'Beginner' },
  { threshold: 25, name: 'Amateur Adventurer' },
  { threshold: 50, name: 'Novice Adventurer' },
  { threshold: 100, name: 'Junior Adventurer' },
  { threshold: 200, name: 'Adventurer' },
  { threshold: 300, name: 'Master' },
  { threshold: 400, name: 'Wizard' },
  { threshold: 500, name: 'Master Adventurer' },
];

export class DungeoScoringService extends ScoringService {
  constructor(private dungeoData: DungeoScoringData) {
    super(dungeoData);
  }

  /**
   * Award points for treasure in trophy case (once per treasure)
   */
  scoreTreasure(treasureId: string, points: number): boolean {
    if (this.dungeoData.scoredTreasures.includes(treasureId)) {
      return false; // Already scored
    }
    this.dungeoData.scoredTreasures.push(treasureId);
    this.addPoints(points, `Placed ${treasureId} in trophy case`);
    return true;
  }

  /**
   * Check if treasure has been scored
   */
  isTreasureScored(treasureId: string): boolean {
    return this.dungeoData.scoredTreasures.includes(treasureId);
  }

  /**
   * Add named achievement
   */
  addAchievement(name: string, points: number): boolean {
    if (this.dungeoData.achievements.includes(name)) {
      return false;
    }
    this.dungeoData.achievements.push(name);
    this.addPoints(points, name);
    return true;
  }
}
```

### Treasure Objects

Treasures are marked with metadata:

```typescript
// On treasure items
interface TreasureData {
  isTreasure: true;
  treasureId: string;      // Unique identifier
  treasureValue: number;   // Points when in trophy case
  acquireValue?: number;   // Points on first pickup (optional)
}

// Example: Trunk of jewels
(trunk as any).isTreasure = true;
(trunk as any).treasureId = 'trunk-of-jewels';
(trunk as any).treasureValue = 15;
```

### Trophy Case Handler

The trophy case detects when treasures are placed inside:

```typescript
// Trophy case event handler
(trophyCase as any).on = {
  'container.itemAdded': (event: IGameEvent, world: WorldModel) => {
    const item = world.getEntity(event.data?.itemId);
    if (!item || !(item as any).isTreasure) return [];

    const scoring = world.getCapability(StandardCapabilities.SCORING) as DungeoScoringData;
    const treasureId = (item as any).treasureId;
    const points = (item as any).treasureValue;

    if (scoring.scoredTreasures?.includes(treasureId)) return [];

    // Award points
    scoring.scoreValue += points;
    scoring.scoredTreasures = [...(scoring.scoredTreasures || []), treasureId];

    return [{
      id: generateEventId(),
      type: 'game.message',
      data: { messageId: 'dungeo.treasure.scored', points },
      timestamp: Date.now(),
      narrate: true
    }];
  }
};
```

### Point Categories (Dungeo)

| Category | Points | Notes |
|----------|--------|-------|
| Treasures in case | ~350 | 19 treasures, various values |
| Combat victories | ~30 | Troll (10), Thief (15), etc. |
| Puzzle solutions | ~100 | Dam, exorcism, etc. |
| Exploration | ~36 | Reaching certain areas |
| Endgame | 100 | Completing the game |
| **Total** | **616** | |

### SCORE Command

The stdlib `scoring` action uses the scoring service:

```typescript
// Already exists - just needs to call service.formatScore()
// Output: "Your score is 45 of 616 points, in 123 moves. Rank: Amateur Adventurer"
```

## Implementation

### Phase 1: Dungeo-Specific (Now)

1. Add `scoredTreasures` to Dungeo scoring data
2. Add trophy case event handler
3. Mark treasures with metadata
4. Test with trunk of jewels

### Phase 2: Extract to Stdlib (Later)

5. Create `ScoringService` class in stdlib
6. Create `TreasureTrait` for treasure metadata
7. Create `TrophyCaseBehavior` (optional)
8. Update Dungeo to use stdlib base

## Consequences

### Positive

- Stories work out of the box with default scoring
- Full customization available (ranks, treasure logic, etc.)
- Dungeo can implement Zork-accurate scoring
- Clean separation: stdlib provides infrastructure, story provides policy

### Negative

- Two implementations to maintain during Phase 1
- Story authors need to understand override pattern

### Design Decisions

1. **Removing treasures doesn't lose points** - Matches original Zork
2. **Treasures score only in trophy case** - Not on acquisition (unless `acquireValue` set)
3. **Achievements are named** - Prevents double-scoring same achievement
4. **Ranks are data-driven** - Easy to customize per story

## References

- [Zork Scoring](http://www.eristic.net/games/infocom/zork1.html) - Original point breakdown
- `packages/stdlib/src/actions/standard/scoring/` - Existing SCORE action
- `stories/dungeo/src/index.ts` - Current scoring capability registration
