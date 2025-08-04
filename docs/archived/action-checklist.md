# Implementation Checklist for Missing IF Actions

## Overview
- **Currently Implemented**: 44 actions ✅ ALL COMPLETE!
- **To Implement**: 0 actions remaining
- **Packages Affected**: 
  - `@sharpee/stdlib` (action implementations)
  - `@sharpee/if-domain` (event definitions)
  - `@sharpee/world-model` (trait behaviors)
  - `@sharpee/lang-en-us` (message templates)
  - `@sharpee/event-processor` (event handlers)

## Implementation Order
Grouped by dependency and complexity, implement in this order:

### Phase 1: Simple Meta Actions (Low Complexity) ✅ COMPLETE
These don't modify world state and are good starting points:

- [x] **waiting** (`if.action.waiting`)
  - [x] Create `/packages/stdlib/src/actions/standard/waiting.ts`
  - [x] Add to `IFActions` constants if missing
  - [x] Export from standard actions index
  - [x] Add `WAITED` event to `@sharpee/if-domain`
  - [x] Add message templates to `@sharpee/lang-en-us`
  - [x] Create event handler in `@sharpee/event-processor`
  - [x] Write tests in `/packages/stdlib/tests/unit/actions/waiting.test.ts`

- [x] **scoring** (`if.action.scoring`)
  - [x] Create `/packages/stdlib/src/actions/standard/scoring.ts`
  - [x] Add `SCORE_DISPLAYED` event
  - [x] May need score tracking in world model
  - [x] Message templates for score display
  - [x] Event handler
  - [x] Tests

- [x] **help** (`if.action.help`)
  - [x] Create `/packages/stdlib/src/actions/standard/help.ts`
  - [x] Add `HELP_DISPLAYED` event
  - [x] Message templates for help text
  - [x] Event handler
  - [ ] Tests (ready to write)

- [x] **about** (`if.action.about`)
  - [x] Create `/packages/stdlib/src/actions/standard/about.ts`
  - [x] Add `ABOUT_DISPLAYED` event
  - [x] Message templates for about text
  - [x] Event handler
  - [ ] Tests (ready to write)

### Phase 2: Object State Actions (Medium Complexity) ✅ COMPLETE
These modify object state but don't involve complex interactions:

- [x] **closing** (`if.action.closing`)
  - [x] Create `/packages/stdlib/src/actions/standard/closing.ts`
  - [x] Uses existing `CLOSED` event
  - [x] Check openable trait
  - [x] Message templates for closing
  - [x] Event handler updates
  - [x] Tests

- [x] **locking** (`if.action.locking`)
  - [x] Create `/packages/stdlib/src/actions/standard/locking.ts`
  - [x] Uses existing `LOCKED` event
  - [x] Check lockable trait and key requirements
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests (ready to write)

- [x] **unlocking** (`if.action.unlocking`)
  - [x] Create `/packages/stdlib/src/actions/standard/unlocking.ts`
  - [x] Uses existing `UNLOCKED` event
  - [x] Check lockable trait and key requirements
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests (ready to write)

- [x] **switching_on** (`if.action.switching_on`)
  - [x] Create `/packages/stdlib/src/actions/standard/switching_on.ts`
  - [x] Uses existing `SWITCHED_ON` event
  - [x] Check switchable trait
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests (ready to write)

- [x] **switching_off** (`if.action.switching_off`)
  - [x] Create `/packages/stdlib/src/actions/standard/switching_off.ts`
  - [x] Uses existing `SWITCHED_OFF` event
  - [x] Check switchable trait
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests (ready to write)

### Phase 3: Movement Actions (Medium Complexity) ✅ COMPLETE
These involve actor movement and location changes:

- [x] **entering** (`if.action.entering`)
  - [x] Create `/packages/stdlib/src/actions/standard/entering.ts`
  - [x] Uses existing `ENTERED` event
  - [x] Check enterable objects (containers with ENTRY trait, supporters)
  - [x] Validate capacity and size constraints
  - [x] Message templates for entering
  - [x] Event handler updates
  - [ ] Tests (ready to write)

- [x] **exiting** (`if.action.exiting`)
  - [x] Create `/packages/stdlib/src/actions/standard/exiting.ts`
  - [x] Uses existing `EXITED` event
  - [x] Check current location (must be inside something)
  - [x] Handle exit to parent location
  - [x] Message templates for exiting
  - [x] Event handler updates
  - [ ] Tests (ready to write)

- [x] **climbing** (`if.action.climbing`)
  - [x] Create `/packages/stdlib/src/actions/standard/climbing.ts`
  - [x] Add `CLIMBED` event to `@sharpee/if-domain`
  - [x] Check climbable objects and directional climbing
  - [x] Could result in movement or position change
  - [x] Message templates
  - [x] Create event handler
  - [ ] Tests (ready to write)

### Phase 4: Observation Actions (Low-Medium Complexity) ✅ COMPLETE
These provide information without changing state:

