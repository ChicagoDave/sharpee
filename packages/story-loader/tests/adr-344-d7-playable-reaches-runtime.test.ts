/**
 * adr-344-d7-playable-reaches-runtime.test.ts — ADR-344 D7 (completing
 * ADR-327 D9): the loader writes `ActorTrait.isPlayable` from the IR's
 * `isPlayable`, so Chord's `playable` finally reaches the runtime.
 *
 * Both directions are asserted on real trait state in a real WorldModel, and
 * they fail for different reasons. Drop the loader's write and the POSITIVE
 * cases fail — Alex reads back non-playable, because the trait's own default
 * is now `false`; that is the assertion pinning the write itself. The
 * NEGATIVE case pins the other half: that the write is conditional on the
 * IR, not a blanket `true` for every person. Before D7 neither could fail,
 * since the trait defaulted `true` and a character without `playable` was
 * indistinguishable from one with it — the exact failure ADR-327's own AC-5
 * could not detect.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { ActorTrait, IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

function compileClean(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors, errors.map((e) => `${e.span.line} ${e.code} ${e.message}`).join(' | ')).toEqual([]);
  return result.ir;
}

/** Engine lifecycle order: initializeWorld first, then createPlayer. */
function load(source: string): { world: WorldModel; player: IFEntity } {
  const story = createStory(compileClean(source), { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  return { world, player };
}

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';

const SOURCE = `${HEADER}create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  A person.

create Jack
  a person
  in the Hall

  Another person.

before the game starts
  change the player to Alex
end before
`;

const playable = (world: WorldModel, name: string): boolean | undefined => {
  const entity = world.getAllEntities().find((e) => e.name === name);
  return entity?.get<ActorTrait>(TraitType.ACTOR)?.isPlayable;
};

describe('the loader writes isPlayable from the IR (ADR-344 D7)', () => {
  it('a `playable` person carries isPlayable true on its ActorTrait', () => {
    const { world } = load(SOURCE);
    expect(playable(world, 'Alex')).toBe(true);
  });

  it('a person WITHOUT `playable` carries isPlayable false — the write is real', () => {
    const { world } = load(SOURCE);
    expect(playable(world, 'Jack')).toBe(false);
  });

  it('the role holder the story hands the engine is playable', () => {
    const { player } = load(SOURCE);
    expect(player.name).toBe('Alex');
    expect(player.get<ActorTrait>(TraitType.ACTOR)?.isPlayable).toBe(true);
  });

  it('the IR and the trait agree for every person in the story', () => {
    const ir = compileClean(SOURCE);
    const { world } = load(SOURCE);
    const people = ir.entities.filter((e) => e.kinds.some((k) => k.name === 'person'));
    expect(people.length).toBe(2);
    for (const person of people) {
      expect(playable(world, person.name), person.name).toBe(person.isPlayable);
    }
  });
});
