/**
 * arrival-narration.test.ts — the platform stays silent when the STORY
 * narrates a fact's arrival itself.
 *
 * The defect this pins: Burbage passing Kemp `the-blow-up` printed the
 * author's staged confrontation AND, on the same turn, the platform's generic
 * "Richard Burbage mentions something to Will Kemp." One moment, told twice.
 * Kemp's rule is `on every turn while second-day and it knows the-blow-up,
 * once` — a TURN-TRIGGERED rule gated on knowing the topic, so it fires on the
 * tick the fact lands and narrates that arrival in the author's words.
 *
 * `arrivalNarratedTopics` carries that set (derived from the compiled story by
 * the loader — authors declare nothing), and the propagation layer reads it.
 * The transfer still HAPPENS; only the platform's narration of it stands down.
 *
 * Fixing it HERE rather than by slowing propagation down matters: the first
 * attempt changed the pace default to one-fact-per-turn, which hid the
 * duplicate but stranded the second fact whenever a pair meets only once —
 * costing Ides the recognition beat that depends on `norwich` reaching Kemp
 * during the single blow-up scene.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { unexpectedAct } from "./scaffold-entry";
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

describe('propagation — the platform does not narrate an arrival the story narrates', () => {
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
  });

  function tick() {
    return createCharacterModelPhase(registry)([speaker, listener], {
      world,
      turn: 1,
      random: {} as unknown as RandomService,
      playerLocation: room.id,
      playerId: player.id,
      act: unexpectedAct,
    });
  }

  function witnessedLines(events: ReturnType<typeof tick>): unknown[] {
    return events.filter(
      (e) =>
        e.type === 'character.propagation.witnessed' ||
        (e.type === 'sound.audibility.heard' &&
          String(
            (e.data as { content?: { messageId?: string } })?.content?.messageId ?? ''
          ).startsWith('character.propagation.witnessed'))
    );
  }

  it('narrates the arrival when the story has no turn-triggered rule for the topic', () => {
    registry.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    // A `mute` profile: the listener never propagates onward, but the
    // sub-step only considers NPCs that carry a profile at all.
    registry.register(listener.id, { propagationProfile: { tendency: 'mute' } });
    expect(witnessedLines(tick()).length).toBeGreaterThan(0);
  });

  it('stays silent when the listener has a turn-triggered rule gated on that topic', () => {
    registry.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['the-blow-up']),
    });
    expect(witnessedLines(tick())).toEqual([]);
  });

  it('still delivers the fact — only the narration stands down', () => {
    registry.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['the-blow-up']),
    });
    tick();
    const listenerTrait = listener.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(listenerTrait.knows('the-blow-up')).toBe(true);
  });

  it('a topic the story does not react to is still narrated', () => {
    registry.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    // Gated on a DIFFERENT topic — no reason for the platform to stand down.
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['some-other-matter']),
    });
    expect(witnessedLines(tick()).length).toBeGreaterThan(0);
  });
});

/**
 * GH #353 — the other half of the contract: the story's reaction runs ON the
 * tick the fact lands, not on the scheduler's next pass. The registry carries
 * the reaction (bound at load, like the oracle); `recordTransfer` calls it
 * right after the fact is written and splices its events into the tick.
 * This fixture has no scene runtime, so it exercises the plain path; the
 * scene-wrapped path is the story-loader real-path test's.
 */
