/**
 * @file ADR-172 Phase 6 Step 6.2 — `SoundDispatcher`.
 *
 * Pins the dispatcher's contract independently of `propagate()` (which
 * already has 27 tests in `propagation.test.ts`). A fake propagate is
 * injected so these tests measure ONLY:
 *
 *   - listener enumeration (find by trait + entity-id sort)
 *   - fan-out (sound × listener)
 *   - null-result skipping
 *   - empty-buffer / no-listener short-circuit
 *   - event shape (type, data, entities mapping)
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  IFEntity,
  ListenerTrait,
  RoomTrait,
  WorldModel,
} from '@sharpee/world-model';
import type { IAudibilityEvent, ISound } from '@sharpee/if-domain';

import { SoundDispatcher, AUDIBILITY_HEARD_EVENT_TYPE } from '../../src/sound/dispatcher';

// =============================================================================
// Test fixtures
// =============================================================================

function buildWorld() {
  const world = new WorldModel();

  const room = world.createEntity('Parlor', 'room');
  room.add(new RoomTrait());

  return { world, room };
}

function addListener(world: WorldModel, name: string, room: IFEntity): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new ActorTrait());
  e.add(new ContainerTrait());
  e.add(new IdentityTrait({ name, article: '' }));
  e.add(new ListenerTrait());
  world.moveEntity(e.id, room.id);
  return e;
}

function makeSound(overrides: Partial<ISound> = {}): ISound {
  return {
    sourceLocation: 'src-room',
    sourceEntity: 'src-actor',
    kind: 'speech',
    volumeTier: 'normal',
    ...overrides,
  };
}

function makeAudibility(overrides: Partial<IAudibilityEvent> = {}): IAudibilityEvent {
  return {
    sourceRoomId: 'src-room',
    targetRoomId: 'dst-room',
    sourceEntityId: 'src-actor',
    kind: 'speech',
    volumeTier: 'normal',
    audibilityTier: 'full',
    timestamp: 1,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('SoundDispatcher (ADR-172 Phase 6 Step 6.2)', () => {
  let world: WorldModel;
  let room: IFEntity;

  beforeEach(() => {
    ({ world, room } = buildWorld());
  });

  it('returns an empty array when the buffer is empty', () => {
    addListener(world, 'alice', room);
    let propagateCalls = 0;
    const dispatcher = new SoundDispatcher(() => {
      propagateCalls++;
      return makeAudibility();
    });

    const events = dispatcher.dispatch([], world, 5);

    expect(events).toEqual([]);
    expect(propagateCalls).toBe(0);
  });

  it('returns an empty array when no listeners exist', () => {
    let propagateCalls = 0;
    const dispatcher = new SoundDispatcher(() => {
      propagateCalls++;
      return makeAudibility();
    });

    const events = dispatcher.dispatch([makeSound()], world, 5);

    expect(events).toEqual([]);
    expect(propagateCalls).toBe(0);
  });

  it('emits one sound.audibility.heard event per (sound × listener) pair when propagate returns non-null', () => {
    addListener(world, 'alice', room);
    addListener(world, 'bob', room);

    const dispatcher = new SoundDispatcher(() => makeAudibility());
    const events = dispatcher.dispatch([makeSound(), makeSound({ kind: 'glass-break' })], world, 7);

    expect(events).toHaveLength(4); // 2 sounds × 2 listeners
    for (const e of events) {
      expect(e.type).toBe(AUDIBILITY_HEARD_EVENT_TYPE);
      expect(e.type).toBe('sound.audibility.heard');
    }
  });

  it('skips (sound × listener) pairs where propagate returns null', () => {
    const alice = addListener(world, 'alice', room);
    const bob = addListener(world, 'bob', room);

    const dispatcher = new SoundDispatcher((_sound, listenerId) => {
      // Alice hears it, Bob does not.
      return listenerId === alice.id ? makeAudibility({ targetRoomId: alice.id }) : null;
    });

    const events = dispatcher.dispatch([makeSound()], world, 1);

    expect(events).toHaveLength(1);
    expect(events[0].entities.target).toBe(alice.id);
    // Bob is not in the result set.
    expect(events.find((e) => e.entities.target === bob.id)).toBeUndefined();
  });

  it('iterates listeners in entity-id sort order (snapshot-stable)', () => {
    // Create listeners in non-sorted insertion order so id ordering is
    // distinct from world-iteration order.
    const z = addListener(world, 'zelda', room);
    const a = addListener(world, 'amelia', room);
    const m = addListener(world, 'mira', room);

    // ids are assigned by world.createEntity; capture them and sort.
    const expectedOrder = [z.id, a.id, m.id].slice().sort();

    const seenListenerIds: string[] = [];
    const dispatcher = new SoundDispatcher((_sound, listenerId) => {
      seenListenerIds.push(listenerId);
      return makeAudibility();
    });

    dispatcher.dispatch([makeSound()], world, 1);

    expect(seenListenerIds).toEqual(expectedOrder);
  });

  it('iterates the buffer in insertion order, listeners inside each sound (outer × inner)', () => {
    const a = addListener(world, 'amelia', room);
    const b = addListener(world, 'bjorn', room);
    const expectedListeners = [a.id, b.id].slice().sort();

    const calls: Array<{ kind: string; listenerId: string }> = [];
    const dispatcher = new SoundDispatcher((sound, listenerId) => {
      calls.push({ kind: sound.kind, listenerId });
      return makeAudibility({ kind: sound.kind });
    });

    dispatcher.dispatch(
      [makeSound({ kind: 'first' }), makeSound({ kind: 'second' })],
      world,
      1,
    );

    expect(calls).toEqual([
      { kind: 'first', listenerId: expectedListeners[0] },
      { kind: 'first', listenerId: expectedListeners[1] },
      { kind: 'second', listenerId: expectedListeners[0] },
      { kind: 'second', listenerId: expectedListeners[1] },
    ]);
  });

  it('threads the timestamp into the propagate call', () => {
    addListener(world, 'alice', room);
    let seenTimestamp: number | undefined;
    const dispatcher = new SoundDispatcher((_sound, _id, _world, ts) => {
      seenTimestamp = ts;
      return makeAudibility({ timestamp: ts });
    });

    dispatcher.dispatch([makeSound()], world, 42);

    expect(seenTimestamp).toBe(42);
  });

  it('places the IAudibilityEvent in event.data and routes entities (actor=source, location=sourceRoom, target=listener)', () => {
    const alice = addListener(world, 'alice', room);

    const audibility = makeAudibility({
      sourceRoomId: 'r-source',
      sourceEntityId: 'e-emitter',
      targetRoomId: 'r-target',
      audibilityTier: 'muffled',
      kind: 'speech',
      volumeTier: 'raised',
      content: { messageId: 'msg.x' },
      wallId: 'w-1',
      timestamp: 9,
    });

    const dispatcher = new SoundDispatcher(() => audibility);
    const events = dispatcher.dispatch([makeSound()], world, 9);

    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.type).toBe(AUDIBILITY_HEARD_EVENT_TYPE);
    expect(e.data).toEqual(audibility);
    expect(e.entities).toEqual({
      actor: 'e-emitter',
      location: 'r-source',
      target: alice.id,
    });
  });

  it('uses the production propagate by default when no fake is injected (smoke test, no propagation expected)', () => {
    // Listener not in any room → propagate returns null → empty event list.
    const dispatcher = new SoundDispatcher();
    const detached = world.createEntity('detached', 'actor');
    detached.add(new ListenerTrait());

    const events = dispatcher.dispatch([makeSound({ sourceLocation: 'nowhere' })], world, 1);

    expect(events).toEqual([]);
  });
});
