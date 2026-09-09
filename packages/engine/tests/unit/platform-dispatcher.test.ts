/**
 * One platform-operation dispatcher (ADR-334 D3) and no dead twins (D4).
 *
 * The meta path (`processMetaPlatformOperation`, one request, completion
 * events returned) and the turn path (`processPlatformOperations`, the
 * drained pending list, completion events emitted) run the same
 * dispatcher. For each of the six operations this drives both paths on
 * fresh engines and asserts they produce the same completion or failure
 * event AND the same engine state change — a stopped engine, a restored
 * turn, a repeated command. Structural cases pin that the switch exists
 * in one module and that the removed class and handler are gone from
 * the package's surface.
 */

import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  createSaveRequestedEvent,
  createRestoreRequestedEvent,
  createQuitRequestedEvent,
  createRestartRequestedEvent,
  createUndoRequestedEvent,
  createAgainRequestedEvent,
  type IPlatformEvent,
  type ISaveData,
  type ISaveRestoreHooks,
  type ISemanticEvent
} from '@sharpee/core';
import * as engineIndex from '../../src/index';
import { GameEngine } from '../../src/game-engine';
import { processPlatformOperations } from '../../src/turn/platform-operations';
import { processMetaPlatformOperation } from '../../src/turn/meta-command';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

const SRC_DIR = join(__dirname, '..', '..', 'src');

/** Every `.ts` file under `src/`, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return name.endsWith('.ts') ? [full] : [];
  });
}

/** A started engine over the minimal story with the given hooks. */
function startedEngine(hooks: Partial<ISaveRestoreHooks>): GameEngine {
  const { engine } = setupTestEngine();
  engine.setStory(new MinimalTestStory());
  engine.registerSaveRestoreHooks({
    onSaveRequested: undefined,
    onRestoreRequested: undefined,
    onQuitRequested: undefined,
    onRestartRequested: undefined,
    ...hooks
  });
  engine.start();
  return engine;
}

/** The comparable shape of a delivered event: its type and payload, or a game message's id. */
function shape(event: ISemanticEvent): unknown {
  const platform = event as { payload?: unknown; data?: { messageId?: string } };
  return { type: event.type, payload: platform.payload ?? platform.data?.messageId };
}

/** Run one request through the meta path; return what it delivered. */
async function metaPath(engine: GameEngine, request: IPlatformEvent): Promise<unknown[]> {
  const delivered = await processMetaPlatformOperation(engine['turnEngine'](), request);
  return delivered.map(shape);
}

/** Run one request through the turn path; return the platform-side events it emitted. */
async function turnPath(engine: GameEngine, request: IPlatformEvent): Promise<unknown[]> {
  const emitted: ISemanticEvent[] = [];
  engine.on('event', (event) => emitted.push(event));
  engine['pendingPlatformOps'].push(request);
  await processPlatformOperations(engine['turnEngine']());
  return emitted
    .filter((e) => e.type.startsWith('platform.') || e.type === 'game.message')
    .map(shape);
}

