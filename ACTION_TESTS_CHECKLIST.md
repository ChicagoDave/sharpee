# Action Tests Checklist - stdlib Package

## Overview
Total actions to test: 46
Currently tested: 39 (85%) ✅ EXCEEDED 80% TARGET!
Remaining: 7

## Testing Guidelines
Each action should have a golden test following the pattern established in:
- `closing-golden.test.ts`
- `waiting-golden.test.ts`

### Test Structure Template
```typescript
describe('actionName (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {});
    test('should declare required messages', () => {});
    test('should belong to correct group', () => {});
  });

  describe('Precondition Checks', () => {
    // Test each failure condition
  });

  describe('Successful Execution', () => {
    // Test successful cases
  });

  describe('Event Structure', () => {
    // Verify event format
  });
});
```

## Actions Checklist

### ✅ Completed (39/46)
- [x] closing.ts - `closing-golden.test.ts`
- [x] waiting.ts - `waiting-golden.test.ts`
- [x] taking.ts - `taking-golden.test.ts`
- [x] dropping.ts - `dropping-golden.test.ts`
- [x] examining.ts - `examining-golden.test.ts`
- [x] opening.ts - `opening-golden.test.ts`
- [x] locking.ts - `locking-golden.test.ts`
- [x] unlocking.ts - `unlocking-golden.test.ts`
- [x] inserting.ts - `inserting-golden.test.ts`
- [x] removing.ts - `removing-golden.test.ts`
- [x] putting.ts - `putting-golden.test.ts`
- [x] giving.ts - `giving-golden.test.ts`
- [x] showing.ts - `showing-golden.test.ts`
- [x] going.ts - `going-golden.test.ts`
- [x] entering.ts - `entering-golden.test.ts`
- [x] exiting.ts - `exiting-golden.test.ts`
- [x] climbing.ts - `climbing-golden.test.ts`
- [x] looking.ts - `looking-golden.test.ts`
- [x] wearing.ts - `wearing-golden.test.ts`
- [x] taking_off.ts - `taking_off-golden.test.ts`
- [x] eating.ts - `eating-golden.test.ts`
- [x] drinking.ts - `drinking-golden.test.ts`
- [x] touching.ts - `touching-golden.test.ts`
- [x] smelling.ts - `smelling-golden.test.ts`
- [x] listening.ts - `listening-golden.test.ts`
- [x] talking.ts - `talking-golden.test.ts`
- [x] asking.ts - `asking-golden.test.ts`
- [x] telling.ts - `telling-golden.test.ts`
- [x] answering.ts - `answering-golden.test.ts`
- [x] inventory.ts - `inventory-golden.test.ts`
- [x] searching.ts - `searching-golden.test.ts`
- [x] using.ts - `using-golden.test.ts`
- [x] switching_on.ts - `switching_on-golden.test.ts`
- [x] switching_off.ts - `switching_off-golden.test.ts`
- [x] attacking.ts - `attacking-golden.test.ts`
- [x] throwing.ts - `throwing-golden.test.ts`
- [x] pushing.ts - `pushing-golden.test.ts`
- [x] pulling.ts - `pulling-golden.test.ts`
- [x] turning.ts - `turning-golden.test.ts`

### ✅ Object Manipulation (11/11) - COMPLETE!
- [x] taking.ts - Test take/get/grab commands
- [x] dropping.ts - Test drop/put down commands  
- [x] examining.ts - Test examine/look at/x commands
- [x] opening.ts - Test opening containers/doors
- [x] locking.ts - Test locking with keys
- [x] unlocking.ts - Test unlocking with keys
- [x] inserting.ts - Test putting objects in containers
- [x] removing.ts - Test taking objects from containers
- [x] putting.ts - Test put X on/in/under Y
- [x] giving.ts - Test give X to Y
- [x] showing.ts - Test show X to Y

### ✅ Movement & Navigation (5/5) - COMPLETE!
- [x] going.ts - Test directional movement
- [x] entering.ts - Test enter vehicle/container
- [x] exiting.ts - Test exit/leave
- [x] climbing.ts - Test climb up/down
- [x] looking.ts - Test look/l command

### ✅ Character Actions (7/7) - COMPLETE!
- [x] wearing.ts - Test wear/put on clothing
- [x] taking_off.ts - Test remove/take off clothing
- [x] eating.ts - Test eat/consume
- [x] drinking.ts - Test drink
- [x] touching.ts - Test touch/feel
- [x] smelling.ts - Test smell/sniff
- [x] listening.ts - Test listen

### ✅ Communication (4/4) - COMPLETE!
- [x] talking.ts - Test talk to/speak to
- [x] asking.ts - Test ask X about Y
- [x] telling.ts - Test tell X about Y
- [x] answering.ts - Test answer X

