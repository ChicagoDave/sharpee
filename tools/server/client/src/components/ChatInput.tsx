/**
 * ChatInput — Enter-to-send input for room-wide chat.
 *
 * Public interface: {@link ChatInput} default export, {@link ChatInputProps}.
 *
 * Bounded context: client room view (ADR-153 Decision 8). Muted participants
 * see the input disabled with the mute copy — the client respects the flag
 * locally; the server is authoritative and rejects muted-send attempts
 * anyway. This keeps the UI honest during brief mute-state races on the
 * wire.
 *
 * On submit: emits `ClientMsg` kind `chat` via the injected `send`. Trims
 * the text; empty input is a no-op.
 */

import {
  useCallback,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { ClientMsg } from '../types/wire';

export interface ChatInputProps {
  /** Sends a client intent — typically useWebSocket.send. */
  send: (msg: ClientMsg) => void;
  /** True when the viewer is muted; disables input with an explicit notice. */
  muted?: boolean;
}

export default function ChatInput({
  send,
  muted = false,
}: ChatInputProps): JSX.Element {
  const [value, setValue] = useState('');

  const submit = useCallback(() => {
    if (muted) return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    send({ kind: 'chat', text: trimmed });
    setValue('');
  }, [value, muted, send]);

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      submit();
    },
    [submit],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: 'var(--sharpee-spacing-sm)',
        borderTop: '1px solid var(--sharpee-border)',
      }}
    >
      {muted && (
        <span
          role="status"
          style={{
            fontSize: '0.75rem',
            color: 'var(--sharpee-error)',
            fontStyle: 'italic',
          }}
        >
          You have been muted.
        </span>
      )}
      <input
        aria-label="Chat message"
        type="text"
        value={value}
        disabled={muted}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={muted ? 'Muted.' : 'Chat the room…'}
        style={{
          width: '100%',
          padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
          border: '1px solid var(--sharpee-border)',
          borderRadius: 'var(--sharpee-border-radius)',
          background: 'var(--sharpee-bg)',
          color: muted ? 'var(--sharpee-text-muted)' : 'var(--sharpee-text)',
          font: 'inherit',
        }}
      />
    </div>
  );
}
