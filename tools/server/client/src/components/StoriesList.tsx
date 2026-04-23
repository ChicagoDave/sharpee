/**
 * StoriesList — renders operator-preloaded stories for the Create Room
 * picker preview on the landing page.
 *
 * Public interface: {@link StoriesList} default export, {@link StoriesListProps}.
 *
 * Bounded context: client UI (ADR-153 frontend). The landing-page stories
 * list is read-only — actual story selection happens inside the Create Room
 * modal in Phase 4.
 */

import type { StorySummary } from '../types/api';

export interface StoriesListProps {
  stories: StorySummary[];
}

export default function StoriesList({ stories }: StoriesListProps): JSX.Element {
  if (stories.length === 0) {
    return (
      <p
        role="status"
        style={{
          color: 'var(--sharpee-text-muted)',
          fontStyle: 'italic',
          padding: 'var(--sharpee-spacing-md)',
        }}
      >
        No stories configured.
      </p>
    );
  }

  return (
    <ul
      aria-label="Available stories"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-xs)',
      }}
    >
      {stories.map((story) => (
        <li
          key={story.slug}
          style={{
            padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-md)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-panel-bg)',
          }}
        >
          <div style={{ fontWeight: 600 }}>{story.title}</div>
          <div
            style={{
              fontSize: '0.85em',
              color: 'var(--sharpee-text-muted)',
              fontFamily: 'var(--sharpee-font-input)',
            }}
          >
            {story.slug}
          </div>
        </li>
      ))}
    </ul>
  );
}
