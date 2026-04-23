/**
 * ChatPanel — message list + input for room-wide chat.
 *
 * Public interface: {@link ChatPanel} default export, {@link ChatPanelProps}.
 *
 * Bounded context: client room view (ADR-153 Decision 8). Composes
 * {@link ChatMessage} and {@link ChatInput}; owns nothing except the
 * auto-scroll behavior (list pins to bottom when new messages arrive).
 */

import { useEffect, useRef } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import type { ChatEntry, ClientMsg, ParticipantSummary } from '../types/wire';

export interface ChatPanelProps {
  messages: ChatEntry[];
  participants: ParticipantSummary[];
  selfId: string | null;
  /** True when the viewer is muted. Derived by the parent from participants. */
  muted?: boolean;
  send: (msg: ClientMsg) => void;
}

export default function ChatPanel({
  messages,
  participants,
  selfId,
  muted,
  send,
}: ChatPanelProps): JSX.Element {
  const listRef = useRef<HTMLUListElement | null>(null);

  // Pin the list to the bottom whenever a new message arrives so the latest
  // keystroke stays visible. Use scrollTop rather than scrollIntoView so we
  // don't steal focus from the chat input.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <section
      aria-label="Chat"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
      }}
    >
      <ul
        ref={listRef}
        aria-label="Chat messages"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 'var(--sharpee-spacing-xs)',
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 ? (
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
          messages.map((m) => (
            <ChatMessage
              key={m.event_id}
              entry={m}
              participants={participants}
              selfId={selfId}
            />
          ))
        )}
      </ul>
      <ChatInput send={send} muted={muted} />
    </section>
  );
}
