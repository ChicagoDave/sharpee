# Scoring Action Design

## Overview
The scoring action displays game progress information including score, rank, and achievements. This meta-action exhibits complete logic duplication between validate and execute phases.

## Required Messages
- `scoring_not_enabled` - Scoring system disabled
- `score_display` - Basic score display
- `score_simple` - Simple score format
- `score_with_rank` - Score with rank
- `perfect_score` - Maximum score achieved
- `rank_novice` - Novice rank
- `rank_amateur` - Amateur rank
- `rank_proficient` - Proficient rank
- `rank_expert` - Expert rank
- `rank_master` - Master rank
- `with_achievements` - Achievement list
- `no_achievements` - No achievements
- `early_game` - Early game progress
- `mid_game` - Mid game progress
- `late_game` - Late game progress
- `game_complete` - Game completed

## Validation Logic

### 1. Scoring Capability Check
- Uses `StandardCapabilities.SCORING`
- Returns `scoring_not_enabled` if missing

### 2. Data Extraction
From scoring capability:
- `scoreValue`: Current score
- `maxScore`: Maximum possible
- `moves`: Move count
- `achievements`: Achievement list

### 3. Rank Calculation
Based on percentage (score/maxScore):
- 100%: Perfect score
- ≥90%: Master
- ≥75%: Expert
- ≥50%: Proficient
- ≥25%: Amateur
- <25%: Novice

### 4. Progress Determination
- 100%: `game_complete`
- ≥75%: `late_game`
- ≥25%: `mid_game`
- <25%: `early_game`

### 5. Message Selection
- Perfect score → `perfect_score`
- Has max score → `score_with_rank`
- Has moves only → `score_display`
- Default → `score_simple`

## Execution Flow

### CRITICAL ISSUE: Complete Logic Duplication
**Entire validation logic repeated exactly:**
- Same data extraction
- Same rank calculation
- Same progress determination
- Same message selection
- No state preservation

### Event Generation
Emits multiple events:
1. **Domain event**: `if.event.score_displayed`
2. **Main message**: Selected score message
3. **Achievement message**: If has achievements
4. **Progress message**: If determined

## Data Structures

### ScoreDisplayedEventData
```typescript
interface ScoreDisplayedEventData {
  score: number;
  maxScore: number;
  moves: number;
  percentage?: number;
  rank?: string;
  achievements?: string[];
  progress?: 'early_game' | 'mid_game' | 'late_game' | 'game_complete';
}
```

## Current Implementation Issues

### Critical Problems
1. **Complete duplication**: 100% logic repeated
2. **No state preservation**: Everything recalculated
3. **No three-phase pattern**: Missing report phase
4. **Performance impact**: Double calculations

### Design Issues
1. **Hardcoded thresholds**: Magic numbers for ranks
2. **Unused messages**: Individual rank messages never used
3. **String joining**: Achievements joined with comma

## Recommended Improvements
1. **Implement three-phase pattern**
2. **Configure rank thresholds**
3. **Format achievements properly**
4. **Add score history tracking**
5. **Support custom ranking systems**