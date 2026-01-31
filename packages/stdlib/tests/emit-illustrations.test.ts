import { describe, it, expect } from 'vitest';
import { IFEntity, SwitchableTrait } from '@sharpee/world-model';
import { emitIllustrations } from '../src/actions/helpers/emit-illustrations';

/**
 * Minimal mock for ActionContext — only the parts emitIllustrations uses.
 */
function mockContext(world: any) {
  let eventCounter = 0;
  return {
    world,
    event(type: string, data: any) {
      return { id: `evt-${++eventCounter}`, type, data };
    },
  } as any;
}

function mockWorld(entities: Map<string, IFEntity> = new Map(), playerId?: string) {
  return {
    getEntity: (id: string) => entities.get(id),
    getPlayer: () => playerId ? entities.get(playerId) : undefined,
    getLocation: (entityId: string) => undefined,
  };
}

describe('emitIllustrations (ADR-124)', () => {
  it('should return empty array for entity with no annotations', () => {
    const entity = new IFEntity('rock', 'object');
    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(entity, 'on-enter', 'group-1', ctx);
    expect(result).toEqual([]);
  });

  it('should emit events for matching trigger annotations', () => {
    const room = new IFEntity('dam', 'room');
    room.annotate('illustration', {
      id: 'dam-exterior',
      src: 'dam-dry.jpg',
      alt: 'The dam',
      trigger: 'on-enter',
      position: 'right',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(room, 'on-enter', 'group-1', ctx);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('if.event.illustrated');
    expect(result[0].data.groupId).toBe('group-1');
    expect(result[0].data.entityId).toBe('dam');
    expect(result[0].data.src).toBe('dam-dry.jpg');
    expect(result[0].data.alt).toBe('The dam');
    expect(result[0].data.position).toBe('right');
  });

  it('should filter out annotations with non-matching trigger', () => {
    const lamp = new IFEntity('lamp', 'object');
    lamp.annotate('illustration', {
      id: 'lamp-detail',
      src: 'lamp.jpg',
      alt: 'A brass lantern',
      trigger: 'on-examine',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(lamp, 'on-enter', 'group-1', ctx);
    expect(result).toEqual([]);
  });

  it('should only emit active conditional annotations', () => {
    const lamp = new IFEntity('lamp', 'object');
    lamp.add(new SwitchableTrait({ isOn: true }));

    lamp.annotate('illustration', {
      id: 'lamp-lit',
      src: 'lamp-lit.jpg',
      alt: 'A glowing lantern',
      trigger: 'on-examine',
    }, { trait: 'switchable', property: 'isOn', value: true });

    lamp.annotate('illustration', {
      id: 'lamp-off',
      src: 'lamp-off.jpg',
      alt: 'A dark lantern',
      trigger: 'on-examine',
    }, { trait: 'switchable', property: 'isOn', value: false });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(lamp, 'on-examine', 'group-1', ctx);

    expect(result).toHaveLength(1);
    expect(result[0].data.src).toBe('lamp-lit.jpg');
  });

  it('should use default position and width when not specified', () => {
    const room = new IFEntity('cave', 'room');
    room.annotate('illustration', {
      id: 'cave-img',
      src: 'cave.jpg',
      alt: 'A dark cave',
      trigger: 'on-enter',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(room, 'on-enter', 'group-1', ctx);

    expect(result[0].data.position).toBe('right');
    expect(result[0].data.width).toBe('40%');
  });

  it('should pass through targetPanel when present', () => {
    const room = new IFEntity('gallery', 'room');
    room.annotate('illustration', {
      id: 'painting',
      src: 'painting.jpg',
      alt: 'A painting',
      trigger: 'on-enter',
      targetPanel: 'sidebar',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(room, 'on-enter', 'group-1', ctx);

    expect(result[0].data.targetPanel).toBe('sidebar');
  });

  it('should not include targetPanel when absent', () => {
    const room = new IFEntity('cave', 'room');
    room.annotate('illustration', {
      id: 'cave-img',
      src: 'cave.jpg',
      alt: 'A cave',
      trigger: 'on-enter',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(room, 'on-enter', 'group-1', ctx);

    expect(result[0].data).not.toHaveProperty('targetPanel');
  });

  it('should emit multiple illustrations for the same trigger', () => {
    const room = new IFEntity('gallery', 'room');
    room.annotate('illustration', {
      id: 'left-wall',
      src: 'left.jpg',
      alt: 'Left wall painting',
      trigger: 'on-enter',
      position: 'left',
    });
    room.annotate('illustration', {
      id: 'right-wall',
      src: 'right.jpg',
      alt: 'Right wall painting',
      trigger: 'on-enter',
      position: 'right',
    });

    const ctx = mockContext(mockWorld());
    const result = emitIllustrations(room, 'on-enter', 'group-1', ctx);

    expect(result).toHaveLength(2);
    expect(result[0].data.src).toBe('left.jpg');
    expect(result[1].data.src).toBe('right.jpg');
  });
});
