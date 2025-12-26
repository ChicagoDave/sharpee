# Three-Phase Pattern Conversion Plan

## Background
Per ADR-058 and ADR-060, all actions should follow the three-phase pattern:
1. **validate(context)**: Returns ValidationResult - pure validation, no side effects
2. **execute(context)**: Returns void - performs mutations only
3. **report(context)**: Returns ISemanticEvent[] - generates all events

## Current State
- **11 actions (27.5%)** already use three-phase pattern
- **26 actions (65%)** still use old pattern (execute returns events)
- **3 action families (7.5%)** use sub-actions pattern

## Actions Already Using Three-Phase ✅
1. closing
2. dropping  
3. examining
4. giving
5. going
6. inserting
7. looking
8. opening
9. putting
10. removing
11. taking

## Actions Using Sub-Actions Pattern ✅
1. switching (activate/deactivate)
2. locking (secure/unsecure)
3. wearable (wear/remove)

## Actions Needing Conversion ❌

### Priority 1: Core Movement & Interaction (Most Used)
1. **entering** - Movement into containers/vehicles
2. **exiting** - Movement out of containers/vehicles
3. **eating** - Basic interaction
4. **drinking** - Basic interaction
5. **attacking** - Combat system
6. **pushing** - Object manipulation
7. **pulling** - Object manipulation

### Priority 2: Meta/System Actions
8. **saving** - Game state management
9. **restoring** - Game state management
10. **quitting** - Game control
11. **restarting** - Game control
12. **scoring** - Game info
13. **about** - Game info
14. **again** - Command repeat

### Priority 3: Sensory Actions
15. **listening** - Sensory
16. **smelling** - Sensory
17. **touching** - Sensory
18. **searching** - Investigation
19. **reading** - Text interaction

### Priority 4: Other Actions
20. **showing** - NPC interaction
21. **talking** - Communication
22. **throwing** - Object manipulation
23. **sleeping** - State change
24. **waiting** - Time passage
25. **climbing** - Movement
26. **helping** - Meta

## Conversion Template

For each action, follow this pattern:

```typescript
// OLD PATTERN (execute returns events)
execute(context: ActionContext): ISemanticEvent[] {
  // validation logic mixed in
  // mutations
  // event generation
  return events;
}

// NEW PATTERN (three-phase)
validate(context: ActionContext): ValidationResult {
  // pure validation only
  return { valid: true } or { valid: false, error: 'message' }
}

execute(context: ActionContext): void {
  // mutations only
  // store any needed state in context for report phase
  (context as any)._actionState = { ... };
}

report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
  // handle validation/execution errors
  // generate all events
  return events;
}
```

## Work Plan

### Phase 1: High Priority Actions (Day 1)
- [ ] entering
- [ ] exiting  
- [ ] eating
- [ ] drinking
- [ ] attacking
- [ ] pushing
- [ ] pulling

### Phase 2: Meta Actions (Day 2)
- [ ] saving
- [ ] restoring
- [ ] quitting
- [ ] restarting
- [ ] scoring
- [ ] about
- [ ] again

### Phase 3: Sensory Actions (Day 3)
- [ ] listening
- [ ] smelling
- [ ] touching
- [ ] searching
- [ ] reading

### Phase 4: Remaining Actions (Day 4)
- [ ] showing
- [ ] talking
- [ ] throwing
- [ ] sleeping
- [ ] waiting
- [ ] climbing
- [ ] helping (if exists)

## Success Criteria
- All actions follow validate/execute/report pattern
- No validation logic in execute
- No event generation in execute
- All events generated in report phase
- Tests pass for all converted actions
- CommandExecutor works with all actions

## Notes
- The quality improvements from previous phases (bug fixes, duplication removal) are already done
- This work specifically addresses the architectural pattern conversion
- Some actions may need the hacky `(context as any)._state` pattern until proper state passing is implemented