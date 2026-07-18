/**
 * door-actions.test.ts — ADR-234 Phase 3: D4 door defaults + AC-2/AC-3/AC-4.
 * REAL-PATH: a Chord-loaded world drives stdlib's REAL goingAction (the
 * first live exercise of going.ts's door_closed/door_locked branches from
 * Chord), examining/opening/closing/locking/unlocking against the door
 * from BOTH connected rooms (scope resolved through the live
 * world.getInScope, not a stub), and save/restore of mid-game door state.
 * Every mutation is asserted on trait/world state per the loader
 * conventions.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import {
  closingAction,
  examiningAction,
  goingAction,
  lockingAction,
  openingAction,
  unlockingAction,
} from '@sharpee/stdlib';
import {
  Direction,
  DirectionType,
  DoorTrait,
  IFEntity,
  LockableTrait,
  OpenableTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const STORY = `story "Door Actions" by "T"
  id: door-actions
  version: 0.0.1

create the Kitchen
  a room
  north to the Hall through the oak door

  A tidy kitchen.

create the Hall
  a room

  A long hall.

create the oak door
  a door, lockable with the brass key

  A heavy oak door.

create the chest
  a container
  in the Kitchen
  openable, lockable

  A pine chest.

create the brass key

  A small brass key.

create the player
  starts in the Kitchen
  carries the brass key

  You.
`;

const STORY_UNLOCKED = STORY.replace(
  'a door, lockable with the brass key',
  'a door, lockable with the brass key, starts unlocked',
);

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function load(source: string): Loaded {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;
const lockable = (e: IFEntity) => e.get(TraitType.LOCKABLE) as LockableTrait;
const openable = (e: IFEntity) => e.get(TraitType.OPENABLE) as OpenableTrait;

/**
 * Build a four-phase context whose requireScope runs through the LIVE
 * platform scope (world.getInScope) — the both-rooms claim is real, not a
 * stubbed ok.
 */
