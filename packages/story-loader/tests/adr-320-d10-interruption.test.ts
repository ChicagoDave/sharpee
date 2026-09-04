/**
 * adr-320-d10-interruption.test.ts — ADR-320 D10 / D10a on the REAL path: an
 * NPC whose `opens when` thread is ready takes the floor from the scene the
 * player is seated in with another partner — on the turn it becomes ready,
 * not a round late — parking the outgoing thread with its `on parting`
 * line, and the outgoing partner resumes where he left off when the hand
 * comes back (GH #348, the W-10 dance's missing primitive).
 *
 * No doubles: a real Chord compile (the W-10 prototype's shape, two hands),
 * the real loader binding the scene runtime, the real engine's scheduler
 * (the hand timer) and actor phase in ADR-332's order, driven by
 * `GameEngine.executeTurn`; state read back from the scene store and the
 * partners' thread state, events from the engine's own stream.
 *
 * Owner context: story-loader tests (rule 13a real-path gate for the
 * interruption facet; `packages/character`'s scene runtime is the OWNED
 * dependency this exercises without a stub).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { CharacterModelTrait, EntityType, TraitType, WorldModel, sceneWith, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';
import { compileSource } from './helpers/boot-engine';

/**
 * Two hands. The dance's `hand` timer has one named turn, so a hand lasts
 * two turns; its expiry flips which partner is `dancing`. Each partner's
 * thread opens itself while dancing. With `gated`, every beat is also held
 * on dancing — the W-10 prototype's original hold gates. Without it the
 * beats are bare, which is what GH #354 (ruled 2026-09-03) makes correct:
 * the platform resolves the hand-off order, not the story's gates.
 */
function source(gated: boolean): string {
  const gate = (who: string) => (gated ? `beat, when ${who} is dancing:` : 'beat:');
  return `story
  title: Two Hands
  authors:
    T
  id: two-hands
  story-version: 0.0.1

define timer hand for the dance
  turning
end timer

create the Ballroom
  a room

  A ballroom.

create the dance
  scenery
  states, reversible: first, second
  in the Ballroom

  The circles.

  when hand expires
    select on the dance's state
      when first
        change the dance to second
        change Jacobs to waiting
        change the Princess to dancing
        phrase hand-off
      when second
        change the dance to first
        change the Princess to waiting
        change Jacobs to dancing
        phrase hand-off
    end select
    restart hand
  end when

create Jacobs
  a person, proper
  states, reversible: dancing, waiting
  mood calm
  in the Ballroom

  Jacobs.

define conversation jacobs-hand for Jacobs, passive
  opens when Jacobs is dancing
  ${gate('Jacobs')}
    phrase jacobs-beat-one
  ${gate('Jacobs')}
    phrase jacobs-beat-two
  ${gate('Jacobs')}
    phrase jacobs-beat-three
  on parting:
    phrase jacobs-parting
  on resuming:
    phrase jacobs-resuming
  conclusion:
    phrase jacobs-conclusion
end conversation

create the Princess
  a person, proper
  states, reversible: waiting, dancing
  mood calm
  in the Ballroom

  The Princess.

define conversation princess-hand for the Princess, passive
  opens when the Princess is dancing
  ${gate('the Princess')}
    phrase princess-beat-one
  ${gate('the Princess')}
    phrase princess-beat-two
  on parting:
    phrase princess-parting
  on resuming:
    phrase princess-resuming
  conclusion:
    phrase princess-conclusion
end conversation

create Jacqueline
  a person, proper
  playable
  starts in the Ballroom

  You.

before the game starts
  change the player to Jacqueline
  start the dance's hand
end before

define phrase hand-off
  The circle turns.
end phrase
define phrase jacobs-beat-one
  Jacobs, one.
end phrase
define phrase jacobs-beat-two
  Jacobs, two.
end phrase
define phrase jacobs-beat-three
  Jacobs, three.
end phrase
define phrase jacobs-parting
  Jacobs, parting.
end phrase
define phrase jacobs-resuming
  Jacobs, resuming.
end phrase
define phrase jacobs-conclusion
  Jacobs, done.
end phrase
define phrase princess-beat-one
  Princess, one.
end phrase
define phrase princess-beat-two
  Princess, two.
end phrase
define phrase princess-parting
  Princess, parting.
end phrase
define phrase princess-resuming
  Princess, resuming.
end phrase
define phrase princess-conclusion
  Princess, done.
end phrase
`;
}

