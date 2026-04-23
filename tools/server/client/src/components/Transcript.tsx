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

import type { TranscriptEntry } from '../state/types';

export interface TranscriptProps {
  entries: TranscriptEntry[];
}

/**
 * Best-effort text extraction from an engine TextBlock. The wire type is
 * deliberately open (`[key: string]: unknown`), so we look for the common
 * shapes and fall back to the raw kind. Plan 05 will replace this with a
 * proper block-kind dispatcher.
 */
function blockText(block: { kind: string; [k: string]: unknown }): string {
  if (typeof block.text === 'string') return block.text;
  if (typeof block.content === 'string') return block.content;
  return `[${block.kind}]`;
}

export default function Transcript({ entries }: TranscriptProps): JSX.Element {
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
              {entry.text_blocks.map((block, i) => (
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
            {entry.text_blocks.map((block, i) => (
              <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {blockText(block)}
              </p>
            ))}
          </article>
        );
      })}
    </div>
  );
}
