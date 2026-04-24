/**
 * Transcript — renders the accumulated turn outputs from `story_output`
 * pushes. Phase 7 scope is a plain-paragraph renderer; style and
 * block-kind-specific formatting (command echoes, room-title blocks,
 * system notices) ship in Plan 05 polish.
 *
 * Public interface: {@link Transcript} default export, {@link TranscriptProps}.
 *
 * Bounded context: client room view (ADR-153 frontend).
 */

import { useLayoutEffect, useRef } from 'react';
import type { TranscriptEntry } from '../state/types';
import type { ParticipantSummary } from '../types/wire';

export interface TranscriptProps {
  entries: TranscriptEntry[];
  /** For resolving command-echo actor_id → display_name. */
  participants?: ParticipantSummary[];
}

/**
 * Best-effort text extraction from an engine TextBlock. The wire type is
 * deliberately open (`[key: string]: unknown`), so we look for the common
 * shapes and fall back to the raw kind. Plan 05 will replace this with a
 * proper block-kind dispatcher.
 */
function blockText(block: { kind?: string; key?: string; [k: string]: unknown }): string {
  if (typeof block.text === 'string') return block.text;
  if (typeof block.content === 'string') return block.content;
  if (Array.isArray(block.content)) return block.content.map(String).join('');
  return `[${block.key ?? block.kind ?? 'unknown'}]`;
}

export default function Transcript({ entries, participants }: TranscriptProps): JSX.Element {
  const nameFor = (actor_id: string): string => {
    if (actor_id === 'system') return 'System';
    return (
      participants?.find((p) => p.participant_id === actor_id)?.display_name ?? actor_id
    );
  };

  // Auto-scroll to bottom when entries change. `useLayoutEffect` runs after
  // DOM mutations but before paint, so the first scroll lands correctly even
  // when a command-echo and a story-output arrive back-to-back. A chased
  // `requestAnimationFrame` catches any post-paint layout growth (fonts
  // loading, wrapping on wide output blocks) that would otherwise leave us
  // short. We depend on `entries` (the array identity) rather than just
  // `entries.length` so a future in-place mutation still retriggers.
  const endRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const el = endRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'end' });
    const raf = requestAnimationFrame(() => el.scrollIntoView({ block: 'end' }));
    return () => cancelAnimationFrame(raf);
  }, [entries]);
  if (entries.length === 0) {
    return (
      <p
        role="status"
        style={{
          color: 'var(--sharpee-text-muted)',
          fontStyle: 'italic',
          padding: 'var(--sharpee-spacing-lg)',
        }}
      >
        Waiting for the story to begin…
      </p>
    );
  }

  return (
    <div
      aria-label="Transcript"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-md)',
        padding: 'var(--sharpee-spacing-lg)',
        fontFamily: 'var(--sharpee-font-story)',
        fontSize: '0.95rem',
        lineHeight: 1.65,
      }}
    >
      {entries.map((entry) => {
        if (entry.command) {
          return (
            <article
              key={entry.turn_id}
              aria-label={`Command from ${nameFor(entry.command.actor_id)}`}
              data-command="true"
              style={{
                fontFamily: 'var(--sharpee-font-mono, var(--sharpee-font-story))',
                color: 'var(--sharpee-text-muted)',
                padding: '0',
              }}
            >
              <span style={{ fontWeight: 600 }}>&gt;</span>
              {' '}
              {entry.command.text}
              {'  '}
              <span
                style={{
                  opacity: 0.65,
                  fontStyle: 'italic',
                  fontSize: '0.85em',
                }}
              >
                by {nameFor(entry.command.actor_id)} at{' '}
                {new Date(entry.command.ts).toLocaleString()}
              </span>
            </article>
          );
        }
        if (entry.restored) {
          return (
            <article
              key={entry.turn_id}
              aria-label={`Restored ${entry.restored.save_name}`}
              data-restored="true"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--sharpee-spacing-sm)',
                padding: 'var(--sharpee-spacing-sm) 0',
                borderTop: '2px solid var(--sharpee-warning, var(--sharpee-accent))',
                borderBottom: '2px solid var(--sharpee-warning, var(--sharpee-accent))',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  color: 'var(--sharpee-warning, var(--sharpee-accent))',
                }}
              >
                Restored · {entry.restored.save_name}
              </div>
              {entry.text_blocks.filter((b) => (b as { key?: string }).key !== 'prompt').map((block, i) => (
                <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {blockText(block)}
                </p>
              ))}
            </article>
          );
        }
        return (
          <article
            key={entry.turn_id}
            aria-label={`Turn ${entry.turn_id}`}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sharpee-spacing-sm)' }}
          >
            {entry.text_blocks.filter((b) => (b as { key?: string }).key !== 'prompt').map((block, i) => (
              <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {blockText(block)}
              </p>
            ))}
          </article>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
