/**
 * arrange.test.ts — `arrange(world, expression)` (ADR-356 D2, Q-1, Q-2):
 * every floor form performs its one write against a world the REAL loader
 * built from Chord source, every non-floor shape is named and writes
 * nothing, and no rejection throws. Derived from the Behavior Statement:
 * each DOES line asserts on the world state after the call, each REJECTS
 * WHEN line asserts the shape and that the world is unchanged.
 *
 * REAL-PATH per Integration Reality: real `@sharpee/chord` compile, real
 * `createStory`/`installStory` over a real engine — no stub of any owned
 * dependency.
 *
 * Owner context: story-loader test suite.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { LockableTrait, OpenableTrait, SwitchableTrait, TraitType, type IFEntity, type WorldModel } from '@sharpee/world-model';
import { arrange } from '../src/arrange';
import { CHORD_GONE_PREFIX, CHORD_IR_ID_ATTRIBUTE, CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY, timerKey } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const STORY = `story
  title: Arrange Fixture
  authors:
    Sharpee
  id: arrange-fixture
  story-version: 0.0.1
  states: calm, alarmed

define timer bell for the player
  dusk
end timer

create the Greenhouse
  a room

  A greenhouse.

create the Shed
  a room

  A shed.

create the vine
  a thing, scenery
  states, reversible: flowering, fruiting
  in the Greenhouse

  A vine.

create the garden shears
  a thing
  aka shears
  in the Shed

  Shears.

create the chest
  a container, openable, lockable with the brass key, starts locked
  in the Shed

  A chest.

create the brass key
  a thing
  in the Shed

  A key.

create the lantern
  a thing, switchable
  in the Greenhouse

  A lantern.

create the pebble
  a thing
  in the Greenhouse

  A pebble.

create the Grounds
  a region

create the Yard
  a room
  in the Grounds

  A yard.

create the Orchard
  a room
  in the Grounds

  An orchard.

create Alex
  a person, proper
  playable
  starts in the Greenhouse

before the game starts
  change the player to Alex
end before
`;

let world: WorldModel;
let player: IFEntity;

/** The entity the loader stamped with this IR id. */
function byIrId(irId: string): IFEntity {
  const hit = world.getAllEntities().find((e) => e.attributes[CHORD_IR_ID_ATTRIBUTE] === irId);
  if (!hit) throw new Error(`no entity stamped ${irId}`);
  return hit;
}

beforeEach(() => {
  ({ world, player } = bootEngine(STORY, 7));
});

