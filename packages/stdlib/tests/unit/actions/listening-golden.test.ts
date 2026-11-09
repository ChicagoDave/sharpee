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

import { describe, test, expect, beforeEach } from 'vitest';
import { listeningAction } from '../../../src/actions/standard/listening';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, ContainerTrait, SwitchableTrait, EdibleTrait, SoundingTrait, OpenableTrait, RoomTrait, DoorTrait, type IFEntity, type WorldModel } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

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


  describe('Listening to Specific Objects', () => {
    test('should detect sound from active device', () => {
      const { world, player, room } = setupBasicWorld();
      const fan = world.createEntity('electric fan', 'object');
      fan.add(new SwitchableTrait({ isOn: true }));
      
      // Put fan in the same room as player
      world.moveEntity(fan.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: fan
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with sound info and device_running message
      expectEvent(events, 'if.event.listened', {
        target: fan.id,
        hasSound: true,
        soundType: 'device',
        messageId: expect.stringContaining('device_running'),
        params: { target: { name: 'electric fan' } }
      });
    });

    test('should detect no sound from inactive device', () => {
      const { world, player, room } = setupBasicWorld();
      const radio = world.createEntity('portable radio', 'object');
      radio.add(new SwitchableTrait({ isOn: false }));
      
      // Put radio in the same room as player
      world.moveEntity(radio.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: radio
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with device_off message
      expectEvent(events, 'if.event.listened', {
        target: radio.id,
        messageId: expect.stringContaining('device_off'),
        params: { target: { name: 'portable radio' } }
      });
    });

    test('should detect sounds from container with contents', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('metal box', 'object');
      box.add(new ContainerTrait());
      
      const coin = world.createEntity('gold coin', 'object');
      
      // Put box in player's hands and coin in box
      world.moveEntity(box.id, player.id);
      world.moveEntity(coin.id, box.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: box
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with contents info and container_sounds message
      expectEvent(events, 'if.event.listened', {
        target: box.id,
        hasContents: true,
        contentCount: 1,
        messageId: expect.stringContaining('container_sounds'),
        params: { target: { name: 'metal box' } }
      });
    });

    test('should detect liquid sounds from container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const bottle = world.createEntity('glass bottle', 'object');
      bottle.add(new ContainerTrait());
      
      const water = world.createEntity('water', 'object');
      water.add(new EdibleTrait({ liquid: true }));
      
      // Put bottle in player's hands and water in bottle
      world.moveEntity(bottle.id, player.id);
      world.moveEntity(water.id, bottle.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: bottle
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with liquid_sounds message
      expectEvent(events, 'if.event.listened', {
        target: bottle.id,
        messageId: expect.stringContaining('liquid_sounds'),
        params: { target: { name: 'glass bottle' } }
      });
    });

    test('should detect no sound from empty container', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('empty box', 'object');
      box.add(new ContainerTrait());
      
      // Put box in the same room as player
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: box
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with no_sound message
      expectEvent(events, 'if.event.listened', {
        target: box.id,
        messageId: expect.stringContaining('no_sound'),
        params: { target: { name: 'empty box' } }
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
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with no_sound message
      expectEvent(events, 'if.event.listened', {
        target: stone.id,
        messageId: expect.stringContaining('no_sound'),
        params: { target: { name: 'smooth stone' } }
      });
    });
  });

  describe('Listening to the Environment', () => {
    test('should detect silence in quiet room', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create command with no entity - listening to environment
      const command = createCommand(IFActions.LISTENING, {});
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event for environment with silence message
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        messageId: expect.stringContaining('silence')
      });
    });

    test('should detect active devices in room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const radio = world.createEntity('old radio', 'object');
      radio.add(new SwitchableTrait({ isOn: true }));
      
      const fan = world.createEntity('ceiling fan', 'object');
      fan.add(new SwitchableTrait({ isOn: true }));
      
      // Put devices in the room
      world.moveEntity(radio.id, room.id);
      world.moveEntity(fan.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with sound sources and active_devices message
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [radio.id, fan.id],
        messageId: expect.stringContaining('active_devices'),
        params: { devices: 'old radio, ceiling fan' }
      });
    });

    test('should ignore inactive devices', () => {
      const { world, player, room } = setupBasicWorld();
      
      const radio = world.createEntity('broken radio', 'object');
      radio.add(new SwitchableTrait({ isOn: false }));
      
      const tv = world.createEntity('television', 'object');
      tv.add(new SwitchableTrait({ isOn: false }));
      
      // Put devices in the room
      world.moveEntity(radio.id, room.id);
      world.moveEntity(tv.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should emit LISTENED event with silence message (no active devices)
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        messageId: expect.stringContaining('silence')
      });
    });

    test('should detect mix of active and inactive devices', () => {
      const { world, player, room } = setupBasicWorld();
      
      const activeRadio = world.createEntity('portable radio', 'object');
      activeRadio.add(new SwitchableTrait({ isOn: true }));
      
      const inactiveTv = world.createEntity('old television', 'object');
      inactiveTv.add(new SwitchableTrait({ isOn: false }));
      
      // Put devices in the room
      world.moveEntity(activeRadio.id, room.id);
      world.moveEntity(inactiveTv.id, room.id);
      
      const command = createCommand(IFActions.LISTENING, {});
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should only detect the active radio with active_devices message
      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [activeRadio.id],
        messageId: expect.stringContaining('active_devices'),
        params: { devices: 'portable radio' }
      });
    });
  });

  describe('Complex Sound Scenarios', () => {
    test('should handle container with mixed contents', () => {
      const { world, player } = setupBasicWorld();
      
      const bag = world.createEntity('leather bag', 'object');
      bag.add(new ContainerTrait());
      
      const keys = world.createEntity('brass keys', 'object');
      const potion = world.createEntity('magic potion', 'object');
      potion.add(new EdibleTrait({ liquid: true }));
      
      // Put bag in player's hands and items in bag
      world.moveEntity(bag.id, player.id);
      world.moveEntity(keys.id, bag.id);
      world.moveEntity(potion.id, bag.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: bag
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should detect liquid sounds (because of potion)
      expectEvent(events, 'if.event.listened', {
        target: bag.id,
        messageId: expect.stringContaining('liquid_sounds'),
        params: { target: { name: 'leather bag' } }
      });
    });

    test('should prioritize device sounds over container state', () => {
      const { world, player } = setupBasicWorld();
      
      // A device that is also a container
      const musicBox = world.createEntity('music box', 'object');
      musicBox.add(new SwitchableTrait({ isOn: true }));
      musicBox.add(new ContainerTrait());
      
      // Put music box in player's hands
      world.moveEntity(musicBox.id, player.id);
      
      const command = createCommand(IFActions.LISTENING, {
        entity: musicBox
      });
      
      const context = createRealTestContext(listeningAction, world, command);
      
      const events = executeWithValidation(listeningAction, context);
      
      // Should prioritize device_running over container sounds
      expectEvent(events, 'if.event.listened', {
        target: musicBox.id,
        messageId: expect.stringContaining('device_running'),
        params: { target: { name: 'music box' } }
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
      
      const events = executeWithValidation(listeningAction, context);
      
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
      
      const events = executeWithValidation(listeningAction, context);
      
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

  describe('Declared sounds (ADR-392 D5, #668)', () => {
    /**
     * A closed crate in `room` with `things` inside it. The crate is filled
     * while open — the world refuses a move into a closed container — and
     * shut afterwards; each move is asserted so a refused fixture cannot
     * pass a scan test vacuously.
     */
    const closedCrate = (world: WorldModel, room: IFEntity, ...things: IFEntity[]): IFEntity => {
      const crate = world.createEntity('slatted crate', 'object');
      crate.add(new ContainerTrait());
      const lid = new OpenableTrait({ isOpen: true });
      crate.add(lid);
      expect(world.moveEntity(crate.id, room.id)).toBe(true);
      for (const thing of things) {
        expect(world.moveEntity(thing.id, crate.id)).toBe(true);
      }
      lid.isOpen = false;
      return crate;
    };

    test('a thing with a declared sound is heard, not silent', () => {
      const { world, room } = setupBasicWorld();
      const bell = world.createEntity('brass bell', 'object');
      bell.add(new SoundingTrait({ tier: 'raised' }));
      world.moveEntity(bell.id, room.id);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, { entity: bell }));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        target: bell.id,
        hasSound: true,
        soundType: 'declared',
        tier: 'raised',
        messageId: expect.stringContaining('sounds_from_target'),
        params: { target: { name: 'brass bell' } }
      });
    });

    test('a loud thing inside a closed crate is still heard', () => {
      const { world, room } = setupBasicWorld();
      const bell = world.createEntity('brass bell', 'object');
      bell.add(new SoundingTrait({ tier: 'raised' }));
      closedCrate(world, room, bell);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, { entity: bell }));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        target: bell.id,
        hasSound: true,
        soundType: 'declared',
        messageId: expect.stringContaining('sounds_from_target')
      });
    });

    test('a plain thing inside a closed crate is still silent', () => {
      const { world, room } = setupBasicWorld();
      const rattle = world.createEntity('wooden rattle', 'object');
      closedCrate(world, room, rattle);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, { entity: rattle }));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        target: rattle.id,
        messageId: expect.stringContaining('no_sound')
      });
    });

    test('a declared sound wins over a switched-off device', () => {
      const { world, room } = setupBasicWorld();
      const radio = world.createEntity('crackling radio', 'object');
      radio.add(new SwitchableTrait({ isOn: false }));
      radio.add(new SoundingTrait({ tier: 'normal' }));
      world.moveEntity(radio.id, room.id);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, { entity: radio }));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        target: radio.id,
        hasSound: true,
        soundType: 'declared',
        tier: 'normal',
        messageId: expect.stringContaining('sounds_from_target')
      });
    });

    test('listen names a loud thing inside a closed crate', () => {
      const { world, room } = setupBasicWorld();
      const bell = world.createEntity('brass bell', 'object');
      bell.add(new SoundingTrait({ tier: 'raised' }));
      closedCrate(world, room, bell);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [bell.id],
        messageId: expect.stringContaining('sounds_nearby'),
        params: { sources: { kind: 'list', conj: 'and', items: [{ name: 'brass bell' }] } }
      });
    });

    test('listen stays silent when the closed crate holds only a plain thing', () => {
      const { world, room } = setupBasicWorld();
      const rattle = world.createEntity('wooden rattle', 'object');
      closedCrate(world, room, rattle);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: undefined,
        messageId: expect.stringContaining('silence')
      });
    });

    test('switched-on devices keep their line and declared sounders join the sources', () => {
      const { world, room } = setupBasicWorld();
      const fan = world.createEntity('electric fan', 'object');
      fan.add(new SwitchableTrait({ isOn: true }));
      world.moveEntity(fan.id, room.id);
      const bell = world.createEntity('brass bell', 'object');
      bell.add(new SoundingTrait({ tier: 'raised' }));
      world.moveEntity(bell.id, room.id);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [fan.id, bell.id],
        messageId: expect.stringContaining('active_devices'),
        params: { devices: 'electric fan' }
      });
    });

    test('listen does not name a loud thing in the next room', () => {
      const { world, room } = setupBasicWorld();
      const hallway = world.createEntity('Hallway', 'room');
      hallway.add(new RoomTrait());
      const door = world.createEntity('oak door', 'door');
      door.add(new DoorTrait({ room1: room.id, room2: hallway.id }));
      door.add(new OpenableTrait({ isOpen: true }));
      world.moveEntity(door.id, room.id);
      const chime = world.createEntity('wind chime', 'object');
      chime.add(new SoundingTrait({ tier: 'raised' }));
      world.moveEntity(chime.id, hallway.id);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: undefined,
        messageId: expect.stringContaining('silence')
      });
    });

    test('listen lists two declared sounders in one list', () => {
      const { world, room } = setupBasicWorld();
      const bell = world.createEntity('brass bell', 'object');
      bell.add(new SoundingTrait({ tier: 'raised' }));
      expect(world.moveEntity(bell.id, room.id)).toBe(true);
      const clock = world.createEntity('ticking clock', 'object');
      clock.add(new SoundingTrait({ tier: 'normal' }));
      expect(world.moveEntity(clock.id, room.id)).toBe(true);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [bell.id, clock.id],
        messageId: expect.stringContaining('sounds_nearby'),
        params: { sources: { kind: 'list', conj: 'and', items: [{ name: 'brass bell' }, { name: 'ticking clock' }] } }
      });
    });

    test('listen names a declared sounder the actor is carrying', () => {
      const { world, player, room } = setupBasicWorld();
      const watch = world.createEntity('pocket watch', 'object');
      watch.add(new SoundingTrait({ tier: 'normal' }));
      expect(world.moveEntity(watch.id, player.id)).toBe(true);

      const context = createRealTestContext(listeningAction, world, createCommand(IFActions.LISTENING, {}));
      const events = executeWithValidation(listeningAction, context);

      expectEvent(events, 'if.event.listened', {
        listeningToEnvironment: true,
        roomId: room.id,
        soundSources: [watch.id],
        messageId: expect.stringContaining('sounds_nearby')
      });
    });
  });
});

