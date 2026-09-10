/**
 * Pins the character tick's sub-step list: the seven names in order, every
 * `requires` satisfied by an earlier entry, a violation reported by name,
 * and one tick running each sub-step exactly once in list order.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/character tests — tick phase.
 *
 * References:
 *   ADR-339 D3 — the order is data with per-step requires, pinned here.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unexpectedAct } from './scaffold-entry';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  CharacterModelTrait,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import {
  CHARACTER_TICK_SUB_STEPS,
  CharacterPhaseRegistry,
  createCharacterModelPhase,
  subStepOrderViolations,
  type TickSubStep,
} from '../../src/tick-phases';

const EXPECTED_ORDER = ['decay', 'observe', 'influence', 'propagation', 'goals', 'scenes', 'arrival-reactions'];

describe('character tick sub-step order (ADR-339 D3)', () => {
  it('lists the seven sub-steps in the contract order', () => {
    expect(CHARACTER_TICK_SUB_STEPS.map((s) => s.name)).toEqual(EXPECTED_ORDER);
  });

  it('places every sub-step after everything it requires', () => {
    expect(subStepOrderViolations(CHARACTER_TICK_SUB_STEPS)).toEqual([]);
  });

  it('names both sub-steps when one is moved ahead of something it requires', () => {
    const swapped: TickSubStep[] = [...CHARACTER_TICK_SUB_STEPS];
    const scenes = swapped.findIndex((s) => s.name === 'scenes');
    const goals = swapped.findIndex((s) => s.name === 'goals');
    [swapped[scenes], swapped[goals]] = [swapped[goals], swapped[scenes]];
    const violations = subStepOrderViolations(swapped);
    expect(violations).toContain("'scenes' requires 'goals', which runs after it");
  });

  it('reports a requirement that is not in the list', () => {
    const missing: TickSubStep[] = [{ name: 'lonely', requires: ['ghost'], run: () => [] }];
    expect(subStepOrderViolations(missing)).toEqual(["'lonely' requires 'ghost', which is not in the list"]);
  });

  describe('one tick over two modeled NPCs', () => {
    let world: WorldModel;
    let room: IFEntity;
    let player: IFEntity;
    let npcs: IFEntity[];

    beforeEach(() => {
      world = new WorldModel();
      room = world.createEntity('Tiring House', 'room');
      room.add(new IdentityTrait({ name: 'Tiring House' }));
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      player = world.createEntity('Player', 'actor');
      player.add(new IdentityTrait({ name: 'Player' }));
      player.add(new ActorTrait({ isPlayer: true }));
      player.add(new ContainerTrait());
      world.setPlayer(player.id);
      world.moveEntity(player.id, room.id);

      npcs = ['Will Kemp', 'Richard Burbage'].map((name) => {
        const npc = world.createEntity(name, 'actor');
        npc.add(new IdentityTrait({ name }));
        npc.add(new ActorTrait());
        npc.add(new ContainerTrait());
        npc.add(new CharacterModelTrait());
        world.moveEntity(npc.id, room.id);
        return npc;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('runs each sub-step exactly once, in list order', () => {
      const spies = CHARACTER_TICK_SUB_STEPS.map((step) => vi.spyOn(step, 'run'));

      createCharacterModelPhase(new CharacterPhaseRegistry())(npcs, {
        world,
        turn: 1,
        random: {} as unknown as RandomService,
        playerLocation: room.id,
        playerId: player.id,
        act: unexpectedAct,
      });

      for (const [index, spy] of spies.entries()) {
        expect(spy, `${EXPECTED_ORDER[index]} ran ${spy.mock.calls.length} times`).toHaveBeenCalledTimes(1);
      }
      const callOrder = spies.map((spy) => spy.mock.invocationCallOrder[0]);
      expect([...callOrder].sort((a, b) => a - b)).toEqual(callOrder);
    });
  });
});
