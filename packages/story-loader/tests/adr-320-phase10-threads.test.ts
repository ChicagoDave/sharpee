/**
 * adr-320-phase10-threads.test.ts — ADR-320 D14 conversation threads
 * through dispatch and the tick, REAL-PATH end to end (Phase 10.4):
 * Chord `define conversation` blocks compile, load through the real
 * loader (thread hooks + D15 registrant), and are driven through the
 * REAL stdlib conversation actions and the REAL NpcPlugin tick. Every
 * assertion lands on real trait / scene-store / occurrence state — the
 * AC14 precedence, transition-enforcement, and `is concluded` legs.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR, normalizeTopic } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { askingAction, talkingAction, tellingAction } from '@sharpee/stdlib';
import {
  CharacterModelTrait,
  IFEntity,
  TraitType,
  WorldModel,
  readSceneStore,
  sceneWith,
} from '@sharpee/world-model';
import { NpcPlugin } from '@sharpee/plugin-npc';
import {
  createSeededRandom,
  deriveStreamSeed,
  type ChoicePoint,
  type RandomService,
  type SeededRandom,
} from '@sharpee/core';
import { ChordStory, createStory } from '../src';

const PHRASES =
  'define phrase weather-line\n  "Rain again."\nend phrase\n' +
  'define phrase weather-after\n  "Fine weather now."\nend phrase\n' +
  'define phrase eels-line\n  "Scandalous, and I will not be drawn on it."\nend phrase\n' +
  'define phrase beat-one\n  "First, the lease."\nend phrase\n' +
  'define phrase beat-two\n  "Then, the timbers."\nend phrase\n' +
  'define phrase parting-line\n  "Hold that thought."\nend phrase\n' +
  'define phrase resuming-line\n  "As I was saying."\nend phrase\n' +
  'define phrase refusing-line\n  "Answer me first."\nend phrase\n' +
  'define phrase conclusion-line\n  "So it is settled."\nend phrase\n';

function storySource(thread: string, extra = ''): string {
  return (
    'story\n  title: T\n  authors:\n    N\n  id: phase104\n  story-version: 0.0.1\n\n' +
    'create the Hall\n  a room\n\n  A hall.\n\n' +
    'create the player\n  in the Hall\n\n  Me.\n\n' +
    'create Kemp\n  a person, proper\n  in the Hall\n  mood cheerful\n  spreads nothing\n\n  The clown.\n\n' +
    'define topics for Kemp\n' +
    '  about "the weather":\n' +
    '    phrase weather-after when the-defection is concluded\n' +
    '    phrase weather-line\n' +
    '  about "the price of eels":\n' +
    '    phrase eels-line\n' +
    'end topics\n\n' +
    thread +
    '\n' +
    extra +
    PHRASES
  );
}

/** The default two-beat thread; `strength` is the header comma-modifier. */
function threadBlock(opts: { strength?: string; opensWhen?: string; beatTwoWhen?: string; beatOneExtra?: string; omitRefusing?: boolean } = {}): string {
  return (
    `define conversation the-defection for Kemp${opts.strength ? `, ${opts.strength}` : ''}\n` +
    '  about "the rose"\n' +
    (opts.opensWhen ? `  opens when ${opts.opensWhen}\n` : '') +
    '  beat:\n' +
    '    phrase beat-one\n' +
    (opts.beatOneExtra ? `    ${opts.beatOneExtra}\n` : '') +
    (opts.beatTwoWhen ? `  beat, when ${opts.beatTwoWhen}:\n` : '  beat:\n') +
    '    phrase beat-two\n' +
    '  on parting:\n' +
    '    phrase parting-line\n' +
    '  on resuming:\n' +
    '    phrase resuming-line\n' +
    (opts.omitRefusing ? '' : '  on refusing:\n    phrase refusing-line\n') +
    '  conclusion:\n' +
    '    phrase conclusion-line\n' +
    'end conversation\n'
  );
}

