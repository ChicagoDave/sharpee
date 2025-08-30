# Pre-Refactor Design Specification

## Action: taking
## Date: 2025-08-29
## Author: Claude

---

## Current State Analysis

### Implementation Pattern
**Current Pattern**: Three-phase (validate/execute/report)

**Current Structure**:
```typescript
validate(context: ActionContext): ValidationResult
execute(context: ActionContext): void  
report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[]
```

### Problems Identified

#### IF Code Smells
1. **Direct world mutation**: Uses `world.moveEntity()` directly instead of behavior pattern
2. **Context pollution**: Stores `_previousLocation` and `_implicitlyRemoved` on context object
3. **Complex validation logic**: Should delegate more to behaviors

#### Pattern Violations
1. Execute method modifies context object directly (adding private properties)
2. Not using behavior patterns consistently for all operations
3. Report method checks post-conditions that should be unnecessary

#### Missing Features
1. No visibility checks (can take items in darkness)
2. No locked container checks (can take from locked containers)  
3. No checks for taking from other actors (except worn items)

### Current Dependencies

#### Required Traits
- ActorTrait (on the actor doing the taking)

#### Optional Traits
- SceneryTrait - prevents taking if present
- RoomTrait - prevents taking if present
- WearableTrait - triggers implicit removal if worn
- ContainerTrait - affects capacity checks

#### Behavior Dependencies
- SceneryBehavior.getCantTakeMessage() - custom error messages
- ActorBehavior.canTakeItem() - capacity validation (but not actual taking!)
- WearableBehavior.remove() - implicit removal of worn items
- world.moveEntity() - actual movement (NOT a behavior)

#### Event Dependencies
- 'if.event.removed' - when implicitly removing worn item
- 'if.event.taken' - main success event with extensive data
- 'action.success' - with 'taken' or 'taken_from' message
- 'action.error' - various error conditions

---

## Target State Design

### Three-Phase Implementation

#### Phase 1: Validation
```typescript
validate(context: ActionContext): ValidationResult {
  const actor = context.player;
  const item = context.command.directObject?.entity;
  
  // Basic checks
  if (!item) return { valid: false, error: 'no_target' };
  if (item.id === actor.id) return { valid: false, error: 'cant_take_self' };
  
  // Use behaviors for validation
  if (item.has(TraitType.SCENERY)) {
    const message = SceneryBehavior.getCantTakeMessage(item);
    return { valid: false, error: message || 'fixed_in_place' };
  }
  
  if (item.has(TraitType.ROOM)) {
    return { valid: false, error: 'cant_take_room' };
  }
  
  // Check if already held
  if (context.world.getLocation(item.id) === actor.id) {
    return { valid: false, error: 'already_have' };
  }
  
  // Visibility check (NEW)
  if (!context.scope.canSee(actor, item)) {
    return { valid: false, error: 'cant_see_that' };
  }
  
  // Container checks (NEW)
  const container = context.world.getEntity(context.world.getLocation(item.id));
  if (container?.has(TraitType.CONTAINER)) {
    if (!container.container.open && container.container.transparent !== true) {
      return { valid: false, error: 'container_closed' };
    }
    if (container.has(TraitType.LOCKABLE) && container.lockable.locked) {
      return { valid: false, error: 'container_locked' };
    }
  }
  
  // Capacity check
  if (!ActorBehavior.canTakeItem(actor, item, context.world)) {
    return { valid: false, error: 'container_full' };
  }
  
  return { valid: true };
}
```

#### Phase 2: Execution
```typescript
execute(context: ActionContext): void {
  const actor = context.player;
  const item = context.command.directObject!.entity!;
  
  // Handle worn items - delegate to behavior
  if (item.has(TraitType.WEARABLE) && item.wearable.worn) {
    const wearer = context.world.getEntity(context.world.getLocation(item.id));
    if (wearer) {
      WearableBehavior.remove(item, wearer);
    }
  }
  
  // Perform the actual move using world method
  // This is correct - moveEntity handles spatial index updates
  context.world.moveEntity(item.id, actor.id);
  
  // NO context pollution - witness system tracks the change
}
```

#### Phase 3: Events
```typescript
report(context: ActionContext): ISemanticEvent[] {
  const actor = context.player;
  const item = context.command.directObject!.entity!;
  
  // Build event data using witness system or world state
  const currentLocation = context.world.getLocation(item.id);
  
  // Verify success (defensive check)
  if (currentLocation !== actor.id) {
    return [context.event('action.error', {
      actionId: context.action.id,
      error: 'take_failed'
    })];
  }
  
  // Use data builder for event data
  const takenData = buildEventData(takenDataConfig, context);
  
  // Return success events
  return [
    context.event('if.event.taken', takenData),
    context.event('action.success', {
      actionId: context.action.id,
      messageId: takenData.fromContainer ? 'taken_from' : 'taken',
      params: takenData
    })
  ];
}
```

### Trait Requirements

#### Required Traits
| Trait | Purpose | Validation | Used In |
|-------|---------|-----------|---------|
| ActorTrait | Actor must be able to hold items | Required on actor | Validation |

