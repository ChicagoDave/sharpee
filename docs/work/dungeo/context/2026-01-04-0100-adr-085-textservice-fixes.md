# Work Summary: ADR-085 TextService Architecture Fixes

**Date**: 2026-01-04
**Duration**: ~30 minutes
**Feature/Area**: ADR-085 Scoring System - TextService Integration

## Objective

Review and correct ADR-085 to properly reflect Sharpee's TextService architecture, ensuring all text goes through TextService lookups rather than being returned by a "language layer."

## What Was Accomplished

### 1. TextService Architecture Correction

**Problem**: Initial ADR-085 described the language layer as "returning" messages, which is incorrect.

**Correct Architecture**:
1. Language packages (lang-en-us) **register** message mappings at startup
2. TextService **looks up** messages when needed
3. Code emits message IDs, TextService resolves them to text

Updated section 6 (now section 7) from "Text Layer Integration" to "TextService Integration" with correct flow:
```
Event → ScoringService → Report phase → TextService.lookup() → Client
```

### 2. Centralized Scoring Definitions

**Change**: Moved from inline event data to centralized definitions.

**Before** (points/reason in event):
```typescript
world.emitEvent('if.event.score_gained', {
  points: 10,
  reason: 'Deposited egg in trophy case',
  sourceId: 'trophy:egg'
});
```

**After** (just sourceId, service looks up rest):
```typescript
// Definition
'trophy:egg': {
  points: 5,
  reasonMessageId: 'dungeo.score.trophy_deposit',
  category: 'treasure'
}

// Event
world.emitEvent('if.event.score_gained', {
  sourceId: 'trophy:egg'
});
```

Benefits:
- All point values in one place (easier to balance)
- All text through TextService (proper i18n)
- Simpler events (just sourceId)

### 3. Rank Message IDs

**Change**: Ranks use message IDs instead of hardcoded strings.

**Before**:
```typescript
ranks: [
  { threshold: 0, name: 'Beginner' },
  { threshold: 400, name: 'Master Adventurer' }
]
```

**After**:
```typescript
ranks: [
  { threshold: 0, messageId: 'if.rank.beginner' },
  { threshold: 400, messageId: 'if.rank.master' }
]
```

Interface updated: `getRank()` → `getRankMessageId()`

### 4. Reason Message IDs

Added scoring reason messages to TextService registration:
```typescript
'dungeo.score.treasure_acquired': (data) => `You found the ${data.itemName}!`,
'dungeo.score.trophy_deposit': (data) => `The ${data.itemName} is now safely stored.`,
'dungeo.score.puzzle_solved': () => 'You solved the puzzle!',
'dungeo.score.new_area': () => 'You discovered a new area.'
```

### 5. Fun No-Scoring Messages

Added randomized responses when scoring is disabled:
```typescript
'if.score.no_scoring': () => {
  const responses = [
    'They shoot, they score!',
    "That's not really your thing.",
    'A smokey message appears, "OUT OF SERVICE"'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
},
```

Stories can override with their own themed messages:
```typescript
// Dungeo override
'if.score.no_scoring': () => {
  const responses = [
    'The Great Underground Empire has no use for such things.',
    'Score? In a dungeon? How gauche.',
    'The grue ate your scoreboard.'
  ];
  return responses[Math.floor(Math.random() * responses.length)];
},
```

### 6. Updated IScoringService Interface

```typescript
interface IScoringService {
  getScore(): number;
  getMaxScore(): number;
  getRankMessageId(): string;  // Returns message ID, not text
  hasScored(sourceId: string): boolean;
  scorePoints(sourceId: string): boolean;  // Looks up points from definitions
  losePoints(sourceId: string, overridePoints?: number): void;
  getDefinition(sourceId: string): ScoringDefinition | undefined;  // New
  getScoredSources(): string[];
  restoreScoredSources(sources: string[]): void;
}
```

## Key Decisions

1. **TextService does lookups** - Language packages register, TextService looks up
2. **Centralized definitions** - Points and reasons defined once, referenced by sourceId
3. **Message IDs everywhere** - Ranks, reasons, display text all use message IDs
4. **Author customization** - Stories can override any message by registering same ID

## Files Changed

- `docs/architecture/adrs/adr-085-scoring-system.md` - Major updates to sections 1, 2, 4, 7

## Test Results

N/A - Documentation only

## Next Steps

1. User review of updated ADR-085
2. If approved, implement scoring system per ADR
3. Continue Dungeo development

## References

- ADR-085: `/mnt/c/repotemp/sharpee/docs/architecture/adrs/adr-085-scoring-system.md`
- Previous summary: `2026-01-04-0000-balloon-wire-fix-and-scoring-adr.md`
