/**
 * face-act-propagation.test.ts — 318-AC4 composed: a witnessed face-act
 * reaches a THIRD NPC's dialogue via propagation, gated under the scene
 * alias (D12a) and under the derived topic name.
 *
 * Composition, all real pieces, no new code paths: the observe sub-step
 * mints the topic on the co-located witness; the witness's propagation
 * profile carries it to a third NPC in a later tick; the third NPC's
 * topic table gates on holding the topic, so the same ASK flips from
 * unknown-topic to the authored line. Assertions land on trait state
 * (the received fact's source) and on the selection result.
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
import type { RandomService, ISemanticEvent } from '@sharpee/core';
import { CharacterPhaseRegistry, createCharacterModelPhase } from '../../src/tick-phases';
import { CharacterModelDialogue } from '../../src/conversation/dialogue-extension';
import type { ConversationData, AuthoredResponse } from '../../src/conversation/builder';
import type { ResponseCandidate } from '../../src/conversation/response-types';

function room(world: WorldModel, name: string): IFEntity {
  const r = world.createEntity(name, 'room');
  r.add(new IdentityTrait({ name }));
  r.add(new RoomTrait());
  r.add(new ContainerTrait());
  return r;
}

function npcIn(world: WorldModel, name: string, at: IFEntity, withModel: boolean): IFEntity {
  const npc = world.createEntity(name, 'actor');
  npc.add(new IdentityTrait({ name }));
  npc.add(new ActorTrait({ isPlayer: false }));
  npc.add(new ContainerTrait());
  npc.add(new NpcTrait({}));
  if (withModel) npc.add(new CharacterModelTrait());
  world.moveEntity(npc.id, at.id);
  return npc;
}

/** Conversation data for the third NPC: one topic gated on holding it. */
function gossipData(topicName: string, keywords: string[], gate: string): ConversationData {
  const candidate: ResponseCandidate = {
    action: 'tell',
    constraints: [],
    messageId: 'gossip-heard-about-it',
  };
  const responses = new Map<string, AuthoredResponse[]>();
  responses.set(`asked about ${topicName}`, [{ candidate } as AuthoredResponse]);
  return {
    topics: [{ name: topicName, keywords, availableWhen: [gate] }],
    responses,
    initiatives: [],
  } as unknown as ConversationData;
}

describe('318-AC4 — witnessed face-act reaches a third NPC via propagation', () => {
  let world: WorldModel;
  let kitchen: IFEntity;
  let cellar: IFEntity;
  let player: IFEntity;
  let registry: CharacterPhaseRegistry;
  let witness: IFEntity;
  let gossip: IFEntity;
  let thief: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    kitchen = room(world, 'Kitchen');
    cellar = room(world, 'Cellar');
    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, kitchen.id);

    registry = new CharacterPhaseRegistry();
    // NPC 1: the actor committing the face-act — no character model
    thief = npcIn(world, 'Thief', kitchen, false);
    // NPC 2: the witness — chatty, tells anyone, everything, at once
    witness = npcIn(world, 'Witness', kitchen, true);
    registry.register(witness.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone', pace: 'eager' },
    });
    // NPC 3: two rooms away from the act — hears it only by propagation
    gossip = npcIn(world, 'Gossip', cellar, true);
    registry.register(gossip.id, {
      propagationProfile: { tendency: 'mute' },
    });
  });

  function tick(turn: number, actionEvents?: ISemanticEvent[]) {
    return createCharacterModelPhase(registry)([witness, gossip, thief], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: kitchen.id,
      playerId: player.id,
      act: unexpectedAct,
      ...(actionEvents ? { actionEvents } : {}),
    });
  }

  /** The thief lifts something off the player — a steal-category face-act. */
  function theftEvent(): ISemanticEvent {
    return {
      id: 'e1',
      type: 'if.event.taken',
      timestamp: 0,
      entities: { actor: thief.id },
      data: { fromLocation: player.id },
    };
  }

  function runScenario(topicName: string, keywords: string[], askText: string) {
    const gossipTrait = gossip.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    gossipTrait.registerPredicate(`knows ${topicName}`, t => t.knows(topicName));

    const dialogue = new CharacterModelDialogue();
    dialogue.registerNpc(
      gossip.id,
      gossipData(topicName, keywords, `knows ${topicName}`),
      gossipTrait,
      () => 4,
    );

    // Before anything happens the topic is gated shut
    expect(dialogue.handleAsk(gossip.id, askText, player.id).messageId)
      .toBe('character.conversation.unknown-topic');

    // Tick 1: the theft is witnessed in the kitchen; the third NPC is in
    // the cellar and learns nothing
    tick(3, [theftEvent()]);
    const witnessTrait = witness.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(witnessTrait.knowledge[topicName]).toMatchObject({ source: 'witnessed' });
    expect(gossipTrait.knows(topicName)).toBe(false);
    expect(dialogue.handleAsk(gossip.id, askText, player.id).messageId)
      .toBe('character.conversation.unknown-topic');

    // Tick 2: the witness has moved next to the third NPC — propagation
    // carries the topic over
    world.moveEntity(witness.id, cellar.id);
    tick(4);
    expect(gossipTrait.knowledge[topicName]).toMatchObject({
      source: 'told',
      confidence: 'believes',
      turnLearned: 4,
    });
    expect(witnessTrait.hasTold(gossip.id, topicName)).toBe(true);

    // The same ASK now selects the gated line — the face-act reached the
    // third NPC's dialogue without anyone scripting the hand-off
    expect(dialogue.handleAsk(gossip.id, askText, player.id).messageId)
      .toBe('gossip-heard-about-it');
  }

  it('gated under the scene alias when the story declares one (D12a)', () => {
    registry.setWitnessedAliases([
      { actor: thief.id, act: 'steal', alias: 'the-kitchen-theft' },
    ]);
    runScenario('the-kitchen-theft', ['theft', 'kitchen theft'], 'the kitchen theft');
  });

  it('gated under the derived topic name when no alias is declared', () => {
    runScenario('Thief stole', ['thief', 'stole'], 'what the thief stole');
  });
});
