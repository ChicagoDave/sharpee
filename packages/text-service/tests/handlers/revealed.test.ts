/**
 * Tests for handleRevealed handler
 *
 * Verifies revealed event processing with direct messages,
 * language provider resolution, and fallback item listing.
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { handleRevealed } from '../../src/handlers/revealed.js';
import { makeEvent, makeProvider, makeContext } from './test-helpers.js';

describe('handleRevealed', () => {
  it('should use direct message field when present', () => {
    const event = makeEvent('if.event.revealed', {
      message: 'Inside the chest you see a gleaming sword.',
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Inside the chest you see a gleaming sword.']);
  });

  it('should use direct text field when message is absent', () => {
    const event = makeEvent('if.event.revealed', {
      text: 'You find a key.',
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['You find a key.']);
  });

  it('should prefer message over text', () => {
    const event = makeEvent('if.event.revealed', {
      message: 'Message wins.',
      text: 'Text loses.',
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks[0].content).toEqual(['Message wins.']);
  });

  it('should resolve via language provider when no direct message', () => {
    const provider = makeProvider({
      'if.event.revealed': 'Inside {container} you see treasures!',
    });
    const event = makeEvent('if.event.revealed', {
      containerName: 'the wooden chest',
      items: [{ entityId: 'sword', name: 'a sword' }],
    });

    const blocks = handleRevealed(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content[0]).toContain('the wooden chest');
  });

  it('should fall back to built-in formatting when provider echoes key', () => {
    const provider = makeProvider({}); // echoes all keys
    const event = makeEvent('if.event.revealed', {
      containerName: 'wooden chest',
      items: [
        { entityId: 'sword', name: 'a gleaming sword' },
        { entityId: 'key', name: 'a rusty key' },
      ],
    });

    const blocks = handleRevealed(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    const text = blocks[0].content[0] as string;
    expect(text).toContain('wooden chest');
    expect(text).toContain('a gleaming sword');
    expect(text).toContain('a rusty key');
  });

  it('should use entityId as fallback name when item name is missing', () => {
    const event = makeEvent('if.event.revealed', {
      containerName: 'box',
      items: [{ entityId: 'mystery-item' }],
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks).toHaveLength(1);
    const text = blocks[0].content[0] as string;
    expect(text).toContain('mystery-item');
  });

  it('should use "it" when containerName is missing', () => {
    const event = makeEvent('if.event.revealed', {
      items: [{ entityId: 'coin', name: 'a gold coin' }],
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks).toHaveLength(1);
    const text = blocks[0].content[0] as string;
    expect(text).toContain('Inside the it');
  });

  it('should return empty when no message, no provider match, and no items', () => {
    const event = makeEvent('if.event.revealed', {
      containerName: 'empty box',
    });

    const blocks = handleRevealed(event, makeContext());

    expect(blocks).toHaveLength(0);
  });
});
