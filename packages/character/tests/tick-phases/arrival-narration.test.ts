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
