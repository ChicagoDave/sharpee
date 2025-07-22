# Next Session Prompt: Complete CommandValidator Implementation

## Context
I'm working on the Sharpee Interactive Fiction Platform. We've successfully completed Phase 1 and 2 of the parser-validation-execution refactor. The parser is now world-agnostic and emits debug events. A basic CommandValidator exists but needs significant enhancement.

## Current Situation
* Parser refactor is complete - it's now world-agnostic
* Debug event system implemented
* Basic CommandValidator structure exists in `/packages/stdlib/src/validation/`
* Validator currently only does basic entity resolution (by type/name)
* Still need to complete the validator before moving to Phase 3 (updating actions)

## Previous Session Results
We completed:
- ✅ Phase 1: All type definitions in @sharpee/core
- ✅ Phase 2: Parser refactored to remove world knowledge
- 🚧 Phase 3: Basic CommandValidator structure (needs enhancement)

## Today's Goal
Complete the CommandValidator implementation with all the complex entity resolution logic that used to be scattered throughout the system.

## Key Files to Review
* `/packages/stdlib/src/validation/command-validator.ts` - Current basic validator
* `/parser-validation-refactor-plan.md` - The implementation checklist (Phase 3)
* `/work-summary-2025-01-11-parser-debug.md` - Summary of last session
* Look for `CommandResolver` logic to extract/refactor

## Specific Tasks for CommandValidator

### 1. Enhanced Entity Resolution
The validator needs to handle:
- **Adjective matching** (red ball vs blue ball)
- **Scope rules** (visible, reachable, touchable)
- **Pronoun resolution** ("it", "them")
- **Ambiguity handling** (when multiple matches exist)
- **Scoring system** for best match selection

### 2. Debug Event Support
Add debug events to the validator similar to the parser:
- `entity_resolution`: Details about how entities were matched
- `scope_check`: What entities were considered and why
- `ambiguity_resolution`: How conflicts were resolved
- `validation_error`: Details about validation failures

### 3. Extract Existing Logic
Find and refactor the entity resolution logic from:
- Old `CommandResolver` if it exists
- Any entity matching code in the old parser
- Scope checking logic from actions

### 4. Define ActionMetadata Interface
Create the interface for actions to declare their requirements:
```typescript
interface ActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: 'visible' | 'reachable' | 'touchable';
  indirectObjectScope?: 'visible' | 'reachable' | 'touchable';
  validPrepositions?: string[];
}
```

## Implementation Approach
1. First, find where the old entity resolution logic lives
2. Extract and refactor it into the CommandValidator
3. Add comprehensive debug events
4. Implement the scoring system for entity matches
5. Add proper error generation for all validation failures
6. Test with complex cases (adjectives, ambiguity, pronouns)

## Important Notes
* Do NOT update actions yet - that's Phase 3
* Do NOT create CommandProcessor yet - that's Phase 4
* Focus only on making the validator feature-complete
* The validator is THE critical piece that needs to handle all complex resolution

## Success Criteria
* [ ] Entity resolution handles adjectives properly
* [ ] Scope rules (visible/reachable/touchable) implemented
* [ ] Pronoun resolution working ("it", "them")
* [ ] Ambiguity handling with scoring system
* [ ] Debug events throughout validation process
* [ ] All validation error types implemented
* [ ] Tests for complex validation scenarios

## Next Steps After This Session
Once the CommandValidator is complete, the next session will:
1. Update all actions to use ValidatedCommand (Phase 4)
2. Create CommandProcessor to chain the phases (Phase 5)
3. Fix remaining circular dependencies (Phase 6)

## Critical Reminder
The validator needs to be COMPLETE before moving on. It should handle ALL the complex entity resolution that was previously scattered throughout the system. This is the key to making the three-phase architecture work properly.

Let's complete the CommandValidator! Start by examining the current implementation and finding where the old resolution logic lives.
