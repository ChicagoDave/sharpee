/**
 * `useCommandInput` — encapsulates the client half of the lock-on-typing
 * command-entry contract (ADR-153 Decision 7).
 *
 * Public interface: {@link useCommandInput}, {@link UseCommandInputArgs},
 * {@link UseCommandInputResult}, {@link InputMode}.
 *
 * Bounded context: client command entry. Pure TS + React hooks — no DOM
 * access beyond standard event types — so a future non-React client
 * (Plan 06+) can reuse the throttle and emission logic without rewriting.
 *
 * Modes:
 *   - `observer`  — viewer has no command-entry tier; input is read-only
 *                   with an explicit observer placeholder.
 *   - `watching`  — another participant holds the lock; input is read-only
 *                   and shows their live draft frame.
 *   - `idle`      — no one holds the lock; typing locally will take it.
 *   - `holding`   — this client holds the lock; typing emits drafts,
 *                   Enter submits, clearing the field releases.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMsg, Tier } from '../types/wire';

export type InputMode = 'observer' | 'watching' | 'idle' | 'holding';

export interface UseCommandInputArgs {
  /** This client's participant_id. */
  selfId: string | null;
  /** This client's tier, derived from the participants list. */
  selfTier: Tier | null;
  /** Current lock holder's participant_id, or null when no lock. */
  lockHolderId: string | null;
  /** Live draft text from the current non-self lock holder. */
  remoteDraft: string;
  /** Sends a client intent — typically the `send` returned by useWebSocket. */
  send: (msg: ClientMsg) => void;
  /**
   * Throttle window for `draft_delta` emissions, in ms. Default 16 (roughly
   * one frame). Test override for deterministic timing.
   */
  throttleMs?: number;
  /** Test override for `Date.now`. */
  nowFn?: () => number;
}

export interface UseCommandInputResult {
  value: string;
  readOnly: boolean;
  mode: InputMode;
  onChange: (next: string) => void;
  onKeyDown: (e: { key: string; preventDefault?: () => void }) => void;
  /** Programmatically submit the current value (primarily for tests). */
  submit: () => void;
}

const CAN_COMMAND: readonly Tier[] = ['primary_host', 'co_host', 'command_entrant'];

function isCommandTier(t: Tier | null): boolean {
  return t !== null && CAN_COMMAND.includes(t);
}

function deriveMode(args: {
  selfId: string | null;
  selfTier: Tier | null;
  lockHolderId: string | null;
}): InputMode {
  if (!isCommandTier(args.selfTier)) return 'observer';
  if (args.lockHolderId === null) return 'idle';
  if (args.lockHolderId === args.selfId) return 'holding';
  return 'watching';
}

export function useCommandInput({
  selfId,
  selfTier,
  lockHolderId,
  remoteDraft,
  send,
  throttleMs = 16,
  nowFn = () => Date.now(),
}: UseCommandInputArgs): UseCommandInputResult {
  const mode = deriveMode({ selfId, selfTier, lockHolderId });
  const readOnly = mode === 'observer' || mode === 'watching';

  const [local, setLocalState] = useState<string>('');
  // Mirror of `local` readable synchronously from callbacks, so we can
  // compare old-vs-new without reading stale closure state.
  const localRef = useRef('');
  const setLocal = useCallback((next: string) => {
    localRef.current = next;
    setLocalState(next);
  }, []);

  // ----- throttled draft_delta emission -----
  const seqRef = useRef(0);
  const lastSentRef = useRef(0);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const emitDraftNow = useCallback(
    (text: string) => {
      seqRef.current += 1;
      send({ kind: 'draft_delta', seq: seqRef.current, text });
      lastSentRef.current = nowFn();
      pendingRef.current = null;
      clearTimer();
    },
    [send, nowFn, clearTimer],
  );

  const scheduleDraft = useCallback(
    (text: string) => {
      const now = nowFn();
      const since = now - lastSentRef.current;
      if (since >= throttleMs) {
        emitDraftNow(text);
        return;
      }
      pendingRef.current = text;
      if (timerRef.current === null) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          if (pendingRef.current !== null) {
            emitDraftNow(pendingRef.current);
          }
        }, throttleMs - since);
      }
    },
    [throttleMs, nowFn, emitDraftNow],
  );

  const emitRelease = useCallback(() => {
    clearTimer();
    pendingRef.current = null;
    seqRef.current = 0;
    lastSentRef.current = 0;
    send({ kind: 'release_lock' });
  }, [send, clearTimer]);

  // ----- public callbacks -----

  const onChange = useCallback(
    (next: string) => {
      if (readOnly) return;
      const prev = localRef.current;
      setLocal(next);
      // Transition to empty/whitespace while we had a non-empty value
      // releases the lock. Do not emit a zero-text draft_delta — the
      // server treats release_lock as the explicit end-of-turn intent.
      if (prev.trim().length > 0 && next.trim().length === 0) {
        emitRelease();
      } else if (next.trim().length > 0) {
        scheduleDraft(next);
      }
    },
    [readOnly, emitRelease, scheduleDraft, setLocal],
  );

  const submit = useCallback(() => {
    if (readOnly) return;
    const current = localRef.current;
    if (current.trim().length === 0) return;
    clearTimer();
    pendingRef.current = null;
    seqRef.current = 0;
    lastSentRef.current = 0;
    send({ kind: 'submit_command', text: current });
    setLocal('');
  }, [readOnly, send, clearTimer, setLocal]);

  const onKeyDown = useCallback(
    (e: { key: string; preventDefault?: () => void }) => {
      if (e.key !== 'Enter') return;
      if (readOnly || localRef.current.trim().length === 0) return;
      e.preventDefault?.();
      submit();
    },
    [readOnly, submit],
  );

  // Clean up any pending timer on unmount.
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // When the viewer stops being the lock holder (e.g., server handed the
  // lock to someone else), drop our local buffer so the field matches the
  // new mode's semantics on next render. `idle` is also cleared — once
  // we release, we don't want our stale pre-release text re-appearing.
  useEffect(() => {
    if (mode !== 'holding' && localRef.current !== '') {
      setLocal('');
    }
  }, [mode, setLocal]);

  const value = mode === 'watching' ? remoteDraft : local;

  return { value, readOnly, mode, onChange, onKeyDown, submit };
}
