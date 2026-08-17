/**
 * Real-path dispatch integration (ADR-320 D4/D8/D16; Phase 6) — stdlib's
 * conversation actions driving the REAL scene runtime binding over the
 * REAL `character.scenes` store, no stubs of owned machinery: scenes
 * actually open in world state, the exchange grip actually starves the
 * interceptor path, directives actually mutate the store, and an illegal
 * exit actually leaves the scene live. Derived from the
 * runConversationScene / exchange-grip Behavior Statements.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  CharacterModelTrait,
  TraitType,
  sceneWith,
  readSceneStore,
  type DialogueSelectionResult,
  type SceneDirective,
} from '@sharpee/world-model';
import {
  askingAction,
  tellingAction,
  talkingAction,
  createActionContext,
  IFActions,
  type Action,
  type ActionContext,
  type ValidatedCommand,
} from '@sharpee/stdlib';
import {
  createSeededRandom,
  deriveStreamSeed,
  type ChoicePoint,
  type RandomService,
  type SeededRandom,
} from '@sharpee/core';
import { registerCharacterScenes, createMapMemoryAccess } from '../../src/conversation';
import type { ConversationMemoryAccess } from '../../src/conversation';
import { CHARACTER_TURN_KEY } from '../../src/character-clock';

// -- harness ---------------------------------------------------------------

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

/** Minimal ValidatedCommand for a conversation verb (the stdlib test idiom). */
function makeCommand(actionId: string, entity: IFEntity, topicText?: string): ValidatedCommand {
  const verb = actionId.split('.').pop() ?? 'unknown';
  const command = {
    parsed: {
      rawInput: verb,
      action: actionId,
      tokens: [],
      structure: {
        verb: { tokens: [0], text: verb, head: verb },
        directObject: {
          tokens: [1], text: entity.name, head: entity.name,
          modifiers: [], articles: [], determiners: [], candidates: [entity.name],
        },
      },
      pattern: 'VERB_NOUN',
      confidence: 1.0,
      extras: {},
    },
    actionId,
    directObject: { entity, parsed: {} },
  } as unknown as ValidatedCommand;
  if (topicText !== undefined) {
    (command as { topic?: { text: string } }).topic = { text: topicText };
  }
  return command;
}

function runAction(action: Action, world: WorldModel, command: ValidatedCommand) {
  const context = createActionContext(world, world.getPlayer()!, action, command, fixtureRandom());
  const validation = action.validate(context);
  expect(validation.valid).toBe(true);
  action.execute(context);
  return { events: action.report(context), context: context as ActionContext };
}