function compileSource(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

/** Deterministic per-point RandomService (the stdlib fixture, mirrored). */
function fixtureRandom(masterSeed = 12345): RandomService {
  const streams = new Map<string, SeededRandom>();
  const streamFor = (name: string): SeededRandom => {
    let s = streams.get(name);
    if (!s) {
      s = createSeededRandom(deriveStreamSeed(masterSeed, name));
      streams.set(name, s);
    }
    return s;
  };
  return {
    chance: (p: ChoicePoint<'yes' | 'no'>, probability: number) => streamFor(p.name).chance(probability),
    int: (p: ChoicePoint, min: number, max: number) => streamFor(p.name).int(min, max),
    pick: <T>(p: ChoicePoint, items: readonly T[]) => streamFor(p.name).pick([...items]),
    resolve: <C extends string, R>(
      p: ChoicePoint<C>,
      sample: (draw: SeededRandom) => { cls: C; value: R },
    ) => sample(streamFor(p.name)),
  } as RandomService;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  npcPlugin: NpcPlugin;
  sounds: ISound[];
}

function load(source: string): Loaded {
  const story = createStory(compileSource(source), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);

  const registered: unknown[] = [];
  story.onEngineReady({
    getPluginRegistry: () => ({ register: (p: unknown) => registered.push(p) }),
  } as never);
  const npcPlugin = registered.find(
    (p) => (p as { id?: string }).id === 'sharpee.plugin.npc',
  ) as NpcPlugin;
  expect(npcPlugin).toBeDefined();

  return { story, world, player, npcPlugin, sounds: [] };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;
const traitOf = (l: Loaded, irId: string): CharacterModelTrait =>
  entity(l, irId).get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;
const threadState = (l: Loaded) =>
  traitOf(l, 'kemp').conversationThreads?.[l.player.id]?.['the-defection'];

/** One NPC turn through the real plugin (the engine's own call shape). */
function tick(l: Loaded, turn: number, actionEvents: ISemanticEvent[] = []): ISemanticEvent[] {
  return l.npcPlugin.onAfterAction({
    world: l.world,
    turn,
    playerId: l.player.id,
    playerLocation: l.world.getLocation(l.player.id)!,
    random: fixtureRandom(),
    actionEvents,
    emitSound: (s) => l.sounds.push(s),
  });
}

/** Four-phase context over the LIVE world (the Phase 7 harness model). */
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
      ({ id: `t-${type}`, type, timestamp: 0, entities: { actor: l.player.id }, data }) as ISemanticEvent,
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

const ask = (l: Loaded, text: string) =>
  run(l, askingAction, { directObject: { entity: entity(l, 'kemp') }, topic: { text } });
const tell = (l: Loaded, text: string) =>
  run(l, tellingAction, { directObject: { entity: entity(l, 'kemp') }, topic: { text } });
const talk = (l: Loaded) =>
  run(l, talkingAction, { directObject: { entity: entity(l, 'kemp') } });

const messageId = (r: { events: ISemanticEvent[] }) =>
  (r.events.find((e) => e.type.startsWith('if.event.'))?.data as { messageId?: string } | undefined)
    ?.messageId;

describe('AC14 — activation, advance, conclusion, and `is concluded` through real dispatch', () => {
  it('a matching ask activates, each ask advances one beat, the conclusion is state', () => {
    const l = load(storySource(threadBlock()));

    // `is concluded` false before: the ungated weather line serves.
    expect(messageId(ask(l, 'the weather'))).toBe('weather-line');

    // Activation: the first on-filter ask opens the thread and serves beat 1.
    const first = ask(l, 'the rose');
    expect(messageId(first)).toBe('beat-one');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    expect(first.events.some((e) => e.type === 'character.scene.thread-opened')).toBe(true);
    expect(first.events.some((e) => e.type === 'character.scene.thread-beat')).toBe(true);

    // One beat per ask; past the last beat, the conclusion serves.
    expect(messageId(ask(l, 'the rose'))).toBe('beat-two');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 2 });
    const concluded = ask(l, 'the rose');
    expect(messageId(concluded)).toBe('conclusion-line');
    expect(concluded.events.some((e) => e.type === 'character.scene.thread-concluded')).toBe(true);

    // Conclusion is state on the trait — the exact `is concluded` read.
    expect(threadState(l)).toMatchObject({ status: 'concluded' });
    const rose = normalizeTopic('the rose');
    expect(traitOf(l, 'kemp').conversationMemory?.[l.player.id]?.discussedTopics).toContain(rose);
    const playerTrait = l.player.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (playerTrait) {
      expect(playerTrait.conversationMemory?.[entity(l, 'kemp').id]?.discussedTopics).toContain(rose);
    }

    // A concluded thread never re-claims its topics: the ask falls to the
    // action default (no table row for "the rose").
    expect(messageId(ask(l, 'the rose'))).toBe(`${askingAction.id}.unknown_topic`);

    // `is concluded` true after: the gated weather line wins the row.
    expect(messageId(ask(l, 'the weather'))).toBe('weather-after');
  });
});

