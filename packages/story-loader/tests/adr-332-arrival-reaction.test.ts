/**
 * adr-332-arrival-reaction.test.ts — GH #353 / ADR-332 D4a on the REAL path:
 * an `on every turn while <npc> knows <topic>, once` clause fires on the turn
 * the topic ARRIVES by propagation, not on the scheduler's next pass.
 *
 * The contract (`tick-phases.ts` `arrivalNarratedTopics`, `loader.ts`
 * `arrivalNarratedTopicsOf`): the story narrates the arrival in its own
 * words on that tick, and the platform's generic "mentions something" line
 * stands down. ADR-332 put the scheduler ahead of the actor phase, so the
 * clause's own daemon now runs before propagation; the arrival reaction the
 * loader binds on the character registry is what keeps the promise.
 *
 * No doubles: a real Chord compile, the real loader binding the reaction,
 * the real engine's scheduler and actor phase in ADR-332's order, driven by
 * `GameEngine.executeTurn`; state read back from the world and the
 * occurrence key, events from the engine's own stream.
 *
 * Owner context: story-loader tests (rule 13a real-path gate for the
 * arrival reaction).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { CharacterModelTrait, EntityType, TraitType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

/**
 * Burbage knows the blow-up and tells anyone. Kemp's rule is gated on
 * knowing it and moves him out of the Yard — a state change the arrival turn
 * must show. Kemp carries a `spreads` line so the propagation sub-step
 * considers him a listener at all (it only pairs profiled NPCs); the topic
 * he would spread is one nobody knows.
 */
const SOURCE = `story
  title: Arrival
  authors:
    T
  id: arrival
  story-version: 0.0.1

create the Yard
  a room

  A yard.

create the Tavern
  a room

  A tavern.

create Burbage
  a person, proper
  in the Yard
  knows the-blow-up, witnessed, certain
  spreads the-blow-up to anyone

  A tragedian.

create Kemp
  a person, proper
  in the Yard
  mood cheerful
  spreads the-weather to anyone

  A clown.

  on every turn while Kemp knows the-blow-up, once
    change mood to angry
    phrase kemp-storms-off
      Kemp bows and walks out toward the tavern.
    move Kemp to the Tavern
  end on

create Alex
  a person
  playable
  starts in the Yard

  You.

before the game starts
  change the player to Alex
end before
`;

/** Kemp's one every-turn clause is his clause 0. */
const ONCE_KEY = 'chord.occurrence.entity-turn.kemp.0';

interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** Run one command and return only the events of that turn, in stream order. */
  turn: (input: string) => Promise<ISemanticEvent[]>;
}

async function boot(seed = 7): Promise<Booted> {
  const story = createStory(compileSource(SOURCE), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  const engine = new GameEngine({
    world,
    player: placeholder,
    parser,
    language,
    perceptionService: new PerceptionService(),
    config: { seed, onEvent: (e) => stream.push(e) },
  });
  engine.setStory(story);
  story.extendParser(parser);
  world.removeEntity(placeholder.id);
  await engine.start();
  const turn = async (input: string) => {
    const from = stream.length;
    await engine.executeTurn(input);
    return stream.slice(from);
  };
  return { engine, story, world, player: world.getPlayer()!, turn };
}

const worldId = (b: Booted, irId: string): string => b.story.entityId(irId)!;
const kempTrait = (b: Booted): CharacterModelTrait =>
  b.world.getEntity(worldId(b, 'kemp'))!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

const stormOffs = (events: ISemanticEvent[]) =>
  events.filter(
    (e) => e.type === 'chord.phrase' && String((e.data as { messageId?: string }).messageId ?? '').endsWith('kemp-storms-off'),
  );

/** The platform's own narration of a transfer — direct, or through the sound path. */
const platformMentions = (events: ISemanticEvent[]) =>
  events.filter(
    (e) =>
      e.type === 'character.propagation.witnessed' ||
      (e.type === 'sound.audibility.heard' &&
        String((e.data as { content?: { messageId?: string } })?.content?.messageId ?? '').startsWith(
          'character.propagation.witnessed',
        )),
  );

describe('GH #353 — an arrival-gated every-turn clause fires on the arrival turn', () => {
  it('the clause runs on the turn the fact lands: state changes, once is spent, the story narrates', async () => {
    const b = await boot();
    expect(kempTrait(b).knows('the-blow-up')).toBe(false);
    expect(b.world.getLocation(worldId(b, 'kemp'))).toBe(worldId(b, 'yard'));
    expect(b.world.getStateValue(ONCE_KEY)).toBeUndefined();

    const events = await b.turn('wait');

    // The fact arrived this turn …
    expect(kempTrait(b).knows('the-blow-up')).toBe(true);
    // … and the clause's mutations landed on the same turn, not the next.
    expect(b.world.getLocation(worldId(b, 'kemp'))).toBe(worldId(b, 'tavern'));
    expect(kempTrait(b).getMood()).toBe('angry');
    expect(b.world.getStateValue(ONCE_KEY)).toBe(1);
    // The story narrated the arrival; the platform's generic line stood down.
    expect(stormOffs(events)).toHaveLength(1);
    expect(platformMentions(events)).toEqual([]);
    // The line is placed where Kemp stood when the clause fired — the Yard he
    // walks out of, not the Tavern his own `move` put him in — so the player
    // standing in the Yard is present to it (ADR-328 D3).
    const stormOff = stormOffs(events)[0];
    expect(stormOff.entities.location).toBe(worldId(b, 'yard'));
    expect(stormOff.entities.actor).toBe(worldId(b, 'kemp'));
    expect((stormOff as { presence?: string }).presence).toBe('present');
  });

  it('the scheduler does not fire the spent clause again on the next turn', async () => {
    const b = await boot();
    await b.turn('wait');
    expect(b.world.getStateValue(ONCE_KEY)).toBe(1);

    const events = await b.turn('wait');

    expect(b.world.getStateValue(ONCE_KEY)).toBe(1);
    expect(stormOffs(events)).toEqual([]);
    expect(b.world.getLocation(worldId(b, 'kemp'))).toBe(worldId(b, 'tavern'));
  });
});
