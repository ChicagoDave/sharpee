/**
 * `stop()` describes the session it is closing once: the `game.ending`
 * event and the reason-specific end event carry the same record — the
 * start clock `start()` read, the counters the turn stages advanced, and
 * the clock read at stop.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { MinimalTestStory } from '../stories';
import { setupTestEngine } from '../test-helpers/setup-test-engine';

interface SessionRecord {
  startTime?: number;
  endTime?: number;
  turns?: number;
  moves?: number;
}

function sessionOf(event: ISemanticEvent): SessionRecord {
  return (event.data as { session: SessionRecord }).session;
}

describe('stop() closes the session with one record', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the ending event and the victory event carry the same start, counters, and stop clock', () => {
    const { engine } = setupTestEngine({ config: { seed: 1 } });
    engine.installStory(new MinimalTestStory());
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    engine.start();

    // Advance the counters the way the turn stages do: two turns, one of
    // which succeeded.
    engine['turnEngine']().countSessionTurn(true);
    engine['turnEngine']().countSessionTurn(false);

    const received: ISemanticEvent[] = [];
    engine.on('event', (event) => received.push(event));
    clock.mockReturnValue(5_000);
    engine.stop('victory', { reason: 'found the treasure' });

    const ending = received.find((e) => e.type === 'game.ending');
    const won = received.find((e) => e.type === 'game.won');
    expect(ending).toBeDefined();
    expect(won).toBeDefined();

    const expected: SessionRecord = { startTime: 1_000, endTime: 5_000, turns: 2, moves: 1 };
    expect(sessionOf(ending!)).toEqual(expected);
    expect(sessionOf(won!)).toEqual(expected);
    expect(engine['running']).toBe(false);
  });

  it('a stopped engine ignores a second stop', () => {
    const { engine } = setupTestEngine({ config: { seed: 1 } });
    engine.installStory(new MinimalTestStory());
    engine.start();
    engine.stop('quit');

    const received: ISemanticEvent[] = [];
    engine.on('event', (event) => received.push(event));
    engine.stop('quit');

    expect(received).toEqual([]);
  });
});
