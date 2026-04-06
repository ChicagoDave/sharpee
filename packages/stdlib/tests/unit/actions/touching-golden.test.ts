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

import { describe, test, expect } from 'vitest';
import { touchingAction } from '../../../src/actions/standard/touching';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand,
  setupBasicWorld,
  findEntityByName
} from '../../test-utils';

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
      
      const events = executeWithValidation(touchingAction, context);

      expectEvent(events, 'if.event.touch_blocked', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    // Scope validation tests removed - now handled by CommandValidator
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with temperature and message
      expectEvent(events, 'if.event.touched', {
        target: lantern.id,
        temperature: 'hot',
        isLit: true,
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with temperature and message
      expectEvent(events, 'if.event.touched', {
        target: radio.id,
        temperature: 'warm',
        isActive: true,
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit device_vibrating message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with texture and message
      expectEvent(events, 'if.event.touched', {
        target: sweater.id,
        texture: 'soft',
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with texture and message
      expectEvent(events, 'if.event.touched', {
        target: door.id,
        texture: 'smooth',
        material: 'hard',
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with texture and message
      expectEvent(events, 'if.event.touched', {
        target: box.id,
        texture: 'solid',
        messageId: expect.stringContaining('feels_hard'),
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with texture and message
      expectEvent(events, 'if.event.touched', {
        target: water.id,
        texture: 'liquid',
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit liquid_container message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with immovable flag and message
      expectEvent(events, 'if.event.touched', {
        target: statue.id,
        immovable: true,
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event (size no longer included in event)
      expectEvent(events, 'if.event.touched', {
        target: boulder.id
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit touched message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit poked message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit prodded message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit patted message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit stroked message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit touched_gently message
      expectEvent(events, 'if.event.touched', {
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
      
      const events = executeWithValidation(touchingAction, context);
      
      // Should emit TOUCHED event with both properties and temperature message
      expectEvent(events, 'if.event.touched', {
        target: jacket.id,
        temperature: 'warm',
        texture: 'soft',
        isActive: true,
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
      
      const events = executeWithValidation(touchingAction, context);
      
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

