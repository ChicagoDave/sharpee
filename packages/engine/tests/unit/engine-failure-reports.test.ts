/**
 * The facade reports its own failures on the system event channel, not
 * stderr: a save or restore hook that fails, and an event listener that
 * throws, each surface as a `system.<type>` event of severity `error` that
 * `event` listeners receive. A listener that throws while its own failure
 * is being reported is dropped rather than reported, so `emit` returns
 * instead of recursing.
 *
 * Platform event ids are pinned here too: `platform_<clock>_<n>` from a
 * per-engine counter, the timestamp being the same clock read the id
 * carries.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import type { GameEngine } from '../../src/game-engine';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

function startedEngine(): GameEngine {
  const { engine } = setupTestEngine();
  engine.installStory(new MinimalTestStory());
  engine.start();
  return engine;
}

function systemEvents(events: ISemanticEvent[]): ISemanticEvent[] {
  return events.filter((e) => e.type.startsWith('system.'));
}

describe('the facade reports its failures as system events', () => {
  let engine: GameEngine;
  let received: ISemanticEvent[];

  beforeEach(() => {
    engine = startedEngine();
    received = [];
    engine.on('event', (event) => received.push(event));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('a rejecting save hook yields false and one system.save_failed carrying the error', async () => {
    engine.registerSaveRestoreHooks({
      onSaveRequested: vi.fn().mockRejectedValue(new Error('disk full')),
    });

    await expect(engine.save()).resolves.toBe(false);

    const reports = systemEvents(received);
    expect(reports.map((e) => e.type)).toEqual(['system.save_failed']);
    const data = reports[0].data as { error: { message: string; stack?: string } };
    expect(data.error.message).toBe('disk full');
    expect(data.error.stack).toContain('disk full');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('a rejecting restore hook yields false and one system.restore_failed carrying the error', async () => {
    engine.registerSaveRestoreHooks({
      onRestoreRequested: vi.fn().mockRejectedValue(new Error('no such save')),
    });

    await expect(engine.restore()).resolves.toBe(false);

    const reports = systemEvents(received);
    expect(reports.map((e) => e.type)).toEqual(['system.restore_failed']);
    expect((reports[0].data as { error: { message: string } }).error.message).toBe('no such save');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('a save with no hook registered returns false and reports nothing', async () => {
    await expect(engine.save()).resolves.toBe(false);
    expect(systemEvents(received)).toEqual([]);
  });

  it('a throwing listener is reported as system.listener_error naming the event, and the rest still run', () => {
    const after = vi.fn();
    engine.on('turn:start', () => {
      throw new Error('listener broke');
    });
    engine.on('turn:start', after);

    engine['emit']('turn:start', 7, 'look');

    expect(after).toHaveBeenCalledWith(7, 'look');
    const reports = systemEvents(received);
    expect(reports.map((e) => e.type)).toEqual(['system.listener_error']);
    const data = reports[0].data as { event: string; error: { message: string } };
    expect(data.event).toBe('turn:start');
    expect(data.error.message).toBe('listener broke');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('a listener that throws on its own failure report is dropped, not recursed into', () => {
    const alwaysThrows = vi.fn(() => {
      throw new Error('every time');
    });
    engine.on('event', alwaysThrows);

    const probe: ISemanticEvent = { id: 'probe', type: 'probe', timestamp: 0, entities: {}, data: {} };
    expect(() => engine['emit']('event', probe)).not.toThrow();

    // Once for the probe, once for the report of its own first failure;
    // the failure on the report is the one that is dropped.
    expect(alwaysThrows).toHaveBeenCalledTimes(2);
    expect(received.map((e) => e.type)).toEqual(['probe', 'system.listener_error']);
    expect(engine['reportingListenerError']).toBe(false);
  });
});

describe('platform event ids', () => {
  it('are platform_<clock>_<n> from a per-engine counter, the timestamp being the same clock read', () => {
    const { engine } = setupTestEngine();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    engine.emitPlatformEvent({ type: 'platform.probe', entities: {}, data: {} });
    engine.emitPlatformEvent({ type: 'platform.probe', entities: {}, data: {} });

    const stored = engine['platformEvents'].getAllEvents();
    expect(stored.map((e) => e.id)).toEqual([
      'platform_1700000000000_1',
      'platform_1700000000000_2',
    ]);
    expect(stored.map((e) => e.timestamp)).toEqual([1_700_000_000_000, 1_700_000_000_000]);
    expect(clock).toHaveBeenCalledTimes(2);
    clock.mockRestore();
  });

  it('a second engine starts its counter afresh', () => {
    const first = setupTestEngine().engine;
    const second = setupTestEngine().engine;
    first.emitPlatformEvent({ type: 'platform.probe', entities: {}, data: {} });
    second.emitPlatformEvent({ type: 'platform.probe', entities: {}, data: {} });

    expect(first['platformEvents'].getAllEvents()[0].id).toMatch(/^platform_\d+_1$/);
    expect(second['platformEvents'].getAllEvents()[0].id).toMatch(/^platform_\d+_1$/);
  });
});
