/**
 * adr-389-one-identity.test.ts — the IR id is the world id (ADR-389 D1).
 * The loader asserts the identity where each entity is made: a world that
 * hands back a different id is refused with a LoadError naming both ids,
 * and a region, the one kind that used to carry a prefixed world id, is
 * built under its IR id like everything else.
 */
import { describe, expect, it } from 'vitest';
import { type IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';
import { requireEntity, worldIdOf } from '../src/identity';
import { compileSource } from './helpers/boot-engine';

const SOURCE = `story
  title: Identity
  authors:
    T
  id: identity
  story-version: 0.0.1

create the Maze
  a region

create the Yard
  a room
  in the Maze

  A yard.

create Alex
  a person
  playable
  starts in the Yard

  Alex.

before the game starts
  change the player to Alex
end before
`;

/** A world that ignores the id a caller asks for, as a world without ADR-388 would. */
class RenamingWorld extends WorldModel {
  override createEntity(displayName: string, type?: string, opts?: { defaultTraits?: boolean; id?: string }): IFEntity {
    return super.createEntity(displayName, type, { ...(opts ?? {}), id: `other-${opts?.id ?? displayName}` });
  }
}

describe('one identity (ADR-389 D1)', () => {
  it('refuses a world that builds an entity under a different id, naming both ids', () => {
    const story = createStory(compileSource(SOURCE));
    const world = new RenamingWorld();
    let thrown: unknown;
    try {
      story.initializeWorld(world);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(LoadError);
    expect((thrown as LoadError).message).toContain('`other-yard`');
    expect((thrown as LoadError).message).toContain('`yard`');
  });

  it('builds every entity, a region included, under its IR id', () => {
    const story = createStory(compileSource(SOURCE));
    const world = new WorldModel();
    story.initializeWorld(world);
    expect(world.getEntity('yard')?.has(TraitType.ROOM)).toBe(true);
    expect(world.getEntity('alex')?.has(TraitType.ACTOR)).toBe(true);
    expect(world.getEntity('maze')?.has(TraitType.REGION)).toBe(true);
    expect(world.getEntity('rg-maze')).toBeUndefined();
    expect(world.isInRegion('yard', 'maze')).toBe(true);
  });

  it('resolves the `player` sentinel against the role holder and every other reference to itself', () => {
    const story = createStory(compileSource(SOURCE));
    const world = new WorldModel();
    // Before the build nothing holds the role: the sentinel names no one.
    expect(worldIdOf(world, 'player')).toBeUndefined();
    expect(() => requireEntity(world, 'player')).toThrow(LoadError);
    story.initializeWorld(world); // the start block assigns Alex
    expect(worldIdOf(world, 'yard')).toBe('yard');
    expect(worldIdOf(world, 'player')).toBe('alex');
    expect(requireEntity(world, 'player').id).toBe('alex');
  });

  it('refuses a reference to an entity that is not in the world, carrying the referrer’s span', () => {
    const story = createStory(compileSource(SOURCE));
    const world = new WorldModel();
    story.initializeWorld(world);
    let thrown: unknown;
    try {
      requireEntity(world, 'cellar', { span: { line: 7, column: 3, endLine: 7, endColumn: 9 } });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(LoadError);
    expect((thrown as LoadError).message).toContain('`cellar` is referenced before it exists in the world');
    expect((thrown as LoadError).span?.line).toBe(7);
  });
});