describe('conversation dispatch × the real scene runtime (ADR-320 Phase 6)', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let npc: IFEntity;
  let memory: ConversationMemoryAccess;

  function makeActor(name: string, modeled: boolean): IFEntity {
    const actor = world.createEntity(name, 'actor');
    actor.add(new IdentityTrait({ name }));
    actor.add(new ActorTrait({ isPlayer: false }));
    actor.add(new ContainerTrait());
    if (modeled) actor.add(new CharacterModelTrait());
    return actor;
  }

  beforeEach(() => {
    world = new WorldModel();
    room = world.createEntity('Tiring House', 'room');
    room.add(new IdentityTrait({ name: 'Tiring House' }));
    room.add(new RoomTrait());
    room.add(new ContainerTrait());

    player = makeActor('Player', false);
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);

    npc = makeActor('Burbage', true);
    world.moveEntity(npc.id, room.id);

    memory = createMapMemoryAccess();
    registerCharacterScenes(world, memory);
    world.setStateValue(CHARACTER_TURN_KEY, 4); // dialogueTurn = 5
  });

  // -- scene lifecycle at the dispatch boundary (D4) -----------------------

  it('TALK TO a modeled NPC opens a scene in the character.scenes store, opener holding the floor', () => {
    const { events } = runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc));

    const scene = sceneWith(world, npc.id);
    expect(scene).toBeDefined();
    expect(scene!.participantIds.sort()).toEqual([npc.id, player.id].sort());
    expect(scene!.openedBy).toEqual({ kind: 'address', openerId: player.id });
    expect(scene!.floorHolderId).toBe(player.id);
    expect(scene!.openedTurn).toBe(5);
    expect(events.map((e) => e.type)).toContain('character.scene.scene-opened');
    expect(events.map((e) => e.type)).toContain('character.scene.floor-change');
  });

  it('a later ASK stamps the move clock on the existing scene instead of opening a second one', () => {
    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc));
    world.setStateValue(CHARACTER_TURN_KEY, 9); // dialogueTurn = 10

    runAction(askingAction, world, makeCommand(IFActions.ASKING, npc, 'the play'));

    const scenes = Object.values(readSceneStore(world).scenes);
    expect(scenes).toHaveLength(1);
    expect(scenes[0].lastMoveTurn).toBe(10);
    expect(scenes[0].openedTurn).toBe(5);
  });

  it('an unmodeled NPC never opens a scene (no model, no change)', () => {
    const stagehand = makeActor('Stagehand', false);
    world.moveEntity(stagehand.id, room.id);

    runAction(talkingAction, world, makeCommand(IFActions.TALKING, stagehand));

    expect(sceneWith(world, stagehand.id)).toBeUndefined();
    expect(Object.keys(readSceneStore(world).scenes)).toHaveLength(0);
  });

  it('no registered scene runtime: dispatch mutates nothing', () => {
    const bare = new WorldModel();
    const bareRoom = bare.createEntity('Stage', 'room');
    bareRoom.add(new IdentityTrait({ name: 'Stage' }));
    bareRoom.add(new RoomTrait());
    bareRoom.add(new ContainerTrait());
    const barePlayer = bare.createEntity('Player', 'actor');
    barePlayer.add(new IdentityTrait({ name: 'Player' }));
    barePlayer.add(new ActorTrait({ isPlayer: true }));
    barePlayer.add(new ContainerTrait());
    bare.setPlayer(barePlayer.id);
    bare.moveEntity(barePlayer.id, bareRoom.id);
    const kemp = bare.createEntity('Kemp', 'actor');
    kemp.add(new IdentityTrait({ name: 'Kemp' }));
    kemp.add(new ActorTrait({ isPlayer: false }));
    kemp.add(new ContainerTrait());
    kemp.add(new CharacterModelTrait());
    bare.moveEntity(kemp.id, bareRoom.id);

    runAction(talkingAction, bare, makeCommand(IFActions.TALKING, kemp));

    expect(bare.getStateValue('character.scenes')).toBeUndefined();
  });

  // -- selection directives reach the store (D4) ---------------------------

  it('a handled selection`s directives mutate the scene through the runtime (exchange open, floor change)', () => {
    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc));
    const sceneId = sceneWith(world, npc.id)!.id;

    world.registerDialogueSelector({
      select: () => ({
        handled: true,
        messageId: 'burbage.answers',
        sceneDirectives: [
          { kind: 'open-exchange', exchange: { exchangeId: 'x-will-you-come', speakerId: npc.id, openedTurn: 5 } },
          { kind: 'set-floor', holderId: npc.id },
        ] as SceneDirective[],
      }),
    });

    const { events } = runAction(askingAction, world, makeCommand(IFActions.ASKING, npc, 'the play'));

    const scene = sceneWith(world, npc.id)!;
    expect(scene.id).toBe(sceneId);
    expect(scene.openExchange).toMatchObject({ exchangeId: 'x-will-you-come', speakerId: npc.id });
    expect(scene.floorHolderId).toBe(npc.id);
    expect(events.map((e) => e.type)).toContain('character.scene.floor-change');
  });

  // -- the exchange grip (D16) ---------------------------------------------

  function openExchangeOn(npcEntity: IFEntity): void {
    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npcEntity));
    const sceneId = sceneWith(world, npcEntity.id)!.id;
    world.getSceneRuntime()!.applyDirectives(sceneId, [
      { kind: 'open-exchange', exchange: { exchangeId: 'x-will-you-come', speakerId: npcEntity.id, openedTurn: 5 } },
    ]);
  }

  function registerTableInterceptor(): void {
    world.registerActionInterceptor(TraitType.ACTOR, IFActions.ASKING, {
      postValidate: (_target, w) => {
        w.setStateValue('test.table.consulted', ((w.getStateValue('test.table.consulted') as number) ?? 0) + 1);
        return null;
      },
      postReport: () => ({ override: { messageId: 'test.table.answer', params: {} } }),
    });
  }

  function registerExchangeSelector(): void {
    world.registerDialogueSelector({
      select: (_npc, intent): DialogueSelectionResult => intent.text === 'the play'
        ? { handled: true, messageId: 'burbage.exchange.the-play' }
        : { handled: false },
      exchangeClaims: (_npc, intent) => intent.text === 'the play',
    });
  }

  it('a claimed input grips the firing: the table path never runs, no bookkeeping is consumed (D16)', () => {
    openExchangeOn(npc);
    registerExchangeSelector();
    registerTableInterceptor();

    const { events } = runAction(askingAction, world, makeCommand(IFActions.ASKING, npc, 'the play'));

    expect(world.getStateValue('test.table.consulted')).toBeUndefined();
    const asked = events.find((e) => e.type === 'if.event.asked')!;
    expect((asked.data as { messageId?: string }).messageId).toBe('burbage.exchange.the-play');
  });

  it('an unclaimed input falls through: the table path runs and its override wins (AC2 rejection leg)', () => {
    openExchangeOn(npc);
    registerExchangeSelector();
    registerTableInterceptor();

    const { events } = runAction(askingAction, world, makeCommand(IFActions.ASKING, npc, 'the weather'));

    expect(world.getStateValue('test.table.consulted')).toBe(1);
    const asked = events.find((e) => e.type === 'if.event.asked')!;
    expect((asked.data as { messageId?: string }).messageId).toBe('test.table.answer');
  });

  it('no open exchange: the probe never grips even when it would claim the input', () => {
    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc)); // scene, no exchange
    registerExchangeSelector();
    registerTableInterceptor();

    runAction(askingAction, world, makeCommand(IFActions.ASKING, npc, 'the play'));

    expect(world.getStateValue('test.table.consulted')).toBe(1);
  });

  // -- world-bounded exit (D8 / AC7) ---------------------------------------

  function exitClosingSelector(leaverId: string): void {
    world.registerDialogueSelector({
      select: () => ({
        handled: true,
        messageId: 'burbage.leaves',
        sceneDirectives: [{ kind: 'close-scene', boundary: 'exit', leaverId }] as SceneDirective[],
      }),
    });
  }

  it('an exit from a roomless trap is refused: the scene stays live and the refusal rides the author channel', () => {
    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc));
    exitClosingSelector(npc.id);

    const { events } = runAction(tellingAction, world, makeCommand(IFActions.TELLING, npc, 'goodbye'));

    expect(sceneWith(world, npc.id)).toBeDefined();
    expect(events.map((e) => e.type)).toContain('character.scene.exit_refused');
    expect(memory.get(npc.id, player.id)).toBeUndefined();
  });

  it('with a traversable exit the scene closes on the exit boundary and folds per-pair memory', () => {
    const yard = world.createEntity('Yard', 'room');
    yard.add(new IdentityTrait({ name: 'Yard' }));
    yard.add(new RoomTrait());
    yard.add(new ContainerTrait());
    const roomTrait = room.get(TraitType.ROOM) as { exits?: Record<string, { destination: string }> };
    roomTrait.exits = { north: { destination: yard.id } };

    runAction(talkingAction, world, makeCommand(IFActions.TALKING, npc));
    exitClosingSelector(npc.id);

    const { events } = runAction(tellingAction, world, makeCommand(IFActions.TELLING, npc, 'goodbye'));

    expect(sceneWith(world, npc.id)).toBeUndefined();
    expect(events.map((e) => e.type)).toContain('character.scene.scene-closed');
    expect(memory.get(npc.id, player.id)).toMatchObject({ visits: 1 });
    expect(memory.get(player.id, npc.id)).toMatchObject({ visits: 1 });
  });
});
