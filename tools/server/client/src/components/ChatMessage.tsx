/**
 * ChatMessage — renders a single room-chat entry with author tier styling.
 *
 * Public interface: {@link ChatMessage} default export,
 * {@link ChatMessageProps}.
 *
 * Bounded context: client room view (ADR-153 frontend, Decision 8).
 *
 * Display decisions:
 *   - Author color by tier so hosts are visually distinct from participants.
 *   - "(you)" marker on self-authored messages.
 *   - Timestamp rendered as local HH:mm; full ISO stays on the `title`.
 *   - Unknown authors (orphan chat from a participant who left) render the
 *     participant_id as a fallback — no empty-from crashes.
 */

import type { ChatEntry, ParticipantSummary, Tier } from '../types/wire';

export interface ChatMessageProps {
  entry: ChatEntry;
  /** Used to resolve `from` → display name + tier. */
  participants: ParticipantSummary[];
  /** Viewer's participant_id, used for self-styling. */
  selfId: string | null;
}

const TIER_COLOR: Record<Tier, string> = {
  primary_host: 'var(--sharpee-accent-hot, var(--sharpee-error))',
  co_host: 'var(--sharpee-accent)',
  command_entrant: 'var(--sharpee-text)',
  participant: 'var(--sharpee-text-muted)',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessage({
  entry,
  participants,
  selfId,
}: ChatMessageProps): JSX.Element {
  const author = participants.find((p) => p.participant_id === entry.from);
  const isSelf = entry.from === selfId;
  const color = author ? TIER_COLOR[author.tier] : 'var(--sharpee-text-muted)';
  const displayName = author?.display_name ?? entry.from;

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 8px',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontSize: '0.8rem',
        }}
      >
        <span style={{ color, fontWeight: 600 }}>{displayName}</span>
        {isSelf && (
          <span style={{ color: 'var(--sharpee-text-muted)' }}>(you)</span>
        )}
        <time
          dateTime={entry.ts}
          title={entry.ts}
          style={{
            color: 'var(--sharpee-text-muted)',
            fontSize: '0.75rem',
            marginLeft: 'auto',
          }}
        >
          {formatTime(entry.ts)}
        </time>
      </span>
      <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {entry.text}
      </span>
    </li>
  );
}