describe('AC14 — blocking enforcement (authored first, repeat second)', () => {
  it('serves the authored `on refusing:` row and holds the thread; table bookkeeping is skipped', () => {
    const l = load(storySource(threadBlock({ strength: 'blocking' })));
    ask(l, 'the rose');

    const refused = ask(l, 'the weather');
    expect(messageId(refused)).toBe('refusing-line');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    // The weather row never served — its occurrence key was never bumped.
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.0')).toBeUndefined();

    // Until `conclusion` fires: after it, the topic table is reachable again.
    ask(l, 'the rose');
    ask(l, 'the rose');
    expect(threadState(l)).toMatchObject({ status: 'concluded' });
    expect(messageId(ask(l, 'the weather'))).toBe('weather-after');
  });

  it('re-serves the current beat when no `on refusing:` row is authored', () => {
    const l = load(storySource(threadBlock({ strength: 'blocking', omitRefusing: true })));
    ask(l, 'the rose');

    expect(messageId(ask(l, 'the weather'))).toBe('beat-one');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
  });
});

describe('AC14 — passive park and resume through dispatch', () => {
  it('an off-thread ask serves its topic the same turn and parks the thread; the resume serves `on resuming:`', () => {
    const l = load(storySource(threadBlock()));
    ask(l, 'the rose');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    // The other topic serves THIS turn; the thread parks as bookkeeping.
    const parked = ask(l, 'the weather');
    expect(messageId(parked)).toBe('weather-line');
    expect(threadState(l)).toMatchObject({ status: 'parked', beatCursor: 1 });
    // The continuability affordance disappears with the park (never stale).
    const scene = sceneWith(l.world, entity(l, 'kemp').id);
    expect(scene?.threadContinuability).toBeUndefined();

    // Resume at the held cursor: the authored `on resuming:` is the reply,
    // the next ask serves the next beat.
    const resumed = ask(l, 'the rose');
    expect(messageId(resumed)).toBe('resuming-line');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    expect(resumed.events.some((e) => e.type === 'character.scene.thread-resumed')).toBe(true);
    expect(messageId(ask(l, 'the rose'))).toBe('beat-two');
  });
});

describe('AC14 — assertive protest (one authored beat of resistance, not a wall)', () => {
  it('the protest consumes the transition turn; the other topic serves from the next ask', () => {
    const l = load(storySource(threadBlock({ strength: 'assertive' })));
    ask(l, 'the rose');

    const protest = ask(l, 'the weather');
    expect(messageId(protest)).toBe('parting-line');
    expect(threadState(l)).toMatchObject({ status: 'parked', beatCursor: 1 });
    // The protest turn skipped the table — no weather occurrence yet.
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.0')).toBeUndefined();

    // No wall: the thread is parked now, so the topic serves.
    expect(messageId(ask(l, 'the weather'))).toBe('weather-line');
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.0')).toBe(1);
  });
});