### ✅ Combat & Physical (5/5) - COMPLETE!
- [x] attacking.ts - Test attack/hit/fight
- [x] throwing.ts - Test throw X at Y
- [x] pushing.ts - Test push/move
- [x] pulling.ts - Test pull/drag
- [x] turning.ts - Test turn X

### ✅ Device Interaction (3/3) - COMPLETE!
- [x] switching_on.ts - Test turn on/switch on
- [x] switching_off.ts - Test turn off/switch off
- [x] using.ts - Test use X on Y

### 📝 Information & Meta (1/7)
- [x] inventory.ts - Test inventory/i command
- [ ] scoring.ts - Test score/points display
- [ ] help.ts - Test help/? command
- [ ] about.ts - Test about/credits
- [ ] saving.ts - Test save game
- [ ] restoring.ts - Test restore/load game
- [ ] quitting.ts - Test quit/exit game

### ✅ Exploration (1/1) - COMPLETE!
- [x] searching.ts - Test search/look in

### ✅ Miscellaneous (2/2) - COMPLETE!
- [x] closing.ts - Close doors/containers
- [x] waiting.ts - Wait/z command

## Remaining Actions (7 total)

### Information & Meta (7 remaining)
1. scoring.ts - Score display system
2. help.ts - Help system
3. about.ts - Game information
4. saving.ts - Save game state
5. restoring.ts - Restore saved game
6. quitting.ts - Exit game

## Test Implementation Tips

1. **Use Test Utils**: Import from `test-utils.ts`
   ```typescript
   import { createEntity, createTestContext, expectEvent, TestData } from '../../test-utils';
   ```

2. **Mock World Setup**: Use TestData helpers
   ```typescript
   const { world, player, room } = TestData.basicSetup();
   const { world, player, room, object } = TestData.withObject('ball', 'red ball');
   ```

3. **Test Event Structure**: Verify semantic events
   ```typescript
   expectEvent(events, 'if.event.taken', {
     item: 'red ball',
     from: 'room1'
   });
   ```

4. **Test Message IDs**: Verify action declares required messages
   ```typescript
   expect(takingAction.requiredMessages).toContain('taken');
   expect(takingAction.requiredMessages).toContain('already_have');
   ```

5. **Test Preconditions**: Each action has specific failure cases
   - Not visible
   - Not reachable
   - Missing requirements (e.g., key for locking)
   - Invalid state (e.g., already open)

## Coverage Goals

- ✅ 50% coverage achieved (25/46 actions tested)
- ✅ 60% coverage achieved (29/46 actions tested)
- ✅ 70% coverage achieved (32/46 actions tested)
- ✅ 80% coverage achieved (37/46 actions tested)
- Current: 85% coverage - TARGET EXCEEDED! 🎉

## Recent Progress

### Session 7 - Physical Manipulation Actions COMPLETE!
- ✅ throwing.ts - Projectile mechanics with fragility, hit/miss, and NPC reactions
- ✅ pushing.ts - Button/switch activation, heavy object movement, hidden passages
- ✅ pulling.ts - Lever/cord mechanics, attached objects, bell ringing
- ✅ turning.ts - Rotational controls (dials, knobs, wheels, cranks, valves)

### Session 6 - Device & Combat Actions Progress
- ✅ switching_on.ts - Device activation with power/light handling
- ✅ switching_off.ts - Device deactivation with darkness detection
- ✅ attacking.ts - Combat system with fragility and NPC reactions

### Session 5 - High Priority Actions Progress
- ✅ answering.ts - NPC question response system with validation and timing
- ✅ inventory.ts - Observable inventory checking with weight/burden system
- ✅ searching.ts - Object and location searching with concealment detection
- ✅ using.ts - Generic object usage with type detection and delegation

### Session 4 - Character Actions Completed
- ✅ eating.ts - Comprehensive food/edible system with portions, taste, effects
- ✅ drinking.ts - Liquid consumption from items and containers
- ✅ touching.ts - Tactile interactions detecting temperature and texture
- ✅ smelling.ts - Olfactory detection of food, drinks, and burning objects
- ✅ listening.ts - Auditory detection of active devices and container sounds

## Next Steps

We've exceeded our 80% target! All core gameplay mechanics are now tested. The remaining 7 actions are all meta/information commands:
1. scoring.ts - Score display system
2. help.ts - Help system
3. about.ts - Game information
4. saving.ts - Save game state
5. restoring.ts - Restore saved game
6. quitting.ts - Exit game

The framework's core gameplay mechanics are now thoroughly tested with 39/46 actions complete!
