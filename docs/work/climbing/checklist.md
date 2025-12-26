# Climbing Action - Three-Phase Refactoring Checklist

## Status: Complete

## Phase 1: Pre-Refactor Analysis
- [x] Review current implementation
- [x] Identify issues:
  - [x] execute() returned ISemanticEvent[] instead of void
  - [x] No report() phase
  - [x] execute() called validate() again (redundant)
  - [x] No sharedData usage - used local variables
  - [x] All event generation in execute instead of report

## Phase 2: Design Specification
- [x] Define ClimbingSharedData interface
- [x] Plan execute() - minimal, just world mutations + store in sharedData
- [x] Plan report() - all event generation from sharedData

## Phase 3: Implementation
- [x] Create ClimbingSharedData interface with:
  - mode: 'directional' | 'object'
  - direction?: string
  - targetId?: string
  - targetName?: string
  - destinationId?: string
  - fromLocationId?: string
- [x] Add getClimbingSharedData() helper
- [x] Refactor execute() to return void
- [x] Move event generation to report()
- [x] Store all needed data in sharedData
- [x] Update tests to use three-phase pattern
- [x] All 17 tests pass

## Phase 4: Review
- [x] Correct three-phase pattern (validate/execute/report)
- [x] execute() returns void
- [x] report() generates all events
- [x] Uses sharedData correctly (no context pollution)
- [x] World mutations only in execute()
- [x] All tests passing

## Changes Made
- `packages/stdlib/src/actions/standard/climbing/climbing.ts` - Full refactor
- `packages/stdlib/tests/unit/actions/climbing-golden.test.ts` - Updated helper

## Notes
- Climbing has two modes: directional (climb up/down) and object (climb tree)
- Directional climbing moves player to another room via exits
- Object climbing moves player onto the target entity
- Both modes use world.moveEntity() in execute phase