describe('propagation — the story reacts to an arrival on the tick it lands', () => {
  let world: WorldModel;
  let yard: IFEntity;
  let tavern: IFEntity;
  let player: IFEntity;
  let speaker: IFEntity;
  let listener: IFEntity;
  let registry: CharacterPhaseRegistry;
  let received: Array<{ listenerId: string; speakerId: string; topic: string; roomId: string; turn: number }>;

  beforeEach(() => {
    world = new WorldModel();
    yard = world.createEntity('Yard', 'room');
    yard.add(new ContainerTrait());
    tavern = world.createEntity('Tavern', 'room');
    tavern.add(new ContainerTrait());

    player = world.createEntity('Player', 'actor');
    player.add(new IdentityTrait({ name: 'Player' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    world.setPlayer(player.id);
    world.moveEntity(player.id, yard.id);

    speaker = npcIn(world, 'Burbage', yard);
    listener = npcIn(world, 'Kemp', yard);

    const trait = speaker.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    trait.knowledge['the-blow-up'] = { source: 'witnessed', confidence: 'certain', turnLearned: 0 };

    registry = new CharacterPhaseRegistry();
    registry.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    received = [];
    // The story's reaction: record what arrived, move the listener out of
    // the room (a real state change), and narrate in the story's own words.
    registry.setArrivalReaction((arrival, w) => {
      received.push(arrival);
      w.moveEntity(arrival.listenerId, tavern.id);
      return [
        {
          id: 'story-reaction',
          type: 'chord.phrase',
          timestamp: 0,
          entities: { actor: arrival.listenerId },
          data: { phraseKey: 'kemp-storms-off', topic: arrival.topic },
        },
      ];
    });
  });

  function tick(turn = 3) {
    return createCharacterModelPhase(registry)([speaker, listener], {
      world,
      turn,
      random: {} as unknown as RandomService,
      playerLocation: yard.id,
      playerId: player.id,
      act: unexpectedAct,
    });
  }

  it('invokes the reaction with the landed fact, and its events join the tick', () => {
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['the-blow-up']),
    });
    expect(world.getLocation(listener.id)).toBe(yard.id);

    const events = tick(3);

    expect(received).toEqual([
      { listenerId: listener.id, speakerId: speaker.id, topic: 'the-blow-up', roomId: yard.id, turn: 3 },
    ]);
    // The fact is written before the reaction sees it.
    const listenerTrait = listener.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(listenerTrait.knows('the-blow-up')).toBe(true);
    // The reaction's state change landed on the tick.
    expect(world.getLocation(listener.id)).toBe(tavern.id);
    // Its narration rides the tick's stream; the platform's own line does not.
    expect(events.some((e) => e.type === 'chord.phrase' && (e.data as { phraseKey?: string }).phraseKey === 'kemp-storms-off')).toBe(true);
    expect(events.some((e) => e.type === 'character.propagation.witnessed')).toBe(false);
  });

  it('is not invoked when the listener already knew the topic', () => {
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['the-blow-up']),
    });
    const listenerTrait = listener.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    listenerTrait.knowledge['the-blow-up'] = { source: 'witnessed', confidence: 'certain', turnLearned: 0 };

    tick(3);

    expect(received).toEqual([]);
    expect(world.getLocation(listener.id)).toBe(yard.id);
  });

  it('does nothing when no reaction is bound — the fact still lands, silently', () => {
    const bare = new CharacterPhaseRegistry();
    bare.register(speaker.id, {
      propagationProfile: { tendency: 'chatty', audience: 'anyone' },
    });
    bare.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['the-blow-up']),
    });

    const events = createCharacterModelPhase(bare)([speaker, listener], {
      world,
      turn: 3,
      random: {} as unknown as RandomService,
      playerLocation: yard.id,
      playerId: player.id,
      act: unexpectedAct,
    });

    const listenerTrait = listener.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(listenerTrait.knows('the-blow-up')).toBe(true);
    expect(world.getLocation(listener.id)).toBe(yard.id);
    expect(events.some((e) => e.type === 'chord.phrase')).toBe(false);
    expect(events.some((e) => e.type === 'character.propagation.witnessed')).toBe(false);
  });

  it('is not invoked for a topic the story has no turn-triggered rule for', () => {
    registry.register(listener.id, {
      propagationProfile: { tendency: 'mute' },
      arrivalNarratedTopics: new Set(['some-other-matter']),
    });

    const events = tick(3);

    expect(received).toEqual([]);
    // The fact still lands, the platform narrates it, the listener stays put.
    const listenerTrait = listener.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
    expect(listenerTrait.knows('the-blow-up')).toBe(true);
    expect(world.getLocation(listener.id)).toBe(yard.id);
    expect(events.some((e) => e.type === 'character.propagation.witnessed')).toBe(true);
  });
});
