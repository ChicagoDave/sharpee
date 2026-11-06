/**
 * servings-line.test.ts — a block's `servings <n>` line reaches the built
 * thing: the edible trait of the world entity carries the count, a block
 * without the line keeps the trait's own one serving, and an IR that puts
 * the count on a thing with nothing to eat or drink is refused at load.
 * Every case asserts on the built world or on the thrown error.
 *
 * Owner context: @sharpee/story-loader test suite.
 *
 * References:
 * - docs/work/archive/event-processor-one-writer/plan.md, Phase 5 — the line.
 * - packages/chord/tests/servings-line.test.ts — the language side.
 */
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { EdibleTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const SOURCE = `story
  title: Servings
  authors:
    T
  id: servings
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the loaf
  a thing, edible
  servings 3
  in the Hall

  A loaf.

create the biscuit
  a thing, edible
  in the Hall

  A biscuit.

create the flask
  a thing, drinkable
  servings 2
  in the Hall

  A flask.

create the stone
  a thing
  in the Hall

  A stone.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

function compiled(): StoryIR {
  const result = compile(SOURCE);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length) throw new Error(errors.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return result.ir;
}

function build(ir: StoryIR): WorldModel {
  const world = new WorldModel();
  createStory(ir).initializeWorld(world);
  return world;
}

function edibleOf(world: WorldModel, id: string): EdibleTrait {
  const trait = world.getEntity(id)?.get(TraitType.EDIBLE) as EdibleTrait | undefined;
  expect(trait, `edible trait of ${id}`).toBeDefined();
  return trait!;
}

describe('`servings <n>` reaches the built thing', () => {
  it('sets the edible trait\'s servings on a thing that is eaten', () => {
    expect(edibleOf(build(compiled()), 'loaf').servings).toBe(3);
  });

  it('leaves one serving on a thing whose block has no line', () => {
    expect(edibleOf(build(compiled()), 'biscuit').servings).toBe(1);
  });

  it('sets the servings of a thing that is drunk, and it stays a liquid', () => {
    const flask = edibleOf(build(compiled()), 'flask');
    expect(flask.servings).toBe(2);
    expect(flask.liquid).toBe(true);
  });

  it('refuses an IR that puts servings on a thing with nothing to eat or drink', () => {
    const ir = compiled();
    ir.entities.find((e) => e.id === 'stone')!.servings = 2;
    expect(() => build(ir)).toThrow(LoadError);
    expect(() => build(ir)).toThrow(/servings/);
  });
});
