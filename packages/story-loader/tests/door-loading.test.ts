/**
 * door-loading.test.ts — ADR-234 AC-1 (loader half): the `through` exit
 * line loads a real door into a real WorldModel — DoorTrait carrying the
 * room pair, `via` stamped on BOTH directions (the reverse inferred, never
 * written), the door placed in room1 for scope — all through the ADR-237
 * D4 `connectRooms` primitive. The one-line and mirrored two-line fixtures
 * must produce IDENTICAL world state (asserted by comparison, not assumed).
 * Rogue-IR backstops (compiler gates bypassed) throw LoadError.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import {
  Direction,
  DoorTrait,
  IFEntity,
  OpenableTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) throw new Error(`fixture ${name} failed to compile`);
  return result.ir;
}

function loadFixture(name: string): { story: ChordStory; world: WorldModel } {
  const story = createStory(compileFixture(name));
  const world = new WorldModel();
  story.initializeWorld(world);
  story.createPlayer(world);
  return { story, world };
}

interface DoorWorldState {
  kitchenExits: unknown;
  hallExits: unknown;
  doorLocation: string | undefined;
  doorTrait: DoorTrait;
  scenery: boolean;
  openable: OpenableTrait;
}

function doorWorldState({ story, world }: { story: ChordStory; world: WorldModel }): DoorWorldState {
  const entity = (irId: string): IFEntity => world.getEntity(story.entityId(irId)!)!;
  const kitchen = entity('kitchen');
  const hall = entity('hall');
  const door = entity('oak-door');
  return {
    kitchenExits: (kitchen.get(TraitType.ROOM) as RoomTrait).exits,
    hallExits: (hall.get(TraitType.ROOM) as RoomTrait).exits,
    doorLocation: world.getLocation(door.id),
    doorTrait: door.get(TraitType.DOOR) as DoorTrait,
    scenery: door.has(TraitType.SCENERY),
    openable: door.get(TraitType.OPENABLE) as OpenableTrait,
  };
}

describe('door loading through the `through` exit line (ADR-234 AC-1)', () => {
  let basic: { story: ChordStory; world: WorldModel };

  beforeAll(() => {
    basic = loadFixture('door-basic.story');
  });

  it('wires DoorTrait, both via stamps, and room1 placement from ONE line', () => {
    const state = doorWorldState(basic);
    const kitchenId = basic.story.entityId('kitchen')!;
    const hallId = basic.story.entityId('hall')!;
    const doorId = basic.story.entityId('oak-door')!;

    expect(state.doorTrait).toBeDefined();
    expect(state.doorTrait.room1).toBe(kitchenId);
    expect(state.doorTrait.room2).toBe(hallId);
    expect((state.kitchenExits as RoomTrait['exits'])?.[Direction.NORTH]?.destination).toBe(hallId);
    expect((state.kitchenExits as RoomTrait['exits'])?.[Direction.NORTH]?.via).toBe(doorId);
    expect((state.hallExits as RoomTrait['exits'])?.[Direction.SOUTH]?.destination).toBe(kitchenId);
    expect((state.hallExits as RoomTrait['exits'])?.[Direction.SOUTH]?.via).toBe(doorId);
    expect(state.doorLocation).toBe(kitchenId);
  });

  it('composes the D4 baseline: scenery + openable starting closed, no lockable', () => {
    const state = doorWorldState(basic);
    expect(state.scenery).toBe(true);
    expect(state.openable.isOpen).toBe(false);
    const door = basic.world.getEntity(basic.story.entityId('oak-door')!)!;
    expect(door.has(TraitType.LOCKABLE)).toBe(false);
  });

  it('the mirrored two-line fixture produces IDENTICAL world state (AC-1)', () => {
    const redundant = loadFixture('door-redundant.story');
    expect(doorWorldState(redundant)).toEqual(doorWorldState(basic));
  });
});

describe('rogue-IR backstops (compiler door gates bypassed)', () => {
  it('an unwired door throws LoadError', () => {
    const ir = compileFixture('door-basic.story');
    const kitchen = ir.entities.find((e) => e.id === 'kitchen')!;
    kitchen.exits[0].via = null; // strip the through-reference
    const story = createStory(ir);
    expect(() => story.initializeWorld(new WorldModel()))
      .toThrow(LoadError);
    expect(() => createStory(compileFixture('door-basic.story')).initializeWorld(new WorldModel()))
      .not.toThrow();
  });

  it('a second wiring to a different pair throws LoadError', () => {
    const ir = compileFixture('door-redundant.story');
    const hall = ir.entities.find((e) => e.id === 'hall')!;
    hall.exits[0].to = 'hall'; // mirror line now claims a different pair
    const story = createStory(ir);
    expect(() => story.initializeWorld(new WorldModel()))
      .toThrow(/rogue IR/);
  });
});
