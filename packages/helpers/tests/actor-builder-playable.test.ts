/**
 * actor-builder-playable.test.ts — ADR-344 D7: the author-facing actor
 * builder gains an explicit `.playable()` opt-in and does NOT default to
 * playable for its own construction.
 *
 * The ADR names the reason directly: a silent `true` one layer up is the
 * mistake that left `isPlayable` dead for three weeks, and the builder is
 * the layer where an author would be least likely to notice it. Assertions
 * are on the built entity's ActorTrait state in a real WorldModel.
 */
import { describe, expect, it } from 'vitest';
import { ActorTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { ActorBuilder } from '../src/builders/actor';

const build = (configure: (b: ActorBuilder) => ActorBuilder) => {
  const world = new WorldModel();
  return configure(new ActorBuilder(world, 'yourself')).build();
};

const actorTrait = (entity: ReturnType<typeof build>) =>
  entity.get<ActorTrait>(TraitType.ACTOR);

describe('ActorBuilder playability (ADR-344 D7)', () => {
  it('actor(...).build() is NOT playable — the builder adds no silent default', () => {
    const trait = actorTrait(build((b) => b));
    expect(trait).toBeDefined();
    expect(trait!.isPlayable).toBe(false);
  });

  it('actor(...).playable().build() is playable', () => {
    const trait = actorTrait(build((b) => b.playable()));
    expect(trait!.isPlayable).toBe(true);
  });

  it('playable() is independent of the other builder options', () => {
    const trait = actorTrait(build((b) =>
      b.description('As good-looking as ever.').properName().inventory({ maxItems: 10 })
    ));
    expect(trait!.isPlayable).toBe(false);
  });

  it('playable() returns the builder, so it chains', () => {
    const world = new WorldModel();
    const builder = new ActorBuilder(world, 'yourself');
    expect(builder.playable()).toBe(builder);
  });
});
