/**
 * oracle-goals.test.ts — ADR-310/318 Phase 5: compiled Chord conditions
 * (goal `active when`, `wait for`) evaluate through the story oracle
 * bound on the CharacterPhaseRegistry; a compiled condition with no
 * oracle bound throws loudly. Assertions land on trait.goalState — the
 * mutable pursuit state the conditions gate (D17).
 */
import { describe, expect, it, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  NpcTrait,
  CharacterModelTrait,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  ActorTrait,
  TraitType,
} from '@sharpee/world-model';
import type { RandomService } from '@sharpee/core';
import type { IRCondition } from '@sharpee/chord';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import type { CompiledStoryOracle } from '../../src/story-oracle';

const COMPILED_COND: IRCondition = { kind: 'story-state', state: 'after-hours' };

function makeWorld() {
  const world = new WorldModel();
  const room = world.createEntity('Kitchen', 'room');
  room.add(new IdentityTrait({ name: 'Kitchen' }));
  room.add(new RoomTrait());
  room.add(new ContainerTrait());
  const player = world.createEntity('Player', 'actor');
  player.add(new IdentityTrait({ name: 'Player' }));
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.setPlayer(player.id);
  world.moveEntity(player.id, room.id);
  const npc = world.createEntity('Cook', 'actor');
  npc.add(new IdentityTrait({ name: 'Cook' }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  npc.add(new CharacterModelTrait());
  world.moveEntity(npc.id, room.id);
  return { world, room, player, npc };
}

function runPhase(registry: CharacterPhaseRegistry, world: WorldModel, npc: IFEntity, room: IFEntity, player: IFEntity) {
  return createCharacterModelPhase(registry)([npc], {
    world,
    turn: 1,
    random: {} as unknown as RandomService,
    playerLocation: room.id,
    playerId: player.id,
  });
}

describe('Phase 5 — compiled conditions through the story oracle', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    ({ world, room, player, npc } = makeWorld());
    registry = new CharacterPhaseRegistry();
  });

  function registerGoal(overrides: { activeWhenCompiled?: IRCondition; waitForCompiled?: IRCondition }) {
    registry.register(npc.id, {
      goalDefs: [{
        id: 'plot',
        activatesWhen: [],
        ...(overrides.activeWhenCompiled ? { activeWhenCompiled: overrides.activeWhenCompiled } : {}),
        priority: 'high',
        mode: 'sequential',
        // The default step waits on an unsatisfied string predicate so a
        // freshly activated goal STAYS active (a completed goal deactivates
        // in the same tick, which would hide the activation under test).
        steps: overrides.waitForCompiled
          ? [{ type: 'waitFor', conditions: [], conditionCompiled: overrides.waitForCompiled }, { type: 'act', messageId: 'next' }]
          : [{ type: 'waitFor', conditions: ['threatened'] }],
      }],
    });
  }

  function oracle(answer: boolean, calls: Array<{ cond: IRCondition; self: string }> = []): CompiledStoryOracle {
    return {
      evalCondition: (cond, opts) => {
        calls.push({ cond, self: opts.self });
        return answer;
      },
      isKindMember: () => false,
    };
  }

  it('activation: the oracle answering true activates the goal on the trait, with the NPC as self', () => {
    const calls: Array<{ cond: IRCondition; self: string }> = [];
    registerGoal({ activeWhenCompiled: COMPILED_COND });
    registry.setOracle(oracle(true, calls));

    runPhase(registry, world, npc, room, player);

    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 0 });
    expect(calls).toEqual([{ cond: COMPILED_COND, self: npc.id }]);
  });

  it('activation: the oracle answering false leaves the goal inactive', () => {
    registerGoal({ activeWhenCompiled: COMPILED_COND });
    registry.setOracle(oracle(false));

    runPhase(registry, world, npc, room, player);

    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(trait.goalState['plot']?.active ?? false).toBe(false);
  });

  it('wait-for: the oracle gates step completion — false waits, true advances the step on the trait', () => {
    registerGoal({ waitForCompiled: COMPILED_COND });
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    registry.setOracle(oracle(false));
    runPhase(registry, world, npc, room, player);
    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 0 });

    registry.setOracle(oracle(true));
    runPhase(registry, world, npc, room, player);
    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 1 });
  });

  it('a compiled activation condition with no oracle bound throws loudly', () => {
    registerGoal({ activeWhenCompiled: COMPILED_COND });
    expect(() => runPhase(registry, world, npc, room, player)).toThrow(/no story oracle is bound/);
  });

  it('a compiled wait-for condition with no oracle bound throws loudly', () => {
    registerGoal({ waitForCompiled: COMPILED_COND });
    expect(() => runPhase(registry, world, npc, room, player)).toThrow(/no story oracle is bound/);
  });
});
