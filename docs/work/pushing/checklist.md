# Pushing Action - Three-Phase Refactoring Checklist

## Status: Complete

## Phase 1: Pre-Refactor Analysis
- [x] Review current implementation
- [x] Identify issues:
  - [x] execute() returned ISemanticEvent[] instead of void
  - [x] No report() phase
  - [x] Used analyzePushAction helper instead of sharedData
  - [x] No actual world mutations (just event generation)

## Phase 2: Design Specification
- [x] Define PushingSharedData interface
- [x] Plan execute() - toggle switchable state, store data
- [x] Plan report() - generate events from sharedData

## Phase 3: Implementation
- [x] Create PushingSharedData interface
- [x] Add getPushingSharedData() helper
- [x] Refactor execute() to return void
- [x] Add SwitchableBehavior.toggle() for buttons
- [x] Move event generation to report()
- [x] Store all needed data in sharedData
- [x] Update tests to use three-phase pattern
- [x] Fix test expectations for message IDs
- [x] All 21 tests pass

## Phase 4: Review
- [x] Correct three-phase pattern (validate/execute/report)
- [x] execute() returns void
- [x] report() generates all events
- [x] Uses sharedData correctly (no context pollution)
- [x] World mutations in execute() (SwitchableBehavior.toggle)
- [x] All tests passing

## Changes Made
- `packages/stdlib/src/actions/standard/pushing/pushing.ts` - Full refactor
- `packages/stdlib/tests/unit/actions/pushing-golden.test.ts` - Updated helper and tests

## Notes
- Pushing has three modes: button, heavy, moveable
- Button mode can toggle switchable devices
- Heavy mode nudges without direction, moves with direction
- Moveable mode can reveal passages
- Uses SwitchableBehavior.toggle() for actual world mutation
