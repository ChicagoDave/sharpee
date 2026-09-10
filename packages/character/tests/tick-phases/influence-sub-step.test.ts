/**
 * The influence sub-step through the real tick: a passive room-range
 * influence registered on one modeled NPC lands, after one tick, as an
 * influence in force on the trait of a modeled NPC in the same room; when
 * the influencer leaves, the next tick expires it by separation. Asserts on
 * the target's trait state, not on the events the tick emits.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/character tests — tick phase.
 *
 * References:
 *   ADR-146 — influence and resistance.
 *   ADR-310 D8/D17 — records mark levels; state rides the trait.
 *   ADR-339 D1 — the sub-step body lives in influence/influence-sub-step.ts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  NpcTrait,
  CharacterModelTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import { isUnderInfluence, type InfluenceDef } from '../../src/influence';
import { unexpectedAct } from './scaffold-entry';

const CALMING: InfluenceDef = {
  name: 'calming',
  mode: 'passive',
  range: 'room',
  effect: { mood: 'at ease' },
  duration: 'while present',
  witnessed: 'priest-presence-calms-{target}',
};

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function actorIn(world: WorldModel, name: string, at: IFEntity, opts?: { player?: boolean; model?: boolean }): IFEntity {
  const e = world.createEntity(name, 'actor');
  e.add(new IdentityTrait({ name }));
  e.add(new ActorTrait({ isPlayer: opts?.player ?? false }));
  e.add(new ContainerTrait());
  if (!opts?.player) e.add(new NpcTrait({}));
  if (opts?.model) e.add(new CharacterModelTrait());
  world.moveEntity(e.id, at.id);
  return e;
}

describe('influence sub-step through the tick', () => {
  let world: WorldModel;
  let chapel: IFEntity;
  let vestry: IFEntity;
  let player: IFEntity;
  let priest: IFEntity;
  let widow: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    world = new WorldModel();
    chapel = room(world, 'Chapel');
    vestry = room(world, 'Vestry');
    player = actorIn(world, 'Player', vestry, { player: true });
    world.setPlayer(player.id);
    priest = actorIn(world, 'Priest', chapel, { model: true });
    widow = actorIn(world, 'Widow', chapel, { model: true });
    registry = new CharacterPhaseRegistry();
    registry.register(priest.id, { influenceDefs: [CALMING] });
    registry.register(widow.id, {});
  });

  function tick(turn: number): void {
    createCharacterModelPhase(registry)([priest, widow], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: vestry.id,
      playerId: player.id,
      act: unexpectedAct,
    });
  }

  it('records a room-range passive influence on the co-located target after one tick', () => {
    const widowTrait = widow.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(isUnderInfluence(widowTrait, 'calming')).toBe(false);

    tick(1);

    expect(isUnderInfluence(widowTrait, 'calming')).toBe(true);
    const record = widowTrait.influencesInForce.find((f) => f.influenceName === 'calming');
    expect(record?.influencerId).toBe(priest.id);
  });

  it('expires the influence by separation on the tick after the influencer leaves', () => {
    const widowTrait = widow.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    tick(1);
    expect(isUnderInfluence(widowTrait, 'calming')).toBe(true);

    world.moveEntity(priest.id, vestry.id);
    tick(2);

    expect(isUnderInfluence(widowTrait, 'calming')).toBe(false);
  });
});