describe("AC14 — the owner's own floor turns (the tick path)", () => {
  it('advances one beat per turn cycle, never doubling a dispatch advance, to the conclusion', () => {
    const l = load(storySource(threadBlock()));
    ask(l, 'the rose'); // beat 1 via dispatch (this cycle's advance)

    tick(l, 1); // same cycle — the dispatch advance stands, the tick stands down
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-two')).toBe(false);

    tick(l, 2); // the owner's own floor turn serves beat 2
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 2 });
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-two')).toBe(true);

    tick(l, 3); // and the conclusion
    expect(threadState(l)).toMatchObject({ status: 'concluded' });
    expect(l.sounds.some((s) => s.content?.messageId === 'conclusion-line')).toBe(true);
    // Conclusion cleared the affordance snapshot.
    expect(sceneWith(l.world, entity(l, 'kemp').id)?.threadContinuability).toBeUndefined();

    // Nothing left to say: a further tick serves no thread line.
    const before = l.sounds.length;
    tick(l, 4);
    expect(l.sounds.length).toBe(before);
  });

  it('an `opens when` thread opens its own scene and speaks beat 1 unprompted', () => {
    const l = load(storySource(threadBlock({ opensWhen: 'it is cheerful' })));

    const events = tick(l, 1);

    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    const scene = sceneWith(l.world, entity(l, 'kemp').id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toContain(l.player.id);
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-one')).toBe(true);
    expect(events.some((e) => e.type === 'character.scene.thread-opened')).toBe(true);
    // The continuability affordance is live on real scene state (D12).
    expect(scene!.threadContinuability).toMatchObject({
      threadKey: 'the-defection',
      beatCursor: 1,
      continuable: true,
    });
  });

  it("a thread beat's `then asks` opens its exchange from the owner's own turn", () => {
    const l = load(
      storySource(
        threadBlock({ opensWhen: 'it is cheerful', beatOneExtra: 'then asks the-offer' }),
        'define exchange the-offer for Kemp\n  answer "aye":\n    phrase offer-aye\nend exchange\n\n' +
          'define phrase offer-aye\n  "Good."\nend phrase\n',
      ),
    );

    // No player input at all: the tick opens the thread, speaks beat 1,
    // and the beat's `then asks` opens its exchange on the player scene.
    const events = tick(l, 1);

    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    const scene = sceneWith(l.world, entity(l, 'kemp').id);
    expect(scene?.openExchange).toMatchObject({ exchangeId: 'kemp.the-offer' });
    expect(events.some((e) => e.type === 'character.exchange.opened')).toBe(true);
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-one')).toBe(true);
  });

  it('an `opens when` thread parked mid-story resumes on the owner turn via `on resuming:`', () => {
    const l = load(storySource(threadBlock({ opensWhen: 'it is cheerful' })));
    tick(l, 1); // the thread opens itself and speaks beat 1
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    // An off-thread ask parks it (the passive path through the arm).
    expect(messageId(ask(l, 'the weather'))).toBe('weather-line');
    expect(threadState(l)).toMatchObject({ status: 'parked', beatCursor: 1 });

    // The owner's own turn resumes it — `on resuming:` is the turn's
    // line, cursor held; the beat follows on the next turn.
    tick(l, 2);
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    expect(l.sounds.some((s) => s.content?.messageId === 'resuming-line')).toBe(true);
    expect(l.world.getStateValue('chord.occurrence.thread.kemp.the-defection.resuming')).toBe(1);

    tick(l, 3);
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 2 });
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-two')).toBe(true);
  });

  it('a held next beat holds the thread; the scene decays and the close parks it', () => {
    const l = load(storySource(threadBlock({ beatTwoWhen: 'it is angry' })));
    ask(l, 'the rose');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    // Beat 2 waits for a world that never comes; nothing advances, the
    // scene decays on silence, and the close parks the thread (D14
    // persistence — the next engagement resumes).
    for (const t of [1, 2, 3, 4, 5]) tick(l, t);
    expect(Object.values(readSceneStore(l.world).scenes)).toHaveLength(0);
    expect(threadState(l)).toMatchObject({ status: 'parked', beatCursor: 1 });
    expect(l.sounds.some((s) => s.content?.messageId === 'beat-two')).toBe(false);
  });
});

describe('AC14 — the grip holds for TELL and TALK TO (the asking wiring, mirrored)', () => {
  it('TELL activates and advances on the filter; a blocking off-topic TELL is refused with no table bookkeeping', () => {
    const l = load(storySource(threadBlock({ strength: 'blocking' })));

    expect(messageId(tell(l, 'the rose'))).toBe('beat-one');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    expect(messageId(tell(l, 'the weather'))).toBe('refusing-line');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });
    expect(l.world.getStateValue('chord.occurrence.topic.kemp.0')).toBeUndefined();
  });

  it('TALK TO advances the active ready thread one beat', () => {
    const l = load(storySource(threadBlock()));
    ask(l, 'the rose');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    expect(messageId(talk(l))).toBe('beat-two');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 2 });
  });
});

describe('AC14 — precedence: an open exchange holds the thread (innermost wins)', () => {
  it('a `then asks` beat waits for its exchange; the answered exchange releases the advance', () => {
    const l = load(
      storySource(
        threadBlock({ beatOneExtra: 'then asks the-offer' }),
        'define exchange the-offer for Kemp\n  answer "aye":\n    phrase offer-aye\nend exchange\n\n' +
          'define phrase offer-aye\n  "Good."\nend phrase\n',
      ),
    );

    const first = ask(l, 'the rose');
    expect(messageId(first)).toBe('beat-one');
    const scene = sceneWith(l.world, entity(l, 'kemp').id);
    expect(scene?.openExchange).toMatchObject({ exchangeId: 'kemp.the-offer' });

    // The open exchange owns the moment: an on-filter ask neither
    // advances the thread nor matches a table row.
    expect(messageId(ask(l, 'the rose'))).toBe(`${askingAction.id}.unknown_topic`);
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 1 });

    // Answering closes the exchange; the thread advances again.
    expect(messageId(ask(l, 'aye'))).toBe('offer-aye');
    expect(sceneWith(l.world, entity(l, 'kemp').id)?.openExchange).toBeNull();
    expect(messageId(ask(l, 'the rose'))).toBe('beat-two');
    expect(threadState(l)).toMatchObject({ status: 'active', beatCursor: 2 });
  });
});
