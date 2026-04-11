/**
 * Integration tests for TextService.processTurn()
 *
 * Tests the full pipeline (filter → sort → route → assemble)
 * and the three inline handlers: implicit take, command failed, client query.
 *
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { TextService, createTextService } from '../src/text-service.js';
import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider } from '@sharpee/if-domain';

/**
 * Create a stub LanguageProvider for integration tests
 */
function makeProvider(
  map: Record<string, string | ((params?: Record<string, unknown>) => string)>,
): LanguageProvider {
  return {
    languageCode: 'en-us',
    getMessage(id: string, params?: Record<string, unknown>): string {
      const entry = map[id];
      if (!entry) return id;
      if (typeof entry === 'function') return entry(params);
      return entry.replace(/\{(\w+)\}/g, (_, k: string) => {
        const val = params?.[k];
        return val === undefined ? '' : String(val);
      });
    },
  } as LanguageProvider;
}

/** Create a minimal event */
function makeEvent(type: string, data?: unknown): ISemanticEvent {
  return {
    id: `evt-${type}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}

describe('TextService.processTurn (full pipeline)', () => {
  it('should return empty array for empty input', () => {
    const service = new TextService(makeProvider({}));

    expect(service.processTurn([])).toEqual([]);
  });

  it('should filter out system and platform events', () => {
    const provider = makeProvider({});
    const service = new TextService(provider);

    const events = [
      makeEvent('system.tick'),
      makeEvent('platform.save_requested'),
    ];

    expect(service.processTurn(events)).toEqual([]);
  });

  it('should sort lifecycle events before domain events', () => {
    const provider = makeProvider({
      'game.started.banner': '{title}',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('if.event.room.description', {
        verbose: false,
        roomDescription: 'A dark room.',
      }),
      makeEvent('game.started', {
        story: { title: 'Test Game', author: 'Author', version: '1.0', id: 'test' },
      }),
    ];

    const blocks = service.processTurn(events);

    // game.started should be processed first (lifecycle sort)
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].key).toBe('game.banner');
    expect(blocks[1].key).toBe('room.description');
  });

  it('should route events to correct handlers and concatenate blocks', () => {
    const provider = makeProvider({});
    const service = new TextService(provider);

    const events = [
      makeEvent('if.event.room.description', {
        verbose: true,
        roomName: 'Kitchen',
        roomDescription: 'A warm, well-lit kitchen.',
      }),
      makeEvent('if.event.revealed', {
        message: 'On the table you see a knife.',
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].key).toBe('room.name');
    expect(blocks[0].content).toEqual(['Kitchen']);
    expect(blocks[1].key).toBe('room.description');
    expect(blocks[2].key).toBe('action.result');
    expect(blocks[2].content).toEqual(['On the table you see a knife.']);
  });
});

describe('TextService.processTurn — tryProcessDomainEventMessage', () => {
  it('should resolve events with messageId through language provider', () => {
    const provider = makeProvider({
      'if.message.taken': 'Taken.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('if.event.taken', {
        messageId: 'if.message.taken',
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Taken.']);
  });

  it('should use action.blocked key for blocked event types', () => {
    const provider = makeProvider({
      'if.message.blocked': 'You cannot do that.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('if.event.action_blocked', {
        messageId: 'if.message.blocked',
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.blocked');
  });

  it('should fall back to inline message when messageId not resolved', () => {
    const provider = makeProvider({}); // echoes all keys
    const service = new TextService(provider);

    const events = [
      makeEvent('if.event.custom', {
        messageId: 'unknown.id',
        message: 'Fallback inline text.',
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Fallback inline text.']);
  });

  it('should skip client.query even with messageId — handled by dedicated handler', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which: {options}?',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('client.query', {
        messageId: 'core.disambiguation_prompt',
        source: 'disambiguation',
        candidates: [{ id: 'ball-1', name: 'red ball' }],
      }),
    ];

    const blocks = service.processTurn(events);

    // Should go through handleClientQuery, not tryProcessDomainEventMessage
    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
  });
});

describe('TextService — handleImplicitTake (inline)', () => {
  it('should format item name in parenthetical message', () => {
    const service = new TextService(makeProvider({}));

    const events = [
      makeEvent('if.event.implicit_take', { itemName: 'rusty key' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['(first taking the rusty key)']);
  });

  it('should use "something" when itemName is missing', () => {
    const service = new TextService(makeProvider({}));

    const events = [
      makeEvent('if.event.implicit_take', {}),
    ];

    const blocks = service.processTurn(events);

    expect(blocks[0].content).toEqual(['(first taking the something)']);
  });
});

describe('TextService — handleCommandFailed (inline)', () => {
  it('should use entity_not_found message for ENTITY_NOT_FOUND reason', () => {
    const provider = makeProvider({
      'core.entity_not_found': 'You do not see that here.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('command.failed', { reason: 'ENTITY_NOT_FOUND', input: 'take gizmo' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    expect(blocks[0].content).toEqual(['You do not see that here.']);
  });

  it('should use command_not_understood message for NO_MATCH reason', () => {
    const provider = makeProvider({
      'core.command_not_understood': 'That sentence makes no sense.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('command.failed', { reason: 'NO_MATCH', input: 'xyzzy' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks[0].content).toEqual(['That sentence makes no sense.']);
  });

  it('should use command_not_understood for parse reason', () => {
    const provider = makeProvider({
      'core.command_not_understood': 'I do not understand.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('command.failed', { reason: 'parse_error' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks[0].content).toEqual(['I do not understand.']);
  });

  it('should use generic command_failed for unknown reasons', () => {
    const provider = makeProvider({
      'core.command_failed': 'Something went wrong.',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('command.failed', { reason: 'UNKNOWN_REASON' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks[0].content).toEqual(['Something went wrong.']);
  });

  it('should use hardcoded fallback when no language provider messages', () => {
    const provider = makeProvider({}); // echoes all keys
    const service = new TextService(provider);

    const events = [
      makeEvent('command.failed', { reason: 'ENTITY_NOT_FOUND' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    // Falls back to hardcoded English since provider echoes the key
    expect(blocks[0].content[0]).toBeTruthy();
  });
});

describe('TextService — handleClientQuery (inline)', () => {
  it('should return empty for non-disambiguation queries', () => {
    const service = new TextService(makeProvider({}));

    const events = [
      makeEvent('client.query', { source: 'confirmation', type: 'yes_no' }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(0);
  });

  it('should format single candidate', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [{ id: 'ball', name: 'red ball' }],
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    const text = blocks[0].content[0] as string;
    expect(text).toContain('the red ball');
  });

  it('should format two candidates with "or"', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'ball-1', name: 'red ball' },
          { id: 'ball-2', name: 'blue ball' },
        ],
      }),
    ];

    const blocks = service.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('the red ball or the blue ball');
  });

  it('should format three+ candidates with Oxford comma', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'w-1', name: 'sword' },
          { id: 'w-2', name: 'axe' },
          { id: 'w-3', name: 'knife' },
        ],
      }),
    ];

    const blocks = service.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('the sword, the axe, or the knife');
  });

  it('should use hardcoded fallback when no language provider', () => {
    // Provider that returns the key (simulating "not found") — but getMessage
    // still returns a truthy string, so the ?? fallback won't trigger.
    // The real fallback path is when languageProvider is undefined.
    const bareProvider = {
      languageCode: 'en-us',
      getMessage(): string | undefined { return undefined as unknown as string; },
    } as LanguageProvider;
    const service = new TextService(bareProvider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'a', name: 'thing A' },
          { id: 'b', name: 'thing B' },
        ],
      }),
    ];

    const blocks = service.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('Which do you mean');
    expect(text).toContain('the thing A or the thing B');
  });

  it('should handle empty candidates list', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which: {options}?',
    });
    const service = new TextService(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [],
      }),
    ];

    const blocks = service.processTurn(events);

    expect(blocks).toHaveLength(1);
  });
});

describe('createTextService factory', () => {
  it('should return a functional ITextService', () => {
    const provider = makeProvider({});
    const service = createTextService(provider);

    expect(service.processTurn([])).toEqual([]);
  });
});
