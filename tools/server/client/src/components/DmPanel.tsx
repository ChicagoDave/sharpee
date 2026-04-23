/**
 * DmPanel — message list + input for a single DM thread.
 *
 * Public interface: {@link DmPanel} default export, {@link DmPanelProps}.
 *
 * Bounded context: client DM threads (Plan 04 Phase 2; ADR-153 Decision 8).
 * Structurally mirrors ChatPanel — list with auto-scroll-to-bottom + an
 * Enter-to-send input — but the send helper targets a single peer id and
 * the message shape is `DmEntry` (has `to` as well as `from`, unlike
 * room chat).
 *
 * The panel deliberately does not re-surface the recording-transparency
 * notice per ADR-153 Decision 11 — that one-time notice ships in Plan 04
 * Phase 5 as a dismissible banner above the DM body.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { sendDm, type Sender } from '../api/ws';
import type { DmEntry } from '../state/types';
import type { ParticipantSummary } from '../types/wire';

export interface DmPanelProps {
  peerId: string;
  peerName: string;
  entries: DmEntry[];
  participants: ParticipantSummary[];
  selfId: string | null;
  send: Sender;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DmPanel({
  peerId,
  peerName,
  entries,
  participants,
  selfId,
  send,
}: DmPanelProps): JSX.Element {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [value, setValue] = useState('');

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    sendDm(send, peerId, trimmed);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    submit();
  };

  return (
    <section
      aria-label={`Direct messages with ${peerName}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <ul
        ref={listRef}
        aria-label="DM messages"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 'var(--sharpee-spacing-xs)',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {entries.length === 0 ? (
          <li
            role="status"
            style={{
              color: 'var(--sharpee-text-muted)',
              fontStyle: 'italic',
              padding: 'var(--sharpee-spacing-sm)',
            }}
          >
            No messages yet.
          </li>
        ) : (
          entries.map((m) => {
            const isSelf = m.from === selfId;
            const author = participants.find((p) => p.participant_id === m.from);
            const displayName = author?.display_name ?? m.from;
            return (
              <li key={m.event_id} style={{ padding: '4px 8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 8,
                    fontSize: '0.8rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: isSelf
                        ? 'var(--sharpee-accent)'
                        : 'var(--sharpee-text)',
                    }}
                  >
                    {displayName}
                    {isSelf && (
                      <span
                        style={{
                          color: 'var(--sharpee-text-muted)',
                          fontWeight: 400,
                          marginLeft: 4,
                        }}
                      >
                        (you)
                      </span>
                    )}
                  </span>
                  <time
                    dateTime={m.ts}
                    title={m.ts}
                    style={{
                      color: 'var(--sharpee-text-muted)',
                      fontSize: '0.75rem',
                      marginLeft: 'auto',
                    }}
                  >
                    {formatTime(m.ts)}
                  </time>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.text}
                </div>
              </li>
            );
          })
        )}
      </ul>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 'var(--sharpee-spacing-sm)',
          borderTop: '1px solid var(--sharpee-border)',
        }}
      >
        <input
          aria-label={`Direct message to ${peerName}`}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Message ${peerName}…`}
          style={{
            width: '100%',
            padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-bg)',
            color: 'var(--sharpee-text)',
            font: 'inherit',
          }}
        />
      </div>
    </section>
  );
}
