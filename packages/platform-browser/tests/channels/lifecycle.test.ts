import { describe, it, expect, vi } from 'vitest';
import type { ChannelDefinition } from '@sharpee/if-domain';
import { createLifecycleChannelRenderer } from '../../src/channels/lifecycle';

const eventJson: ChannelDefinition = {
  id: 'lifecycle',
  contentType: 'json',
  mode: 'event',
};

describe('lifecycleChannelRenderer', () => {
  it('formats save_failed with the payload message', () => {
    const appendSystemMessage = vi.fn();
    const r = createLifecycleChannelRenderer({ appendSystemMessage });
    r.onValue({ kind: 'save_failed', message: 'Disk full' }, eventJson);
    expect(appendSystemMessage).toHaveBeenCalledTimes(1);
    expect(appendSystemMessage).toHaveBeenCalledWith('[Save failed: Disk full]');
  });

  it('falls back to "Unknown error" on save_failed without a message', () => {
    const appendSystemMessage = vi.fn();
    const r = createLifecycleChannelRenderer({ appendSystemMessage });
    r.onValue({ kind: 'save_failed' }, eventJson);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      '[Save failed: Unknown error]',
    );
  });

  it('formats restore_failed with the payload message', () => {
    const appendSystemMessage = vi.fn();
    const r = createLifecycleChannelRenderer({ appendSystemMessage });
    r.onValue(
      { kind: 'restore_failed', message: 'No save data available' },
      eventJson,
    );
    expect(appendSystemMessage).toHaveBeenCalledWith(
      '[Restore failed: No save data available]',
    );
  });

  it('falls back to "No saved game found" on restore_failed without a message', () => {
    const appendSystemMessage = vi.fn();
    const r = createLifecycleChannelRenderer({ appendSystemMessage });
    r.onValue({ kind: 'restore_failed' }, eventJson);
    expect(appendSystemMessage).toHaveBeenCalledWith(
      '[Restore failed: No saved game found]',
    );
  });

  it('invokes onRestoreCompleted on restore_completed without writing a system message', () => {
    const appendSystemMessage = vi.fn();
    const onRestoreCompleted = vi.fn();
    const r = createLifecycleChannelRenderer({
      appendSystemMessage,
      onRestoreCompleted,
    });
    r.onValue({ kind: 'restore_completed' }, eventJson);
    expect(onRestoreCompleted).toHaveBeenCalledTimes(1);
    expect(appendSystemMessage).not.toHaveBeenCalled();
  });

  it('no-ops when onRestoreCompleted is not provided', () => {
    const appendSystemMessage = vi.fn();
    const r = createLifecycleChannelRenderer({ appendSystemMessage });
    expect(() =>
      r.onValue({ kind: 'restore_completed' }, eventJson),
    ).not.toThrow();
    expect(appendSystemMessage).not.toHaveBeenCalled();
  });

  it('ignores non-payload values silently', () => {
    const appendSystemMessage = vi.fn();
    const onRestoreCompleted = vi.fn();
    const r = createLifecycleChannelRenderer({
      appendSystemMessage,
      onRestoreCompleted,
    });
    r.onValue(undefined, eventJson);
    r.onValue(null, eventJson);
    r.onValue('not a payload', eventJson);
    r.onValue({ kind: 'unknown_kind' }, eventJson);
    expect(appendSystemMessage).not.toHaveBeenCalled();
    expect(onRestoreCompleted).not.toHaveBeenCalled();
  });
});
