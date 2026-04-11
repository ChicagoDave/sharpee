/**
 * Tests for handleGameMessage and handleGenericEvent handlers
 *
 * Verifies message resolution chains: messageId → literal text → provider fallback.
 *
 * @see ADR-096 Text Service Architecture
 */

import { describe, it, expect } from 'vitest';
import { handleGameMessage, handleGenericEvent } from '../../src/handlers/generic.js';
import { makeEvent, makeProvider, makeContext } from './test-helpers.js';

describe('handleGameMessage', () => {
  it('should resolve messageId through language provider', () => {
    const provider = makeProvider({
      'game.welcome': 'Welcome to the adventure!',
    });
    const event = makeEvent('game.message', {
      messageId: 'game.welcome',
    });

    const blocks = handleGameMessage(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('game.message');
    expect(blocks[0].content).toEqual(['Welcome to the adventure!']);
  });

  it('should pass params to provider for template substitution', () => {
    const provider = makeProvider({
      'game.score_changed': 'Your score is now {score}.',
    });
    const event = makeEvent('game.message', {
      messageId: 'game.score_changed',
      params: { score: 42 },
    });

    const blocks = handleGameMessage(event, makeContext(provider));

    expect(blocks[0].content).toEqual(['Your score is now 42.']);
  });

  it('should fall back to text field when messageId not resolved', () => {
    const provider = makeProvider({}); // echoes all keys
    const event = makeEvent('game.message', {
      messageId: 'unknown.id',
      text: 'Fallback text.',
    });

    const blocks = handleGameMessage(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Fallback text.']);
  });

  it('should fall back to message field', () => {
    const event = makeEvent('game.message', {
      message: 'Direct message.',
    });

    const blocks = handleGameMessage(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Direct message.']);
  });

  it('should return empty when no messageId, text, or message', () => {
    const event = makeEvent('game.message', {});

    const blocks = handleGameMessage(event, makeContext());

    expect(blocks).toHaveLength(0);
  });
});

describe('handleGenericEvent', () => {
  it('should use direct message field', () => {
    const event = makeEvent('story.custom', {
      message: 'Something custom happened.',
    });

    const blocks = handleGenericEvent(event, makeContext());

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('action.result');
    expect(blocks[0].content).toEqual(['Something custom happened.']);
  });

  it('should use direct text field when message is absent', () => {
    const event = makeEvent('story.custom', {
      text: 'Custom text.',
    });

    const blocks = handleGenericEvent(event, makeContext());

    expect(blocks[0].content).toEqual(['Custom text.']);
  });

  it('should prefer message over text', () => {
    const event = makeEvent('story.custom', {
      message: 'Message wins.',
      text: 'Text loses.',
    });

    const blocks = handleGenericEvent(event, makeContext());

    expect(blocks[0].content).toEqual(['Message wins.']);
  });

  it('should resolve event type as template key through provider', () => {
    const provider = makeProvider({
      'if.event.custom_thing': 'The custom thing happened to {target}!',
    });
    const event = makeEvent('if.event.custom_thing', {
      target: 'the lamp',
    });

    const blocks = handleGenericEvent(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['The custom thing happened to the lamp!']);
  });

  it('should try messageId when event type not resolved', () => {
    const provider = makeProvider({
      'custom.message.id': 'Resolved via messageId.',
    });
    const event = makeEvent('unknown.type', {
      messageId: 'custom.message.id',
    });

    const blocks = handleGenericEvent(event, makeContext(provider));

    expect(blocks).toHaveLength(1);
    expect(blocks[0].content).toEqual(['Resolved via messageId.']);
  });

  it('should return empty when nothing resolves', () => {
    const provider = makeProvider({}); // echoes all keys
    const event = makeEvent('unknown.type', {
      someData: 'irrelevant',
    });

    const blocks = handleGenericEvent(event, makeContext(provider));

    expect(blocks).toHaveLength(0);
  });

  it('should return empty when data is null', () => {
    const event = makeEvent('unknown.type', null);

    const blocks = handleGenericEvent(event, makeContext());

    expect(blocks).toHaveLength(0);
  });

  it('should return empty when data is undefined', () => {
    const event = makeEvent('unknown.type');

    const blocks = handleGenericEvent(event, makeContext());

    expect(blocks).toHaveLength(0);
  });
});
