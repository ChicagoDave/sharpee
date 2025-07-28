import { describe, beforeEach, test, expect } from '@jest/globals';
import { WorldModel, IFEntity, TraitType } from '@sharpee/world-model';
import { sleepingAction } from '@sharpee/stdlib';
import { createRealTestContext, createCommand } from '../test-utils';

describe('Sleeping Action', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;

  beforeEach(() => {
    // Create real world model
    world = new WorldModel();
    
    // Create room
    room = world.createEntity('Test Room', 'room');
    room.add({ type: TraitType.ROOM });
    
    // Create player 
    player = world.createEntity('yourself', 'actor');
    player.add({ type: TraitType.ACTOR });
    player.add({ type: TraitType.CONTAINER });
    
    // Set up basic relationships
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Basic Sleeping', () => {
    test('should allow sleeping in normal room', () => {
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events).toHaveLength(2); // SLEPT event + success message
      expect(events[0].type).toBe('if.event.slept');
      expect(events[0].data.turnsPassed).toBe(1);
      expect(events[1].type).toBe('action.success');
    });

    test('should prevent sleeping in dangerous location', () => {
      // Add dangerous trait to room
      room.add({ 
        type: 'if.trait.dangerous' as TraitType
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events).toHaveLength(1); // Just failure message
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.messageId).toBe('too_dangerous_to_sleep');
    });

    test('should prevent sleeping in no-sleep location', () => {
      // Add no-sleep trait to room
      room.add({ 
        type: 'if.trait.no_sleep' as TraitType
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events).toHaveLength(1); // Just failure message
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.messageId).toBe('cant_sleep_here');
    });
  });

  describe('Sleep Quality', () => {
    test('should provide deep sleep in bed', () => {
      // Create a bed in the room
      const bed = world.createEntity('comfortable bed', 'object');
      bed.add({ 
        type: TraitType.SUPPORTER
      });
      bed.add({ 
        type: 'if.trait.comfortable' as TraitType
      });
      world.moveEntity(bed.id, room.id);
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe('if.event.slept');
      expect(events[0].data.comfortable).toBe(true);
      expect(events[0].data.turnsPassed).toBe(3); // Deep sleep passes more time
      expect(events[1].data.messageId).toBe('deep_sleep');
    });

    test('should provide deep sleep in comfortable location', () => {
      // Make room comfortable
      room.add({ 
        type: 'if.trait.comfortable' as TraitType
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events[0].data.comfortable).toBe(true);
      expect(events[1].data.messageId).toBe('deep_sleep');
    });

    test('should wake refreshed from comfortable sleep', () => {
      // Make room comfortable
      room.add({ 
        type: TraitType.ROOM,
        isComfortable: true 
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      // Should have SLEPT event + deep_sleep message + woke_refreshed message
      expect(events.length).toBe(3);
      expect(events[2].data.messageId).toBe('woke_refreshed');
    });
  });

  describe('Player State', () => {
    test('should prevent sleeping when well-rested', () => {
      // Set player state data on the player actor trait
      player.add({ 
        type: TraitType.ACTOR,
        playerState: { wellRested: true }
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect(events[0].data.messageId).toBe('already_well_rested');
    });

    test('should fall asleep quickly when exhausted', () => {
      // Set player state data on the player actor trait
      player.add({ 
        type: TraitType.ACTOR,
        playerState: { exhausted: true }
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events[0].data.exhausted).toBe(true);
      expect(events[0].data.turnsPassed).toBe(2);
      expect(events[1].data.messageId).toBe('fell_asleep');
    });

    test('should doze off when tired', () => {
      // Set player state data on the player actor trait
      player.add({ 
        type: TraitType.ACTOR,
        playerState: { tired: true }
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events[1].data.messageId).toBe('dozed_off');
    });

    test('should take brief nap when not tired', () => {
      // Set player state data (empty = not tired)
      player.add({ 
        type: TraitType.ACTOR,
        playerState: {}
      });
      
      const command = createCommand('if.action.sleeping');
      const context = createRealTestContext(sleepingAction, world, command);
      
      const events = sleepingAction.execute(context);
      
      expect(events[1].data.messageId).toBe('brief_nap');
    });
  });

  describe('Required Messages', () => {
    test('should have all required message IDs', () => {
      expect(sleepingAction.requiredMessages).toContain('slept');
      expect(sleepingAction.requiredMessages).toContain('dozed_off');
      expect(sleepingAction.requiredMessages).toContain('fell_asleep');
      expect(sleepingAction.requiredMessages).toContain('brief_nap');
      expect(sleepingAction.requiredMessages).toContain('deep_sleep');
      expect(sleepingAction.requiredMessages).toContain('slept_fitfully');
      expect(sleepingAction.requiredMessages).toContain('cant_sleep_here');
      expect(sleepingAction.requiredMessages).toContain('too_dangerous_to_sleep');
      expect(sleepingAction.requiredMessages).toContain('already_well_rested');
      expect(sleepingAction.requiredMessages).toContain('woke_refreshed');
      expect(sleepingAction.requiredMessages).toContain('disturbed_sleep');
      expect(sleepingAction.requiredMessages).toContain('nightmares');
      expect(sleepingAction.requiredMessages).toContain('peaceful_sleep');
    });
  });

  describe('Action Properties', () => {
    test('should have correct action ID', () => {
      expect(sleepingAction.id).toBe('if.action.sleeping');
    });

    test('should be in meta group', () => {
      expect(sleepingAction.group).toBe('meta');
    });
  });
});
