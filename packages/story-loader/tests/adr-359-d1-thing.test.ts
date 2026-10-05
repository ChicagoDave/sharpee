/**
 * adr-359-d1-thing.test.ts — `a thing` loads as a plain object, and `thing`
 * classifies every entity but rooms and regions.
 *
 * REAL-PATH: Chord source through `compile`, loaded by `createStory` into a
 * real WorldModel; classification asserted through the evaluator's `is-a`
 * and the story oracle's `isKindMember`, the two sites that share the rule.
 */
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, Evaluator, type ChordStory } from '../src';

const SOURCE = `story
  title: Things
  authors:
    T
  id: things
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the Grounds
  a region
  containing the Hall

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

create the cap
  a thing, wearable
  in the Hall

  A cap.

create the scarf
  wearable
  in the Hall

  A scarf.

create the crate
  a container
  in the Hall

  A crate.
`;

function load(): { ir: StoryIR; story: ChordStory; world: WorldModel } {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir, { seed: 1 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { ir: result.ir, story, world };
}

describe('ADR-359 D1 — `a thing` in the IR and the world', () => {
  const { ir, story, world } = load();
  const entityOf = (irId: string) => world.getEntity(story.entityId(irId)!)!;

  it('records `thing` as the kind of a plain object', () => {
    expect(ir.entities.find((e) => e.id === 'cap')!.kinds.map((k) => k.name)).toEqual(['thing']);
  });

  it('builds `a thing` exactly as a block with no kind', () => {
    const cap = entityOf('cap');
    const scarf = entityOf('scarf');
    expect(cap.type).toBe(scarf.type);
    expect([...cap.traits.keys()].sort()).toEqual([...scarf.traits.keys()].sort());
    expect(world.getLocation(cap.id)).toBe(story.entityId('hall'));
  });
});

describe('ADR-359 D1 — `thing` is the parent of every kind but room and region', () => {
  const { ir, story, world } = load();
  const ev = new Evaluator(ir, story, 1);
  const isA = (id: string, name: string, negated = false) =>
    ev.evalCondition(
      { kind: 'predicate', pred: 'is-a', negated, subject: { kind: 'entity', id }, object: { kind: 'symbol', name } },
      { world },
    );
  const oracle = story['storyOracle']();
  const member = (irId: string, kind: string) => oracle.isKindMember(story.entityId(irId)!, kind);

  it('`is a thing` holds for things, containers and persons', () => {
    expect(isA('cap', 'thing')).toBe(true);
    expect(isA('scarf', 'thing')).toBe(true);
    expect(isA('crate', 'thing')).toBe(true);
    expect(isA('alex', 'thing')).toBe(true);
  });

  it('`is a thing` fails for rooms and regions', () => {
    expect(isA('hall', 'thing')).toBe(false);
    expect(isA('grounds', 'thing')).toBe(false);
    expect(isA('hall', 'thing', true)).toBe(true);
  });

  it('a specific kind still classifies only its own entities', () => {
    expect(isA('crate', 'container')).toBe(true);
    expect(isA('cap', 'container')).toBe(false);
  });

  it('kind membership for character scopes follows the same rule', () => {
    expect(member('crate', 'thing')).toBe(true);
    expect(member('alex', 'thing')).toBe(true);
    expect(member('hall', 'thing')).toBe(false);
    expect(member('cap', 'container')).toBe(false);
  });
});
