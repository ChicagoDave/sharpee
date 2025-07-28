/**
 * Golden test for listening action - demonstrates testing auditory interactions
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to listen to specific objects
 * - Detect environmental sounds in the location
 * - Identify sounds from active devices
 * - Check containers for sounds (rattling contents, liquid)
 * - Handle silence when no sounds are present
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { listeningAction } from '../../../src/actions/standard/listening';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

describe('listeningAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(listeningAction.id).toBe(IFActions.LISTENING);
    });

    test('should declare required messages', () => {
      expect(listeningAction.requiredMessages).toContain('not_visible');
      expect(listeningAction.requiredMessages).toContain('silence');
      expect(listeningAction.requiredMessages).toContain('ambient_sounds');
      expect(listeningAction.requiredMessages).toContain('active_devices');
      expect(listeningAction.requiredMessages).toContain('no_sound');
      expect(listeningAction.requiredMessages).toContain('device_running');
      expect(listeningAction.requiredMessages).toContain('device_off');
      expect(listeningAction.requiredMessages).toContain('container_sounds');
      expect(listeningAction.requiredMessages).toContain('liquid_sounds');
      expect(listeningAction.requiredMessages).toContain('listened_to');
      expect(listeningAction.requiredMessages).toContain('listened_environment');
    });

    test('should belong to sensory group', () => {
      expect(listeningAction.group).toBe('sensory');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when target is not visible', () => {
      const { world, player } = setupBasicWorld();
      const otherRoom = world.createEntity('other room', 'room');
      const radio = world.createEntity('old radio', 'object');
      
      // Put radio in a different room so it's not visible
      world.moveEntity(radio.id, otherRoom.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: radio
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'old radio' }
      });
    });
  });

  describe('Listening to Specific Objects', () => {
    test('should detect sound from active device', () => {
      const { world, player, room } = setupBasicWorld();
      const fan = world.createEntity('electric fan', 'object');
      fan.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      // Put fan in the same room as player
      world.moveEntity(fan.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: fan
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit LISTENED event with sound info
      expectEvent(events, 'if.event.listened', {
        target: fan.id,
        hasSound: true,
        soundType: 'device'
      });
      
      // Should emit device_running message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_running'),
        params: { target: 'electric fan' }
      });
    });

    test('should detect no sound from inactive device', () => {
      const { world, player, room } = setupBasicWorld();
      const radio = world.createEntity('portable radio', 'object');
      radio.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      // Put radio in the same room as player
      world.moveEntity(radio.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: radio
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit device_off message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_off'),
        params: { target: 'portable radio' }
      });
    });

    test('should detect sounds from container with contents', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('metal box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      
      const coin = world.createEntity('gold coin', 'object');
      
      // Put box in player's hands and coin in box
      world.moveEntity(box.id, player.id);
      world.moveEntity(coin.id, box.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: box
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit LISTENED event with contents info
      expectEvent(events, 'if.event.listened', {
        target: box.id,
        hasContents: true,
        contentCount: 1
      });
      
      // Should emit container_sounds message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('container_sounds'),
        params: { target: 'metal box' }
      });
    });

    test('should detect liquid sounds from container', () => {
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
      
      // Put bottle in player's hands and water in bottle
      world.moveEntity(bottle.id, player.id);
      world.moveEntity(water.id, bottle.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: bottle
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit liquid_sounds message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('liquid_sounds'),
        params: { target: 'glass bottle' }
      });
    });

    test('should detect no sound from empty container', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('empty box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      
      // Put box in the same room as player
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: box
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit no_sound message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_sound'),
        params: { target: 'empty box' }
      });
    });

    test('should detect no sound from ordinary objects', () => {
      const { world, player, room } = setupBasicWorld();
      const stone = world.createEntity('smooth stone', 'object');
      
      // Put stone in the same room as player
      world.moveEntity(stone.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: stone
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit LISTENED event
      expectEvent(events, 'if.event.listened', {
        target: stone.id
      });
      
      // Should emit no_sound message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('no_sound'),
        params: { target: 'smooth stone' }
      });
    });
  });

  describe('Listening to the Environment', () => {
    test('should detect silence in quiet room', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create command with no entity - listening to environment
      const command = createCommand(IFActions.LISTENING, {});
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit LISTENED event for environment
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id
      });
      
      // Should emit silence message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('silence')
      });
    });

    test('should detect active devices in room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const radio = world.createEntity('old radio', 'object');
      radio.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      const fan = world.createEntity('ceiling fan', 'object');
      fan.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      // Put devices in the room
      world.moveEntity(radio.id, room.id);
      world.moveEntity(fan.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit LISTENED event with sound sources
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [radio.id, fan.id]
      });
      
      // Should emit active_devices message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('active_devices'),
        params: { devices: 'old radio, ceiling fan' }
      });
    });

    test('should ignore inactive devices', () => {
      const { world, player, room } = setupBasicWorld();
      
      const radio = world.createEntity('broken radio', 'object');
      radio.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      const tv = world.createEntity('television', 'object');
      tv.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      // Put devices in the room
      world.moveEntity(radio.id, room.id);
      world.moveEntity(tv.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should emit silence message (no active devices)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('silence')
      });
    });

    test('should detect mix of active and inactive devices', () => {
      const { world, player, room } = setupBasicWorld();
      
      const activeRadio = world.createEntity('portable radio', 'object');
      activeRadio.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      const inactiveTv = world.createEntity('old television', 'object');
      inactiveTv.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      // Put devices in the room
      world.moveEntity(activeRadio.id, room.id);
      world.moveEntity(inactiveTv.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should only detect the active radio
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [activeRadio.id]
      });
      
      // Should emit active_devices message with only active device
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('active_devices'),
        params: { devices: 'portable radio' }
      });
    });
  });

  describe('Complex Sound Scenarios', () => {
    test('should handle container with mixed contents', () => {
      const { world, player } = setupBasicWorld();
      
      const bag = world.createEntity('leather bag', 'object');
      bag.add({
        type: TraitType.CONTAINER,
        capacity: 10
      });
      
      const keys = world.createEntity('brass keys', 'object');
      const potion = world.createEntity('magic potion', 'object');
      potion.add({
        type: TraitType.EDIBLE,
        isDrink: true
      });
      
      // Put bag in player's hands and items in bag
      world.moveEntity(bag.id, player.id);
      world.moveEntity(keys.id, bag.id);
      world.moveEntity(potion.id, bag.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: bag
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should detect liquid sounds (because of potion)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('liquid_sounds'),
        params: { target: 'leather bag' }
      });
    });

    test('should prioritize device sounds over container state', () => {
      const { world, player } = setupBasicWorld();
      
      // A device that is also a container
      const musicBox = world.createEntity('music box', 'object');
      musicBox.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      musicBox.add({
        type: TraitType.CONTAINER,
        capacity: 1
      });
      
      // Put music box in player's hands
      world.moveEntity(musicBox.id, player.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: musicBox
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      // Should prioritize device_running over container sounds
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_running'),
        params: { target: 'music box' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const bell = world.createEntity('brass bell', 'object');
      
      // Put bell in the same room as player
      world.moveEntity(bell.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: bell
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(bell.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });

    test('should include proper entities for environmental listening', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = listeningAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room.id);
          // No target for environmental listening
          expect(event.entities.target).toBeUndefined();
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Listening', () => {
  test('pattern: sound-producing devices', () => {
    // Test various devices that make sounds when active
    const soundDevices = [
      { name: 'radio', description: 'static and music' },
      { name: 'fan', description: 'whirring blades' },
      { name: 'clock', description: 'ticking mechanism' },
      { name: 'generator', description: 'engine noise' },
      { name: 'alarm', description: 'beeping sound' }
    ];
    
    const { world } = setupBasicWorld();
    
    soundDevices.forEach(({ name, description }) => {
      const device = world.createEntity(name, 'object');
      device.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      device.add({
        type: TraitType.IDENTITY,
        name,
        description
      });
      
      expect(device.has(TraitType.SWITCHABLE)).toBe(true);
      const switchable = device.get(TraitType.SWITCHABLE) as any;
      expect(switchable.isOn).toBe(true);
    });
  });

  test('pattern: container sound variations', () => {
    // Test different container contents and their sounds
    const containerScenarios = [
      {
        container: 'bottle',
        contents: [{ name: 'water', isDrink: true }],
        expectedSound: 'liquid'
      },
      {
        container: 'box',
        contents: [{ name: 'coins', isDrink: false }],
        expectedSound: 'rattling'
      },
      {
        container: 'jar',
        contents: [],
        expectedSound: 'none'
      }
    ];
    
    const { world } = setupBasicWorld();
    
    containerScenarios.forEach(({ container, contents, expectedSound }) => {
      const containerEntity = world.createEntity(container, 'object');
      containerEntity.add({
        type: TraitType.CONTAINER,
        capacity: 5
      });
      
      const contentEntities = contents.map(({ name, isDrink }) => {
        const item = world.createEntity(name, 'object');
        if (isDrink) {
          item.add({
            type: TraitType.EDIBLE,
            isDrink
          });
        }
        return item;
      });
      
      // Verify container setup
      expect(containerEntity.has(TraitType.CONTAINER)).toBe(true);
      
      // Verify liquid detection
      if (expectedSound === 'liquid') {
        const hasLiquid = contentEntities.some(item => {
          if (item.has(TraitType.EDIBLE)) {
            const edible = item.get(TraitType.EDIBLE) as any;
            return edible.isDrink;
          }
          return false;
        });
        expect(hasLiquid).toBe(true);
      }
    });
  });

  test('pattern: environmental soundscapes', () => {
    // Test various room configurations with sound sources
    const environments = [
      {
        name: 'kitchen',
        devices: ['refrigerator', 'dishwasher'],
        active: ['refrigerator']
      },
      {
        name: 'workshop',
        devices: ['drill', 'saw', 'sander'],
        active: ['sander']
      },
      {
        name: 'server_room',
        devices: ['server1', 'server2', 'cooling_fan'],
        active: ['server1', 'server2', 'cooling_fan']
      }
    ];
    
    const { world } = setupBasicWorld();
    
    environments.forEach(({ name, devices, active }) => {
      const room = world.createEntity(name, 'room');
      
      const deviceEntities = devices.map(device => {
        const entity = world.createEntity(device, 'object');
        entity.add({
          type: TraitType.SWITCHABLE,
          isOn: active.includes(device)
        });
        return entity;
      });
      
      // Count active devices
      const activeCount = deviceEntities.filter(d => {
        const switchable = d.get(TraitType.SWITCHABLE) as any;
        return switchable.isOn;
      }).length;
      
      expect(activeCount).toBe(active.length);
    });
  });

  test('pattern: silence detection', () => {
    // Test scenarios that should produce silence
    const silentScenarios = [
      { name: 'empty_room', contents: [] },
      { name: 'room_with_furniture', contents: ['table', 'chair', 'bookshelf'] },
      { name: 'room_with_off_devices', contents: [
        { name: 'tv', switchable: { isOn: false } },
        { name: 'stereo', switchable: { isOn: false } }
      ]}
    ];
    
    silentScenarios.forEach(scenario => {
      // All scenarios should result in no active sound sources
      const hasActiveSound = scenario.contents.some((item: any) => 
        typeof item === 'object' && item.switchable?.isOn
      );
      
      expect(hasActiveSound).toBe(false);
    });
  });
});
