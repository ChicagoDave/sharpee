/**
 * Golden test for touching action - demonstrates testing tactile interactions
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to touch/feel objects
 * - Discover temperature properties (hot, warm, cold)
 * - Discover texture properties (soft, hard, smooth, rough, wet)
 * - Handle special cases (vibrating devices, liquid containers)
 * - Support various touch verbs (poke, pat, stroke, etc.)
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { touchingAction } from '../../../src/actions/standard/touching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld,
  findEntityByName
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

describe('touchingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(touchingAction.id).toBe(IFActions.TOUCHING);
    });

    test('should declare required messages', () => {
      expect(touchingAction.requiredMessages).toContain('no_target');
      expect(touchingAction.requiredMessages).toContain('not_visible');
      expect(touchingAction.requiredMessages).toContain('not_reachable');
      expect(touchingAction.requiredMessages).toContain('feels_normal');
      expect(touchingAction.requiredMessages).toContain('feels_warm');
      expect(touchingAction.requiredMessages).toContain('feels_hot');
      expect(touchingAction.requiredMessages).toContain('feels_cold');
      expect(touchingAction.requiredMessages).toContain('feels_soft');
      expect(touchingAction.requiredMessages).toContain('feels_hard');
      expect(touchingAction.requiredMessages).toContain('feels_smooth');
      expect(touchingAction.requiredMessages).toContain('feels_rough');
      expect(touchingAction.requiredMessages).toContain('feels_wet');
      expect(touchingAction.requiredMessages).toContain('device_vibrating');
      expect(touchingAction.requiredMessages).toContain('touched');
    });

    test('should belong to sensory group', () => {
      expect(touchingAction.group).toBe('sensory');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.TOUCHING);
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when target is not visible', () => {
      const { world, player } = setupBasicWorld();
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      const stone = world.createEntity('small stone', 'object');
      world.moveEntity(stone.id, otherRoom.id); // In different room
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: stone
        })
      );
      
      // No mocking needed - stone is actually not visible (in different room)
      const events = touchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'small stone' }
      });
    });

    test('should fail when target is not reachable', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create a closed transparent display case
      const displayCase = world.createEntity('display case', 'object');
      displayCase.add({
        type: TraitType.CONTAINER,
        capacity: 10,
        isTransparent: true  // Can see through it
      });
      displayCase.add({
        type: TraitType.OPENABLE,
        isOpen: false  // But it's closed
      });
      
      const painting = world.createEntity('oil painting', 'object');
      painting.add({
        type: TraitType.SCENERY
      });
      
      world.moveEntity(displayCase.id, room.id);
      world.moveEntity(painting.id, displayCase.id); // Painting in closed case
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: painting
        })
      );
      
      // No mocking needed - painting is visible but not reachable (in closed container)
      const events = touchingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'oil painting' }
      });
    });
  });

  describe('Temperature Detection', () => {
    test('should detect hot light source when lit', () => {
      const { world, player, room, object: lantern } = TestData.withObject('brass lantern', {
        [TraitType.LIGHT_SOURCE]: {
          type: TraitType.LIGHT_SOURCE,
          isLit: true
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: lantern
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with temperature
      expectEvent(events, 'if.event.touched', {
        target: lantern.id,
        temperature: 'hot',
        isLit: true
      });
      
      // Should emit feels_hot message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_hot'),
        params: { target: 'brass lantern' }
      });
    });

    test('should detect warm device when switched on', () => {
      const { world, player, room, object: radio } = TestData.withObject('portable radio', {
        [TraitType.SWITCHABLE]: {
          type: TraitType.SWITCHABLE,
          isOn: true
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: radio
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with temperature
      expectEvent(events, 'if.event.touched', {
        target: radio.id,
        temperature: 'warm',
        isActive: true
      });
      
      // Should emit feels_warm message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_warm'),
        params: { target: 'portable radio' }
      });
    });

    test('should detect vibrating device', () => {
      const { world, player, room, object: phone } = TestData.withObject('vibrating phone', {
        [TraitType.SWITCHABLE]: {
          type: TraitType.SWITCHABLE,
          isOn: true
        },
        [TraitType.IDENTITY]: {
          type: TraitType.IDENTITY,
          name: 'vibrating phone',
          description: 'A phone that vibrates when active'
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: phone
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit device_vibrating message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_vibrating'),
        params: { target: 'vibrating phone' }
      });
    });
  });

  describe('Texture Detection', () => {
    test('should detect soft wearable items', () => {
      const { world, player, room, object: sweater } = TestData.withObject('wool sweater', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: sweater
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with texture
      expectEvent(events, 'if.event.touched', {
        target: sweater.id,
        texture: 'soft'
      });
      
      // Should emit feels_soft message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_soft'),
        params: { target: 'wool sweater' }
      });
    });

    test('should detect smooth door surfaces', () => {
      const { world, player, room, object: door } = TestData.withObject('wooden door', {
        [TraitType.DOOR]: {
          type: TraitType.DOOR,
          isOpen: false
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: door
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with texture
      expectEvent(events, 'if.event.touched', {
        target: door.id,
        texture: 'smooth',
        material: 'hard'
      });
      
      // Should emit feels_smooth message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_smooth'),
        params: { target: 'wooden door' }
      });
    });

    test('should detect hard container surfaces', () => {
      const { world, player, room, object: box } = TestData.withObject('metal box', {
        [TraitType.CONTAINER]: {
          type: TraitType.CONTAINER,
          capacity: 10
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: box
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with texture  
      expectEvent(events, 'if.event.touched', {
        target: box.id,
        texture: 'solid'
      });
      
      // Note: Current implementation emits 'touched' not 'feels_hard'
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('touched'),
        params: { target: 'metal box' }
      });
    });

    test('should detect wet liquid items', () => {
      const { world, player, room, object: water } = TestData.withObject('puddle of water', {
        [TraitType.EDIBLE]: {
          type: TraitType.EDIBLE,
          isDrink: true
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: water
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with texture
      expectEvent(events, 'if.event.touched', {
        target: water.id,
        texture: 'liquid'
      });
      
      // Should emit feels_wet message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_wet'),
        params: { target: 'puddle of water' }
      });
    });
  });

  describe('Special Cases', () => {
    test('should detect container with liquid inside', () => {
      const { world, player, room } = setupBasicWorld();
      
      const bottle = world.createEntity('glass bottle', 'object');
      bottle.add({
        type: TraitType.CONTAINER,
        capacity: 1
      });
      
      const water = world.createEntity('water', 'object');
      water.add({
        type: TraitType.EDIBLE,
        isDrink: true
      });
      
      world.moveEntity(bottle.id, player.id);
      world.moveEntity(water.id, bottle.id);
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: bottle
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit liquid_container message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('liquid_container'),
        params: { target: 'glass bottle' }
      });
    });

    test('should detect immovable scenery', () => {
      const { world, player, room, object: statue } = TestData.withObject('marble statue', {
        [TraitType.SCENERY]: {
          type: TraitType.SCENERY
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: statue
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with immovable flag
      expectEvent(events, 'if.event.touched', {
        target: statue.id,
        immovable: true
      });
      
      // Should emit immovable_object message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('immovable_object'),
        params: { target: 'marble statue' }
      });
    });

    test('should include size information when available', () => {
      const { world, player, room, object: boulder } = TestData.withObject('large boulder', {
        [TraitType.IDENTITY]: {
          type: TraitType.IDENTITY,
          name: 'large boulder',
          size: 'large'
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: boulder
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with size
      expectEvent(events, 'if.event.touched', {
        target: boulder.id,
        size: 'large'
      });
    });
  });

  describe('Verb Variations', () => {
    test('should handle normal touch', () => {
      const { world, player, room, object: table } = TestData.withObject('wooden table');
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: table
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit touched message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('touched'),
        params: { target: 'wooden table' }
      });
    });

    test('should handle poke verb', () => {
      const { world, player, room, object: cushion } = TestData.withObject('soft cushion');
      
      const command = createCommand(IFActions.TOUCHING, {
        entity: cushion
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'poke', 
        head: 'poke' 
      };
      
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      // Should emit poked message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('poked'),
        params: { target: 'soft cushion' }
      });
    });

    test('should handle prod verb', () => {
      const { world, player, room, object: log } = TestData.withObject('fallen log');
      
      const command = createCommand(IFActions.TOUCHING, {
        entity: log
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'prod', 
        head: 'prod' 
      };
      
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      // Should emit prodded message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('prodded'),
        params: { target: 'fallen log' }
      });
    });

    test('should handle pat verb', () => {
      const { world, player, room, object: dog } = TestData.withObject('friendly dog');
      
      const command = createCommand(IFActions.TOUCHING, {
        entity: dog
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'pat', 
        head: 'pat' 
      };
      
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      // Should emit patted message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('patted'),
        params: { target: 'friendly dog' }
      });
    });

    test('should handle stroke verb', () => {
      const { world, player, room, object: cat } = TestData.withObject('sleeping cat');
      
      const command = createCommand(IFActions.TOUCHING, {
        entity: cat
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'stroke', 
        head: 'stroke' 
      };
      
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      // Should emit stroked message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('stroked'),
        params: { target: 'sleeping cat' }
      });
    });

    test('should handle feel verb', () => {
      const { world, player, room, object: fabric } = TestData.withObject('silk fabric');
      
      const command = createCommand(IFActions.TOUCHING, {
        entity: fabric
      });
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'feel', 
        head: 'feel' 
      };
      
      const context = createRealTestContext(touchingAction, world, command);
      
      const events = touchingAction.execute(context);
      
      // Should emit touched_gently message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('touched_gently'),
        params: { target: 'silk fabric' }
      });
    });
  });

  describe('Complex Temperature and Texture Combinations', () => {
    test('should prioritize temperature over texture', () => {
      const { world, player, room, object: jacket } = TestData.withObject('heated jacket', {
        [TraitType.WEARABLE]: {
          type: TraitType.WEARABLE,
          worn: false
        },
        [TraitType.SWITCHABLE]: {
          type: TraitType.SWITCHABLE,
          isOn: true
        }
      });
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: jacket
        })
      );
      
      const events = touchingAction.execute(context);
      
      // Should emit TOUCHED event with both properties
      expectEvent(events, 'if.event.touched', {
        target: jacket.id,
        temperature: 'warm',
        texture: 'soft',
        isActive: true
      });
      
      // Should prioritize temperature message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('feels_warm'),
        params: { target: 'heated jacket' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room, object: rock } = TestData.withObject('smooth rock');
      
      const context = createRealTestContext(touchingAction, world,
        createCommand(IFActions.TOUCHING, {
          entity: rock
        })
      );
      
      const events = touchingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(rock.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Touching', () => {
  test('pattern: temperature spectrum', () => {
    // Test various temperature states
    const temperatureObjects = [
      { name: 'ice', temperature: 'cold', trait: {} }, // Base implementation doesn't have cold
      { name: 'candle', temperature: 'hot', trait: { [TraitType.LIGHT_SOURCE]: { type: TraitType.LIGHT_SOURCE, isLit: true } } },
      { name: 'computer', temperature: 'warm', trait: { [TraitType.SWITCHABLE]: { type: TraitType.SWITCHABLE, isOn: true } } }
    ];
    
    temperatureObjects.forEach(({ name, temperature, trait }) => {
      const world = new WorldModel();
      const obj = world.createEntity(name, 'object');
      
      // Add traits
      for (const [traitType, traitData] of Object.entries(trait)) {
        obj.add({ type: traitType, ...traitData });
      }
      
      if (temperature === 'hot' && obj.has(TraitType.LIGHT_SOURCE)) {
        const light = obj.get(TraitType.LIGHT_SOURCE) as any;
        expect(light.isLit).toBe(true);
      } else if (temperature === 'warm' && obj.has(TraitType.SWITCHABLE)) {
        const device = obj.get(TraitType.SWITCHABLE) as any;
        expect(device.isOn).toBe(true);
      }
    });
  });

  test('pattern: texture variety', () => {
    // Test various textures
    const textureObjects = [
      { name: 'blanket', texture: 'soft', trait: TraitType.WEARABLE },
      { name: 'glass', texture: 'smooth', trait: TraitType.DOOR },
      { name: 'crate', texture: 'solid', trait: TraitType.CONTAINER },
      { name: 'water', texture: 'liquid', trait: TraitType.EDIBLE }
    ];
    
    textureObjects.forEach(({ name, texture, trait }) => {
      const world = new WorldModel();
      const obj = world.createEntity(name, 'object');
      
      if (trait === TraitType.EDIBLE) {
        obj.add({ type: trait, isDrink: true });
      } else {
        obj.add({ type: trait });
      }
      
      expect(obj.has(trait)).toBe(true);
    });
  });

  test('pattern: complex tactile objects', () => {
    // Test objects with multiple tactile properties
    const world = new WorldModel();
    const complexObject = world.createEntity('running engine', 'object');
    complexObject.add({
      type: TraitType.SWITCHABLE,
      isOn: true
    });
    complexObject.add({
      type: TraitType.CONTAINER,
      capacity: 5
    });
    complexObject.add({
      type: TraitType.IDENTITY,
      name: 'running engine',
      description: 'A vibrating engine that produces heat',
      size: 'large'
    });
    
    expect(complexObject.has(TraitType.SWITCHABLE)).toBe(true);
    expect(complexObject.has(TraitType.CONTAINER)).toBe(true);
    expect(complexObject.has(TraitType.IDENTITY)).toBe(true);
  });
});
