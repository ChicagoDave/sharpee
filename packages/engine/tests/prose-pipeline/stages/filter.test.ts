/**
 * Tests for `filterEvents` — drops system.* and platform.* events.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 * @see plan-20260509-phase1.md §Sub-phase 1.3 (port from text-service)
 */

import { describe, it, expect } from 'vitest';
import { filterEvents } from '../../../src/prose-pipeline/stages/filter';
import type { ISemanticEvent } from '@sharpee/core';

function makeEvent(type: string, data?: unknown): ISemanticEvent {
  return {
    id: `evt-${type}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}

describe('filterEvents', () => {
  it('should drop system.* events', () => {
    const events = [
      makeEvent('system.tick'),
      makeEvent('system.turn.start'),
      makeEvent('system.turn.end'),
    ];

    const result = filterEvents(events);

    expect(result).toHaveLength(0);
  });

  it('should drop platform.* events', () => {
    const events = [
      makeEvent('platform.save_requested'),
      makeEvent('platform.restore_completed'),
      makeEvent('platform.quit'),
    ];

    const result = filterEvents(events);

    expect(result).toHaveLength(0);
  });

  it('should pass through domain events', () => {
    const events = [
      makeEvent('if.event.room.description'),
      makeEvent('if.event.revealed'),
      makeEvent('action.success'),
    ];

    const result = filterEvents(events);

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.type)).toEqual([
      'if.event.room.description',
      'if.event.revealed',
      'action.success',
    ]);
  });

  it('should pass through game.* events', () => {
    const events = [makeEvent('game.started'), makeEvent('game.message')];

    const result = filterEvents(events);

    expect(result).toHaveLength(2);
  });

  it('should filter a mixed array correctly', () => {
    const events = [
      makeEvent('system.tick'),
      makeEvent('if.event.room.description'),
      makeEvent('platform.save_requested'),
      makeEvent('action.success'),
      makeEvent('system.turn.end'),
      makeEvent('game.message'),
    ];

    const result = filterEvents(events);

    expect(result).toHaveLength(3);
    expect(result.map((e) => e.type)).toEqual([
      'if.event.room.description',
      'action.success',
      'game.message',
    ]);
  });

  it('should return empty array for empty input', () => {
    const result = filterEvents([]);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when all events are filtered', () => {
    const events = [makeEvent('system.tick'), makeEvent('platform.quit')];

    const result = filterEvents(events);

    expect(result).toHaveLength(0);
  });
});
