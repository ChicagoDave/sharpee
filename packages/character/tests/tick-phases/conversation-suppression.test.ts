/**
 * conversation-suppression.test.ts — ADR-310 D16 lifecycle rule, tick
 * half: a fresh conversation marker suppresses goal-STEP execution in
 * the goal sub-step while activation still re-evaluates ("the goal
 * simply does not act"), and pursuit resumes once the window elapses.
 * Assertions land on trait.goalState (D17), the same probe as the
 * oracle-goals suite: an oracle answering true advances a compiled
 * wait-for step 0 → 1 on any UNsuppressed tick.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { unexpectedAct } from "./scaffold-entry";
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
import { markConversationTurn } from '../../src/conversation/conversation-marker';
import { DEFAULT_DECAY_THRESHOLDS } from '../../src/conversation/lifecycle';
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

describe('D16 — a conversation in progress suppresses goal pursuit', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let registry: CharacterPhaseRegistry;

  beforeEach(() => {
    ({ world, room, player, npc } = makeWorld());
    registry = new CharacterPhaseRegistry();
    registry.register(npc.id, {
      goalDefs: [{
        id: 'plot',
        activatesWhen: [],
        priority: 'high',
        mode: 'sequential',
        steps: [
          { type: 'waitFor', conditions: [], conditionCompiled: COMPILED_COND },
          { type: 'act', messageId: 'next' },
        ],
      }],
    });
    registry.setOracle({
      evalCondition: () => true,
      isKindMember: () => false,
    } satisfies CompiledStoryOracle);
  });

  function runPhaseAtTurn(turn: number) {
    return createCharacterModelPhase(registry)([npc], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
      act: unexpectedAct,
    });
  }

  it('a fresh marker holds the step while activation still re-evaluates', () => {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    markConversationTurn(trait, player.id, 1);

    runPhaseAtTurn(1);

    // Activation happened (the goal is live on the trait) — but the
    // wait-for step the oracle would satisfy did NOT advance.
    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 0 });
  });

  it('the suppression holds through the whole window, then pursuit resumes', () => {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    markConversationTurn(trait, player.id, 1);

    const lastSuppressedTurn = 1 + DEFAULT_DECAY_THRESHOLDS.neutral - 1;
    for (let turn = 1; turn <= lastSuppressedTurn; turn++) {
      runPhaseAtTurn(turn);
      expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 0 });
    }

    runPhaseAtTurn(lastSuppressedTurn + 1);
    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 1 });
  });

  it('an unmarked NPC pursues normally (no marker, no change)', () => {
    const trait = npc.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

    runPhaseAtTurn(1);

    expect(trait.goalState['plot']).toMatchObject({ active: true, currentStep: 1 });
  });
});
