/**
 * GraceBanner — full-width banner shown below the room header while the
 * Primary Host is disconnected and the succession grace window is pending
 * (ADR-153 Decision 6).
 *
 * Public interface: {@link GraceBanner} default export,
 * {@link GraceBannerProps}.
 *
 * Bounded context: client room view. The countdown ticks locally but the
 * authoritative deadline comes from the server (presence.grace_deadline).
 * Once the local ticker goes past the deadline the banner shows
 * "Succession in progress…" until the server emits the role_change that
 * clears `state.phGraceDeadline` in the reducer.
 */

import { useEffect, useState } from 'react';
import type { ParticipantSummary } from '../types/wire';

export interface GraceBannerProps {
  /** Server-provided absolute deadline for the grace window (ISO string). */
  deadline: string;
  participants: ParticipantSummary[];
  designatedSuccessorId: string | null;
  /** Test override — defaults to Date.now. */
  nowFn?: () => number;
}

function formatRemaining(remainingMs: number): string {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GraceBanner({
  deadline,
  participants,
  designatedSuccessorId,
  nowFn = () => Date.now(),
}: GraceBannerProps): JSX.Element {
  const deadlineMs = Date.parse(deadline);
  const [now, setNow] = useState<number>(nowFn());

  useEffect(() => {
    const id = window.setInterval(() => setNow(nowFn()), 1000);
    return () => window.clearInterval(id);
  }, [nowFn]);

  const remaining = deadlineMs - now;
  const successor = participants.find((p) => p.participant_id === designatedSuccessorId);
  const successorName = successor?.handle ?? 'a Co-Host';

  const copy =
    remaining > 0
      ? `Primary Host disconnected. ${successorName} will be promoted in ${formatRemaining(remaining)}.`
      : `Primary Host disconnected. Succession in progress…`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-lg)',
        background: 'color-mix(in srgb, var(--sharpee-error) 15%, transparent)',
        color: 'var(--sharpee-error)',
        borderBottom: '1px solid var(--sharpee-border)',
        fontSize: '0.9rem',
        textAlign: 'center',
      }}
    >
      {copy}
    </div>
  );
}
