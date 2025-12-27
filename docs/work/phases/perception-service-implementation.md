# Implementation Plan: ADR-069 PerceptionService

**ADR**: docs/architecture/adrs/adr-069-perception-event-filtering.md
**Status**: Ready to implement
**Branch**: phase4

## Overview

Implement a PerceptionService that filters semantic events based on what the player can perceive. This fixes the going-into-dark-room bug and establishes the pattern for blindness, deafness, etc.

## Phase 1: Core Interface

### 1.1 Define IPerceptionService in @sharpee/core

- [ ] Create `packages/core/src/services/IPerceptionService.ts`
- [ ] Define interface:
  ```typescript
  interface IPerceptionService {
    filterEvents(events: ISemanticEvent[], actor: IFEntity, world: WorldModel): ISemanticEvent[];
    canPerceive(actor: IFEntity, location: IFEntity, world: WorldModel, sense: Sense): boolean;
  }
  type Sense = 'sight' | 'hearing' | 'smell' | 'touch';
  ```
- [ ] Export from core package index

### 1.2 Create PerceptionService in @sharpee/stdlib

- [ ] Create `packages/stdlib/src/services/PerceptionService.ts`
- [ ] Implement `canSeeVisually(actor, location, world)`:
  - Check actor blind trait
  - Check if wearing blindfold
  - Delegate to `VisibilityBehavior.isDark()` for environment
- [ ] Implement `filterEvents()`:
  - Find `if.event.room.description` events
  - If `!canSeeVisually()`, replace with `if.event.room.dark`
  - Pass through all other events unchanged
- [ ] Export from stdlib package index
- [ ] Add unit tests

## Phase 2: Engine Integration

### 2.1 Add perceptionService to GameEngineConfig

- [ ] Update `GameEngineConfig` interface in engine
- [ ] Add optional `perceptionService?: IPerceptionService`
- [ ] Store in GameEngine instance

### 2.2 Integrate into turn processing

- [ ] Find where events are returned from action execution
- [ ] If perceptionService configured, call `filterEvents()` before returning
- [ ] Pass-through if no service (engine stays generic)

### 2.3 Wire up in story initialization

- [ ] Update Cloak of Darkness to instantiate and provide PerceptionService
- [ ] Verify events are being filtered

## Phase 3: Clean Up Going Action

### 3.1 Simplify going.report()

- [ ] Keep room description emission in going (PerceptionService will filter it)
- [ ] OR remove and let engine trigger look (decide based on testing)
- [ ] Remove any darkness checks from going (no longer needed)

### 3.2 Verify looking action

- [ ] Confirm looking emits `if.event.room.description`
- [ ] PerceptionService should filter it the same way
- [ ] Remove redundant darkness handling if duplicated

## Phase 4: Validation

### 4.1 Cloak of Darkness tests

- [ ] Run losing path - darkness should suppress room description on entry
- [ ] Run winning path - lit room should show full description
- [ ] Verify "blundering around" message still appears (from event handler)

### 4.2 Looking action tests

- [ ] `look` in dark room → "It's pitch dark..."
- [ ] `look` in lit room → full description

### 4.3 Edge cases

- [ ] Multiple movements in one turn
- [ ] VERBOSE mode on other actions
- [ ] NPC movement (should not filter - they're not the player)

## Files to Create/Modify

**Create:**
- `packages/core/src/services/IPerceptionService.ts`
- `packages/stdlib/src/services/PerceptionService.ts`
- `packages/stdlib/tests/unit/services/perception-service.test.ts`

**Modify:**
- `packages/core/src/index.ts` (export interface)
- `packages/stdlib/src/index.ts` (export service)
- `packages/engine/src/GameEngine.ts` (add service integration)
- `packages/engine/src/types.ts` or config (add to config)
- `stories/cloak-of-darkness/src/index.ts` (wire up service)
- `packages/stdlib/src/actions/standard/going/going.ts` (possibly simplify)

## Dependencies

- ADR-068 (VisibilityBehavior.isDark) - DONE
- Engine turn processing understood - need to review

## Open Questions Resolved

1. **Room description source**: Any action can emit, PerceptionService filters uniformly
2. **Stacking effects**: Author responsibility, we handle core cases
3. **Partial perception**: Future enhancement, not blocking

## Success Criteria

1. Entering dark bar with cloak does NOT show room description
2. Entering dark bar with cloak DOES show darkness message
3. Entering lit bar shows full description
4. All existing looking tests pass
5. No regression in Cloak of Darkness winning path
