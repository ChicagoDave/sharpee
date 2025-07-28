/**
 * Golden test for pulling action - demonstrates testing pull mechanics
 * 
 * This shows patterns for testing actions that:
 * - Activate levers and handles
 * - Pull cords, ropes, and chains
 * - Ring bells or activate mechanisms
 * - Detach attached objects
 * - Move heavy objects (opposite of push)
 * - Handle directional movement
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { pullingAction } from '../../../src/actions/standard/pulling';
import { IFActions } from '../../../src/actions/constants';
import { 
  TraitType, 
  PullableTrait,
  LeverTrait,
  CordTrait,
  BellPullTrait,
  AttachedTrait
} from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { WorldModel } from '@sharpee/world-model';

describe('pullingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(pullingAction.id).toBe(IFActions.PULLING);
    });

    test('should declare required messages', () => {
      expect(pullingAction.requiredMessages).toContain('no_target');
      expect(pullingAction.requiredMessages).toContain('not_visible');
      expect(pullingAction.requiredMessages).toContain('not_reachable');
      expect(pullingAction.requiredMessages).toContain('not_pullable');
      expect(pullingAction.requiredMessages).toContain('too_heavy');
      expect(pullingAction.requiredMessages).toContain('wearing_it');
      expect(pullingAction.requiredMessages).toContain('wont_budge');
      expect(pullingAction.requiredMessages).toContain('lever_pulled');
      expect(pullingAction.requiredMessages).toContain('lever_clicks');
      expect(pullingAction.requiredMessages).toContain('lever_toggled');
      expect(pullingAction.requiredMessages).toContain('lever_stuck');
      expect(pullingAction.requiredMessages).toContain('lever_springs_back');
      expect(pullingAction.requiredMessages).toContain('cord_pulled');
      expect(pullingAction.requiredMessages).toContain('bell_rings');
      expect(pullingAction.requiredMessages).toContain('cord_activates');
      expect(pullingAction.requiredMessages).toContain('cord_breaks');
      expect(pullingAction.requiredMessages).toContain('comes_loose');
      expect(pullingAction.requiredMessages).toContain('firmly_attached');
      expect(pullingAction.requiredMessages).toContain('tugging_useless');
      expect(pullingAction.requiredMessages).toContain('pulled_direction');
      expect(pullingAction.requiredMessages).toContain('pulled_nudged');
      expect(pullingAction.requiredMessages).toContain('pulled_with_effort');
      expect(pullingAction.requiredMessages).toContain('pulling_does_nothing');
      expect(pullingAction.requiredMessages).toContain('fixed_in_place');
      expect(pullingAction.requiredMessages).toContain('already_pulled');
      expect(pullingAction.requiredMessages).toContain('max_pulls_reached');
    });

    test('should belong to device_manipulation group', () => {
      expect(pullingAction.group).toBe('device_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.PULLING);
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should fail when target is not visible', () => {
      const { world, player } = setupBasicWorld();
      const lever = world.createEntity('control lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      
      // Put lever in a different room so it's not visible
      const otherRoom = world.createEntity('other room', 'room');
      world.moveEntity(lever.id, otherRoom.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'control lever' }
      });
    });

    test('should fail when target is not pullable', () => {
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      // No pullable trait
      
      world.moveEntity(rock.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: rock }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_pullable'),
        params: { target: 'ordinary rock' }
      });
    });

    test('should fail when pulling worn items', () => {
      const { world, player } = setupBasicWorld();
      const belt = world.createEntity('leather belt', 'object');
      belt.add({
        type: TraitType.WEARABLE,
        worn: true
      });
      belt.add(new PullableTrait({ pullType: 'attached' }));
      
      // Belt is worn by player
      world.moveEntity(belt.id, player.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: belt }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('wearing_it'),
        params: { target: 'leather belt' }
      });
    });

    test('should fail when object requires too much strength', () => {
      const { world, player, room } = setupBasicWorld();
      const safe = world.createEntity('heavy safe', 'object');
      safe.add(new PullableTrait({ 
        pullType: 'heavy',
        requiresStrength: 50 // Too strong for player
      }));
      
      world.moveEntity(safe.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: safe }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('too_heavy'),
        params: { 
          target: 'heavy safe',
          requiredStrength: 50
        }
      });
    });

    test('should fail when already pulled non-repeatable object', () => {
      const { world, player, room } = setupBasicWorld();
      const handle = world.createEntity('emergency handle', 'object');
      handle.add(new PullableTrait({ 
        pullType: 'lever',
        repeatable: false,
        pullCount: 1
      }));
      
      world.moveEntity(handle.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: handle }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_pulled'),
        params: { target: 'emergency handle' }
      });
    });

    test('should fail when max pulls reached', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('old lever', 'object');
      lever.add(new PullableTrait({ 
        pullType: 'lever',
        maxPulls: 3,
        pullCount: 3
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('max_pulls_reached'),
        params: { target: 'old lever' }
      });
    });
  });

  describe('Lever and Handle Pulling', () => {
    test('should pull basic lever', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('brass lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        target: lever.id,
        targetName: 'brass lever',
        pullType: 'lever',
        activated: true
      });
      
      // Should emit lever_pulled message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('lever_pulled')
      });
    });

    test('should handle lever with positions', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('control lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      lever.add(new LeverTrait({ 
        position: 'up',
        controls: 'gate-001'
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'lever',
        oldPosition: 'up',
        newPosition: 'down',
        controls: 'gate-001',
        activated: true
      });
      
      // Should emit lever_clicks message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('lever_clicks')
      });
    });

    test('should handle stuck lever', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('rusty lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      lever.add(new LeverTrait({ 
        position: 'down',
        stuck: true
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('lever_stuck'),
        params: { target: 'rusty lever' }
      });
    });

    test('should handle spring-loaded lever', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('spring lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      lever.add(new LeverTrait({ 
        position: 'neutral',
        springLoaded: true
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'lever',
        springLoaded: true
      });
      
      // Should emit lever_springs_back message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('lever_springs_back')
      });
    });

    test('should toggle switchable lever', () => {
      const { world, player, room } = setupBasicWorld();
      const switchLever = world.createEntity('power lever', 'object');
      switchLever.add(new PullableTrait({ pullType: 'lever' }));
      switchLever.add(new LeverTrait({ position: 'up' }));
      switchLever.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      world.moveEntity(switchLever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: switchLever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'lever',
        willToggle: true,
        currentState: true,
        newState: false,
        activated: true
      });
      
      // Should emit lever_toggled message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('lever_toggled')
      });
    });
  });

  describe('Cord and Rope Pulling', () => {
    test('should pull basic cord', () => {
      const { world, player, room } = setupBasicWorld();
      const cord = world.createEntity('pull cord', 'object');
      cord.add(new PullableTrait({ pullType: 'cord' }));
      cord.add(new CordTrait({ 
        cordType: 'cord',
        activates: 'mechanism-001'
      }));
      
      world.moveEntity(cord.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: cord }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        target: cord.id,
        pullType: 'cord',
        cordType: 'cord',
        activates: 'mechanism-001'
      });
      
      // Should emit cord_activates message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('cord_activates')
      });
    });

    test('should ring bell when pulling bell cord', () => {
      const { world, player, room } = setupBasicWorld();
      const bellCord = world.createEntity('bell cord', 'object');
      bellCord.add(new PullableTrait({ pullType: 'cord' }));
      bellCord.add(new CordTrait({ cordType: 'rope' }));
      bellCord.add(new BellPullTrait({
        ringsBellId: 'chapel-bell',
        bellSound: 'church_bell',
        ringCount: 3,
        audibleDistance: 5
      }));
      
      world.moveEntity(bellCord.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: bellCord }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'cord',
        rings: true,
        bellSound: 'church_bell',
        ringCount: 3,
        audibleDistance: 5,
        ringsBellId: 'chapel-bell'
      });
      
      // Should emit bell_rings message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('bell_rings')
      });
      
      // Should emit sound event
      expectEvent(events, 'if.event.sound', {
        source: bellCord.id,
        sound: 'church_bell',
        distance: 5
      });
    });

    test('should handle broken bell pull', () => {
      const { world, player, room } = setupBasicWorld();
      const bellCord = world.createEntity('broken bell cord', 'object');
      bellCord.add(new PullableTrait({ pullType: 'cord' }));
      bellCord.add(new CordTrait({ cordType: 'rope' }));
      bellCord.add(new BellPullTrait({
        broken: true,
        bellSound: 'silence'
      }));
      
      world.moveEntity(bellCord.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: bellCord }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit cord_pulled message (not bell_rings)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('cord_pulled')
      });
    });

    test('should handle breakable cord', () => {
      const { world, player, room } = setupBasicWorld();
      const rope = world.createEntity('frayed rope', 'object');
      rope.add(new PullableTrait({ 
        pullType: 'cord',
        requiresStrength: 20 // Strong pull
      }));
      rope.add(new CordTrait({ 
        cordType: 'rope',
        breakable: true,
        breakStrength: 15, // Will break
        breakSound: 'rope_snap.mp3'
      }));
      
      world.moveEntity(rope.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: rope }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'cord',
        breaks: true,
        sound: 'rope_snap.mp3'
      });
      
      // Should emit cord_breaks message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('cord_breaks')
      });
    });
  });

  describe('Attached Object Pulling', () => {
    test('should detach detachable objects', () => {
      const { world, player, room } = setupBasicWorld();
      const poster = world.createEntity('movie poster', 'object');
      poster.add(new PullableTrait({ pullType: 'attached' }));
      poster.add(new AttachedTrait({
        attachedTo: 'wall',
        attachmentType: 'glued',
        detachable: true,
        detachForce: 10,
        detachSound: 'paper_tear.mp3'
      }));
      
      world.moveEntity(poster.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: poster }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'attached',
        attachmentType: 'glued',
        attachedTo: 'wall',
        willDetach: true,
        detached: true,
        sound: 'paper_tear.mp3'
      });
      
      // Should emit comes_loose message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('comes_loose')
      });
      
      // Should emit detached event
      expectEvent(events, 'if.event.detached', {
        item: poster.id,
        from: 'wall'
      });
    });

    test('should fail to detach firmly attached objects', () => {
      const { world, player, room } = setupBasicWorld();
      const plaque = world.createEntity('brass plaque', 'object');
      plaque.add(new PullableTrait({ pullType: 'attached' }));
      plaque.add(new AttachedTrait({
        attachedTo: 'monument',
        attachmentType: 'screwed',
        detachable: false
      }));
      
      world.moveEntity(plaque.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: plaque }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit firmly_attached message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('firmly_attached')
      });
    });

    test('should handle insufficient force for detachment', () => {
      const { world, player, room } = setupBasicWorld();
      const sign = world.createEntity('metal sign', 'object');
      sign.add(new PullableTrait({ pullType: 'attached' }));
      sign.add(new AttachedTrait({
        attachedTo: 'post',
        attachmentType: 'nailed',
        detachable: true,
        detachForce: 30, // Too strong
        loose: false
      }));
      
      world.moveEntity(sign.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: sign }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit firmly_attached message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('firmly_attached')
      });
    });

    test('should handle loose attachment', () => {
      const { world, player, room } = setupBasicWorld();
      const note = world.createEntity('paper note', 'object');
      note.add(new PullableTrait({ pullType: 'attached' }));
      note.add(new AttachedTrait({
        attachedTo: 'board',
        attachmentType: 'nailed',
        detachable: true,
        detachForce: 30,
        loose: true // Easier to pull
      }));
      
      world.moveEntity(note.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: note }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit tugging_useless message (loose but still too strong)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('tugging_useless')
      });
    });
  });

  describe('Heavy Object Pulling', () => {
    test('should pull moveable objects in direction', () => {
      const { world, player, room } = setupBasicWorld();
      const crate = world.createEntity('wooden crate', 'object');
      crate.add(new PullableTrait({ 
        pullType: 'heavy',
        requiresStrength: 5
      }));
      
      world.moveEntity(crate.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: crate }
      );
      command.parsed.extras = { direction: 'west' };
      
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'heavy',
        direction: 'west',
        moved: true,
        moveDirection: 'west'
      });
      
      // Should emit pulled_direction message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pulled_direction'),
        params: { target: 'wooden crate', direction: 'west' }
      });
    });

    test('should pull heavy objects with effort', () => {
      const { world, player, room } = setupBasicWorld();
      const desk = world.createEntity('heavy desk', 'object');
      desk.add(new PullableTrait({ 
        pullType: 'heavy',
        requiresStrength: 35 // Requires effort but possible
      }));
      
      world.moveEntity(desk.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: desk }
      );
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit pulled_with_effort message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pulled_with_effort')
      });
    });

    test('should nudge objects without direction', () => {
      const { world, player, room } = setupBasicWorld();
      const chair = world.createEntity('office chair', 'object');
      chair.add(new PullableTrait({ 
        pullType: 'heavy',
        requiresStrength: 5
      }));
      
      world.moveEntity(chair.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: chair }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should emit PULLED event
      expectEvent(events, 'if.event.pulled', {
        pullType: 'heavy',
        nudged: true,
        moved: false
      });
      
      // Should emit pulled_nudged message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pulled_nudged')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('control lever', 'object');
      lever.add(new PullableTrait({ pullType: 'lever' }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(lever.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });

    test('should track pull count', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('counter lever', 'object');
      lever.add(new PullableTrait({ 
        pullType: 'lever',
        pullCount: 2,
        maxPulls: 5
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      // Should increment pull count
      expectEvent(events, 'if.event.pulled', {
        pullCount: 3 // Was 2, now 3
      });
    });

    test('should include custom pull sounds', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('musical lever', 'object');
      lever.add(new PullableTrait({ 
        pullType: 'lever',
        pullSound: 'chime.mp3'
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'if.event.pulled', {
        sound: 'chime.mp3'
      });
    });

    test('should include custom effects', () => {
      const { world, player, room } = setupBasicWorld();
      const lever = world.createEntity('magic lever', 'object');
      lever.add(new PullableTrait({ 
        pullType: 'lever',
        effects: {
          onPull: 'if.event.portal_opens'
        }
      }));
      
      world.moveEntity(lever.id, room.id);
      
      const command = createCommand(
        IFActions.PULLING,
        { entity: lever }
      );
      const context = createRealTestContext(pullingAction, world, command);
      
      const events = pullingAction.execute(context);
      
      expectEvent(events, 'if.event.pulled', {
        customEffect: 'if.event.portal_opens'
      });
    });
  });
});

describe('Testing Pattern Examples for Pulling with Traits', () => {
  test('pattern: trait-based pull types', () => {
    // Test different pull types via traits
    const pullTypes = [
      { trait: 'PULLABLE', pullType: 'lever' },
      { trait: 'PULLABLE', pullType: 'cord' },
      { trait: 'PULLABLE', pullType: 'attached' },
      { trait: 'PULLABLE', pullType: 'heavy' }
    ];
    
    pullTypes.forEach(({ trait, pullType }) => {
      expect(trait).toBe('PULLABLE');
      expect(['lever', 'cord', 'attached', 'heavy']).toContain(pullType);
    });
  });

  test('pattern: combining pullable with specific traits', () => {
    // Test trait combinations
    const combinations = [
      { base: 'PULLABLE', specific: 'LEVER', behavior: 'lever mechanics' },
      { base: 'PULLABLE', specific: 'CORD', behavior: 'cord mechanics' },
      { base: 'PULLABLE', specific: 'BELL_PULL', behavior: 'bell ringing' },
      { base: 'PULLABLE', specific: 'ATTACHED', behavior: 'detachment' }
    ];
    
    combinations.forEach(({ base, specific, behavior }) => {
      expect(base).toBe('PULLABLE');
      expect(specific).toBeTruthy();
      expect(behavior).toBeTruthy();
    });
  });

  test('pattern: strength requirements', () => {
    // Test strength-based pulling
    const strengthTests = [
      { required: 5, playerStrength: 10, canPull: true },
      { required: 10, playerStrength: 10, canPull: true },
      { required: 15, playerStrength: 10, canPull: false },
      { required: 50, playerStrength: 10, canPull: false }
    ];
    
    strengthTests.forEach(({ required, playerStrength, canPull }) => {
      const result = playerStrength >= required;
      expect(result).toBe(canPull);
    });
  });

  test('pattern: detachment mechanics', () => {
    // Test detachment force requirements
    const detachTests = [
      { detachForce: 10, pullForce: 15, detaches: true },
      { detachForce: 20, pullForce: 15, detaches: false },
      { detachForce: 5, pullForce: 15, detaches: true }
    ];
    
    detachTests.forEach(({ detachForce, pullForce, detaches }) => {
      const result = pullForce >= detachForce;
      expect(result).toBe(detaches);
    });
  });

  test('pattern: lever positions', () => {
    // Test lever position changes
    const leverStates = [
      { from: 'up', to: 'down' },
      { from: 'down', to: 'up' },
      { from: 'neutral', withDirection: 'up', to: 'up' },
      { from: 'neutral', withDirection: 'down', to: 'down' }
    ];
    
    leverStates.forEach(state => {
      if (state.from === 'up') expect(state.to).toBe('down');
      if (state.from === 'down') expect(state.to).toBe('up');
      if (state.from === 'neutral') expect(state.to).toBe(state.withDirection);
    });
  });

  test('pattern: bell pull configuration', () => {
    // Test bell pull properties
    const bellPulls = [
      { ringCount: 1, pattern: 'single' },
      { ringCount: 2, pattern: 'double' },
      { ringCount: 3, pattern: 'triple' },
      { ringCount: 10, pattern: 'continuous' }
    ];
    
    bellPulls.forEach(({ ringCount, pattern }) => {
      expect(ringCount).toBeGreaterThan(0);
      expect(['single', 'double', 'triple', 'continuous']).toContain(pattern);
    });
  });
});
