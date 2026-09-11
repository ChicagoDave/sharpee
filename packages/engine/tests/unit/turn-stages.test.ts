/**
 * The stages the order test drives but no test asserted on state for
 * (mutation-verification, Phase 16): each case drives a real engine
 * through `executeTurn` and asserts the state the stage changes — the
 * world, the turn counter, the player identity, the engine's running
 * flag, the stored events — never a spy count alone. The runner's two
 * failure contracts are pinned the same way.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSaveRequestedEvent, type ISemanticEvent } from '@sharpee/core';
import { ActorTrait, EntityType, type WorldModel } from '@sharpee/world-model';
import { endStory, killPlayer } from '@sharpee/stdlib';
import { INPUT_MODE_STATE_KEY } from '../../src/types';
import { GameEngine } from '../../src/game-engine';
import { chainStage } from '../../src/turn/chain';
import { executeCommandStage } from '../../src/turn/execute-command';
import { validateInputStage } from '../../src/turn/validate-input';
import type { TurnStageContext } from '../../src/turn/context';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

function started(story: MinimalTestStory = new MinimalTestStory()): { engine: GameEngine; world: WorldModel } {
  const { engine } = setupTestEngine();
  engine.installStory(story);
  engine.start();
  return { engine, world: engine.getWorld() };
}

function named(world: WorldModel, name: string) {
  const entity = world.getAllEntities().find((e) => e.name === name);
  if (!entity) throw new Error(`no entity named ${name}`);
  return entity;
}

/** A story handler that reacts to a take with the given event. */
function reactToTake(engine: GameEngine, event: ISemanticEvent): void {
  engine.getEventProcessor().registerHandler('if.event.taken', () => [{ type: 'emit', event }]);
}

function collectEvents(engine: GameEngine): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];
  engine.on('event', (e) => events.push(e));
  return events;
}

describe('validate-input', () => {
  // Through `executeTurn` a null input never reaches this stage: the
  // undo-snapshot stage's registry check trims the input first, as the
  // original method did ahead of its own null guard. The stage's contract
  // is pinned on its own; the dead reach is recorded in ADR-334's notes.
  it('a null input sets a failed result and stops the list', async () => {
    const context = { input: null as unknown as string, turn: 4, started: false, semanticEvents: [], events: [] } as unknown as TurnStageContext;
    expect(await validateInputStage.run(context)).toBe('stop');
    expect(context.result?.success).toBe(false);
    expect(context.result?.error).toBe('Input cannot be null or undefined');
    expect(context.result?.turn).toBe(4);
    expect(context.result?.events.map((e) => e.type)).toEqual(['command.failed']);
  });

  it('a string input continues without touching the result', async () => {
    const context = { input: 'look', turn: 4, started: false, semanticEvents: [], events: [] } as unknown as TurnStageContext;
    expect(await validateInputStage.run(context)).toBe('continue');
    expect(context.result).toBeUndefined();
  });
});

describe('undo-snapshot', () => {
  it('a regular command snapshots the world so UNDO puts the lamp back; a meta command takes no snapshot', async () => {
    const { engine, world } = started();
    const lamp = named(world, 'lamp');
    const room = world.getLocation(lamp.id);
    expect(engine.canUndo()).toBe(false);

    await engine.executeTurn('score');
    expect(engine.canUndo()).toBe(false);

    await engine.executeTurn('take lamp');
    expect(world.getLocation(lamp.id)).toBe(world.getPlayer()!.id);
    expect(engine.canUndo()).toBe(true);

    await engine.executeTurn('undo');
    expect(world.getLocation(lamp.id)).toBe(room);
  });
});

describe('input-mode', () => {
  afterEach(() => vi.restoreAllMocks());

  it('an active mode owns the line: its events are the result, the counter advances as it says, and the command path never runs', async () => {
    const { engine, world } = started();
    engine.registerInputMode('quiz', {
      advancesTurn: true,
      handleInput: (input) => [{ id: `quiz-${input}`, type: 'quiz.answered', timestamp: 1, entities: {}, data: { input } }]
    });
    world.setStateValue(INPUT_MODE_STATE_KEY, 'quiz');
    const emitted = collectEvents(engine);
    const commandPath = vi.spyOn(executeCommandStage, 'run');
    const before = engine.getContext().currentTurn;

    const result = await engine.executeTurn('blue');

    expect(result.success).toBe(true);
    expect(result.events.map((e) => e.type)).toEqual(['quiz.answered']);
    expect(emitted.map((e) => e.type)).toContain('quiz.answered');
    expect(engine.getContext().currentTurn).toBe(before + 1);
    expect(commandPath).not.toHaveBeenCalled();
  });

  it('a mode that does not advance the turn leaves the counter alone', async () => {
    const { engine, world } = started();
    engine.registerInputMode('menu', { advancesTurn: false, handleInput: () => [] });
    world.setStateValue(INPUT_MODE_STATE_KEY, 'menu');
    const before = engine.getContext().currentTurn;
    await engine.executeTurn('3');
    expect(engine.getContext().currentTurn).toBe(before);
  });
});

describe('player-switch', () => {
  it('a switch requested during the turn lands at the turn boundary: the world and the context both name the new player', async () => {
    const { engine, world } = started();
    const ada = world.createEntity('Ada', EntityType.ACTOR);
    ada.add(new ActorTrait({ isPlayable: true }));
    world.moveEntity(ada.id, world.getLocation(world.getPlayer()!.id)!);
    const original = world.getPlayer()!.id;
    reactToTake(engine, {
      id: 'switch', type: 'if.event.player.switch_requested', timestamp: 1, entities: {}, data: { entityId: ada.id }
    });

    await engine.executeTurn('take lamp');

    expect(world.getPlayer()!.id).toBe(ada.id);
    expect(engine.getContext().player.id).toBe(ada.id);
    expect(world.getLocation(named(world, 'lamp').id)).toBe(original);
  });
});

