import { describe, it, expect } from 'vitest';
import { WorldModel } from '../src/world/WorldModel';
import { RoomTrait } from '../src/traits/room/roomTrait';
import { ContainerTrait } from '../src/traits/container/containerTrait';
import { ActorTrait } from '../src/traits/actor/actorTrait';
import { SwitchableTrait } from '../src/traits/switchable/switchableTrait';
import { IFEntity } from '../src/entities/if-entity';

function setupWorld() {
  const world = new WorldModel();
  const room = world.createEntity('Test Room', 'room');
  room.add(new RoomTrait());
  room.add(new ContainerTrait());

  const player = world.createEntity('Player', 'actor');
  player.add(new ActorTrait());
  player.add(new ContainerTrait());
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);

  return { world, room, player };
}

describe('Entity Annotations (ADR-124)', () => {
  describe('annotate() and getAnnotations()', () => {
    it('should add and retrieve annotations by kind', () => {
      const entity = new IFEntity('lamp', 'object');

      entity.annotate('illustration', {
        id: 'lamp-lit',
        src: 'lamp-lit.jpg',
        alt: 'A glowing brass lantern',
        trigger: 'on-examine',
      });

      const annotations = entity.getAnnotations('illustration');
      expect(annotations).toHaveLength(1);
      expect(annotations[0].id).toBe('lamp-lit');
      expect(annotations[0].kind).toBe('illustration');
      expect(annotations[0].data.src).toBe('lamp-lit.jpg');
    });

    it('should support multiple annotations per kind', () => {
      const entity = new IFEntity('dam', 'room');

      entity.annotate('illustration', {
        id: 'dam-exterior',
        src: 'dam-dry.jpg',
        trigger: 'on-enter',
      });
      entity.annotate('illustration', {
        id: 'dam-detail',
        src: 'dam-controls.jpg',
        trigger: 'on-examine',
      });

      expect(entity.getAnnotations('illustration')).toHaveLength(2);
    });

    it('should return empty array for unknown kind', () => {
      const entity = new IFEntity('rock', 'object');
      expect(entity.getAnnotations('illustration')).toEqual([]);
    });

    it('should support multiple kinds on the same entity', () => {
      const entity = new IFEntity('npc', 'actor');

      entity.annotate('illustration', { id: 'portrait', src: 'npc.jpg' });
      entity.annotate('voice', { id: 'voice-style', color: '#ff0000' });

      expect(entity.getAnnotations('illustration')).toHaveLength(1);
      expect(entity.getAnnotations('voice')).toHaveLength(1);
    });

    it('should be chainable', () => {
      const entity = new IFEntity('obj', 'object');
      const result = entity.annotate('illustration', { id: 'a', src: 'a.jpg' });
      expect(result).toBe(entity);
    });
  });

  describe('removeAnnotation()', () => {
    it('should remove by kind and id', () => {
      const entity = new IFEntity('dam', 'room');
      entity.annotate('illustration', { id: 'a', src: 'a.jpg' });
      entity.annotate('illustration', { id: 'b', src: 'b.jpg' });

      const removed = entity.removeAnnotation('illustration', 'a');
      expect(removed).toBe(true);
      expect(entity.getAnnotations('illustration')).toHaveLength(1);
      expect(entity.getAnnotations('illustration')[0].id).toBe('b');
    });

    it('should return false for non-existent annotation', () => {
      const entity = new IFEntity('obj', 'object');
      expect(entity.removeAnnotation('illustration', 'nope')).toBe(false);
    });

    it('should clean up empty kind map', () => {
      const entity = new IFEntity('obj', 'object');
      entity.annotate('illustration', { id: 'only', src: 'only.jpg' });
      entity.removeAnnotation('illustration', 'only');
      expect(entity.hasAnnotations('illustration')).toBe(false);
    });
  });

  describe('hasAnnotations()', () => {
    it('should return true when annotations exist', () => {
      const entity = new IFEntity('obj', 'object');
      entity.annotate('illustration', { id: 'a', src: 'a.jpg' });
      expect(entity.hasAnnotations('illustration')).toBe(true);
    });

    it('should return false when no annotations', () => {
      const entity = new IFEntity('obj', 'object');
      expect(entity.hasAnnotations('illustration')).toBe(false);
    });
  });

  describe('getActiveAnnotations() - condition evaluation', () => {
    it('should return all annotations when none have conditions', () => {
      const { world, room } = setupWorld();
      room.annotate('illustration', { id: 'a', src: 'a.jpg' });
      room.annotate('illustration', { id: 'b', src: 'b.jpg' });

      const active = room.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(2);
    });

    it('should filter by self trait condition', () => {
      const { world } = setupWorld();
      const lamp = world.createEntity('Lamp', 'object');
      lamp.add(new SwitchableTrait({ isOn: true }));

      lamp.annotate('illustration', {
        id: 'lamp-lit',
        src: 'lamp-lit.jpg',
      }, { trait: 'switchable', property: 'isOn', value: true });

      lamp.annotate('illustration', {
        id: 'lamp-off',
        src: 'lamp-off.jpg',
      }, { trait: 'switchable', property: 'isOn', value: false });

      const active = lamp.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('lamp-lit');
    });

    it('should filter by player trait condition', () => {
      const { world, player, room } = setupWorld();
      // Give player a switchable trait for testing
      player.add(new SwitchableTrait({ isOn: false }));

      room.annotate('illustration', {
        id: 'room-special',
        src: 'room-special.jpg',
      }, { trait: 'switchable', property: 'isOn', value: true, scope: 'player' });

      // Player's switchable isOn=false, so condition fails
      let active = room.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(0);

      // Turn it on
      player.get<SwitchableTrait>('switchable')!.isOn = true;
      active = room.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('room-special');
    });

    it('should filter by location trait condition', () => {
      const { world, room } = setupWorld();
      const item = world.createEntity('Magic Gem', 'object');
      world.moveEntity(item.id, room.id);

      room.add(new SwitchableTrait({ isOn: false }));

      item.annotate('illustration', {
        id: 'gem-glow',
        src: 'gem-glow.jpg',
      }, { trait: 'switchable', property: 'isOn', value: true, scope: 'location' });

      // Room switchable is off — condition fails
      let active = item.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(0);

      // Turn room switchable on
      room.get<SwitchableTrait>('switchable')!.isOn = true;
      active = item.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(1);
    });

    it('should return unconditional annotations alongside matching conditional ones', () => {
      const { world } = setupWorld();
      const lamp = world.createEntity('Lamp', 'object');
      lamp.add(new SwitchableTrait({ isOn: true }));

      lamp.annotate('illustration', { id: 'always', src: 'always.jpg' });
      lamp.annotate('illustration', {
        id: 'conditional',
        src: 'lit.jpg',
      }, { trait: 'switchable', property: 'isOn', value: true });

      const active = lamp.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(2);
    });

    it('should return false for condition on missing trait', () => {
      const { world } = setupWorld();
      const rock = world.createEntity('Rock', 'object');

      rock.annotate('illustration', {
        id: 'rock-magic',
        src: 'rock-magic.jpg',
      }, { trait: 'switchable', property: 'isOn', value: true });

      const active = rock.getActiveAnnotations('illustration', world);
      expect(active).toHaveLength(0);
    });
  });

  describe('clone()', () => {
    it('should deep-copy annotations', () => {
      const entity = new IFEntity('lamp', 'object');
      entity.annotate('illustration', { id: 'a', src: 'a.jpg' });

      const cloned = entity.clone('lamp-clone');
      expect(cloned.getAnnotations('illustration')).toHaveLength(1);
      expect(cloned.getAnnotations('illustration')[0].id).toBe('a');

      // Verify independence
      entity.annotate('illustration', { id: 'b', src: 'b.jpg' });
      expect(cloned.getAnnotations('illustration')).toHaveLength(1);
    });
  });

  describe('toJSON() / fromJSON()', () => {
    it('should round-trip annotations', () => {
      const entity = new IFEntity('lamp', 'object');
      entity.annotate('illustration', {
        id: 'lamp-lit',
        src: 'lamp-lit.jpg',
        alt: 'A lit lantern',
        trigger: 'on-examine',
      }, { trait: 'switchable', property: 'isOn', value: true });

      entity.annotate('voice', {
        id: 'voice-style',
        color: '#ff0000',
      });

      const json = entity.toJSON();
      const restored = IFEntity.fromJSON(json);

      const illustrations = restored.getAnnotations('illustration');
      expect(illustrations).toHaveLength(1);
      expect(illustrations[0].id).toBe('lamp-lit');
      expect(illustrations[0].data.src).toBe('lamp-lit.jpg');
      expect(illustrations[0].condition).toEqual({
        trait: 'switchable',
        property: 'isOn',
        value: true,
      });

      const voices = restored.getAnnotations('voice');
      expect(voices).toHaveLength(1);
      expect(voices[0].data.color).toBe('#ff0000');
    });

    it('should handle entity with no annotations', () => {
      const entity = new IFEntity('rock', 'object');
      const json = entity.toJSON();
      expect(json.annotations).toBeUndefined();

      const restored = IFEntity.fromJSON(json);
      expect(restored.getAnnotations('illustration')).toEqual([]);
    });
  });
});