function makeContext(l: Loaded, action: { id: string }, command: Record<string, unknown>): any {
  const currentLocation =
    l.world.getContainingRoom(l.player.id) ?? l.world.getEntity(l.world.getLocation(l.player.id)!)!;
  return {
    world: l.world,
    player: l.player,
    action,
    currentLocation,
    command,
    sharedData: {},
    requireScope: (target: IFEntity) =>
      l.world.getInScope(l.player.id).some((e) => e.id === target.id)
        ? { ok: true }
        : { ok: false, error: { valid: false, error: 'not_in_scope' } },
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

/** Run all four phases of a real stdlib action; returns the validation. */
function drive(l: Loaded, action: any, command: Record<string, unknown>) {
  const context = makeContext(l, action, command);
  const validation = action.validate(context);
  context.validationResult = validation;
  if (validation.valid) {
    action.execute(context);
    action.report(context);
  }
  return validation;
}

const go = (l: Loaded, direction: DirectionType) =>
  drive(l, goingAction, { parsed: { extras: { direction } } });

describe('D4 kind-scoped lockable default', () => {
  it('a lockable DOOR loads locked; a lockable non-door still loads unlocked', () => {
    const l = load(STORY);
    expect(lockable(entity(l, 'oak-door')).isLocked).toBe(true);
    expect(lockable(entity(l, 'chest')).isLocked).toBe(false); // trait-wide default untouched
  });

  it('`starts unlocked` overrides the door default (composition order regression pin)', () => {
    const l = load(STORY_UNLOCKED);
    expect(lockable(entity(l, 'oak-door')).isLocked).toBe(false);
  });

  it('the key config still resolves to a world id on the door', () => {
    const l = load(STORY);
    expect(lockable(entity(l, 'oak-door')).keyId).toBe(l.story.entityId('brass-key'));
  });
});

describe('AC-2: real goingAction through the door in three states', () => {
  it('locked (the load default) refuses with door_locked', () => {
    const l = load(STORY);
    const result = go(l, Direction.NORTH);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('door_locked');
    expect(l.world.getContainingRoom(l.player.id)?.id).toBe(l.story.entityId('kitchen'));
  });

  it('unlocked but closed refuses with door_closed', () => {
    const l = load(STORY);
    const unlock = drive(l, unlockingAction, {
      directObject: { entity: entity(l, 'oak-door') },
      indirectObject: { entity: entity(l, 'brass-key') },
      preposition: 'with',
    });
    expect(unlock.valid, JSON.stringify(unlock)).toBe(true);
    expect(lockable(entity(l, 'oak-door')).isLocked).toBe(false);

    const result = go(l, Direction.NORTH);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('door_closed');
  });

  it('open and unlocked traverses BOTH directions (the inferred reverse included)', () => {
    const l = load(STORY);
    drive(l, unlockingAction, {
      directObject: { entity: entity(l, 'oak-door') },
      indirectObject: { entity: entity(l, 'brass-key') },
      preposition: 'with',
    });
    const open = drive(l, openingAction, { directObject: { entity: entity(l, 'oak-door') } });
    expect(open.valid, JSON.stringify(open)).toBe(true);
    expect(openable(entity(l, 'oak-door')).isOpen).toBe(true);

    expect(go(l, Direction.NORTH).valid).toBe(true);
    expect(l.world.getContainingRoom(l.player.id)?.id).toBe(l.story.entityId('hall'));
    expect(go(l, Direction.SOUTH).valid).toBe(true);
    expect(l.world.getContainingRoom(l.player.id)?.id).toBe(l.story.entityId('kitchen'));
  });
});

describe('AC-3: the door is live from BOTH connected rooms', () => {
  it('platform scope surfaces the door in room1 AND room2 (placement is room1 only)', () => {
    const l = load(STORY);
    const doorId = l.story.entityId('oak-door')!;
    expect(l.world.getLocation(doorId)).toBe(l.story.entityId('kitchen')); // spatial home
    expect(l.world.getInScope(l.player.id).map((e) => e.id)).toContain(doorId);

    l.world.moveEntity(l.player.id, l.story.entityId('hall')!);
    expect(l.world.getInScope(l.player.id).map((e) => e.id)).toContain(doorId);
  });

  it('examine, close, and lock all work from room2 through live scope', () => {
    const l = load(STORY);
    const door = entity(l, 'oak-door');
    // Open + unlock from the Kitchen side first.
    drive(l, unlockingAction, {
      directObject: { entity: door },
      indirectObject: { entity: entity(l, 'brass-key') },
      preposition: 'with',
    });
    drive(l, openingAction, { directObject: { entity: door } });
    l.world.moveEntity(l.player.id, l.story.entityId('hall')!);

    expect(drive(l, examiningAction, { directObject: { entity: door } }).valid).toBe(true);

    const close = drive(l, closingAction, { directObject: { entity: door } });
    expect(close.valid, JSON.stringify(close)).toBe(true);
    expect(openable(door).isOpen).toBe(false);

    const lock = drive(l, lockingAction, {
      directObject: { entity: door },
      indirectObject: { entity: entity(l, 'brass-key') },
      preposition: 'with',
    });
    expect(lock.valid, JSON.stringify(lock)).toBe(true);
    expect(lockable(door).isLocked).toBe(true);
  });
});

describe('AC-4: door state survives save/restore', () => {
  it('restores mid-game trait state (unlocked + opened), the pair, and both via stamps', () => {
    const l = load(STORY);
    drive(l, unlockingAction, {
      directObject: { entity: entity(l, 'oak-door') },
      indirectObject: { entity: entity(l, 'brass-key') },
      preposition: 'with',
    });
    drive(l, openingAction, { directObject: { entity: entity(l, 'oak-door') } });

    const restored = new WorldModel();
    restored.loadJSON(l.world.toJSON());

    const doorId = l.story.entityId('oak-door')!;
    const door = restored.getEntity(doorId)!;
    expect((door.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);
    expect((door.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    const doorTrait = door.get(TraitType.DOOR) as DoorTrait;
    expect(doorTrait.room1).toBe(l.story.entityId('kitchen'));
    expect(doorTrait.room2).toBe(l.story.entityId('hall'));

    const kitchen = restored.getEntity(l.story.entityId('kitchen')!)!;
    const hall = restored.getEntity(l.story.entityId('hall')!)!;
    expect((kitchen.get(TraitType.ROOM) as RoomTrait).exits?.[Direction.NORTH]?.via).toBe(doorId);
    expect((hall.get(TraitType.ROOM) as RoomTrait).exits?.[Direction.SOUTH]?.via).toBe(doorId);
    expect(restored.getLocation(doorId)).toBe(l.story.entityId('kitchen'));
  });
});
