/**
 * presence-location.test.ts — the ADR-328 D3 producer half on the
 * propagation `witnessed` event: it carries the speaker as `entities.actor`
 * and the room the transfer happened in as `entities.location`, so the
 * engine's enrichment funnel can tag presence. The `roomId ===
 * playerLocation` gate that decides whether the event is emitted at all is
 * unchanged here (Phase 2b retires it).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  WorldModel,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  NpcTrait,
  CharacterModelTrait,
  TraitType,
  type IFEntity,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';

function npcIn(world: WorldModel, name: string, at: IFEntity): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  npc.add(new CharacterModelTrait());
  world.moveEntity(npc.id, at.id);
  return npc;
}

describe('propagation witnessed event is located (ADR-328 D3)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let speaker: IFEntity;
  let listener: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Yard', 'room');
    room.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);

    speaker = npcIn(world, 'Burbage', room);
    listener = npcIn(world, 'Kemp', room);

    const trait = speaker.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.knowledge['the-blow-up'] = { source: 'witnessed', confidence: 'certain', turnLearned: 0 };

    registry = new CharacterPhaseRegistry();
    registry.register(speaker.id, { propagationProfile: { tendency: 'chatty', audience: 'anyone' } });
    registry.register(listener.id, { propagationProfile: { tendency: 'mute' } });
  });

  it('carries the speaker as actor and the room as location', () => {
    const events = createCharacterModelPhase(registry)([speaker, listener], {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
    });
    const witnessed = events.filter((e) => e.type === 'character.propagation.witnessed');
    expect(witnessed.length).toBeGreaterThan(0);
    for (const e of witnessed) {
      expect(e.entities.actor).toBe(speaker.id);
      expect(e.entities.location).toBe(room.id);
    }
  });
});