describe('arrange — the floor forms write the world', () => {
  it('story.state = <phase> sets the story-phase key', () => {
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('calm');
    expect(arrange(world, 'story.state = alarmed')).toEqual({ arranged: true });
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('alarmed');
  });

  it('the story is <phase> sets the same key', () => {
    expect(arrange(world, 'the story is alarmed')).toEqual({ arranged: true });
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('alarmed');
  });

  it('[the] <name> is <state> sets the entity declared-state key', () => {
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'vine')).toBe('flowering');
    expect(arrange(world, 'the vine is fruiting')).toEqual({ arranged: true });
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'vine')).toBe('fruiting');
    expect(arrange(world, 'vine is flowering')).toEqual({ arranged: true });
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'vine')).toBe('flowering');
  });

  it('<entity>.location = <place> moves the entity, by display name, by IR id, and for the player', () => {
    const shears = byIrId('garden-shears');
    const greenhouse = byIrId('greenhouse');
    const shed = byIrId('shed');
    expect(world.getLocation(shears.id)).toBe(shed.id);

    expect(arrange(world, 'shears.location = Greenhouse')).toEqual({ arranged: true });
    expect(world.getLocation(shears.id)).toBe(greenhouse.id);

    expect(arrange(world, 'garden-shears.location = shed')).toEqual({ arranged: true });
    expect(world.getLocation(shears.id)).toBe(shed.id);

    expect(world.getLocation(player.id)).toBe(greenhouse.id);
    expect(arrange(world, 'player.location = Shed')).toEqual({ arranged: true });
    expect(world.getLocation(player.id)).toBe(shed.id);
  });

  it('<entity>.inventory contains <item> places the item on the holder', () => {
    const shears = byIrId('garden-shears');
    expect(world.getLocation(shears.id)).not.toBe(player.id);
    expect(arrange(world, 'player.inventory contains garden shears')).toEqual({ arranged: true });
    expect(world.getLocation(shears.id)).toBe(player.id);
  });

  it('<entity>.contents contains <item> places into a container even while it is closed and locked', () => {
    const chest = byIrId('chest');
    const pebble = byIrId('pebble');
    expect((chest.get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(false);
    expect(arrange(world, 'chest.contents contains pebble')).toEqual({ arranged: true });
    expect(world.getLocation(pebble.id)).toBe(chest.id);
  });

  it('<entity>.isOpen / isLocked / isOn = true|false write the trait flag', () => {
    const chest = byIrId('chest');
    const lantern = byIrId('lantern');
    const openable = chest.get(TraitType.OPENABLE) as OpenableTrait;
    const lockable = chest.get(TraitType.LOCKABLE) as LockableTrait;
    const switchable = lantern.get(TraitType.SWITCHABLE) as SwitchableTrait;
    expect([openable.isOpen, lockable.isLocked, switchable.isOn]).toEqual([false, true, false]);

    expect(arrange(world, 'chest.isLocked = false')).toEqual({ arranged: true });
    expect(arrange(world, 'chest.isOpen = true')).toEqual({ arranged: true });
    expect(arrange(world, 'lantern.isOn = true')).toEqual({ arranged: true });
    expect([openable.isOpen, lockable.isLocked, switchable.isOn]).toEqual([true, false, true]);

    expect(arrange(world, 'chest.isOpen = false')).toEqual({ arranged: true });
    expect(openable.isOpen).toBe(false);
  });

  it('a placement revives an entity a remove had taken offstage, as the runtime move does', () => {
    const pebble = byIrId('pebble');
    world.moveEntity(pebble.id, null);
    world.setStateValue(CHORD_GONE_PREFIX + 'pebble', true);

    expect(arrange(world, 'pebble.location = Shed')).toEqual({ arranged: true });
    expect(world.getLocation(pebble.id)).toBe(byIrId('shed').id);
    expect(world.getStateValue(CHORD_GONE_PREFIX + 'pebble')).toBe(false);
  });
});

describe('arrange — a timer phase writes the timer record as the runtime verbs do (ADR-356 D2 as amended 2026-09-27)', () => {
  const key = timerKey('player.bell');

  it('has started on an idle timer writes a running record stamped with the current turn', () => {
    expect(world.getStateValue(key)).toBeUndefined();
    expect(arrange(world, 'player.bell has started', { turn: 4 })).toEqual({ arranged: true });
    expect(world.getStateValue(key)).toEqual({ phase: 'running', index: 0, startedTurn: 4 });
  });

  it('has started on a timer already started writes nothing, as `start` writes nothing', () => {
    world.setStateValue(key, { phase: 'stopped', index: 2, startedTurn: 1 });
    expect(arrange(world, 'player.bell has started', { turn: 9 })).toEqual({ arranged: true });
    expect(world.getStateValue(key)).toEqual({ phase: 'stopped', index: 2, startedTurn: 1 });
  });

  it('has expired keeps the record and flips its phase, as expiry does', () => {
    world.setStateValue(key, { phase: 'running', index: 1, startedTurn: 3 });
    expect(arrange(world, 'player.bell has expired')).toEqual({ arranged: true });
    expect(world.getStateValue(key)).toEqual({ phase: 'expired', index: 1, startedTurn: 3 });
  });

  it('has expired on an idle timer writes the expired record from the idle default', () => {
    expect(arrange(world, 'player.bell has expired')).toEqual({ arranged: true });
    expect(world.getStateValue(key)).toEqual({ phase: 'expired', index: 0, startedTurn: -1 });
  });

  it('a start that must write and has no turn is refused by name, and writes nothing', () => {
    expect(arrange(world, 'player.bell has started')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'starting player.bell needs the current turn, and the caller supplied none',
    });
    expect(world.getStateValue(key)).toBeUndefined();
  });

  it('the record is ordinary world state: it survives a state round trip and the story reads it as started', () => {
    expect(arrange(world, 'player.bell has started', { turn: 2 })).toEqual({ arranged: true });
    world.setState(JSON.parse(JSON.stringify(world.getState())));
    expect(world.getStateValue(key)).toEqual({ phase: 'running', index: 0, startedTurn: 2 });
  });
});

