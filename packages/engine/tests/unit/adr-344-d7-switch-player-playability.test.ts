/**
 * adr-344-d7-switch-player-playability.test.ts — ADR-344 D7: with the
 * trait's default flipped to non-playable, `switchPlayer`'s playability
 * guard is live for the first time.
 *
 * The guard has existed since `switchPlayer` did, but every actor in every
 * story carried `isPlayable: true` by default, so it could never fire. This
 * pins both directions: an actor that opted in becomes the player and the
 * world says so; one that did not is refused, and the refusal changes
 * nothing — the previous player is still the player.
 */
import { describe, expect, it } from 'vitest';
import { ActorTrait, EntityType, IdentityTrait, TraitType } from '@sharpee/world-model';
import { setupTestEngineWithStory } from '../test-helpers/setup-test-engine';

/**
 * Add a second actor to the installed story's world.
 *
 * @param opts whether the newcomer opts in to holding the player role
 * @returns the engine, world, the original player, and the newcomer
 */
function withSecondActor(opts: { playable: boolean }) {
  const { engine, world, player } = setupTestEngineWithStory();
  const other = world.createEntity('Ada', EntityType.ACTOR);
  other.add(new ActorTrait({ isPlayable: opts.playable }));
  other.add(new IdentityTrait({ name: 'Ada', properName: true, article: '' }));
  world.moveEntity(other.id, world.getLocation(player.id)!);
  return { engine, world, player, other };
}

describe('switchPlayer honours isPlayable (ADR-344 D7)', () => {
  it('switches to an actor that opted in — the world player actually changes', () => {
    const { engine, world, player, other } = withSecondActor({ playable: true });
    expect(world.getPlayer()!.id).toBe(player.id);

    engine.switchPlayer(other.id);

    expect(world.getPlayer()!.id).toBe(other.id);
    expect(engine.getContext().player.id).toBe(other.id);
    expect(other.get<ActorTrait>(TraitType.ACTOR)!.isPlayer).toBe(true);
    expect(player.get<ActorTrait>(TraitType.ACTOR)!.isPlayer).toBe(false);
  });

  it('refuses an actor that did not opt in, naming playability', () => {
    const { engine, other } = withSecondActor({ playable: false });

    expect(() => engine.switchPlayer(other.id)).toThrow(/is not playable/);
  });

  it('the refusal mutates nothing — the original player still holds the role', () => {
    const { engine, world, player, other } = withSecondActor({ playable: false });

    expect(() => engine.switchPlayer(other.id)).toThrow();

    expect(world.getPlayer()!.id).toBe(player.id);
    expect(engine.getContext().player.id).toBe(player.id);
    expect(other.get<ActorTrait>(TraitType.ACTOR)!.isPlayer).toBe(false);
  });

  it('a bare ActorTrait is non-playable, so the default alone refuses the switch', () => {
    const { engine, world, player } = setupTestEngineWithStory();
    const bystander = world.createEntity('bystander', EntityType.ACTOR);
    bystander.add(new ActorTrait());
    world.moveEntity(bystander.id, world.getLocation(player.id)!);

    expect(() => engine.switchPlayer(bystander.id)).toThrow(/is not playable/);
  });
});
