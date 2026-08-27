/**
 * adr-320-phase7.test.ts — persistence and load-time instantiation,
 * REAL-PATH end to end: Chord source with the ADR-320 conversation
 * constructs compiles, loads through the real loader (which registers
 * the scene runtime and the D15 dialogue registrant), and is driven
 * through stdlib's REAL asking/talking actions. Every assertion lands on
 * real dispatched/persisted state — the `character.scenes` store, trait
 * `conversationMemory`, occurrence keys — never on mocks.
 *
 * Covers: registration at load; greeting (boundary) selection by pair
 * memory and absence/repetition words; exchange overlay (grip serves the
 * answer row, no table occurrence consumed; miss falls through); `then
 * asks` reopening; `leave` with real exit legality (legal close + `on
 * leaving`; illegal refusal leaves the scene live); the four evaluator
 * predicates flipping on real state; per-pair memory recording on both
 * modeled sides (modeled PC included); manner beats rotating on the wire.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { askingAction, talkingAction } from '@sharpee/stdlib';
import {
  CharacterModelTrait,
  IFEntity,
  TraitType,
  WorldModel,
  liveScenes,
  sceneWith,
  type ConversationSceneState,
} from '@sharpee/world-model';
import { ChordStory, createStory, LoadError } from '../src';

const CHARACTER_TURN_KEY = 'character.turn';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: phase7\n  story-version: 0.0.1\n\n' +
  'create the Hall\n  a room\n  east to the Yard\n\n  A hall.\n\n' +
  'create the Yard\n  a room\n  west to the Hall\n\n  A yard.\n\n' +
  'create the Cell\n  a room\n\n  A cell.\n\n' +
  // NOTE: the analyzer forbids character lines on the player
  // (`analysis.character-line-player`) — Chord has no modeled-PC
  // authoring surface yet, so the contracts §2.1 symmetry is exercised
  // at the character-package level (trait-memory-access tests), and the
  // unmodeled-PC no-change leg (D7) is asserted here instead.
  'create Alex\n  a person\n  playable\n  in the Hall\n\n  Me.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create Kemp\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood cheerful\n' +
  '  knows the falling-out, witnessed\n\n' +
  '  The clown.\n\n' +
  'create the Warden\n' +
  '  a person, proper\n' +
  '  in the Cell\n' +
  '  mood calm\n\n' +
  '  The warden.\n\n' +
  'define topics for Kemp\n' +
  '  about "the tour":\n' +
  '    phrase kemp-tour\n' +
  '    then asks the-offer\n' +
  '  about "the weather":\n' +
  '    phrase kemp-weather-first when asked once\n' +
  '    phrase kemp-weather\n' +
  '  about "the falling-out":\n' +
  '    phrase kemp-fallout-fresh when the falling-out is fresh\n' +
  '    phrase kemp-fallout\n' +
  '  about "the play":\n' +
  '    phrase kemp-play-discussed when the tour was discussed\n' +
  '    phrase kemp-play\n' +
  '  about "the news":\n' +
  '    phrase kemp-news-change when the subject changes\n' +
  '    phrase kemp-news\n' +
  '  about "the money":\n' +
  '    deflect to "the weather"\n' +
  'end topics\n\n' +
  'define exchange the-offer for Kemp\n' +
  '  answer "yes":\n' +
  '    phrase kemp-offer-yes\n' +
  '  answer "no":\n' +
  '    phrase kemp-offer-no\n' +
  '    leave\n' +
  '  answer "the weather":\n' +
  '    phrase kemp-offer-weather\n' +
  '  answer "maybe":\n' +
  '    deflect to "the weather"\n' +
  '  on silence:\n' +
  '    phrase kemp-offer-silence\n' +
  'end exchange\n\n' +
  'define greetings for Kemp\n' +
  '  first time:\n' +
  '    phrase kemp-first\n' +
  '  on return:\n' +
  '    phrase kemp-return\n' +
  '  on return, after days:\n' +
  '    phrase kemp-return-days\n' +
  '  asked again:\n' +
  '    phrase kemp-persistent\n' +
  '  on leaving:\n' +
  '    phrase kemp-leaving\n' +
  'end greetings\n\n' +
  'define manner for Kemp\n' +
  '  when Kemp is cheerful:\n' +
  '    beat "He sketches a jig step."\n' +
  '    beat "He winks at a stagehand."\n' +
  'end manner\n\n' +
  'define topics for the Warden\n' +
  '  about "escape":\n' +
  '    phrase warden-escape\n' +
  '    then asks lock-question\n' +
  'end topics\n\n' +
  'define exchange lock-question for the Warden\n' +
  '  answer "open it":\n' +
  '    phrase warden-storms-out\n' +
  '    leave\n' +
  'end exchange\n\n' +
  'define phrase kemp-tour\n  "A grand tour."\nend phrase\n' +
  'define phrase kemp-weather-first\n  "First you ask of rain."\nend phrase\n' +
  'define phrase kemp-weather\n  "Rain again."\nend phrase\n' +
  'define phrase kemp-fallout-fresh\n  "Raw, that."\nend phrase\n' +
  'define phrase kemp-fallout\n  "Old news."\nend phrase\n' +
  'define phrase kemp-play-discussed\n  "As I said of the tour."\nend phrase\n' +
  'define phrase kemp-play\n  "The play is the thing."\nend phrase\n' +
  'define phrase kemp-news-change\n  "Changing the subject, are we."\nend phrase\n' +
  'define phrase kemp-news\n  "No news."\nend phrase\n' +
  'define phrase kemp-offer-yes\n  "Splendid!"\nend phrase\n' +
  'define phrase kemp-offer-no\n  "Then I am gone."\nend phrase\n' +
  'define phrase kemp-offer-weather\n  "Rain, always, on tour."\nend phrase\n' +
  'define phrase kemp-offer-silence\n  He waits.\nend phrase\n' +
  'define phrase kemp-first\n  He looks you up and down.\nend phrase\n' +
  'define phrase kemp-return\n  He nods.\nend phrase\n' +
  'define phrase kemp-return-days\n  "Where have you been?"\nend phrase\n' +
  'define phrase kemp-persistent\n  "Persistent, are you not."\nend phrase\n' +
  'define phrase kemp-leaving\n  He turns away.\nend phrase\n' +
  'define phrase warden-escape\n  "Escape, is it?"\nend phrase\n' +
  'define phrase warden-storms-out\n  "Enough!"\nend phrase\n';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function load(source: string = SOURCE): Loaded {
  const story = createStory(compileSource(source), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;
const traitOf = (l: Loaded, irId: string): CharacterModelTrait =>
  entity(l, irId).get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
const sceneOfPair = (l: Loaded, irId: string): ConversationSceneState | undefined =>
  sceneWith(l.world, entity(l, irId).id);

/** Four-phase context over the LIVE world (topic-dispatch harness model). */
function makeContext(l: Loaded, action: typeof askingAction, command: Record<string, unknown>): any {
  const currentLocation =
    l.world.getContainingRoom(l.player.id) ?? l.world.getEntity(l.world.getLocation(l.player.id)!)!;
  return {
    world: l.world,
    player: l.player,
    action,
    currentLocation,
    command,
    sharedData: {},
    canSee: (target: IFEntity) => l.world.getVisible(l.player.id).some((e) => e.id === target.id),
    requireScope: (target: IFEntity) =>
      l.world.getInScope(l.player.id).some((e) => e.id === target.id)
        ? { ok: true }
        : { ok: false, error: { valid: false, error: 'not_in_scope' } },
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

function run(l: Loaded, action: typeof askingAction, command: Record<string, unknown>) {
  const context = makeContext(l, action, command);
  const validation = action.validate(context);
  context.validationResult = validation;
  let events: ISemanticEvent[] = [];
  if (validation.valid) {
    action.execute(context);
    events = action.report(context);
  }
  return { validation, events };
}

/** Ask an NPC about a topic through the real four-phase action. */
const ask = (l: Loaded, npcIrId: string, text: string) =>
  run(l, askingAction, { directObject: { entity: entity(l, npcIrId) }, topic: { text } });

/** TALK TO an NPC through the real four-phase action. */
const talk = (l: Loaded, npcIrId: string) =>
  run(l, talkingAction, { directObject: { entity: entity(l, npcIrId) } });

const messageId = (r: { events: ISemanticEvent[] }) => (r.events[0]?.data as any)?.messageId;
const eventsOfType = (r: { events: ISemanticEvent[] }, type: string) =>
  r.events.filter((e) => e.type === type);

describe('load-time registration (Phase 7 design §3)', () => {
  it('a story with character blocks registers the scene runtime and the D15 registrant', () => {
    const l = load();
    expect(l.world.getSceneRuntime()).toBeDefined();
    const registration = l.world.getDialogueSelector();
    expect(registration).toBeDefined();
    expect(typeof registration!.exchangeClaims).toBe('function');
  });

  it('conversation blocks without a character model are a LoadError, never silently inert', () => {
    const source = SOURCE.replace('  mood cheerful\n  knows the falling-out, witnessed\n', '');
    const ir = compileSource(source);
    const story = createStory(ir, { seed: 7 });
    const world = new WorldModel();
    expect(() => {
      story.initializeWorld(world);
      const player = story.createPlayer(world);
      world.setPlayer(player.id);
    }).toThrowError(LoadError);
  });
});

describe('scene lifecycle and greetings (AC1)', () => {
  it('TALK TO on first contact serves the first-time row and opens the scene', () => {
    const l = load();
    const r = talk(l, 'kemp');

    expect(messageId(r)).toBe('kemp-first');
    const scene = sceneOfPair(l, 'kemp');
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toContain(l.player.id);
    expect(eventsOfType(r, 'character.scene.scene-opened')).toHaveLength(1);
  });

  it('a return serves the bare return row; a long absence the refined row', () => {
    const l = load();
    talk(l, 'kemp');
    l.world.getSceneRuntime()!.applyDirectives(sceneOfPair(l, 'kemp')!.id, [
      { kind: 'close-scene', boundary: 'exit' },
    ]);
    expect(messageId(talk(l, 'kemp'))).toBe('kemp-return');

    l.world.getSceneRuntime()!.applyDirectives(sceneOfPair(l, 'kemp')!.id, [
      { kind: 'close-scene', boundary: 'exit' },
    ]);
    l.world.setStateValue(CHARACTER_TURN_KEY, 40); // ages the absence past `after-a-while`
    expect(messageId(talk(l, 'kemp'))).toBe('kemp-return-days');
  });

  it('the repetition row wins a return once the pair has asked again', () => {
    const l = load();
    ask(l, 'kemp', 'the weather');
    ask(l, 'kemp', 'the weather');
    l.world.getSceneRuntime()!.applyDirectives(sceneOfPair(l, 'kemp')!.id, [
      { kind: 'close-scene', boundary: 'exit' },
    ]);
    expect(messageId(talk(l, 'kemp'))).toBe('kemp-persistent');
  });

  it('a content row beats the boundary row on a scene-opening ask (D5 discipline)', () => {
    const l = load();
    const r = ask(l, 'kemp', 'the weather');
    expect(messageId(r)).toBe('kemp-weather-first');
    expect(sceneOfPair(l, 'kemp')).toBeDefined();
  });

  it('closing folds per-pair memory: visits advance on the modeled holder', () => {
    const l = load();
    talk(l, 'kemp');
    l.world.getSceneRuntime()!.applyDirectives(sceneOfPair(l, 'kemp')!.id, [
      { kind: 'close-scene', boundary: 'exit' },
    ]);
    expect(traitOf(l, 'kemp').conversationMemory[l.player.id].visits).toBe(1);
  });
});

describe('exchange overlay through real dispatch (AC2)', () => {
  it('`then asks` opens the exchange from a topic row', () => {
    const l = load();
    const r = ask(l, 'kemp', 'the tour');

    expect(messageId(r)).toBe('kemp-tour');
    const scene = sceneOfPair(l, 'kemp')!;
    expect(scene.openExchange).toBeDefined();
    expect(scene.openExchange!.exchangeId).toBe('kemp.the-offer');
    const opened = eventsOfType(r, 'character.exchange.opened');
    expect(opened).toHaveLength(1);
    expect((opened[0].data as any).word).toBe('asks');
  });

  it('a gripped answer serves the exchange row, closes the exchange, and consumes NO table occurrence', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');
    const r = ask(l, 'kemp', 'the weather'); // collides with a table row — the exchange wins

    expect(messageId(r)).toBe('kemp-offer-weather');
    expect(sceneOfPair(l, 'kemp')!.openExchange).toBeNull();
    // The weather TABLE row (index 1) never fired: no occurrence consumed.
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.1')).toBeUndefined();
    // The exchange row's own occurrence did.
    expect(l.world.getStateValue('chord.occurrence.exchange.kemp.the-offer.2')).toBe(1);
  });

  it('input matching no exchange row falls through to the table, exchange still open', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');
    const r = ask(l, 'kemp', 'the play'); // no exchange row answers this

    expect(messageId(r)).toBe('kemp-play-discussed'); // the tour was discussed
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.3')).toBe(1);
    expect(sceneOfPair(l, 'kemp')!.openExchange).toBeDefined();
  });
});