describe('arrange — the three shapes named and not written', () => {
  it.each([
    ['vine.pruning occurrence = 2', 'occurrence'],
    ['the weather asked once', 'topic-history'],
    ['player.bell at dusk', 'timer-position'],
  ])('%s → SKIPPED as %s, nothing written', (expression, shape) => {
    const before = JSON.stringify(world.getState());
    expect(arrange(world, expression)).toEqual({ arranged: false, shape });
    expect(JSON.stringify(world.getState())).toBe(before);
  });
});

describe('arrange — what it refuses, by name, without throwing', () => {
  it('an entity the story does not declare', () => {
    expect(arrange(world, 'trowel.location = Shed')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'entity "trowel" not found',
    });
    expect(arrange(world, 'player.location = Attic')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'entity "Attic" not found',
    });
    expect(arrange(world, 'the trowel is rusty')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'entity "trowel" not found',
    });
  });

  it('text no form matches', () => {
    expect(arrange(world, 'prune the vine')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'no form matches "prune the vine"',
    });
  });

  it('a negated form, which names no single state', () => {
    const before = JSON.stringify(world.getState());
    for (const expression of ['story.state != calm', 'the vine is not flowering', 'player.location != Shed', 'player.inventory not-contains pebble', 'chest.isOpen != true']) {
      const result = arrange(world, expression);
      expect(result.arranged).toBe(false);
      expect(result.arranged === false && result.shape).toBe('negation');
    }
    expect(JSON.stringify(world.getState())).toBe(before);
  });

  it('a state on an entity that declares none', () => {
    expect(arrange(world, 'the pebble is shiny')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"pebble" declares no states',
    });
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'pebble')).toBeUndefined();
  });

  it('a flag the entity has no trait for, a property that is not a flag, a value that is not a flag value', () => {
    expect(arrange(world, 'pebble.isOpen = true')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"pebble" has no trait carrying isOpen',
    });
    expect(arrange(world, 'chest.name = box')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"name" is not a flag the floor arranges (isOpen, isLocked, isOn)',
    });
    expect(arrange(world, 'chest.isOpen = ajar')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"ajar" is not a flag value (true, false)',
    });
    expect((byIrId('chest').get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(false);
  });

  it('a collection the floor does not arrange', () => {
    expect(arrange(world, 'chest.exits contains pebble')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"exits" is not a collection the floor arranges (inventory, contents)',
    });
  });
});

describe('arrange — a story that declares no phases', () => {
  it('refuses story.state by name', () => {
    const bare = bootEngine(STORY.replace('  states: calm, alarmed\n', ''), 7);
    expect(arrange(bare.world, 'story.state = alarmed')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: 'this story declares no states',
    });
    expect(bare.world.getStateValue(CHORD_STORY_STATE_KEY)).toBeUndefined();
  });
});