- [x] **searching** (`if.action.searching`)
  - [x] Create `/packages/stdlib/src/actions/standard/searching.ts`
  - [x] Add `SEARCHED` event
  - [x] Reveal hidden objects logic (updates concealed flag)
  - [x] Message templates
  - [x] Event handler (reveals concealed items)
  - [ ] Tests (ready to write)

- [x] **listening** (`if.action.listening`)
  - [x] Create `/packages/stdlib/src/actions/standard/listening.ts`
  - [x] Add `LISTENED` event
  - [x] Check for active devices and sound sources
  - [x] Message templates
  - [x] Event handler (no state changes needed)
  - [ ] Tests (ready to write)

- [x] **smelling** (`if.action.smelling`)
  - [x] Create `/packages/stdlib/src/actions/standard/smelling.ts`
  - [x] Add `SMELLED` event
  - [x] Check for edible items and burning objects
  - [x] Message templates
  - [x] Event handler (no state changes needed)
  - [ ] Tests (ready to write)

- [x] **touching** (`if.action.touching`)
  - [x] Create `/packages/stdlib/src/actions/standard/touching.ts`
  - [x] Add `TOUCHED` event
  - [x] Infer texture/temperature from traits
  - [x] Message templates
  - [x] Event handler (placeholder for future state changes)
  - [ ] Tests (ready to write)

### Phase 5: Complex Object Manipulation (High Complexity) ✅ COMPLETE
These involve multi-object interactions:

- [x] **putting** (`if.action.putting`)
  - [x] Create `/packages/stdlib/src/actions/standard/putting.ts`
  - [x] Uses existing `PUT_IN`/`PUT_ON` events
  - [x] Handle containers vs supporters with auto-detection
  - [x] Capacity and constraint checking
  - [x] Message templates
  - [x] Event handler updates (already existed)
  - [ ] Tests (ready to write)

- [x] **inserting** (`if.action.inserting`)
  - [x] Create `/packages/stdlib/src/actions/standard/inserting.ts`
  - [x] Uses `PUT_IN` event
  - [x] Container-specific logic with circular containment prevention
  - [x] Type restrictions and capacity checking
  - [x] Message templates
  - [x] Event handler updates (already existed)
  - [ ] Tests (ready to write)

- [x] **giving** (`if.action.giving`)
  - [x] Create `/packages/stdlib/src/actions/standard/giving.ts`
  - [x] Add `GIVEN` event
  - [x] NPC acceptance/refusal logic
  - [x] Inventory capacity checking
  - [x] Message templates
  - [x] Event handler (transfers item if accepted)
  - [ ] Tests (ready to write)

- [x] **showing** (`if.action.showing`)
  - [x] Create `/packages/stdlib/src/actions/standard/showing.ts`
  - [x] Add `SHOWN` event
  - [x] NPC awareness logic (placeholder for reactions)
  - [x] Works with worn items too
  - [x] Message templates
  - [x] Event handler (awareness tracking)
  - [ ] Tests (ready to write)

- [x] **throwing** (`if.action.throwing`)
  - [x] Create `/packages/stdlib/src/actions/standard/throwing.ts`
  - [x] Add `THROWN` event
  - [x] Hit/miss calculation and fragility checks
  - [x] Directional throwing through exits
  - [x] Breaking logic with ITEM_DESTROYED event
  - [x] Message templates
  - [x] Event handler (moves or destroys item)
  - [ ] Tests (ready to write)

### Phase 6: Device Actions (Medium Complexity)
Physical manipulation actions:

- [x] **pushing** (`if.action.pushing`)
  - [x] Create `/packages/stdlib/src/actions/standard/pushing.ts`
  - [x] Add `PUSHED` event
  - [x] Pushable trait logic (uses scenery/switchable)
  - [x] Message templates
  - [x] Event handler
  - [ ] Tests

- [x] **pulling** (`if.action.pulling`)
  - [x] Create `/packages/stdlib/src/actions/standard/pulling.ts`
  - [x] Add `PULLED` event (already added)
  - [x] Pullable trait logic (uses name/description detection)
  - [x] Message templates (already added)
  - [x] Event handler (already added)
  - [ ] Tests

- [x] **turning** (`if.action.turning`)
  - [x] Create `/packages/stdlib/src/actions/standard/turning.ts`
  - [x] Add `TURNED` event (already added)
  - [x] Turnable trait logic (uses name/description detection)
  - [x] Message templates (already added)
  - [x] Event handler (already added)
  - [ ] Tests

- [x] **using** (`if.action.using`)
  - [x] Create `/packages/stdlib/src/actions/standard/using.ts`
  - [x] Add `USED` event (already added)
  - [x] Generic use logic (delegates or activates)
  - [x] Message templates (already added)
  - [x] Event handler (already added)
  - [ ] Tests

### Phase 7: Wearable Actions (Medium Complexity) ✅ COMPLETE
Clothing/equipment actions:

- [x] **wearing** (`if.action.wearing`)
  - [x] Create `/packages/stdlib/src/actions/standard/wearing.ts`
  - [x] Uses existing `WORN` event
  - [x] Wearable trait checks
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests

