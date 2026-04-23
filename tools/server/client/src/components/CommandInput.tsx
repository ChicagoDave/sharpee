/**
 * CommandInput — full implementation of the lock-on-typing command-entry
 * contract (ADR-153 Decision 7). Wraps {@link useCommandInput} with a
 * thin input element.
 *
 * Public interface: {@link CommandInput} default export,
 * {@link CommandInputProps}.
 *
 * Bounded context: client room view. Behavior split out into the hook so
 * logic tests don't need a DOM; this file is the thin render shell.
 */

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  useCommandInput,
  type InputMode,
} from '../hooks/useCommandInput';
import type { ClientMsg, Tier } from '../types/wire';

export interface CommandInputProps {
  selfId: string | null;
  selfTier: Tier | null;
  lockHolderId: string | null;
  /** Live draft text from the current remote lock holder. */
  remoteDraft: string;
  /** Sends a client intent — wired to useWebSocket.send in Room. */
  send: (msg: ClientMsg) => void;
  /** Test override forwarded to the hook. */
  throttleMs?: number;
}

function placeholderFor(mode: InputMode): string {
  switch (mode) {
    case 'observer':
      return 'Observers cannot enter commands.';
    case 'watching':
      return 'Another participant is typing…';
    case 'idle':
      return 'Type a command. Enter submits.';
    case 'holding':
      return 'You hold the command lock.';
  }
}

export default function CommandInput({
  selfId,
  selfTier,
  lockHolderId,
  remoteDraft,
  send,
  throttleMs,
}: CommandInputProps): JSX.Element {
  const { value, readOnly, mode, onChange, onKeyDown } = useCommandInput({
    selfId,
    selfTier,
    lockHolderId,
    remoteDraft,
    send,
    throttleMs,
  });

  return (
    <div
      aria-label="Command input"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sharpee-spacing-sm)',
        padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
        borderTop: '1px solid var(--sharpee-border)',
        background: 'var(--sharpee-bg-secondary)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontFamily: 'var(--sharpee-font-mono)',
          color: mode === 'holding' ? 'var(--sharpee-accent)' : 'var(--sharpee-text-muted)',
        }}
      >
        {'>'}
      </span>
      <input
        aria-label="Command"
        data-mode={mode}
        type="text"
        value={value}
        readOnly={readOnly}
        placeholder={placeholderFor(mode)}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>) =>
          onKeyDown({ key: e.key, preventDefault: () => e.preventDefault() })
        }
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: readOnly ? 'var(--sharpee-text-muted)' : 'var(--sharpee-text)',
          font: 'inherit',
          fontFamily: 'var(--sharpee-font-mono)',
        }}
      />
    </div>
  );
}