describe('leave and exit legality (AC7)', () => {
  it('a legal leave closes the scene on the exit boundary and the leaving row rides along', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');
    const r = ask(l, 'kemp', 'no');

    expect(messageId(r)).toBe('kemp-offer-no');
    expect(liveScenes(l.world).some((s) => s.participantIds.includes(entity(l, 'kemp').id))).toBe(false);
    expect(traitOf(l, 'kemp').conversationMemory[l.player.id].visits).toBe(1);
    // The `on leaving` phrase rides as an appended chord.phrase event.
    expect(
      r.events.some((e) => e.type === 'chord.phrase' && (e.data as any)?.messageId === 'kemp-leaving'),
    ).toBe(true);
    expect(eventsOfType(r, 'character.scene.scene-closed')).toHaveLength(1);
  });

  it('an illegal leave serves a rendered silence instead — scene live, exit refused on the author channel', () => {
    const l = load();
    l.world.moveEntity(l.player.id, entity(l, 'cell').id);
    ask(l, 'warden', 'escape');
    const r = ask(l, 'warden', 'open it');

    // No override: the action default stands as the evasion.
    expect(messageId(r)).toBe(`${askingAction.id}.unknown_topic`);
    const scene = sceneOfPair(l, 'warden')!;
    expect(scene).toBeDefined();
    expect(scene.openExchange).toBeDefined(); // the refused row never served
    expect(eventsOfType(r, 'character.scene.exit_refused')).toHaveLength(1);
    expect(eventsOfType(r, 'character.scene.rendered-silence')).toHaveLength(1);
    // Nothing mutated: the exchange row's occurrence was never consumed.
    expect(l.world.getStateValue('chord.occurrence.exchange.warden.lock-question.0')).toBeUndefined();
  });
});