describe('arrange — a state adjective is the trait flag, not a declared state (GH #549 Phase 3)', () => {
  const STOVE_STORY = `story
  title: Arrange Adjectives
  authors:
    Sharpee
  id: arrange-adjectives
  story-version: 0.0.1

create the Cellar
  a room

  A cellar.

create the stove
  a container, openable
  in the Cellar
  states, reversible: cold, hot

  A stove.

create the strongbox
  a container, openable, lockable with the small key, starts locked
  in the Cellar

  A strongbox.

create the small key
  a thing
  in the Cellar

  A key.

create the lantern
  a thing, switchable
  in the Cellar
  states: dusty, polished

  A lantern.

create Alex
  a person, proper
  playable
  starts in the Cellar

before the game starts
  change the player to Alex
end before
`;
  let stoveWorld: WorldModel;
  const stoveById = (irId: string): IFEntity => {
    const hit = stoveWorld.getAllEntities().find((e) => e.attributes[CHORD_IR_ID_ATTRIBUTE] === irId);
    if (!hit) throw new Error(`no entity stamped ${irId}`);
    return hit;
  };
  beforeEach(() => {
    ({ world: stoveWorld } = bootEngine(STOVE_STORY, 7));
  });

  it('`is closed` / `is open` write the openable flag and leave the declared state where it was', () => {
    expect(arrange(stoveWorld, 'the stove is hot')).toEqual({ arranged: true });
    expect(arrange(stoveWorld, 'the stove is closed')).toEqual({ arranged: true });
    expect((stoveById('stove').get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(false);
    expect(stoveWorld.getStateValue(CHORD_STATE_PREFIX + 'stove')).toBe('hot');
    expect(arrange(stoveWorld, 'the stove is open')).toEqual({ arranged: true });
    expect((stoveById('stove').get(TraitType.OPENABLE) as OpenableTrait).isOpen).toBe(true);
    expect(stoveWorld.getStateValue(CHORD_STATE_PREFIX + 'stove')).toBe('hot');
  });

  it('`is unlocked` / `is locked` and `is on` / `is off` write their flags the same way', () => {
    expect(arrange(stoveWorld, 'the strongbox is unlocked')).toEqual({ arranged: true });
    expect((stoveById('strongbox').get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
    expect(arrange(stoveWorld, 'the strongbox is locked')).toEqual({ arranged: true });
    expect((stoveById('strongbox').get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(true);
    expect(arrange(stoveWorld, 'the lantern is on')).toEqual({ arranged: true });
    expect((stoveById('lantern').get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(true);
    expect(stoveWorld.getStateValue(CHORD_STATE_PREFIX + 'lantern')).toBe('dusty');
  });

  it('an adjective of a trait the entity lacks is a declared state as before', () => {
    expect(arrange(stoveWorld, 'the lantern is locked')).toEqual({ arranged: true });
    expect(stoveWorld.getStateValue(CHORD_STATE_PREFIX + 'lantern')).toBe('locked');
  });
});

describe('arrange — a region place lands in its first room (GH #549 Phase 5, GH #538)', () => {
  it('`<entity>.location = <region>` moves the entity into the first room declared in the region, by display name and by IR id', () => {
    const yard = byIrId('yard');
    const orchard = byIrId('orchard');
    expect(world.getLocation(player.id)).not.toBe(yard.id);

    expect(arrange(world, 'player.location = Grounds')).toEqual({ arranged: true });
    expect(world.getLocation(player.id)).toBe(yard.id);
    expect(world.getLocation(player.id)).not.toBe(orchard.id);
    expect(world.isInRegion(player.id, byIrId('grounds').id)).toBe(true);

    const pebble = byIrId('pebble');
    expect(arrange(world, 'pebble.location = grounds')).toEqual({ arranged: true });
    expect(world.getLocation(pebble.id)).toBe(yard.id);
  });

  it('a region holding no rooms is refused by name, and nothing moves', () => {
    // Chord refuses to compile a memberless region, so one is built on the world directly.
    world.createRegion('rg-void', { name: 'Void' });
    const before = world.getLocation(player.id);
    expect(arrange(world, 'player.location = Void')).toEqual({
      arranged: false,
      shape: 'unrecognized',
      detail: '"Void" is a region holding no rooms',
    });
    expect(world.getLocation(player.id)).toBe(before);
  });
});
