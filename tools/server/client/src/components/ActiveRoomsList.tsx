/**
 * ActiveRoomsList — public discovery surface showing rooms that currently
 * have at least one connected participant.
 *
 * Public interface: {@link ActiveRoomsList} default export,
 * {@link ActiveRoomsListProps}.
 *
 * Bounded context: client landing page (ADR-153 frontend). Clicking "Enter"
 * on a row delegates to the parent, which opens the passcode modal. This
 * component never has the passcode — joining is always code-gated.
 */

import Button from './Button';
import type { RoomSummary, StorySummary } from '../types/api';

export interface ActiveRoomsListProps {
  rooms: RoomSummary[];
  /** Used to render the story's human title instead of the raw slug. */
  stories: StorySummary[];
  onEnter: (room_id: string) => void;
  /**
   * When true, per-row Enter buttons are disabled with explanatory copy.
   * Set by Landing when the user has no stored identity (ADR-161 R11
   * gate). Defaults to false so existing call sites keep working.
   */
  identityMissing?: boolean;
}

function storyTitleFor(slug: string, stories: StorySummary[]): string {
  return stories.find((s) => s.slug === slug)?.title ?? slug;
}

export default function ActiveRoomsList({
  rooms,
  stories,
  onEnter,
  identityMissing = false,
}: ActiveRoomsListProps): JSX.Element {
  const gateLabel = 'Set up your identity first';
  if (rooms.length === 0) {
    return (
      <p
        role="status"
        style={{
          color: 'var(--sharpee-text-muted)',
          fontStyle: 'italic',
          padding: 'var(--sharpee-spacing-md)',
        }}
      >
        No active rooms.
      </p>
    );
  }

  return (
    <ul
      aria-label="Active rooms"
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sharpee-spacing-xs)',
      }}
    >
      {rooms.map((room) => (
        <li
          key={room.room_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sharpee-spacing-md)',
            padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-md)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-panel-bg)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {room.title}
            </div>
            <div style={{ fontSize: '0.85em', color: 'var(--sharpee-text-muted)' }}>
              {storyTitleFor(room.story_slug, stories)}
              {' · '}
              {room.participant_count}{' '}
              {room.participant_count === 1 ? 'person' : 'people'}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => onEnter(room.room_id)}
            aria-label={
              identityMissing ? gateLabel : `Enter room ${room.title}`
            }
            title={identityMissing ? gateLabel : undefined}
            disabled={identityMissing}
          >
            Enter
          </Button>
        </li>
      ))}
    </ul>
  );
}
