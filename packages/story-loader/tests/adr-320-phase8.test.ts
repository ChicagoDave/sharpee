/**
 * adr-320-phase8.test.ts — NPC↔NPC scene scheduling and save/restore,
 * REAL-PATH end to end: Chord source compiles, loads through the real
 * loader (scene runtime + D15 registrant + Phase 8 initiative runner),
 * and is driven through the REAL NpcPlugin → NpcService → character-model
 * tick phase (registered via the story's own onEngineReady) and the REAL
 * stdlib conversation actions. Save/restore goes through the REAL
 * `SaveRestoreService`. Every assertion lands on real store / trait /
 * occurrence / sound-buffer state.
 *
 * Covers: AC9's travel leg (a player TELL landing on a hearer, then
 * moving onward through an NPC↔NPC scene over the propagation graph);
 * the Phase 8 initiative runner (a forcing `on <act>` row executing on a
 * witnessed act, opening a scene with the actor); and AC12 (mid-scene
 * save with an open exchange, restore into a fresh world, byte-identical
 * continuation).
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
  SaveRestoreService,
  PluginRegistry,
  type GameContext,
  type ISaveRestoreStateProvider,
  type Story,
} from '@sharpee/engine';
import { createSemanticEventSource } from '@sharpee/core';
import {
  createSeededRandom,
  deriveStreamSeed,
  type ChoicePoint,
  type RandomService,
  type SeededRandom,
} from '@sharpee/core';
import { ChordStory, createStory } from '../src';

const CHARACTER_TURN_KEY = 'character.turn';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: phase8\n  story-version: 0.0.1\n\n' +
  'create the Hall\n  a room\n  east to the Yard\n\n  A hall.\n\n' +
  'create the Yard\n  a room\n  west to the Hall\n\n  A yard.\n\n' +
  'create the Cell\n  a room\n\n  A cell.\n\n' +
  'create the player\n  in the Hall\n\n  Me.\n\n' +
  'create Aemilia\n' +
  '  a person, proper\n' +
  '  in the Hall\n' +
  '  mood cheerful\n' +
  '  spreads chatty to anyone\n\n' +
  '  The gossip.\n\n' +
  'create Bram\n' +
  '  a person, proper\n' +
  '  in the Cell\n' +
  '  mood calm\n' +
  '  spreads nothing\n\n' +
  '  The stagehand.\n\n' +
  'define topics for Aemilia\n' +
  '  about "the tour":\n' +
  '    phrase aemilia-tour\n' +
  '    then asks the-offer\n' +
  'end topics\n\n' +
  'define exchange the-offer for Aemilia\n' +
  '  answer "yes":\n' +
  '    phrase aemilia-offer-yes\n' +
  '  answer "no":\n' +
  '    phrase aemilia-offer-no\n' +
  'end exchange\n\n' +
  'define initiative for Bram\n' +
  '  on harm:\n' +
  '    phrase bram-condemns\n' +
  'end initiative\n\n' +
  'define phrase aemilia-tour\n  "A grand tour."\nend phrase\n' +
  'define phrase aemilia-offer-yes\n  "Splendid!"\nend phrase\n' +
  'define phrase aemilia-offer-no\n  "A pity."\nend phrase\n' +
  'define phrase bram-condemns\n  "Shame on you!"\nend phrase\n';

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

function load(source: string = SOURCE): Loaded {
  const story = createStory(compileSource(source), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);

  // The story's own engine-ready hook registers the REAL NpcPlugin and
  // the character-model tick phase on its service — no stub of owned
  // machinery; the test drives the plugin exactly as the engine would.
  const registered: unknown[] = [];
  story.onEngineReady({
    getPluginRegistry: () => ({ register: (p: unknown) => registered.push(p) }),
  });
  const npcPlugin = registered.find(
    (p) => (p as { id?: string }).id === 'sharpee.plugin.npc',
  ) as NpcPlugin;
  expect(npcPlugin).toBeDefined();

  return { story, world, player, npcPlugin, sounds: [] };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;
const traitOf = (l: Loaded, irId: string): CharacterModelTrait =>
  entity(l, irId).get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

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
      // The real ActionContext stamps the acting player on every event;
      // the statement site (observe sub-step) reads `entities.actor`.
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
const tell = (l: Loaded, npcIrId: string, text: string) =>
  run(l, tellingAction, { directObject: { entity: entity(l, npcIrId) }, topic: { text } });
const talk = (l: Loaded, npcIrId: string) =>
  run(l, talkingAction, { directObject: { entity: entity(l, npcIrId) } });

const messageId = (r: { events: ISemanticEvent[] }) =>
  (r.events.find((e) => e.type.startsWith('if.event.'))?.data as any)?.messageId;

describe('AC9 — a player claim travels onward through an NPC↔NPC scene', () => {
  it('TELL lands on the hearer, then moves to a third party inside a scene, effects regardless of observation', () => {
    const l = load();
    const topic = normalizeTopic('the scandal');

    // 1) The player TELLs Aemilia — the statement site needs the told
    // event observed by the tick (the engine feeds action events in).
    const told = tell(l, 'aemilia', 'the scandal');
    tick(l, 1, told.events);
    expect(traitOf(l, 'aemilia').knows(topic)).toBe(true);
    expect(traitOf(l, 'bram').knows(topic)).toBe(false);

    // 2) The player walks off; the player-scene decays on silence.
    l.world.moveEntity(l.player.id, l.story.entityId('yard')!);
    for (const t of [2, 3, 4, 5, 6]) tick(l, t);
    expect(Object.values(readSceneStore(l.world).scenes)).toHaveLength(0);

    // 3) Bram arrives; the gossip moves in an NPC↔NPC scene the player
    // never sees — the effect lands anyway (AC8's silent face).
    l.world.moveEntity(entity(l, 'bram').id, l.story.entityId('hall')!);
    const events = tick(l, 7);

    expect(traitOf(l, 'bram').knows(topic)).toBe(true);
    const scene = sceneWith(l.world, entity(l, 'aemilia').id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toContain(entity(l, 'bram').id);
    expect(scene!.currentTopic).toBe(topic);
    // Scene wire rode the turn stream; the conversation sound was emitted
    // (reception grading is the dispatcher's, out of view here).
    expect(events.some((e) => e.type === 'character.scene.scene-opened')).toBe(true);
    expect(l.sounds.some((s) => s.kind === 'speech')).toBe(true);
    // Both sides recorded the discussion (D9 ground truth).
    expect(
      traitOf(l, 'aemilia').conversationMemory?.[entity(l, 'bram').id]?.discussedTopics,
    ).toContain(topic);
  });
});

describe('Phase 8 initiative runner — a forcing `on <act>` row seizes a witnessed act', () => {
  it('runs the row body through the loader, opens a scene with the actor, advances the occurrence key', () => {
    const l = load();
    // Bram must witness the act — seat him in the Hall.
    l.world.moveEntity(entity(l, 'bram').id, l.story.entityId('hall')!);

    const attack: ISemanticEvent = {
      id: 'evt-attack',
      type: 'if.event.attacked',
      timestamp: 0,
      entities: { actor: l.player.id },
      data: { target: entity(l, 'aemilia').id },
    };
    const events = tick(l, 1, [attack]);

    const scene = sceneWith(l.world, entity(l, 'bram').id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds).toContain(l.player.id);
    expect(scene!.openedBy).toEqual({ kind: 'initiative', openerId: entity(l, 'bram').id });

    const utterance = events.find((e) => e.type === 'character.scene.utterance');
    expect(utterance).toBeDefined();
    expect((utterance!.data as { messageId?: string }).messageId).toBe('bram-condemns');
    expect(l.sounds.some((s) => s.content?.messageId === 'bram-condemns')).toBe(true);
    expect(l.world.getStateValue('chord.occurrence.initiative.bram.0')).toBe(1);
  });

  it('no forcing row for the occasion: nothing seizes, nothing opens', () => {
    const l = load();
    // Aemilia has no initiative rows; only she witnesses (Bram in the Cell).
    const attack: ISemanticEvent = {
      id: 'evt-attack',
      type: 'if.event.attacked',
      timestamp: 0,
      entities: { actor: l.player.id },
      data: {},
    };
    tick(l, 1, [attack]);

    expect(Object.values(readSceneStore(l.world).scenes)).toHaveLength(0);
    expect(l.sounds).toHaveLength(0);
  });
});

describe('AC12 — mid-scene save/restore through the real SaveRestoreService', () => {
  function providerFor(l: Loaded): ISaveRestoreStateProvider {
    return {
      getWorld: () => l.world,
      getContext: () =>
        ({
          currentTurn: 6,
          player: l.player,
          history: [],
          metadata: { started: new Date() },
        }) as unknown as GameContext,
      getStory: () => l.story as unknown as Story,
      getEventSource: () => createSemanticEventSource(),
      getPluginRegistry: () => new PluginRegistry(),
      getParser: () => undefined,
    };
  }

  it('a scene with an open exchange survives the round trip and continues byte-identically', () => {
    const service = new SaveRestoreService();

    // Drive the original to mid-scene: scene open, exchange open.
    const l1 = load();
    l1.world.setStateValue(CHARACTER_TURN_KEY, 4);
    talk(l1, 'aemilia');
    ask(l1, 'aemilia', 'the tour'); // serves the row AND opens the-offer
    const sceneBefore = sceneWith(l1.world, entity(l1, 'aemilia').id);
    expect(sceneBefore?.openExchange).toMatchObject({ exchangeId: 'aemilia.the-offer' });

    const saveData = service.createSaveData(providerFor(l1));

    // A fresh world, freshly loaded (the engine's restart shape), then
    // the real restore path — world snapshot, story post-restore hook.
    const l2 = load();
    service.loadSaveData(saveData, providerFor(l2));

    // The scene store came back verbatim: scene, open exchange, cursors.
    expect(readSceneStore(l2.world)).toEqual(readSceneStore(l1.world));
    // Trait memory came back with the world snapshot (schema v2).
    expect(traitOf(l2, 'aemilia').conversationMemory).toEqual(
      traitOf(l1, 'aemilia').conversationMemory,
    );

    // Byte-identical continuation: the gripped answer serves the same row
    // on both sides, and the stores agree afterward.
    const r1 = ask(l1, 'aemilia', 'yes');
    const r2 = ask(l2, 'aemilia', 'yes');
    expect(messageId(r2)).toBe(messageId(r1));
    expect(messageId(r2)).toBe('aemilia-offer-yes');
    expect(readSceneStore(l2.world)).toEqual(readSceneStore(l1.world));
    expect(l2.world.getStateValue('chord.occurrence.exchange.aemilia.the-offer.0')).toBe(
      l1.world.getStateValue('chord.occurrence.exchange.aemilia.the-offer.0'),
    );
  });
});