describe('the four conversation predicates on real state (AC4/AC10)', () => {
  it('`is fresh` holds at load and stops holding after the clock ages the fact', () => {
    const fresh = load();
    expect(messageId(ask(fresh, 'kemp', 'the falling-out'))).toBe('kemp-fallout-fresh');

    const aged = load();
    aged.world.setStateValue(CHARACTER_TURN_KEY, 20);
    expect(messageId(ask(aged, 'kemp', 'the falling-out'))).toBe('kemp-fallout');
  });

  it('`was discussed` flips once the pair has covered the topic', () => {
    const l = load();
    expect(messageId(ask(l, 'kemp', 'the play'))).toBe('kemp-play');
    ask(l, 'kemp', 'the tour');
    expect(messageId(ask(l, 'kemp', 'the play'))).toBe('kemp-play-discussed');
  });

  it('`asked once` holds on the first ask only', () => {
    const l = load();
    expect(messageId(ask(l, 'kemp', 'the weather'))).toBe('kemp-weather-first');
    expect(messageId(ask(l, 'kemp', 'the weather'))).toBe('kemp-weather');
  });

  it('`the subject changes` holds on the abandoning firing and releases with the clock', () => {
    const l = load();
    talk(l, 'kemp');
    ask(l, 'kemp', 'the weather'); // seeds the thread
    expect(messageId(ask(l, 'kemp', 'the news'))).toBe('kemp-news-change');

    l.world.setStateValue(CHARACTER_TURN_KEY, 5); // a later turn: the stamp no longer holds
    expect(messageId(ask(l, 'kemp', 'the news'))).toBe('kemp-news');
  });
});

