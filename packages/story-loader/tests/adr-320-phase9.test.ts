/**
 * adr-320-phase9.test.ts — the D12 wire schema, REAL-PATH end to end:
 * Chord source compiles, loads through the real loader, and is driven
 * through the REAL stdlib conversation actions; assertions land on the
 * real scene store and on the stdlib channels' closures over the LIVE
 * world.
 *
 * Covers: the advertised-response snapshot (every exchange row kind
 * enumerated onto `ExchangeState.responses` at open time, entity topic
 * ids resolved to world ids, exactly one silence entry); the
 * `exchange-affordances` channel as a pure projection of that state
 * (open advertises, close clears); the `scene` channel projecting the
 * dispatch path's wire events; and AC12's D12 leg (a restored world
 * re-advertises identically).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { createSemanticEventSource } from '@sharpee/core';
import {
  askingAction,
  talkingAction,
  exchangeAffordancesChannel,
  sceneChannel,
  type SceneChannelRow,
} from '@sharpee/stdlib';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { IFEntity, WorldModel, sceneWith, type ExchangeAffordances } from '@sharpee/world-model';
import {
  SaveRestoreService,
  PluginRegistry,
  type GameContext,
  type ISaveRestoreStateProvider,
  type Story,
} from '@sharpee/engine';
import { ChordStory, createStory } from '../src';

const CHARACTER_TURN_KEY = 'character.turn';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: phase9\n  story-version: 0.0.1\n\n' +
  'create the Hall\n  a room\n\n  A hall.\n\n' +
  'create Alex\n  a person\n  playable\n  in the Hall\n\n  Me.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create Aemilia\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood cheerful\n\n' +
  '  The gossip.\n\n' +
  'create Bram\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood calm\n\n' +
  '  The stagehand.\n\n' +
  'define topics for Aemilia\n' +
  '  about "the tour":\n' +
  '    phrase aemilia-tour\n' +
  '    then asks the-offer\n' +
  'end topics\n\n' +
  'define exchange the-offer for Aemilia\n' +
  '  answer "yes", "aye":\n' +
  '    phrase aemilia-offer-yes\n' +
  '  answer Bram:\n' +
  '    phrase aemilia-offer-bram\n' +
  '  on leaving:\n' +
  '    phrase aemilia-offer-leaving\n' +
  '  on silence:\n' +
  '    phrase aemilia-offer-silence\n' +
  'end exchange\n\n' +
  'define phrase aemilia-tour\n  "A grand tour."\nend phrase\n' +
  'define phrase aemilia-offer-yes\n  "Splendid!"\nend phrase\n' +
  'define phrase aemilia-offer-bram\n  "Ah, him."\nend phrase\n' +
  'define phrase aemilia-offer-leaving\n  "Off already?"\nend phrase\n' +
  'define phrase aemilia-offer-silence\n  "Nothing to say?"\nend phrase\n';

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

function load(): Loaded {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;

/** Four-phase context over the LIVE world (the Phase 7/8 harness model). */
function makeContext(l: Loaded, action: typeof askingAction, command: Record<string, unknown>): any {
  const currentLocation =
    l.world.getContainingRoom(l.player.id) ?? l.world.getEntity(l.world.getLocation(l.player.id)!)!;
  return {
    world: l.world,
    player: l.player,
    actor: l.player,
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

const ask = (l: Loaded, npcIrId: string, text: string) =>
  run(l, askingAction, { directObject: { entity: entity(l, npcIrId) }, topic: { text } });
const talk = (l: Loaded, npcIrId: string) =>
  run(l, talkingAction, { directObject: { entity: entity(l, npcIrId) } });

function channelCtx(l: Loaded, events: ISemanticEvent[] = [], turn = 5): ChannelProduceContext {
  return { world: l.world, events, blocks: [], turn, prevValue: undefined };
}

/** The fixture exchange's advertised set — the expected snapshot. */
function expectedResponses(l: Loaded) {
  return [
    {
      kind: 'verbal',
      rowId: 'aemilia.the-offer#0',
      topic: { kind: 'text', primary: 'yes', aliases: ['aye'] },
    },
    {
      kind: 'verbal',
      rowId: 'aemilia.the-offer#1',
      // Entity topics advertise the resolved WORLD id, not the Chord id.
      topic: { kind: 'entity', id: entity(l, 'bram').id },
    },
    { kind: 'act', rowId: 'aemilia.the-offer#2', actionId: 'leaving' },
    { kind: 'silence' },
  ];
}

function openTheOffer(l: Loaded): void {
  l.world.setStateValue(CHARACTER_TURN_KEY, 4);
  talk(l, 'aemilia');
  ask(l, 'aemilia', 'the tour'); // serves the row AND opens the-offer
}

describe('D12 — the advertised-response snapshot on ExchangeState', () => {
  it('opening an exchange persists every row kind as an affordance, one silence, world ids resolved', () => {
    const l = load();
    openTheOffer(l);

    const scene = sceneWith(l.world, entity(l, 'aemilia').id);
    expect(scene?.openExchange).toBeDefined();
    expect(scene!.openExchange!.responses).toEqual(expectedResponses(l));
    // Exactly one silence entry — the authored row, never doubled by the
    // inalienable-move fallback.
    expect(scene!.openExchange!.responses.filter((r) => r.kind === 'silence')).toHaveLength(1);
  });
});

describe('D12 — the exchange-affordances channel projects the live store', () => {
  it('advertises the open exchange, then clears to the empty array when it closes', () => {
    const l = load();
    openTheOffer(l);
    const scene = sceneWith(l.world, entity(l, 'aemilia').id)!;

    expect(exchangeAffordancesChannel.produce(channelCtx(l))).toEqual([
      { sceneId: scene.id, exchangeId: 'aemilia.the-offer', responses: expectedResponses(l) },
    ]);

    // A gripped answer serves the row and closes the exchange — the
    // channel must clear, never re-advertise stale choices.
    ask(l, 'aemilia', 'yes');
    expect(sceneWith(l.world, entity(l, 'aemilia').id)?.openExchange).toBeNull();
    expect(exchangeAffordancesChannel.produce(channelCtx(l))).toEqual([]);
  });
});

describe('D12 — the scene channel carries the dispatch path`s wire events', () => {
  it('projects the real action events into scene rows, exchange lifecycle included', () => {
    const l = load();
    l.world.setStateValue(CHARACTER_TURN_KEY, 4);
    const talked = talk(l, 'aemilia');
    const asked = ask(l, 'aemilia', 'the tour');

    const rows = sceneChannel.produce(channelCtx(l, [...talked.events, ...asked.events], 4)) as
      | SceneChannelRow[]
      | undefined;
    expect(rows).toBeDefined();
    expect(rows!.length).toBeGreaterThan(0);
    // Every row is scene wire — the channel never leaks other events.
    for (const row of rows!) {
      expect(
        row.kind.startsWith('character.scene.') || row.kind.startsWith('character.exchange.'),
      ).toBe(true);
    }
    // The exchange open rode the stream with its `asks` word.
    expect(rows).toContainEqual({
      turn: 4,
      kind: 'character.exchange.opened',
      data: { exchangeId: 'aemilia.the-offer', word: 'asks' },
    });
  });
});

describe('AC12 (D12 leg) — a restored world re-advertises identically', () => {
  function providerFor(l: Loaded): ISaveRestoreStateProvider {
    return {
      getWorld: () => l.world,
      getContext: () =>
        ({
          currentTurn: 6,
          player: l.player,
          actor: l.player,
          history: [],
          metadata: { started: new Date() },
        }) as unknown as GameContext,
      getStory: () => l.story as unknown as Story,
      getEventSource: () => createSemanticEventSource(),
      getPluginRegistry: () => new PluginRegistry(),
      getParser: () => undefined,
    };
  }

  it('the affordances channel projects the same set from the restored store', () => {
    const service = new SaveRestoreService();

    const l1 = load();
    openTheOffer(l1);
    const saveData = service.createSaveData(providerFor(l1));

    const l2 = load();
    service.loadSaveData(saveData, providerFor(l2));

    const advertised = exchangeAffordancesChannel.produce(channelCtx(l2)) as
      | ExchangeAffordances[]
      | undefined;
    expect(advertised).toEqual(exchangeAffordancesChannel.produce(channelCtx(l1)));
    expect(advertised![0]?.responses).toEqual(expectedResponses(l1));
  });
});
