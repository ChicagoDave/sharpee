/**
 * useCommandInput behaviour tests.
 *
 * Behavior Statement — useCommandInput
 *   DOES: derives `mode` from (selfTier, lockHolderId, selfId); emits
 *         `draft_delta` with incrementing `seq` throttled at most once per
 *         `throttleMs` on user typing; on a transition from non-empty to
 *         empty, emits `release_lock` and cancels any pending throttled
 *         send; on Enter with non-empty trimmed text, emits
 *         `submit_command` and clears local text; reads local text while
 *         holding/idle and the remote draft while watching.
 *   WHEN: called by CommandInput or a peer UI.
 *   BECAUSE: client half of ADR-153 Decision 7.
 *   REJECTS WHEN: readOnly (observer, watching) swallows onChange / Enter;
 *                 Enter on empty/whitespace is ignored.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommandInput } from './useCommandInput';
import type { ClientMsg, Tier } from '../types/wire';

interface SetupArgs {
  selfId?: string | null;
  selfTier?: Tier | null;
  lockHolderId?: string | null;
  remoteDraft?: string;
  throttleMs?: number;
  now?: { value: number };
}

function setup(args: SetupArgs = {}) {
  const sent: ClientMsg[] = [];
  const send = (msg: ClientMsg) => {
    sent.push(msg);
  };
  const nowRef = args.now ?? { value: 1_000_000 };
  // Use "in args" so an explicit null is preserved, not replaced by the default.
  const initialTier: Tier | null =
    'selfTier' in args ? (args.selfTier as Tier | null) : 'command_entrant';
  const hook = renderHook(
    ({
      lockHolderId,
      remoteDraft,
      selfTier,
    }: {
      lockHolderId: string | null;
      remoteDraft: string;
      selfTier: Tier | null;
    }) =>
      useCommandInput({
        selfId: args.selfId ?? 'p-me',
        selfTier,
        lockHolderId,
        remoteDraft,
        send,
        throttleMs: args.throttleMs ?? 16,
        nowFn: () => nowRef.value,
      }),
    {
      initialProps: {
        lockHolderId: args.lockHolderId ?? null,
        remoteDraft: args.remoteDraft ?? '',
        selfTier: initialTier,
      },
    },
  );
  return { hook, sent, now: nowRef };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useCommandInput — mode derivation', () => {
  it('observer when selfTier is participant', () => {
    const { hook } = setup({ selfTier: 'participant' });
    expect(hook.result.current.mode).toBe('observer');
    expect(hook.result.current.readOnly).toBe(true);
  });

  it('idle when no one holds the lock and self has command rights', () => {
    const { hook } = setup({ selfTier: 'command_entrant', lockHolderId: null });
    expect(hook.result.current.mode).toBe('idle');
    expect(hook.result.current.readOnly).toBe(false);
  });

  it('holding when selfId matches lockHolderId', () => {
    const { hook } = setup({ lockHolderId: 'p-me' });
    expect(hook.result.current.mode).toBe('holding');
    expect(hook.result.current.readOnly).toBe(false);
  });

  it('watching when someone else holds the lock', () => {
    const { hook } = setup({ lockHolderId: 'p-other', remoteDraft: 'foo' });
    expect(hook.result.current.mode).toBe('watching');
    expect(hook.result.current.readOnly).toBe(true);
    expect(hook.result.current.value).toBe('foo');
  });

  it('observer when selfTier is null (self not yet in roster)', () => {
    const { hook } = setup({ selfTier: null });
    expect(hook.result.current.mode).toBe('observer');
  });
});

describe('useCommandInput — typing + throttle', () => {
  it('first keystroke emits draft_delta immediately with seq=1', () => {
    const { hook, sent } = setup();
    act(() => {
      hook.result.current.onChange('l');
    });
    expect(sent).toEqual([{ kind: 'draft_delta', seq: 1, text: 'l' }]);
    expect(hook.result.current.value).toBe('l');
  });

  it('rapid keystrokes within the throttle window coalesce to one trailing send', () => {
    const { hook, sent, now } = setup({ throttleMs: 20 });
    act(() => {
      hook.result.current.onChange('l'); // leading send at t=1_000_000
    });
    expect(sent).toHaveLength(1);
    act(() => {
      now.value += 5;
      hook.result.current.onChange('lo');
      now.value += 5;
      hook.result.current.onChange('loo');
      now.value += 5;
      hook.result.current.onChange('look');
    });
    // Only the leading send so far — the trailing timer has not fired.
    expect(sent).toHaveLength(1);
    act(() => {
      now.value += 20;
      vi.advanceTimersByTime(20);
    });
    // Trailing send carries the latest text with seq=2.
    expect(sent).toEqual([
      { kind: 'draft_delta', seq: 1, text: 'l' },
      { kind: 'draft_delta', seq: 2, text: 'look' },
    ]);
  });

  it('keystrokes far apart each fire immediately', () => {
    const { hook, sent, now } = setup({ throttleMs: 16 });
    act(() => {
      hook.result.current.onChange('l');
      now.value += 100;
      hook.result.current.onChange('lo');
      now.value += 100;
      hook.result.current.onChange('loo');
    });
    expect(sent).toEqual([
      { kind: 'draft_delta', seq: 1, text: 'l' },
      { kind: 'draft_delta', seq: 2, text: 'lo' },
      { kind: 'draft_delta', seq: 3, text: 'loo' },
    ]);
  });
});

describe('useCommandInput — release, submit, readOnly', () => {
  it('clearing the field after typing emits release_lock and cancels pending drafts', () => {
    const { hook, sent, now } = setup({ throttleMs: 50 });
    act(() => {
      hook.result.current.onChange('look');
    });
    act(() => {
      now.value += 10;
      hook.result.current.onChange('loo'); // schedules a trailing send
    });
    expect(sent).toHaveLength(1);
    act(() => {
      hook.result.current.onChange(''); // release
    });
    expect(sent).toEqual([
      { kind: 'draft_delta', seq: 1, text: 'look' },
      { kind: 'release_lock' },
    ]);
    // The pending trailing send was cancelled.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(sent).toHaveLength(2);
  });

  it('whitespace-only text after non-empty also releases', () => {
    const { hook, sent } = setup();
    act(() => {
      hook.result.current.onChange('go');
      hook.result.current.onChange('   '); // effectively empty
    });
    expect(sent.at(-1)).toEqual({ kind: 'release_lock' });
  });

  it('Enter submits the current text and clears local', () => {
    const { hook, sent } = setup();
    act(() => {
      hook.result.current.onChange('look');
    });
    act(() => {
      hook.result.current.onKeyDown({ key: 'Enter', preventDefault: () => {} });
    });
    expect(sent.at(-1)).toEqual({ kind: 'submit_command', text: 'look' });
    expect(hook.result.current.value).toBe('');
  });

  it('Enter on empty input is ignored', () => {
    const { hook, sent } = setup();
    act(() => {
      hook.result.current.onKeyDown({ key: 'Enter' });
    });
    expect(sent).toEqual([]);
  });

  it('observer mode swallows onChange', () => {
    const { hook, sent } = setup({ selfTier: 'participant' });
    act(() => {
      hook.result.current.onChange('nope');
    });
    expect(sent).toEqual([]);
    expect(hook.result.current.value).toBe('');
  });

  it('watching mode shows the remote draft and swallows local onChange', () => {
    const { hook, sent } = setup({ lockHolderId: 'p-other', remoteDraft: 'go n' });
    expect(hook.result.current.value).toBe('go n');
    act(() => {
      hook.result.current.onChange('hijack');
    });
    expect(sent).toEqual([]);
  });

  it('transitioning from holding to watching clears local buffer', () => {
    const { hook } = setup({ lockHolderId: 'p-me' });
    act(() => {
      hook.result.current.onChange('look');
    });
    expect(hook.result.current.value).toBe('look');
    hook.rerender({
      lockHolderId: 'p-other',
      remoteDraft: 'go',
      selfTier: 'command_entrant',
    });
    expect(hook.result.current.mode).toBe('watching');
    expect(hook.result.current.value).toBe('go');
    // And flipping back to idle starts from empty, not our stale buffer.
    hook.rerender({ lockHolderId: null, remoteDraft: '', selfTier: 'command_entrant' });
    expect(hook.result.current.mode).toBe('idle');
    expect(hook.result.current.value).toBe('');
  });
});
