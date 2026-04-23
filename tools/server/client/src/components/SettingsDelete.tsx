/**
 * SettingsDelete — "Danger zone" type-to-confirm room deletion.
 *
 * Public interface: {@link SettingsDelete} default export.
 *
 * Bounded context: client room settings (Plan 02 Phase 5; ADR-153 Decision 12).
 *
 * The server independently validates the `confirm_title` in the
 * `delete_room` intent and rejects mismatches. This component's job is the
 * UX guard — disabled Delete button until the user types the exact current
 * title — not the authoritative check.
 *
 * On submit the confirm_title sent to the server is the *current room title*
 * from props, not the typed text. They must match (the button was only
 * enabled when they did), and sending the canonical value dodges any subtle
 * whitespace drift between the input field and the server's record.
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import { sendDeleteRoom, type Sender } from '../api/ws';

export interface SettingsDeleteProps {
  currentTitle: string;
  send: Sender;
}

export default function SettingsDelete({
  currentTitle,
  send,
}: SettingsDeleteProps): JSX.Element {
  const [typed, setTyped] = useState('');
  const matches = typed === currentTitle;

  const onConfirm = useCallback(() => {
    if (!matches) return;
    sendDeleteRoom(send, currentTitle);
  }, [matches, currentTitle, send]);

  return (
    <section
      aria-labelledby="settings-delete-heading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: 'var(--sharpee-spacing-md)',
        border: '1px solid var(--sharpee-error)',
        borderRadius: 'var(--sharpee-border-radius)',
        background: 'color-mix(in srgb, var(--sharpee-error) 6%, transparent)',
      }}
    >
      <h3
        id="settings-delete-heading"
        style={{ margin: 0, fontSize: '0.95rem', color: 'var(--sharpee-error)' }}
      >
        Danger zone — delete room
      </h3>
      <p
        style={{
          margin: 0,
          color: 'var(--sharpee-text-muted)',
          fontSize: '0.85rem',
        }}
      >
        Deleting the room disconnects every participant and removes the
        transcript, chat, and saves permanently. This cannot be undone.
      </p>
      <label
        htmlFor="settings-delete-confirm"
        style={{ fontSize: '0.85rem' }}
      >
        Type the room title <strong>{currentTitle}</strong> to confirm:
      </label>
      <input
        id="settings-delete-confirm"
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={typed.length > 0 && !matches}
        style={{
          width: '100%',
          padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
          border: `1px solid ${
            typed.length > 0 && !matches
              ? 'var(--sharpee-error)'
              : 'var(--sharpee-border)'
          }`,
          borderRadius: 'var(--sharpee-border-radius)',
          background: 'var(--sharpee-bg-secondary)',
          color: 'var(--sharpee-text)',
          font: 'inherit',
        }}
      />
      <Button
        type="button"
        variant="primary"
        onClick={onConfirm}
        disabled={!matches}
        aria-label="Delete room"
        style={{
          alignSelf: 'start',
          background: 'var(--sharpee-error)',
          border: '1px solid var(--sharpee-error)',
        }}
      >
        Delete room
      </Button>
    </section>
  );
}
