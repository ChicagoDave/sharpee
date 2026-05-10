/**
 * Integration tests for `ProsePipeline.processTurn`.
 *
 * Ports the text-service.test.ts integration suite (22 tests) and
 * adds a Behavior Statement coverage row for AC-3 nesting +
 * AC-7 (template + bracket parser produces structured IDecoration
 * blocks).
 *
 * @see ADR-174 §Internal interfaces
 * @see plan-20260509-phase1.md §Sub-phase 1.5 tests PP1..PP7
 */

import { describe, it, expect } from 'vitest';
import type { LanguageProvider } from '@sharpee/if-domain';
import {
  ProsePipeline,
  createProsePipeline,
} from '../../src/prose-pipeline/pipeline';
import { makeEvent, makeProvider } from './test-helpers';
import type { IDecoration, TextContent } from '@sharpee/text-blocks';

function isDecoration(item: TextContent): item is IDecoration {
  return typeof item === 'object' && item !== null && 'className' in item;
}

describe('ProsePipeline.processTurn (full pipeline)', () => {
  it('PP5: should return empty array for empty input', () => {
    const pipeline = new ProsePipeline(makeProvider({}));

    expect(pipeline.processTurn([])).toEqual([]);
  });

  it('PP3: should filter out system and platform events', () => {
    const provider = makeProvider({});
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('system.tick'),
      makeEvent('platform.save_requested'),
    ];

    expect(pipeline.processTurn(events)).toEqual([]);
  });

  it('PP4: should sort lifecycle events before domain events', () => {
    const provider = makeProvider({
      'game.started.banner': '{title}',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('if.event.room.description', {
        verbose: false,
        roomDescription: 'A dark room.',
      }),
      makeEvent('game.started', {
        story: { title: 'Test Game', author: 'Author', version: '1.0', id: 'test' },
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].key).toBe('game.banner');
    expect(blocks[1].key).toBe('room.description');
  });

  it('PP1: should route events to correct handlers and concatenate blocks', () => {
    const provider = makeProvider({});
    const pipeline = new ProsePipeline(provider);

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

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].key).toBe('room.name');
    expect(blocks[0].content).toEqual(['Kitchen']);
    expect(blocks[1].key).toBe('room.description');
    expect(blocks[2].key).toBe('action.result');
    expect(blocks[2].content).toEqual(['On the table you see a knife.']);
  });

  it('PP7: bracketed templates resolve to structured IDecoration blocks', () => {
    const provider = makeProvider({
      'if.message.taken': 'You take [item:the lamp].',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('if.event.taken', { messageId: 'if.message.taken' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toHaveLength(3);
    expect(blocks[0].content[0]).toBe('You take ');
    const dec = blocks[0].content[1];
    expect(isDecoration(dec)).toBe(true);
    if (!isDecoration(dec)) return;
    expect(dec.className).toBe('sharpee-item');
    expect(dec.content).toEqual(['the lamp']);
    expect(blocks[0].content[2]).toBe('.');
  });

  it('PP2: routes sound.audibility.heard through audibility handler', () => {
    const provider = makeProvider({
      'sound.heard.ambient.full': 'You hear {kind}.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('sound.audibility.heard', {
        sourceRoomId: 'r1',
        targetRoomId: 'r1',
        sourceEntityId: 'e1',
        kind: 'ambient',
        volumeTier: 'normal',
        audibilityTier: 'full',
        timestamp: 1,
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['You hear ambient.']);
  });
});

describe('ProsePipeline.processTurn — tryProcessDomainEventMessage', () => {
  it('should resolve events with messageId through language provider', () => {
    const provider = makeProvider({ 'if.message.taken': 'Taken.' });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('if.event.taken', { messageId: 'if.message.taken' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Taken.']);
  });

  it('should use action.blocked key for blocked event types', () => {
    const provider = makeProvider({
      'if.message.blocked': 'You cannot do that.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('if.event.action_blocked', {
        messageId: 'if.message.blocked',
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.blocked');
  });

  it('should fall back to inline message when messageId not resolved', () => {
    const provider = makeProvider({});
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('if.event.custom', {
        messageId: 'unknown.id',
        message: 'Fallback inline text.',
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Fallback inline text.']);
  });

  it('should skip client.query even with messageId — handled by dedicated handler', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which: {options}?',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('client.query', {
        messageId: 'core.disambiguation_prompt',
        source: 'disambiguation',
        candidates: [{ id: 'ball-1', name: 'red ball' }],
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
  });
});

describe('ProsePipeline — handleImplicitTake (extracted)', () => {
  it('should format item name in parenthetical message', () => {
    const pipeline = new ProsePipeline(makeProvider({}));

    const events = [
      makeEvent('if.event.implicit_take', { itemName: 'rusty key' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['(first taking the rusty key)']);
  });

  it('should use "something" when itemName is missing', () => {
    const pipeline = new ProsePipeline(makeProvider({}));

    const events = [makeEvent('if.event.implicit_take', {})];

    const blocks = pipeline.processTurn(events);

    expect(blocks[0].content).toEqual(['(first taking the something)']);
  });
});

describe('ProsePipeline — handleCommandFailed (extracted)', () => {
  it('should use entity_not_found message for ENTITY_NOT_FOUND reason', () => {
    const provider = makeProvider({
      'core.entity_not_found': 'You do not see that here.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('command.failed', {
        reason: 'ENTITY_NOT_FOUND',
        input: 'take gizmo',
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    expect(blocks[0].content).toEqual(['You do not see that here.']);
  });

  it('should use command_not_understood message for NO_MATCH reason', () => {
    const provider = makeProvider({
      'core.command_not_understood': 'That sentence makes no sense.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('command.failed', { reason: 'NO_MATCH', input: 'xyzzy' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks[0].content).toEqual(['That sentence makes no sense.']);
  });

  it('should use command_not_understood for parse reason', () => {
    const provider = makeProvider({
      'core.command_not_understood': 'I do not understand.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('command.failed', { reason: 'parse_error' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks[0].content).toEqual(['I do not understand.']);
  });

  it('should use generic command_failed for unknown reasons', () => {
    const provider = makeProvider({
      'core.command_failed': 'Something went wrong.',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('command.failed', { reason: 'UNKNOWN_REASON' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks[0].content).toEqual(['Something went wrong.']);
  });

  it('should use hardcoded fallback when no language provider messages', () => {
    const provider = makeProvider({});
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('command.failed', { reason: 'ENTITY_NOT_FOUND' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    expect(blocks[0].content[0]).toBeTruthy();
  });
});

describe('ProsePipeline — handleClientQuery (extracted)', () => {
  it('should return empty for non-disambiguation queries', () => {
    const pipeline = new ProsePipeline(makeProvider({}));

    const events = [
      makeEvent('client.query', { source: 'confirmation', type: 'yes_no' }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(0);
  });

  it('should format single candidate', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [{ id: 'ball', name: 'red ball' }],
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    const text = blocks[0].content[0] as string;
    expect(text).toContain('the red ball');
  });

  it('should format two candidates with "or"', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'ball-1', name: 'red ball' },
          { id: 'ball-2', name: 'blue ball' },
        ],
      }),
    ];

    const blocks = pipeline.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('the red ball or the blue ball');
  });

  it('should format three+ candidates with Oxford comma', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });
    const pipeline = new ProsePipeline(provider);

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

    const blocks = pipeline.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('the sword, the axe, or the knife');
  });

  it('should use hardcoded fallback when language provider returns undefined', () => {
    const bareProvider = {
      languageCode: 'en-us',
      getMessage(): string | undefined {
        return undefined as unknown as string;
      },
    } as LanguageProvider;
    const pipeline = new ProsePipeline(bareProvider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'a', name: 'thing A' },
          { id: 'b', name: 'thing B' },
        ],
      }),
    ];

    const blocks = pipeline.processTurn(events);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('Which do you mean');
    expect(text).toContain('the thing A or the thing B');
  });

  it('should handle empty candidates list', () => {
    const provider = makeProvider({
      'core.disambiguation_prompt': 'Which: {options}?',
    });
    const pipeline = new ProsePipeline(provider);

    const events = [
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [],
      }),
    ];

    const blocks = pipeline.processTurn(events);

    expect(blocks).toHaveLength(1);
  });
});

describe('createProsePipeline factory', () => {
  it('should return a functional ITextService', () => {
    const provider = makeProvider({});
    const pipeline = createProsePipeline(provider);

    expect(pipeline.processTurn([])).toEqual([]);
  });

  it('should throw if no language provider is supplied', () => {
    expect(() =>
      createProsePipeline(undefined as unknown as LanguageProvider),
    ).toThrow();
  });
});