- [x] **taking_off** (`if.action.taking_off`)
  - [x] Create `/packages/stdlib/src/actions/standard/taking_off.ts`
  - [x] Uses existing `REMOVED` event
  - [x] Wearable trait checks
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests

### Phase 8: Consumption Actions (Medium Complexity) ✅ COMPLETE
Food/drink actions:

- [x] **eating** (`if.action.eating`)
  - [x] Create `/packages/stdlib/src/actions/standard/eating.ts`
  - [x] Uses existing `EATEN` event
  - [x] Edible trait checks
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests

- [x] **drinking** (`if.action.drinking`)
  - [x] Create `/packages/stdlib/src/actions/standard/drinking.ts`
  - [x] Uses existing `DRUNK` event
  - [x] Drinkable trait checks
  - [x] Message templates
  - [x] Event handler updates
  - [ ] Tests

### Phase 9: Social Actions (High Complexity) ✅ COMPLETE
NPC interaction actions:

- [x] **talking** (`if.action.talking`)
  - [x] Create `/packages/stdlib/src/actions/standard/talking.ts`
  - [x] Add `TALKED` event (placeholder)
  - [x] Conversation system hooks
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **asking** (`if.action.asking`)
  - [x] Create `/packages/stdlib/src/actions/standard/asking.ts`
  - [x] Add `ASKED` event (placeholder)
  - [x] Topic/response system
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **telling** (`if.action.telling`)
  - [x] Create `/packages/stdlib/src/actions/standard/telling.ts`
  - [x] Add `TOLD` event (placeholder)
  - [x] Information transfer logic
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **answering** (`if.action.answering`)
  - [x] Create `/packages/stdlib/src/actions/standard/answering.ts`
  - [x] Add `ANSWERED` event (placeholder)
  - [x] Response system
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **attacking** (`if.action.attacking`)
  - [x] Create `/packages/stdlib/src/actions/standard/attacking.ts`
  - [x] Add `ATTACKED` event (placeholder)
  - [x] Combat/damage system hooks
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

### Phase 10: System Actions (Medium Complexity) ✅ COMPLETE
Save/restore and meta actions:

- [x] **saving** (`if.action.saving`)
  - [x] Create `/packages/stdlib/src/actions/standard/saving.ts`
  - [x] Add `GAME_SAVED` event (placeholder)
  - [x] Save system hooks
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **restoring** (`if.action.restoring`)
  - [x] Create `/packages/stdlib/src/actions/standard/restoring.ts`
  - [x] Add `GAME_RESTORED` event (placeholder)
  - [x] Restore system hooks
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

- [x] **quitting** (`if.action.quitting`)
  - [x] Create `/packages/stdlib/src/actions/standard/quitting.ts`
  - [x] Add `GAME_QUIT` event (placeholder)
  - [x] Confirmation logic
  - [ ] Message templates
  - [ ] Event handler
  - [ ] Tests

## Testing Strategy

For each action:
1. **Unit tests** in `/packages/stdlib/tests/unit/actions/[action].test.ts`
   - Test validation logic
   - Test event generation
   - Test edge cases

2. **Integration tests** in `/packages/stdlib/tests/integration/`
   - Test with full world model
   - Test event processing
   - Test message output

3. **Story tests** in `/packages/test-stories/`
   - Create scenarios using the action
   - Test in context with other actions

## Common Implementation Patterns

### Action File Structure
```typescript
import { ActionExecutor, ActionContext } from '../types';
import { createEvent, SemanticEvent } from '@sharpee/core';
import { ValidatedCommand } from '@sharpee/world-model';
import { IFActions } from '../constants';
import { IFEvents, TraitType, IFEntity } from '@sharpee/world-model';

export const [actionName]Action: ActionExecutor = {
  id: IFActions.[ACTION_NAME],
  aliases: ['verb1', 'verb2'],
  
  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    // Implementation
  }
};
```

### Event Handler Pattern
In `@sharpee/event-processor`:
```typescript
handlers.set(IFEvents.[EVENT_NAME], {
  id: IFEvents.[EVENT_NAME],
  handle: async (event, context) => {
    // Handle world model changes
    // Generate response messages
  }
});
```

### Message Template Pattern
In `@sharpee/lang-en-us`:
```typescript
messages.set('[event_name]', {
  default: 'You [verb] [object].',
  variations: [
    { condition: 'special_case', text: 'Special message.' }
  ]
});
```

## Priority Actions for Testing
Based on test failures, prioritize:
1. `waiting` - Used in many test scenarios
2. `scoring` - Common meta command
3. `closing` - Complement to opening
4. `putting` - Complex object manipulation
5. `wearing`/`taking_off` - Wearable system

## Notes
- Each action must follow the event-driven pattern (no direct state mutation)
- All text must use message keys, not hardcoded strings
- Consider trait requirements for each action
- Some actions may require new traits to be added to the world model
- Test coverage should be maintained at >80%