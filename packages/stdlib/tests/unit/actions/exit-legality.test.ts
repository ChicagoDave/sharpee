/**
 * Exit-legality tests (ADR-320 D8; Phase 6) — the conversational `leave`
 * outcome reads the same world state the going action reads: static
 * exits, the ADR-240 blocked-exit evaluator, the trait blocked map, and
 * door locks. Assertions run against real room/door state.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  EntityType,
  TraitType,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  OpenableTrait,
  LockableTrait,
  type IFEntity,
  type ExitKey,
  type IExitInfo,
  ActorTrait,
} from '@sharpee/world-model';
import { hasTraversableExit, canActorLeave } from '../../../src/actions/helpers/exit-legality';
import { exitBlockedKey } from '@sharpee/world-model';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';
import { EntityType as ET, Direction } from '@sharpee/world-model';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

describe('hasTraversableExit (ADR-320 D8)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let yard: IFEntity;

  function makeRoom(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new IdentityTrait({ name }));
    r.add(new RoomTrait());
    r.add(new ContainerTrait());
    return r;
  }

  beforeEach(() => {
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    room = makeRoom('Tiring House');
    yard = makeRoom('Yard');
  });

  function setExits(exits: Partial<Record<ExitKey, IExitInfo>>): void {
    room.get(RoomTrait)!.exits = exits;
  }

  test('a room with no exits offers no way out', () => {
    expect(hasTraversableExit(world, room.id)).toBe(false);
  });

  test('a plain static exit is traversable', () => {
    setExits({ [Direction.NORTH]: { destination: yard.id } });
    expect(hasTraversableExit(world, room.id)).toBe(true);
  });

  test('a blocked-map direction is not traversable (going`s trait fallback)', () => {
    setExits({ [Direction.NORTH]: { destination: yard.id } });
    room.get(RoomTrait)!.blockedExits = {
      [Direction.NORTH]: 'The way is barred.',
    };
    expect(hasTraversableExit(world, room.id)).toBe(false);
  });

  test('a live blocked-exit evaluator is authoritative over the open trait map (ADR-240)', () => {
    setExits({ [Direction.NORTH]: { destination: yard.id } });
    world.registerEvaluator(exitBlockedKey(room.id, Direction.NORTH), () => true);
    expect(hasTraversableExit(world, room.id)).toBe(false);
  });

  test('a locked door bars the only exit; unlocking it opens the way', () => {
    const door = world.createEntity('stage door', EntityType.DOOR);
    door.add(new IdentityTrait({ name: 'stage door' }));
    door.add(new OpenableTrait({ isOpen: false }));
    door.add(new LockableTrait({ isLocked: true }));
    setExits({ [Direction.NORTH]: { destination: yard.id, via: door.id } });

    expect(hasTraversableExit(world, room.id)).toBe(false);

    door.get(LockableTrait)!.isLocked = false;
    // Closed but unlocked: openable, so the exit is takeable
    expect(hasTraversableExit(world, room.id)).toBe(true);
  });

  test('one barred direction does not bar the room when another is open', () => {
    setExits({
      [Direction.NORTH]: { destination: yard.id },
      [Direction.SOUTH]: { destination: yard.id },
    });
    world.registerEvaluator(exitBlockedKey(room.id, Direction.NORTH), () => true);
    expect(hasTraversableExit(world, room.id)).toBe(true);
  });
});

describe('canActorLeave — going`s own validate, run for the leaver (ADR-328 D5)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let yard: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  const random = createFixtureRandomService(3);

  function makeRoom(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new IdentityTrait({ name }));
    r.add(new RoomTrait());
    r.add(new ContainerTrait());
    return r;
  }

  function setExits(exits: Partial<Record<ExitKey, IExitInfo>>): void {
    room.get(RoomTrait)!.exits = exits;
  }

  beforeEach(() => {
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    room = makeRoom('Tiring House');
    yard = makeRoom('Yard');
    player = world.createEntity('You', ET.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.moveEntity(player.id, yard.id);
    world.setPlayer(player.id);
    npc = world.createEntity('Burbage', ET.ACTOR);
    npc.add(new IdentityTrait({ name: 'Burbage' }));
    npc.add(new ActorTrait());
    npc.add(new ContainerTrait());
    world.moveEntity(npc.id, room.id);
  });

  test('no exits: the leaver cannot go anywhere, and nothing moved', () => {
    expect(canActorLeave(world, npc, player, random)).toBe(false);
    expect(world.getLocation(npc.id)).toBe(room.id);
  });

  test('an open exit validates for the leaver — validate only, nothing moves', () => {
    setExits({ [Direction.NORTH]: { destination: yard.id } });
    expect(canActorLeave(world, npc, player, random)).toBe(true);
    expect(world.getLocation(npc.id)).toBe(room.id);
  });

  test('a live blocked-exit evaluator refuses the leaver exactly as it refuses going', () => {
    setExits({ [Direction.NORTH]: { destination: yard.id } });
    world.registerEvaluator(exitBlockedKey(room.id, Direction.NORTH), () => true);
    expect(canActorLeave(world, npc, player, random)).toBe(false);
  });

  test('a locked door bars the only exit for the leaver', () => {
    const door = world.createEntity('stage door', EntityType.DOOR);
    door.add(new IdentityTrait({ name: 'stage door' }));
    door.add(new OpenableTrait({ isOpen: false }));
    door.add(new LockableTrait({ isLocked: true }));
    setExits({ [Direction.NORTH]: { destination: yard.id, via: door.id } });
    expect(canActorLeave(world, npc, player, random)).toBe(false);
  });
});
