/**
 * adr-349-location-names.test.ts — the registration seam.
 *
 * `compileLocationNames` turns the analyzer's numbered `room name` keys into
 * live predicates in world-model's registry (D16 contracts 1 and 2). AC-13 (a
 * region contributes to its members, and a member with no arm of its own renders
 * the region's part alone) and AC-14 (a conditional heading still varies after a
 * save and restore) both live here — AC-14 is the criterion the registry exists
 * to satisfy, and it fails for any implementation that stores the predicates on
 * a serialized trait.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { compile } from '@sharpee/chord';
import {
  WorldModel,
  LocationHeadingBehavior,
  clearLocationNames,
  lookupLocationName,
} from '@sharpee/world-model';
import { createStory } from '../src';

const HEADER = `story
  title: Well
  authors:
    T
  id: well
  story-version: 0.0.1

`;

const START = `before the game starts
  change the player to Alex
end before

`;

function load(body: string) {
  const result = compile(HEADER + body + START);
  if (!result.ok) throw new Error(result.diagnostics.map(d => `${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { world, player };
}

const headingOf = (world: WorldModel, player: { id: string }) =>
  LocationHeadingBehavior.resolve(world.getEntity(player.id)!, world).map(p => [p.role, p.text]);

const WELL_AND_BUCKET = `create the Well
  a room
  room name while the bucket is open:
    Top of Well, the bucket gaping
  room name:
    Top of Well

  A well.

create the bucket
  a container
  openable
  in the Well

  A bucket.

create Alex
  a person
  playable
  starts in the Well

  You.

`;

describe('compileLocationNames (ADR-349 D16 contracts 1 and 2)', () => {
  beforeEach(() => clearLocationNames());

  it('registers one arm per numbered key, under the world entity id', () => {
    const { world } = load(WELL_AND_BUCKET);

    const well = world.getAllEntities().find(e => e.name === 'Well')!;
    const arms = lookupLocationName(well.id);

    expect(arms).toHaveLength(2);
    expect(arms![0].text).toBe('Top of Well, the bucket gaping');
    expect(arms![0].holds).toBeInstanceOf(Function);
    expect(arms![1].text).toBe('Top of Well');
    expect(arms![1].holds).toBeUndefined();
  });

  it('registers nothing for a story that declares no `room name`', () => {
    const { world } = load(`create the Well
  a room

  A well.

create Alex
  a person
  playable
  starts in the Well

  You.

`);

    const well = world.getAllEntities().find(e => e.name === 'Well')!;
    expect(lookupLocationName(well.id)).toBeUndefined();
  });

  it('evaluates an arm against the live world, not against load-time state', () => {
    const { world, player } = load(WELL_AND_BUCKET);
    const bucket = world.getAllEntities().find(e => e.name === 'bucket')!;
    const openable = bucket.get('openable') as { isOpen: boolean };

    openable.isOpen = true;
    expect(headingOf(world, player)).toEqual([['place', 'Top of Well, the bucket gaping']]);

    openable.isOpen = false;
    expect(headingOf(world, player)).toEqual([['place', 'Top of Well']]);
  });

  it('the loader\'s own clear stops a stale arm answering for a second story', () => {
    // The guard under test is `compileLocationNames`'s clear, NOT this file's
    // beforeEach: both stories are loaded inside one test, so only the
    // production clear stands between them.
    const first = load(`create the Well
  a room
  room name:
    Top of Well

  A well.

create Alex
  a person
  playable
  starts in the Well

  You.

`);
    const firstWellId = first.world.getAllEntities().find(e => e.name === 'Well')!.id;
    expect(lookupLocationName(firstWellId)).toBeDefined();

    const second = load(`create the Well
  a room

  A well.

create Alex
  a person
  playable
  starts in the Well

  You.

`);
    const secondWell = second.world.getAllEntities().find(e => e.name === 'Well')!;

    // The precondition the guard exists for: a second story reuses the id.
    // If entity-id derivation ever stops colliding, this fails loudly rather
    // than letting the test below pass for the wrong reason.
    expect(secondWell.id).toBe(firstWellId);

    expect(lookupLocationName(secondWell.id)).toBeUndefined();
    expect(headingOf(second.world, second.player)).toEqual([]);
  });

  describe('AC-14 — the round trip', () => {
    it('a conditional heading still varies after a save and restore', () => {
      const { world, player } = load(WELL_AND_BUCKET);
      const bucketId = world.getAllEntities().find(e => e.name === 'bucket')!.id;
      (world.getEntity(bucketId)!.get('openable') as { isOpen: boolean }).isOpen = true;

      expect(headingOf(world, player)).toEqual([['place', 'Top of Well, the bucket gaping']]);

      // An in-game RESTORE: the same world is repopulated and the registrations
      // already in place are reused — nothing about the arms was serialized.
      const saved = world.toJSON();
      world.loadJSON(saved);

      // The arm that held at save time still holds — not the first arm forever.
      expect(headingOf(world, player)).toEqual([['place', 'Top of Well, the bucket gaping']]);

      // And the predicate is still LIVE, which is what a trait-carried closure
      // could not be: flipping the world flips the heading back.
      (world.getEntity(bucketId)!.get('openable') as { isOpen: boolean }).isOpen = false;
      expect(headingOf(world, player)).toEqual([['place', 'Top of Well']]);
    });
  });

  describe('AC-13 — a region contributes', () => {
    const MAZE = `create the Maze
  a region
  containing the maze-1 and the maze-2
  room name:
    Maze of twisty little passages, all alike

create the maze-1
  a room

  You are lost.

create the maze-2
  a room
  room name:
    A dead end

  You are lost.

create Alex
  a person
  playable
  starts in the maze-1

  You.

`;

    it('a member with no arm of its own renders the region part alone', () => {
      const { world, player } = load(MAZE);

      expect(headingOf(world, player)).toEqual([
        ['region', 'Maze of twisty little passages, all alike'],
      ]);
    });

    it('a member with its own arm renders both, place before region', () => {
      const { world, player } = load(MAZE);
      const deadEnd = world.getAllEntities().find(e => e.name === 'maze-2')!;
      world.moveEntity(player.id, deadEnd.id);

      expect(headingOf(world, player)).toEqual([
        ['place', 'A dead end'],
        ['region', 'Maze of twisty little passages, all alike'],
      ]);
    });
  });
});