describe('deflect to — the deflection serves the owner\'s own table row (D8)', () => {
  it('a table-row deflect executes the target row under ITS occurrence key', () => {
    const l = load();
    const r = ask(l, 'kemp', 'the money');

    expect(messageId(r)).toBe('kemp-weather'); // the target row's phrase is the response
    // The deflecting row (index 5) and the target row (index 1) each consumed once.
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.5')).toBe(1);
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.1')).toBe(1);
  });

  it('an exchange-answer deflect serves the table row and closes the exchange', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');
    const r = ask(l, 'kemp', 'maybe');

    expect(messageId(r)).toBe('kemp-weather');
    expect(sceneOfPair(l, 'kemp')!.openExchange).toBeNull();
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.1')).toBe(1);
    expect(l.world.getStateValue('chord.occurrence.exchange.kemp.the-offer.3')).toBe(1);
  });
});

describe('per-pair memory recording (design §5)', () => {
  it('an ask records asked counts and a delivery records discussed topics on the modeled holder', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');

    const kempView = traitOf(l, 'kemp').conversationMemory[l.player.id];
    expect(kempView.askedCounts['tour']).toBe(1);
    expect(kempView.discussedTopics).toContain('tour');

    // The unmodeled player holds nothing (D7: no model, no change) — the
    // symmetric write was attempted and ignored by the trait access.
    expect(l.player.get(TraitType.CHARACTER_MODEL)).toBeUndefined();
  });
});

describe('manner beats on the wire (AC3 — carriage half)', () => {
  it('served exchange answers carry a beat and rotate without back-to-back repeats', () => {
    const l = load();
    ask(l, 'kemp', 'the tour');
    const first = eventsOfType(ask(l, 'kemp', 'yes'), 'character.scene.utterance');
    expect(first).toHaveLength(1);
    const firstBeats = (first[0].data as any).beats as string[];
    expect(firstBeats).toHaveLength(1);

    ask(l, 'kemp', 'the tour');
    const second = eventsOfType(ask(l, 'kemp', 'yes'), 'character.scene.utterance');
    const secondBeats = (second[0].data as any).beats as string[];
    expect(secondBeats).toHaveLength(1);
    expect(secondBeats[0]).not.toBe(firstBeats[0]);
  });
});
