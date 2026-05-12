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

/**
 * Two-line setup `const provider = makeProvider({...}); const pipeline =
 * new ProsePipeline(provider);` repeats in every test. Collapse it into
 * one call so the test body is just events + assertions.
 */
function makePipeline(messages: Record<string, string> = {}): ProsePipeline {
  return new ProsePipeline(makeProvider(messages));
}

/**
 * Assert `item` is a decoration with the given `className` (and
 * optionally the given flat `content`). Same helper as parser.test.ts;
 * shared across files would require a test-utils package.
 */
function expectDecoration(
  item: TextContent,
  className: string,
  content?: TextContent[],
): asserts item is IDecoration {
  expect(isDecoration(item)).toBe(true);
  if (!isDecoration(item)) throw new Error('unreachable: assertion above failed');
  expect(item.className).toBe(className);
  if (content !== undefined) {
    expect(item.content).toEqual(content);
  }
}

describe('ProsePipeline.processTurn (full pipeline)', () => {
  it('PP5: should return empty array for empty input', () => {
    expect(makePipeline().processTurn([])).toEqual([]);
  });

  it('PP3: should filter out system and platform events', () => {
    const events = [
      makeEvent('system.tick'),
      makeEvent('platform.save_requested'),
    ];

    expect(makePipeline().processTurn(events)).toEqual([]);
  });

  it('PP4: should sort lifecycle events before domain events', () => {
    const pipeline = makePipeline({ 'game.started.banner': '{title}' });

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

    // The structured banner now emits multiple `game.banner` blocks
    // (one per semantic piece) before the room description.
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].key).toBe('game.banner');
    const lastBanner = blocks
      .map((b, i) => ({ b, i }))
      .filter((x) => x.b.key === 'game.banner')
      .pop()!;
    expect(blocks[lastBanner.i + 1].key).toBe('room.description');
  });

  it('PP1: should route events to correct handlers and concatenate blocks', () => {
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

    const blocks = makePipeline().processTurn(events);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].key).toBe('room.name');
    expect(blocks[0].content).toEqual([
      { className: 'sharpee-room', content: ['Kitchen'] },
    ]);
    expect(blocks[1].key).toBe('room.description');
    expect(blocks[2].key).toBe('action.result');
    expect(blocks[2].content).toEqual(['On the table you see a knife.']);
  });

  it('PP7: bracketed templates resolve to structured IDecoration blocks', () => {
    const pipeline = makePipeline({ 'if.message.taken': 'You take [item:the lamp].' });

    const blocks = pipeline.processTurn([
      makeEvent('if.event.taken', { messageId: 'if.message.taken' }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toHaveLength(3);
    expect(blocks[0].content[0]).toBe('You take ');
    expectDecoration(blocks[0].content[1], 'sharpee-item', ['the lamp']);
    expect(blocks[0].content[2]).toBe('.');
  });

  it('PP2: routes sound.audibility.heard through audibility handler', () => {
    const pipeline = makePipeline({ 'sound.heard.ambient.full': 'You hear {kind}.' });

    const blocks = pipeline.processTurn([
      makeEvent('sound.audibility.heard', {
        sourceRoomId: 'r1',
        targetRoomId: 'r1',
        sourceEntityId: 'e1',
        kind: 'ambient',
        volumeTier: 'normal',
        audibilityTier: 'full',
        timestamp: 1,
      }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['You hear ambient.']);
  });
});

describe('ProsePipeline.processTurn — tryProcessDomainEventMessage', () => {
  it('should resolve events with messageId through language provider', () => {
    const pipeline = makePipeline({ 'if.message.taken': 'Taken.' });

    const blocks = pipeline.processTurn([
      makeEvent('if.event.taken', { messageId: 'if.message.taken' }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Taken.']);
  });

  it('should use action.blocked key for blocked event types', () => {
    const pipeline = makePipeline({ 'if.message.blocked': 'You cannot do that.' });

    const blocks = pipeline.processTurn([
      makeEvent('if.event.action_blocked', { messageId: 'if.message.blocked' }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.blocked');
  });

  it('should fall back to inline message when messageId not resolved', () => {
    const blocks = makePipeline().processTurn([
      makeEvent('if.event.custom', {
        messageId: 'unknown.id',
        message: 'Fallback inline text.',
      }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Fallback inline text.']);
  });

  it('should skip client.query even with messageId — handled by dedicated handler', () => {
    const pipeline = makePipeline({ 'core.disambiguation_prompt': 'Which: {options}?' });

    const blocks = pipeline.processTurn([
      makeEvent('client.query', {
        messageId: 'core.disambiguation_prompt',
        source: 'disambiguation',
        candidates: [{ id: 'ball-1', name: 'red ball' }],
      }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
  });
});

describe('ProsePipeline — handleImplicitTake (extracted)', () => {
  it('should format item name in parenthetical message', () => {
    const blocks = makePipeline().processTurn([
      makeEvent('if.event.implicit_take', { itemName: 'rusty key' }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['(first taking the rusty key)']);
  });

  it('should use "something" when itemName is missing', () => {
    const blocks = makePipeline().processTurn([
      makeEvent('if.event.implicit_take', {}),
    ]);

    expect(blocks[0].content).toEqual(['(first taking the something)']);
  });
});

describe('ProsePipeline — handleCommandFailed (extracted)', () => {
  it.each<{
    name: string;
    messages: Record<string, string>;
    eventData: Record<string, unknown>;
    expectedContent?: string[];
    expectedKey?: string;
  }>([
    {
      name: 'uses entity_not_found message for ENTITY_NOT_FOUND reason',
      messages: { 'core.entity_not_found': 'You do not see that here.' },
      eventData: { reason: 'ENTITY_NOT_FOUND', input: 'take gizmo' },
      expectedContent: ['You do not see that here.'],
      expectedKey: 'error',
    },
    {
      name: 'uses command_not_understood message for NO_MATCH reason',
      messages: { 'core.command_not_understood': 'That sentence makes no sense.' },
      eventData: { reason: 'NO_MATCH', input: 'xyzzy' },
      expectedContent: ['That sentence makes no sense.'],
    },
    {
      name: 'uses command_not_understood for parse reason',
      messages: { 'core.command_not_understood': 'I do not understand.' },
      eventData: { reason: 'parse_error' },
      expectedContent: ['I do not understand.'],
    },
    {
      name: 'uses generic command_failed for unknown reasons',
      messages: { 'core.command_failed': 'Something went wrong.' },
      eventData: { reason: 'UNKNOWN_REASON' },
      expectedContent: ['Something went wrong.'],
    },
  ])('$name', ({ messages, eventData, expectedContent, expectedKey }) => {
    const blocks = makePipeline(messages).processTurn([
      makeEvent('command.failed', eventData),
    ]);

    if (expectedKey) expect(blocks[0].key).toBe(expectedKey);
    if (expectedContent) expect(blocks[0].content).toEqual(expectedContent);
  });

  it('should use hardcoded fallback when no language provider messages', () => {
    const blocks = makePipeline().processTurn([
      makeEvent('command.failed', { reason: 'ENTITY_NOT_FOUND' }),
    ]);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('error');
    expect(blocks[0].content[0]).toBeTruthy();
  });
});

describe('ProsePipeline — handleClientQuery (extracted)', () => {
  it('should return empty for non-disambiguation queries', () => {
    const blocks = makePipeline().processTurn([
      makeEvent('client.query', { source: 'confirmation', type: 'yes_no' }),
    ]);

    expect(blocks).toHaveLength(0);
  });

  it.each<{
    name: string;
    candidates: Array<{ id: string; name: string }>;
    expectedSubstring: string;
  }>([
    {
      name: 'formats single candidate',
      candidates: [{ id: 'ball', name: 'red ball' }],
      expectedSubstring: 'the red ball',
    },
    {
      name: 'formats two candidates with "or"',
      candidates: [
        { id: 'ball-1', name: 'red ball' },
        { id: 'ball-2', name: 'blue ball' },
      ],
      expectedSubstring: 'the red ball or the blue ball',
    },
    {
      name: 'formats three+ candidates with Oxford comma',
      candidates: [
        { id: 'w-1', name: 'sword' },
        { id: 'w-2', name: 'axe' },
        { id: 'w-3', name: 'knife' },
      ],
      expectedSubstring: 'the sword, the axe, or the knife',
    },
  ])('$name', ({ candidates, expectedSubstring }) => {
    const pipeline = makePipeline({
      'core.disambiguation_prompt': 'Which do you mean: {options}?',
    });

    const blocks = pipeline.processTurn([
      makeEvent('client.query', { source: 'disambiguation', candidates }),
    ]);

    expect(blocks[0].content[0] as string).toContain(expectedSubstring);
  });

  it('should use hardcoded fallback when language provider returns undefined', () => {
    const bareProvider = {
      languageCode: 'en-us',
      getMessage(): string | undefined {
        return undefined as unknown as string;
      },
    } as LanguageProvider;
    const pipeline = new ProsePipeline(bareProvider);

    const blocks = pipeline.processTurn([
      makeEvent('client.query', {
        source: 'disambiguation',
        candidates: [
          { id: 'a', name: 'thing A' },
          { id: 'b', name: 'thing B' },
        ],
      }),
    ]);

    const text = blocks[0].content[0] as string;
    expect(text).toContain('Which do you mean');
    expect(text).toContain('the thing A or the thing B');
  });

  it('should handle empty candidates list', () => {
    const pipeline = makePipeline({ 'core.disambiguation_prompt': 'Which: {options}?' });

    const blocks = pipeline.processTurn([
      makeEvent('client.query', { source: 'disambiguation', candidates: [] }),
    ]);

    expect(blocks).toHaveLength(1);
  });
});

describe('createProsePipeline factory', () => {
  it('should return a functional ITextService', () => {
    expect(createProsePipeline(makeProvider({})).processTurn([])).toEqual([]);
  });

  it('should throw if no language provider is supplied', () => {
    expect(() =>
      createProsePipeline(undefined as unknown as LanguageProvider),
    ).toThrow();
  });
});
