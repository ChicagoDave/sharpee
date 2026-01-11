# Work Summary: Parser Refactor Planning

**Date**: 2026-01-10
**Duration**: ~2 hours
**Branch**: parser-refactor (from dungeo)
**Feature/Area**: Parser architecture - trait-based scope system

## Objective

Design a comprehensive parser refactor so grammar declares only semantic constraints (traits), while parser handles scope (visibility/reachability) automatically.

## Problem Statement

Current grammar patterns mix concerns:
```typescript
grammar.define('board :vehicle')
  .where('vehicle', (scope) => scope.visible().matching({ enterable: true }))
```

Issues:
- Grammar declares `.visible()` - parser should determine this from world state
- `.matching({ enterable: true })` checks property, not trait
- Boat has VehicleTrait but `entity.enterable` is undefined

## Solution Designed

**New grammar pattern:**
```typescript
grammar.define('board :target')
  .hasTrait(TraitType.VEHICLE)
  .mapsTo('if.action.entering')
```

**4-Tier Scope System:**
| Level | Meaning | Example Actions |
|-------|---------|-----------------|
| AWARE | Player knows it exists | think about, ask about |
| VISIBLE | Player can see it | examine, look at |
| REACHABLE | Player can touch it | take, push, board |
| CARRIED | In inventory | drop, eat, wear |

Key insight: Author can put anything in AWARE scope, but visibility/reachability still apply separately.

## Documents Created

### 1. Refactor Plan (`docs/work/parser/refactor-plan.md`)

6-phase implementation plan:
1. Add `.hasTrait()` to PatternBuilder
2. Update ScopeEvaluator for trait filtering
3. Make scope implicit based on action metadata
4. Migrate grammar patterns
5. Add disambiguation with `entity.scope(actionId, score)`
6. Add implicit takes with `if.events.implicit-take`

### 2. Scope Scenarios (`docs/work/parser/scope-scenarios.md`)

10 test scenarios validating the design:
1. Soccer ball across pitch (visible, not reachable)
2. Kitten in closed box (reachable, not visible)
3. Key in glass case (visible through glass)
4. Rope in dark cellar (reachable in darkness)
5. Apple held by NPC (visible, NPC possession)
6. Book on high shelf (visible, too high)
7. Fish in aquarium (visible through glass+water)
8. Voice from adjacent room (audible only)
9. Item in player's pocket (NPC perspective)
10. Treasure behind waterfall (partial barrier)

### 3. Plan Assessment (`docs/work/parser/plan-assessment.md`)

Professional comparison with TADS 3, Inform 6/7, and Hugo:
- Our 4-tier scope matches TADS 3's sophisticated model
- Trait-based grammar cleaner than Inform's approach
- Event-based implicit actions allow author hooks

## Key Design Decisions

### Scope Failure Handling
- Parser resolves entity from AWARE scope
- Action's `validate()` checks required scope level
- Action's `blocked()` generates contextual failure message
- Authors customize messages in blocked() phase

### Disambiguation
```typescript
apple.scope('if.action.eating', 150);      // prefer real apple
waxApple.scope('if.action.eating', 50);    // deprioritize wax apple
```
- Higher score = more likely auto-selected
- Close scores prompt user: "Do you mean X or Y?"

### Implicit Takes
- Event: `if.events.implicit-take` (distinct from regular take)
- Full validate/blocked phases execute
- Success: "(first taking the X)" then main action
- Failure: Report take's blocked message (e.g., gnome attacks)

### Grammar API
- `.hasTrait(TraitType.X)` - primary constraint method
- `.matching({ prop: value })` - edge cases only

## Decisions Deferred

1. **Preconditions system** - Like TADS 3's `preCond = [objHeld]`, needs more scenarios
2. **Multi-object commands** - "take all", may be separate ADR
3. **AUDIBLE scope level** - Lower priority for now

## Files Changed

| File | Change |
|------|--------|
| `docs/work/parser/refactor-plan.md` | Created - main implementation plan |
| `docs/work/parser/scope-scenarios.md` | Created - 10 test scenarios |
| `docs/work/parser/plan-assessment.md` | Created - TADS/Inform/Hugo comparison |
| `docs/context/session-20260110-0731-dungeo.md` | Created - earlier session summary |

## Commits

1. `594837f` - docs: Add parser refactor plan for trait-based constraints
2. `21eba18` - docs: Add scope validation step for visible vs reachable
3. `bfdbbd4` - docs: Add scope scenarios for parser validation
4. `b178e5e` - docs: Add 4-tier scope system (AWARE/VISIBLE/REACHABLE/CARRIED)
5. `3b66101` - docs: Add professional assessment comparing to TADS/Inform/Hugo
6. `77f0ec5` - docs: Add user responses to assessment recommendations
7. `6497779` - docs: Update plan with confirmed design decisions

## Next Steps

1. Review plan one final time
2. Create feature branch for implementation
3. Start Phase 1: Add `.hasTrait()` to PatternBuilder
4. Test with "board boat" command

## References

- ADR-089: Pronoun resolution (already implemented)
- TADS 3: 4-tier scope model, preconditions, logicalRank
- Inform 7: "in scope" concept, "Does the player mean" rules