#### Optional Traits
| Trait | Purpose | Validation | Used In |
|-------|---------|-----------|---------|
| SceneryTrait | Marks item as fixed | Prevents taking | Validation |
| RoomTrait | Rooms can't be taken | Prevents taking | Validation |
| WearableTrait | May need removal first | Checked for worn state | Execution |
| ContainerTrait | Affects capacity/access | Checked for closed/locked | Validation |
| LockableTrait | Prevents access | Checked if locked | Validation |

### Behavior Integration

#### Required Behaviors
| Behavior | Purpose | When Checked | Customization |
|----------|---------|-------------|---------------|
| ActorBehavior | Capacity validation | Validation | Via capacity limits |
| SceneryBehavior | Custom error messages | Validation | Via cantTakeMessage |

#### Optional Behaviors
| Behavior | Purpose | When Checked | Customization |
|----------|---------|-------------|---------------|
| WearableBehavior | Remove worn items | Execution | Via worn flag |
| ContainerBehavior | Check accessibility | Validation | Via open/locked state |

---

## Event System Design

### Event Data Structure
```typescript
interface TakenEventData {
  itemSnapshot?: EntitySnapshot;
  actorSnapshot?: EntitySnapshot;
  item: string; // backward compatibility
  fromLocation?: EntityId;
  container?: string;
  fromContainer?: boolean;
  fromSupporter?: boolean;
}
```

### Event Hooks

#### Pre-Execution Hooks
- None currently (could add 'before.taking')

#### Post-Execution Hooks
- 'if.event.taken' - Main success event
- 'action.success' - Generic success with message

### Extensibility Points
1. Custom error messages via SceneryBehavior
2. Event handlers can intercept 'if.event.taken'
3. Capacity limits via ActorTrait configuration

---

## Error Handling

### Validation Errors
| Condition | Error Message | Recovery |
|-----------|--------------|----------|
| No target | no_target | Prompt for object |
| Taking self | cant_take_self | None |
| Already held | already_have | None |
| Is room | cant_take_room | None |
| Is scenery | fixed_in_place | None |
| Container closed | container_closed | Open first |
| Container locked | container_locked | Unlock first |
| Inventory full | container_full | Drop something |
| Can't see | cant_see_that | Get light/move closer |

### Runtime Errors
| Condition | Error Message | Recovery |
|-----------|--------------|----------|
| Move failed | take_failed | Check world state |

### Edge Cases
1. Taking worn items from self (should work)
2. Taking from nested containers (check visibility)
3. Taking from other actors (future feature)

---

## Test Strategy

### Unit Tests
- [X] Validation tests exist
- [X] Basic execution tests exist
- [ ] Need visibility tests
- [ ] Need locked container tests

### Integration Tests
- [X] Parser integration tested
- [ ] Story integration needs testing
- [ ] Extension integration needs testing

### Test Scenarios
1. **Basic Success Case**:
   - Setup: Item in room with actor
   - Action: Take item
   - Expected: Item in actor's inventory

2. **Container Edge Case**:
   - Setup: Item in locked container
   - Action: Try to take item
   - Expected: Error about locked container

3. **Visibility Case**:
   - Setup: Item in dark room
   - Action: Try to take item
   - Expected: Error about not seeing it

---

## Migration Strategy

### Breaking Changes
None - maintaining backward compatibility

### Backward Compatibility
1. Keep 'item' field in event data
2. Support both 'taken' and 'taken_from' messages
3. Don't change event structure

### Migration Path
1. Remove context pollution (use witness system)
2. Add visibility checks
3. Add container accessibility checks
4. Improve error messages

---

## Implementation Checklist

### Code Changes
- [ ] Remove _previousLocation from context
- [ ] Remove _implicitlyRemoved from context
- [ ] Add visibility checks
- [ ] Add container locked checks
- [ ] Use witness system for tracking changes

### Testing
- [ ] Add visibility tests
- [ ] Add locked container tests
- [ ] Verify witness system integration
- [ ] Test backward compatibility

### Documentation
- [ ] Document visibility requirement
- [ ] Document container accessibility
- [ ] Update event documentation
- [ ] Add examples

---

## Risks and Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Witness system not tracking | High | Verify witness records changes |
| Breaking event handlers | High | Maintain exact event structure |

### Compatibility Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Stories expect context properties | Medium | Check story usage first |
| Extensions depend on behavior | Low | Document changes clearly |

---

## Acceptance Criteria

1. [X] Three-phase pattern fully implemented
2. [ ] No context pollution
3. [ ] Visibility checks working
4. [ ] Container accessibility checks working
5. [ ] All existing tests passing
6. [ ] New tests for missing features
7. [ ] Event data backward compatible
8. [ ] Witness system tracking changes

---

## Notes

### Design Decisions
- Keep using world.moveEntity() - it's the correct abstraction for spatial changes
- Use witness system instead of context pollution for tracking state
- Add visibility and container checks for better IF compliance

### Open Questions
- Should we auto-open containers when taking? (No - explicit is better)
- Should we support taking from other actors? (Future feature)
- How does witness system handle implicit removal? (Need to verify)

### References
- Witness system: `/packages/stdlib/src/scope/witness-system.ts`
- World model: `/packages/world-model/src/world/WorldModel.ts`
- Actor behavior: `/packages/world-model/src/traits/actor/actorBehavior.ts`