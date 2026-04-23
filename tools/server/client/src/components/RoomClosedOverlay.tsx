/**
 * RoomClosedOverlay — full-viewport modal shown when the server broadcasts
 * `room_closed`. Auto-redirects to `/` after a 5-second countdown; the user
 * can click "Leave now" to redirect immediately.
 *
 * Public interface: {@link RoomClosedOverlay} default export,
 * {@link RoomClosedOverlayProps}.
 *
 * Bounded context: client room view (Plan 02 Phase 7; ADR-153 AC4, AC6).
 * Reason-specific copy:
 *   - `deleted`  → "This room has been closed by the host."
 *   - `recycled` → "This room was recycled after a period of inactivity."
 * The server-provided `message` overrides the canned copy when present —
 * that gives the host's delete flow a chance to explain why.
 */

import { useEffect, useState } from 'react';
import Button from './Button';

export interface RoomClosedOverlayProps {
  reason: 'deleted' | 'recycled';
  /** Optional server-supplied message; shown in place of the canned copy. */
  message?: string;
  /** Called when the countdown reaches zero OR the user clicks Leave now. */
  onRedirect: () => void;
  /**
   * Starting countdown in seconds. Default 5 — matches the plan's spec.
   * Test override to shorten the wait.
   */
  countdownSeconds?: number;
}

function defaultCopy(reason: 'deleted' | 'recycled'): string {
  if (reason === 'deleted') return 'This room has been closed by the host.';
  return 'This room was recycled after a period of inactivity.';
}

export default function RoomClosedOverlay({
  reason,
  message,
  onRedirect,
  countdownSeconds = 5,
}: RoomClosedOverlayProps): JSX.Element {
  const [remaining, setRemaining] = useState<number>(countdownSeconds);

  useEffect(() => {
    if (remaining <= 0) {
      onRedirect();
      return;
    }
    const id = window.setTimeout(() => setRemaining((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [remaining, onRedirect]);

  const body = message ?? defaultCopy(reason);

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sharpee-spacing-lg)',
        zIndex: 4000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-closed-heading"
        style={{
          background: 'var(--sharpee-bg)',
          color: 'var(--sharpee-text)',
          border: '1px solid var(--sharpee-border)',
          borderRadius: 'var(--sharpee-border-radius)',
          maxWidth: 480,
          width: '100%',
          padding: 'var(--sharpee-spacing-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sharpee-spacing-md)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        }}
      >
        <h2 id="room-closed-heading" style={{ margin: 0 }}>
          Room closed
        </h2>
        <p style={{ margin: 0 }}>{body}</p>
        <p
          role="status"
          aria-live="polite"
          style={{ margin: 0, color: 'var(--sharpee-text-muted)', fontSize: '0.9rem' }}
        >
          Returning to the landing page in {remaining}
          {remaining === 1 ? ' second' : ' seconds'}…
        </p>
        <Button
          variant="primary"
          onClick={onRedirect}
          style={{ alignSelf: 'start' }}
        >
          Leave now
        </Button>
      </div>
    </div>
  );
}
