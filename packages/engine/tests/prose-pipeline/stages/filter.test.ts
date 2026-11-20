/**
 * Tests for `filterEvents` — drops system.* and platform request-phase
 * events; platform outcome events pass through to handlePlatformEvent.
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
  it.each<{
    name: string;
    inputTypes: string[];
    expectedTypes: string[];
  }>([
    {
      name: 'drops system.* events',
      inputTypes: ['system.tick', 'system.turn.start', 'system.turn.end'],
      expectedTypes: [],
    },
    {
      name: 'drops platform request-phase events',
      inputTypes: ['platform.save_requested', 'platform.undo_requested', 'platform.quit_requested'],
      expectedTypes: [],
    },
    {
      name: 'passes through platform outcome events (rendered by handlePlatformEvent)',
      inputTypes: ['platform.save_completed', 'platform.restore_completed', 'platform.undo_failed'],
      expectedTypes: ['platform.save_completed', 'platform.restore_completed', 'platform.undo_failed'],
    },
    {
      name: 'passes through domain events',
      inputTypes: ['if.event.room.description', 'if.event.revealed', 'action.success'],
      expectedTypes: ['if.event.room.description', 'if.event.revealed', 'action.success'],
    },
    {
      name: 'passes through game.* events',
      inputTypes: ['game.started', 'game.message'],
      expectedTypes: ['game.started', 'game.message'],
    },
    {
      name: 'filters a mixed array correctly (preserves passthrough order)',
      inputTypes: [
        'system.tick',
        'if.event.room.description',
        'platform.save_requested',
        'action.success',
        'system.turn.end',
        'game.message',
      ],
      expectedTypes: ['if.event.room.description', 'action.success', 'game.message'],
    },
    {
      name: 'returns empty array for empty input',
      inputTypes: [],
      expectedTypes: [],
    },
    {
      name: 'returns empty array when all events are filtered',
      inputTypes: ['system.tick', 'platform.quit_requested'],
      expectedTypes: [],
    },
  ])('$name', ({ inputTypes, expectedTypes }) => {
    const result = filterEvents(inputTypes.map((t) => makeEvent(t)));
    expect(result.map((e) => e.type)).toEqual(expectedTypes);
  });

  describe('story events (ADR-405)', () => {
    const vocabulary: ReadonlySet<string> = new Set(['petted', 'chime-played']);

    it('drops an event whose type is in the story-event vocabulary, whatever its data', () => {
      const bare = makeEvent('petted');
      const withText = makeEvent('petted', { message: 'never printed', text: 'nor this', messageId: 'taken' });
      const media = makeEvent('chime-played', { src: 'chime.ogg', text: 'never printed' });
      const kept = makeEvent('game.message', { text: 'printed' });

      expect(filterEvents([bare, kept, withText, media], vocabulary)).toEqual([kept]);
    });

    it('passes the same type when the vocabulary does not hold it', () => {
      const event = makeEvent('petted', { message: 'printed, as for a story that declares no story events' });

      expect(filterEvents([event])).toEqual([event]);
      expect(filterEvents([event], new Set(['fed']))).toEqual([event]);
    });

    it('matches a type without regard to case', () => {
      expect(filterEvents([makeEvent('Petted')], vocabulary)).toEqual([]);
    });

    it('keeps the system and platform rules alongside the vocabulary', () => {
      const types = ['system.tick', 'platform.save_requested', 'platform.save_completed', 'petted', 'action.success'];

      const result = filterEvents(types.map((t) => makeEvent(t)), vocabulary);

      expect(result.map((e) => e.type)).toEqual(['platform.save_completed', 'action.success']);
    });
  });
});