describe('one platform-operation dispatcher (ADR-334 D3)', () => {
  it('exactly one module under src/ switches on PlatformEventType', () => {
    const switching = sourceFiles(SRC_DIR).filter((file) =>
      /case PlatformEventType\./.test(readFileSync(file, 'utf8'))
    );
    expect(switching.map((f) => f.replace(SRC_DIR, 'src'))).toEqual(['src/platform-operations.ts']);
  });

  it('save: both paths hand the same save data to the hook and complete', async () => {
    const seen: ISaveData[] = [];
    const hooks = { onSaveRequested: vi.fn(async (data: ISaveData) => { seen.push(data); }) };
    const request = createSaveRequestedEvent({ saveName: 'paired', timestamp: 1 });

    const meta = await metaPath(startedEngine(hooks), request);
    const turn = await turnPath(startedEngine(hooks), request);

    expect(meta).toEqual([{ type: 'platform.save_completed', payload: { success: true, error: undefined } }]);
    expect(turn).toEqual(meta);
    expect(seen).toHaveLength(2);
    expect(seen.map((d) => d.metadata.description)).toEqual(['paired', 'paired']);
  });

  it('restore: both paths load the save and roll the turn counter back', async () => {
    const results: Array<{ before: number; after: number; events: unknown[] }> = [];
    for (const path of [metaPath, turnPath]) {
      const engine = startedEngine({});
      const saveData = engine['createSaveData']() as ISaveData;
      engine.registerSaveRestoreHooks({ onRestoreRequested: async () => saveData });
      await engine.executeTurn('look');
      await engine.executeTurn('look');
      const before = engine.getContext().currentTurn;
      const events = await path(engine, createRestoreRequestedEvent({ saveName: 'paired' }));
      results.push({ before, after: engine.getContext().currentTurn, events });
    }
    const [meta, turn] = results;
    expect(meta.events).toEqual([{ type: 'platform.restore_completed', payload: { success: true, error: undefined } }]);
    expect(turn.events).toEqual(meta.events);
    expect(meta.after).toBeLessThan(meta.before);
    expect(turn.after).toBe(meta.after);
  });

  it('restore: both paths fail the same way when the hook has no data', async () => {
    const hooks = { onRestoreRequested: async () => null };
    const request = createRestoreRequestedEvent({ saveName: 'none' });
    const meta = await metaPath(startedEngine(hooks), request);
    const turn = await turnPath(startedEngine(hooks), request);
    expect(meta).toEqual([{ type: 'platform.restore_failed', payload: { success: false, error: 'No save data available' } }]);
    expect(turn).toEqual(meta);
  });

  it('quit: both paths stop the engine when confirmed and keep it running when declined', async () => {
    const request = createQuitRequestedEvent({ reason: 'user_requested' });

    const confirmMeta = startedEngine({ onQuitRequested: async () => true });
    const confirmTurn = startedEngine({ onQuitRequested: async () => true });
    const meta = await metaPath(confirmMeta, request);
    const turn = await turnPath(confirmTurn, request);
    expect(meta).toEqual([{ type: 'platform.quit_confirmed', payload: { success: true } }]);
    expect(turn).toEqual(meta);
    expect(confirmMeta['running']).toBe(false);
    expect(confirmTurn['running']).toBe(false);

    const declineMeta = startedEngine({ onQuitRequested: async () => false });
    const declineTurn = startedEngine({ onQuitRequested: async () => false });
    const metaDeclined = await metaPath(declineMeta, request);
    const turnDeclined = await turnPath(declineTurn, request);
    expect(metaDeclined).toEqual([{ type: 'platform.quit_cancelled', payload: { success: false } }]);
    expect(turnDeclined).toEqual(metaDeclined);
    expect(declineMeta['running']).toBe(true);
    expect(declineTurn['running']).toBe(true);
  });

  it('restart: both paths acknowledge then stop with reason restart, or cancel and keep running', async () => {
    const request = createRestartRequestedEvent({ reason: 'user_requested' });

    const confirmMeta = startedEngine({ onRestartRequested: async () => true });
    const confirmTurn = startedEngine({ onRestartRequested: async () => true });
    const meta = await metaPath(confirmMeta, request);
    const turn = await turnPath(confirmTurn, request);
    expect(meta).toEqual([{ type: 'game.message', payload: 'if.action.restarting.game_restarting' }]);
    // The turn path also sees the stop's own game.* events; the platform-side
    // shape it delivers is the same ack and nothing else.
    expect(turn.filter((e) => (e as { type: string }).type !== 'game.ended')).toEqual(meta);
    expect(confirmMeta['running']).toBe(false);
    expect(confirmTurn['running']).toBe(false);

    const declineMeta = startedEngine({ onRestartRequested: async () => false });
    const declineTurn = startedEngine({ onRestartRequested: async () => false });
    const metaDeclined = await metaPath(declineMeta, request);
    const turnDeclined = await turnPath(declineTurn, request);
    expect(metaDeclined).toEqual([{ type: 'platform.restart_cancelled', payload: { success: false } }]);
    expect(turnDeclined).toEqual(metaDeclined);
    expect(declineMeta['running']).toBe(true);
    expect(declineTurn['running']).toBe(true);
  });

  it('undo: both paths roll back one turn, and both refuse when there is nothing to undo', async () => {
    const results: Array<{ before: number; after: number; events: unknown[] }> = [];
    for (const path of [metaPath, turnPath]) {
      const engine = startedEngine({});
      // `look` is non-undoable and takes no snapshot; a take does, whether
      // or not the minimal story has anything to take.
      await engine.executeTurn('take lamp');
      await engine.executeTurn('take lamp');
      const before = engine.getContext().currentTurn;
      const events = await path(engine, createUndoRequestedEvent());
      results.push({ before, after: engine.getContext().currentTurn, events });
    }
    const [meta, turn] = results;
    expect(meta.events).toEqual([
      { type: 'platform.undo_completed', payload: { success: true, restoredToTurn: meta.after, error: undefined } }
    ]);
    expect(turn.events).toEqual(meta.events);
    expect(meta.after).toBeLessThan(meta.before);
    expect(turn.after).toBe(meta.after);

    const nothingMeta = await metaPath(startedEngine({}), createUndoRequestedEvent());
    const nothingTurn = await turnPath(startedEngine({}), createUndoRequestedEvent());
    expect(nothingMeta).toEqual([
      { type: 'platform.undo_failed', payload: { success: false, restoredToTurn: undefined, error: 'Nothing to undo' } }
    ]);
    expect(nothingTurn).toEqual(nothingMeta);
  });

  it('again: both paths run the stored command as a turn and deliver nothing; both fail without one', async () => {
    const runs: Array<{ completed: number; advanced: number; events: unknown[] }> = [];
    for (const path of [metaPath, turnPath]) {
      const engine = startedEngine({});
      let completed = 0;
      engine.on('turn:complete', () => { completed++; });
      const before = engine.getContext().currentTurn;
      const events = await path(engine, createAgainRequestedEvent({ command: 'look', actionId: 'if.action.looking' }));
      runs.push({ completed, advanced: engine.getContext().currentTurn - before, events });
    }
    // The repeated `look` ran as a turn of its own on both paths: the turn
    // counter advanced once and nothing platform-side was delivered.
    expect(runs[0]).toEqual({ completed: 1, advanced: 1, events: [] });
    expect(runs[1]).toEqual({ completed: 1, advanced: 1, events: [] });

    const empty = createAgainRequestedEvent({ command: '', actionId: 'if.action.looking' });
    const meta = await metaPath(startedEngine({}), empty);
    const turn = await turnPath(startedEngine({}), empty);
    expect(meta).toEqual([{ type: 'platform.again_failed', payload: { success: false, error: 'No command to repeat' } }]);
    expect(turn).toEqual(meta);
  });

  it('a throwing hook is answered by the one error mapping on both paths', async () => {
    const boom = { onSaveRequested: async () => { throw new Error('disk full'); } };
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const request = createSaveRequestedEvent({ saveName: 'x', timestamp: 1 });
      const meta = await metaPath(startedEngine(boom), request);
      const turn = await turnPath(startedEngine(boom), request);
      expect(meta).toEqual([{ type: 'platform.save_failed', payload: { success: false, error: 'disk full' } }]);
      expect(turn).toEqual(meta);
    } finally {
      quiet.mockRestore();
    }
  });
});

describe('no dead twins (ADR-334 D4)', () => {
  it('GameEngine has no platformOpHandler or turnEventProcessor field', () => {
    const source = readFileSync(join(SRC_DIR, 'game-engine.ts'), 'utf8');
    expect(source).not.toMatch(/platformOpHandler|turnEventProcessor/);
  });

  it('the package exports processEvent and not the removed class, factory, or handler', () => {
    const surface = engineIndex as Record<string, unknown>;
    expect(typeof surface.processEvent).toBe('function');
    expect(typeof surface.enrichTurnEvents).toBe('function');
    expect(typeof surface.dispatchPlatformOperations).toBe('function');
    expect(surface.TurnEventProcessor).toBeUndefined();
    expect(surface.createTurnEventProcessor).toBeUndefined();
    expect(surface.PlatformOperationHandler).toBeUndefined();
    expect(surface.createPlatformOperationHandler).toBeUndefined();
  });
});
