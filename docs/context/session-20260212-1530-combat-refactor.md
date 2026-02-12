# Session Summary: 2026-02-12 - combat-refactor (3:30 PM CST)

## Status: Complete

## Goals
- Review and refine ADR-129 (Treasure Scoring architecture)
- Verify both author scenarios (built-in scoring, custom scoring)
- Assess impact on thief implementation

## Completed

### 1. ADR-129 Design Review — Identified Gaps in Original Proposal

Traced both author scenarios through the original ADR-129 design and found two blocking issues:
- **ActionContext has no scoring service access** — the taking action can't call `scoringService.awardOnce()` as proposed
- **No `awardOnce()` method** on IScoringService — existing API requires pre-registered definitions

Also identified design gaps: double-scoring risk, deduplication mismatch with Dungeo's `takenTreasures[]`, unclear opt-out mechanism.

### 2. Redesigned Scoring as Transactional Ledger on WorldModel

Replaced the ScoringService approach with a primitive score ledger directly on the world model:

```typescript
interface ScoreEntry { id: string; points: number; description: string; }

world.awardScore(id: string, points: number, description: string): boolean
world.revokeScore(id: string): boolean
world.hasScore(id: string): boolean
world.getScore(): number
world.getScoreEntries(): ScoreEntry[]
```

Key design decisions:
- **No ScoringService needed** — actions call `world.awardScore()` directly (world is already on ActionContext)
- **Deduplication by ID** — `awardScore` returns false if ID exists
- **Author-provided descriptions** — `IdentityTrait.pointsDescription` populates the ledger, enables `FULL SCORE` command
- **`revokeScore()`** enables loss mechanics (thief steals from trophy case)

### 3. Trophy Case Scoring via Putting Interceptor

Designed the complete interceptor chain for trophy case scoring:
- `TrophyCaseTrait` — marker trait on the trophy case entity
- `TrophyCasePuttingInterceptor` — `postExecute` hook checks item for `TreasureTrait.trophyCaseValue`, calls `world.awardScore()`
- Registration: `registerActionInterceptor(TrophyCaseTrait.type, 'if.action.putting', ...)`

Scoring stays in the action execution flow (putting action's execute phase), not event handlers.

### 4. Verified Two Author Scenarios

**Scenario 1 (Built-in):** Author sets `points: 10` on IdentityTrait. Stdlib taking action handles everything. No traits, interceptors, or services needed.

**Scenario 2 (Custom/Dungeo):** Author uses `IdentityTrait.points` for take-scoring (stdlib) and adds story-level TreasureTrait + interceptor for trophy case. The two compose via different ledger IDs (`entity.id` vs `trophy:entity.id`).

### 5. Assessed Impact on Thief Implementation

Impact is minimal — core thief logic (state machine, combat, steal/deposit) is untouched:
- `depositTreasures()` — same `trophyCaseValue > 0` filter, just imports from story-level trait
- `getTreasureValue()` — reads from two traits (`identity.points + treasure.trophyCaseValue`)
- `isCarryingEgg()` — uses `entity.id` instead of `treasureId`
- `getHeroFightStrength()` — `world.getScore()` instead of `scoringService.getScore()`
- `isThiefDead()` — `world.hasScore('thief-killed')` instead of service method

### 6. Updated ADR-129

Rewrote ADR-129 with the complete transactional ledger design, including:
- WorldModel score ledger API
- `IdentityTrait.points` and `pointsDescription`
- Complete interceptor registration example for trophy case
- Both author scenarios with code examples
- Migration scope for platform and story changes
- Alternatives considered (ScoringService, event handlers, entity attributes)

## Key Decisions
- Scoring is a world model primitive, not a service
- Score entries are transactional `(id, points, description)` — not a running total
- Take-scoring lives in stdlib (IdentityTrait.points), trophy case scoring lives in story (interceptor)
- ScoringService, ScoringEventProcessor, and platform TreasureTrait will all be removed

## Files Changed
- `docs/architecture/adrs/adr-129-treasure-scoring-to-story-layer.md` — complete rewrite

## Next Steps
- ADR-129 implementation (separate branch after combat-refactor lands)
- Continue thief work on combat-refactor branch