const SOURCE = source(true);

interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** Run one command and return only the events of that turn, in stream order. */
  turn: (input: string) => Promise<ISemanticEvent[]>;
}

async function boot(seed = 7, text: string = SOURCE): Promise<Booted> {
  const story = createStory(compileSource(text), { seed });
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
const traitOf = (b: Booted, irId: string): CharacterModelTrait =>
  b.world.getEntity(worldId(b, irId))!.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
const thread = (b: Booted, irId: string, key: string) => traitOf(b, irId).conversationThreads?.[b.player.id]?.[key];
const seatedWith = (b: Booted): Set<string> | undefined => {
  const scene = sceneWith(b.world, b.player.id);
  return scene ? new Set(scene.participantIds) : undefined;
};
/** Events of a turn whose payload mentions a phrase key (direct or through the sound path). */
const mentioning = (events: ISemanticEvent[], key: string) =>
  events.filter((e) => JSON.stringify(e.data ?? {}).includes(key));

describe('ADR-320 D10a — an opens-when partner takes the floor on the hand-off turn', () => {
  it('turn 1: Jacobs opens his scene with the player and speaks his first beat', async () => {
    const b = await boot();
    const events = await b.turn('wait');

    expect(seatedWith(b)).toEqual(new Set([worldId(b, 'jacobs'), b.player.id]));
    expect(thread(b, 'jacobs', 'jacobs-hand')).toMatchObject({ status: 'active' });
    expect(mentioning(events, 'jacobs-beat-one').length).toBeGreaterThan(0);
    expect(thread(b, 'princess', 'princess-hand')).toBeUndefined();
  });

  it('the hand-off turn: the Princess interrupts, Jacobs parks with his parting line, she speaks — same turn', async () => {
    const b = await boot();
    await b.turn('wait');
    const events = await b.turn('wait');

    // The story's own clock passed the hand this turn.
    expect(mentioning(events, 'hand-off').length).toBeGreaterThan(0);
    // Persisted state: the player is seated with the Princess now, not Jacobs.
    expect(seatedWith(b)).toEqual(new Set([worldId(b, 'princess'), b.player.id]));
    expect(sceneWith(b.world, worldId(b, 'jacobs'))).toBeUndefined();
    // Jacobs's thread parked at its cursor, not concluded, not lost.
    const parked = thread(b, 'jacobs', 'jacobs-hand');
    expect(parked?.status).toBe('parked');
    expect(parked?.beatCursor).toBeGreaterThanOrEqual(1);
    // The Princess's thread is open and her first beat landed THIS turn.
    expect(thread(b, 'princess', 'princess-hand')).toMatchObject({ status: 'active' });
    expect(mentioning(events, 'princess-beat-one').length).toBeGreaterThan(0);
    // The wire: the challenge yielded, and the parting line rendered.
    const interruption = events.find((e) => e.type === 'character.scene.interruption');
    expect(interruption?.data).toMatchObject({ interrupterId: worldId(b, 'princess'), outcome: 'yields' });
    const parting = events.find((e) => e.type === 'character.thread.parting');
    expect(parting?.data).toMatchObject({ ownerId: worldId(b, 'jacobs'), partnerId: b.player.id });
    expect(mentioning(events, 'jacobs-parting').length).toBeGreaterThan(0);
  });

  it('the hand comes back: the Princess parks in turn and Jacobs resumes where he left off', async () => {
    const b = await boot();
    await b.turn('wait');
    await b.turn('wait');
    const cursorWhenParked = thread(b, 'jacobs', 'jacobs-hand')!.beatCursor;
    await b.turn('wait');
    const events = await b.turn('wait');

    expect(mentioning(events, 'hand-off').length).toBeGreaterThan(0);
    expect(seatedWith(b)).toEqual(new Set([worldId(b, 'jacobs'), b.player.id]));
    expect(thread(b, 'princess', 'princess-hand')?.status).toBe('parked');
    expect(mentioning(events, 'princess-parting').length).toBeGreaterThan(0);
    const resumed = thread(b, 'jacobs', 'jacobs-hand');
    expect(resumed?.status).toBe('active');
    expect(resumed?.beatCursor).toBe(cursorWhenParked);
    expect(mentioning(events, 'jacobs-resuming').length).toBeGreaterThan(0);
  });
});

describe('GH #354 — with no per-beat hold gates, the hand-off order follows `opens when`, not entity id', () => {
  const BARE = source(false);

  it('the reproduction condition holds: the seated owner\'s id sorts before the challenger\'s', async () => {
    const b = await boot(7, BARE);
    expect(worldId(b, 'jacobs') < worldId(b, 'princess')).toBe(true);
  });

  it('the hand-off turn: Jacobs does not speak his next beat on the way out — the Princess parks him first, then speaks', async () => {
    const b = await boot(7, BARE);
    await b.turn('wait');
    const cursorBefore = thread(b, 'jacobs', 'jacobs-hand')!.beatCursor;
    const events = await b.turn('wait');

    expect(mentioning(events, 'hand-off').length).toBeGreaterThan(0);
    // Jacobs parked at the cursor he held before the turn: no beat served while losing the hand.
    const parked = thread(b, 'jacobs', 'jacobs-hand');
    expect(parked?.status).toBe('parked');
    expect(parked?.beatCursor).toBe(cursorBefore);
    expect(mentioning(events, 'jacobs-beat-two')).toHaveLength(0);
    expect(mentioning(events, 'jacobs-parting').length).toBeGreaterThan(0);
    // The Princess holds the floor and her first beat landed this turn.
    expect(seatedWith(b)).toEqual(new Set([worldId(b, 'princess'), b.player.id]));
    expect(thread(b, 'princess', 'princess-hand')).toMatchObject({ status: 'active' });
    expect(mentioning(events, 'princess-beat-one').length).toBeGreaterThan(0);
    // Order on the wire: the parting precedes the new scene.
    const types = events.map((e) => e.type);
    expect(types.indexOf('character.thread.parting')).toBeLessThan(types.indexOf('character.scene.scene-opened'));
  });

  it('the hand comes back: the Princess parks at her own cursor and Jacobs resumes where he left off', async () => {
    const b = await boot(7, BARE);
    await b.turn('wait');
    await b.turn('wait');
    const jacobsCursor = thread(b, 'jacobs', 'jacobs-hand')!.beatCursor;
    await b.turn('wait');
    const princessCursor = thread(b, 'princess', 'princess-hand')!.beatCursor;
    const events = await b.turn('wait');

    expect(mentioning(events, 'hand-off').length).toBeGreaterThan(0);
    expect(thread(b, 'princess', 'princess-hand')).toMatchObject({ status: 'parked', beatCursor: princessCursor });
    expect(mentioning(events, 'princess-parting').length).toBeGreaterThan(0);
    expect(thread(b, 'jacobs', 'jacobs-hand')).toMatchObject({ status: 'active', beatCursor: jacobsCursor });
    expect(mentioning(events, 'jacobs-resuming').length).toBeGreaterThan(0);
    expect(seatedWith(b)).toEqual(new Set([worldId(b, 'jacobs'), b.player.id]));
  });
});
