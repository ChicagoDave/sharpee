/**
 * Tests for `tryProcessDomainEventMessage` — ADR-097 messageId path with
 * the ADR-206 unified params-binding rule (`data.params ?? data`).
 */

import { describe, it, expect, vi } from 'vitest';
import { tryProcessDomainEventMessage } from '../../../src/prose-pipeline/handlers/domain-message';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

describe('tryProcessDomainEventMessage', () => {
  it('returns null for events without a messageId (falls through to type handlers)', () => {
    const provider = makeProvider({});
    const event = makeEvent('if.event.pushed', { direction: 'north' });

    expect(tryProcessDomainEventMessage(event, makeContext(provider))).toBeNull();
  });

  it('binds nested data.params', () => {
    const provider = makeProvider({
      'story.msg': 'Points {direction}.',
    });
    const event = makeEvent('if.event.pushed', {
      messageId: 'story.msg',
      params: { direction: 'north' },
    });

    const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

    expect(blocks).not.toBeNull();
    expect(blocks![0].content).toEqual(['Points north.']);
  });

  it('falls back to FLAT event data when params is absent (ADR-206 unified rule)', () => {
    // The box_rotates shape: messageId + flat params. Previously this
    // failed the domain path (nested-only) and only rendered by accident
    // via the generic handler's flat binding.
    const provider = makeProvider({
      'story.msg': 'Points {direction}.',
    });
    const event = makeEvent('if.event.pushed', {
      messageId: 'story.msg',
      direction: 'north',
    });

    const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

    expect(blocks).not.toBeNull();
    expect(blocks![0].content).toEqual(['Points north.']);
  });

  it('nested params win over flat fields when both exist', () => {
    const provider = makeProvider({
      'story.msg': 'Points {direction}.',
    });
    const event = makeEvent('if.event.pushed', {
      messageId: 'story.msg',
      direction: 'south',
      params: { direction: 'north' },
    });

    const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

    expect(blocks![0].content).toEqual(['Points north.']);
  });

  it('routes blocked/failure event types to the blocked block key', () => {
    const provider = makeProvider({ 'story.blocked': 'No.' });
    const event = makeEvent('if.event.capability_blocked', {
      messageId: 'story.blocked',
    });

    const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

    expect(blocks![0].key).toBe('action.blocked');
  });

  it('falls back to inline message text when the messageId is unregistered', () => {
    const provider = makeProvider({});
    const event = makeEvent('if.event.attacked', {
      messageId: 'unregistered.id',
      message: 'Inline combat narration.',
    });

    const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

    expect(blocks![0].content).toEqual(['Inline combat narration.']);
  });

  it('warns when a BLOCKED event would render blank (unregistered id, no inline fallback) and returns null (ADR-231 D1)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const provider = makeProvider({});
      const event = makeEvent('if.event.wear_blocked', {
        messageId: 'story.unregistered-refusal',
        // NO data.message / data.text — nothing to fall back to.
      });

      const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

      expect(blocks).toBeNull();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      // The warning names the unresolvable message id.
      expect(String(warnSpy.mock.calls[0][0])).toContain('story.unregistered-refusal');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('does NOT warn for a non-blocked domain event with an unregistered id and no fallback', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const provider = makeProvider({});
      const event = makeEvent('if.event.pushed', {
        messageId: 'story.unregistered-association',
      });

      const blocks = tryProcessDomainEventMessage(event, makeContext(provider));

      expect(blocks).toBeNull();
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
