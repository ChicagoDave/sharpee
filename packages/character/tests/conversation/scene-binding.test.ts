/**
 * Scene-runtime binding floor tests (ADR-320 D7/D10; Phase 6) — derived
 * from the floorWinnerFor Behavior Statement: bids are built from the
 * runtime-owned speak-propensity curve over REAL store-resident scenes,
 * authored rows most-specific-win, and the player and unmodeled
 * participants never bid.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  CharacterModelTrait,
  TraitType,
} from '@sharpee/world-model';
import {
  createSceneRuntimeBinding,
  createMapMemoryAccess,
  openScene,
} from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

describe('floorWinnerFor (ADR-320 D7/D10)', () => {
  let world: WorldModel;
  let impulsiveRoss: IFEntity;
  let quietJohn: IFEntity;
  let player: IFEntity;

  function makeActor(name: string, personality?: Record<string, number>): IFEntity {
    const actor = world.createEntity(name, 'actor');
    actor.add(new IdentityTrait({ name }));
    actor.add(new ActorTrait({ isPlayer: false }));
    actor.add(new ContainerTrait());
    actor.add(new CharacterModelTrait(personality ? { personality: personality as never } : {}));
    return actor;
  }

  beforeEach(() => {
    world = new WorldModel();
    world.setStateValue(CHARACTER_TURN_KEY, 1);
    impulsiveRoss = makeActor('Ross', { impulsive: 0.8 });
    quietJohn = makeActor('John', { curious: 0.3 });
    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
  });

  function openThreeWayScene(): string {
    const { scene } = openScene(world, {
      participantIds: [impulsiveRoss.id, quietJohn.id, player.id],
      openedBy: { kind: 'witnessed-event', eventId: 'evt-shadow' },
    });
    return scene.id;
  }

  it('the higher personality propensity seizes the open floor; every bid is retained', () => {
    const binding = createSceneRuntimeBinding(world, createMapMemoryAccess());
    const sceneId = openThreeWayScene();

    const decision = binding.floorWinnerFor(sceneId, { kind: 'open-floor', sceneId });

    expect(decision.winnerId).toBe(impulsiveRoss.id);
    // The player never bids; both NPCs do (losers' manner still reacts)
    expect(decision.bids.map((b) => b.participantId).sort()).toEqual(
      [impulsiveRoss.id, quietJohn.id].sort(),
    );
  });

  it('fear suppresses: a cornered character loses the floor they would otherwise take (D7)', () => {
    const binding = createSceneRuntimeBinding(world, createMapMemoryAccess());
    const trait = impulsiveRoss.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.threatValue = 100; // damp = 1 → net propensity 0

    const sceneId = openThreeWayScene();
    const decision = binding.floorWinnerFor(sceneId, { kind: 'open-floor', sceneId });

    expect(decision.winnerId).toBe(quietJohn.id);
  });

  it('authored rows beat disposition both ways (D7 most-specific-wins)', () => {
    const binding = createSceneRuntimeBinding(world, createMapMemoryAccess(), {
      authoredFor: (participantId) =>
        participantId === impulsiveRoss.id ? 'suppresses'
          : participantId === quietJohn.id ? 'forces'
          : undefined,
    });

    const sceneId = openThreeWayScene();
    const decision = binding.floorWinnerFor(sceneId, { kind: 'open-floor', sceneId });

    expect(decision.winnerId).toBe(quietJohn.id);
  });

  it('a dead scene id resolves to nobody with no bids', () => {
    const binding = createSceneRuntimeBinding(world, createMapMemoryAccess());

    expect(binding.floorWinnerFor('scene-999', { kind: 'open-floor', sceneId: 'scene-999' }))
      .toEqual({ winnerId: null, bids: [] });
  });

  it('the breaking pressure band compels a bid even under full fear damp (D7)', () => {
    const binding = createSceneRuntimeBinding(world, createMapMemoryAccess());
    const trait = impulsiveRoss.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.threatValue = 100;
    trait.pressure.value = 1;
    trait.pressure.band = 'breaking';
    const johnTrait = quietJohn.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    johnTrait.threatValue = 100; // both damped; only breaking duty is live

    const sceneId = openThreeWayScene();
    const decision = binding.floorWinnerFor(sceneId, { kind: 'open-floor', sceneId });

    expect(decision.winnerId).toBe(impulsiveRoss.id);
  });
});
