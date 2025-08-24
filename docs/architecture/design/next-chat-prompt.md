# Prompt for Next Chat: Implementing Story-Based Testing

## Context
I'm working on the Sharpee Interactive Fiction Engine test suite. We've identified that the current testing approach is causing module resolution issues when trying to mock the language provider directly. The solution is to refactor tests to use test stories that properly load the language provider through the normal engine initialization flow.

## Current State
- Location: `/packages/engine/`
- Test plan created: `story-based-testing-plan.md`
- Issue: Tests failing with "TypeError: verbDef.verbs is not iterable"
- Root cause: Direct language provider mocking conflicts with module resolution

## What Needs to Be Done
Implement the story-based testing approach outlined in the plan:

1. **Create test stories** in `/packages/engine/tests/stories/`:
   - minimal-test-story.ts
   - action-test-story.ts
   - complex-world-test-story.ts
   - event-test-story.ts
   - game-state-test-story.ts
   - completion-test-story.ts
   - index.ts (exports)

2. **Refactor existing tests** to use these test stories instead of mocking the language provider

3. **Remove the problematic mocking code** from setup.ts

## Key Design Principles to Remember
- Test stories implement the Story interface
- Each story specifies `language: 'en-us'` in its config
- Stories include test helper methods to verify internal state
- No build step needed - ts-jest compiles TypeScript on the fly
- Stories go in `/packages/engine/tests/stories/`

## First Task
Start by creating `minimal-test-story.ts` and refactoring `game-engine.test.ts` to use it. This will validate the approach before creating all the other test stories.

## Success Criteria
- Tests pass without "verbDef.verbs is not iterable" errors
- Achieve 80% code coverage
- Tests reflect real-world engine usage