describe('platform-operations (regular turn)', () => {
  it('a request emitted by the action is drained before the prose renders and its completion joins the result', async () => {
    const { engine } = started();
    const onSaveRequested = vi.fn(async () => {});
    engine.registerSaveRestoreHooks({ onSaveRequested });
    reactToTake(engine, createSaveRequestedEvent({ saveName: 'auto', timestamp: 1 }));

    const result = await engine.executeTurn('take lamp');

    expect(onSaveRequested).toHaveBeenCalledOnce();
    expect(result.events.map((e) => e.type)).toContain('platform.save_completed');
  });
});

describe('ending', () => {
  it('AC-2: a story that declares victory through endStory stops the engine after the turn', async () => {
    const { engine, world } = started();
    const emitted = collectEvents(engine);
    // The declaring site is the story's own reaction to the take — the same
    // verb a Chord `win` lowers to. Nothing implements `isComplete`.
    engine.getEventProcessor().registerHandler('if.event.taken', () => {
      endStory(world, 'victory', { turn: 1, messageId: 'lamp.lit' });
      return [];
    });

    await engine.executeTurn('take lamp');

    // POSTCONDITION: the world records the ending, and the engine stopped
    // because of that record.
    expect(world.getEnding()).toMatchObject({ kind: 'victory', turn: 1, messageId: 'lamp.lit' });
    expect(engine['phase'].name).toBe('stopped');
    const ended = emitted.filter((e) => e.type === 'game.ended');
    expect(ended).toHaveLength(1);
    expect((ended[0].data as { ending?: { type?: string } }).ending?.type).toBe('victory');
    await expect(engine.executeTurn('look')).rejects.toThrow(/'stopped' phase/);
  });

  it('AC-2: the poll is gone — a story still carrying isComplete() is never asked', async () => {
    // The hook is off the `Story` interface (ADR-347 D2b), so a story that
    // kept the method is just a story with an extra method. If this test
    // ever stops at `stopped`, the poll came back.
    class PollingStory extends MinimalTestStory {
      isComplete(): boolean { return true; }
    }
    const { engine, world } = started(new PollingStory());

    await engine.executeTurn('take lamp');

    expect(world.getEnding()).toBeUndefined();
    expect(engine['phase'].name).toBe('playing');
  });

  it('a death story policy did not revive becomes a defeat Ending on the world', async () => {
    const { engine, world } = started();
    const emitted = collectEvents(engine);
    const player = world.getPlayer()!;
    reactToTake(engine, killPlayer(world, player, { cause: 'grue' })!);

    await engine.executeTurn('take lamp');

    expect(world.getEnding()).toMatchObject({ kind: 'defeat', cause: 'grue' });
    expect(engine['phase'].name).toBe('stopped');
    const ended = emitted.filter((e) => e.type === 'game.ended');
    expect((ended[0].data as { ending?: { type?: string } }).ending?.type).toBe('defeat');
    expect(emitted.some((e) => e.type === 'game.lost')).toBe(true);
  });
});

describe('clear-turn-events and turn-complete', () => {
  it('the turn’s stored events are emptied after rendering, and turn:complete carries the returned result', async () => {
    const { engine } = started();
    const completed: unknown[] = [];
    engine.on('turn:complete', (result) => completed.push(result));
    const turn = engine.getContext().currentTurn;

    const result = await engine.executeTurn('take lamp');

    expect(engine['turnEvents'].get(turn)).toEqual([]);
    expect(completed).toEqual([result]);
  });
});

describe('meta-command failure', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a throw inside the meta command becomes a command.failed event and a failed result, and the engine keeps running', async () => {
    const { engine } = started();
    vi.spyOn(engine['commandExecutor'], 'validateCommand').mockImplementation(() => {
      throw new Error('registry offline');
    });
    const result = await engine.executeTurn('score');
    expect(result.success).toBe(false);
    expect(result.error).toBe('registry offline');
    expect(result.events.map((e) => e.type)).toEqual(['command.failed']);
    expect(engine['phase'].name).toBe('playing');
  });
});

describe('the runner’s failure contracts', () => {
  afterEach(() => vi.restoreAllMocks());

  it('an error after turn:start is reported as turn:failed with the turn number and rethrown', async () => {
    const { engine } = started();
    const failed: Array<[Error, number]> = [];
    engine.on('turn:failed', (error, turn) => failed.push([error, turn]));
    vi.spyOn(executeCommandStage, 'run').mockRejectedValue(new Error('executor down'));
    const turn = engine.getContext().currentTurn;

    await expect(engine.executeTurn('look')).rejects.toThrow('executor down');

    expect(failed).toHaveLength(1);
    expect(failed[0][0].message).toBe('executor down');
    expect(failed[0][1]).toBe(turn);
  });

  it('a list that stops without a result is a programming error, reported before the turn started', async () => {
    const { engine } = started();
    const failed: unknown[] = [];
    engine.on('turn:failed', (error) => failed.push(error));
    vi.spyOn(chainStage, 'run').mockResolvedValue('stop');

    await expect(engine.executeTurn('look')).rejects.toThrow('The turn ended without a result');
    expect(failed).toEqual([]);
  });
});
