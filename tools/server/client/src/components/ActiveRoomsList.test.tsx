/**
 * ActiveRoomsList behavior tests — roster preview (ADR-161 Phase F).
 *
 * Behavior Statement — ActiveRoomsList roster rendering
 *   DOES:
 *     - For each room, renders the connected participants' Handles inline
 *       on the secondary line, comma-separated.
 *     - When the roster has more than ROSTER_PREVIEW_LIMIT (5) Handles,
 *       collapses overflow to `Handle1, Handle2, …, Handle5, +N more`.
 *     - Sets the row's `title` attribute to the full Handle list (no
 *       truncation), so a tooltip reveals everyone.
 *     - Each room's Handles render exactly the strings the server
 *       supplies — no transformation, no display-name fallback.
 *   WHEN: rendered with `rooms[]` from the server.
 *   BECAUSE: ADR-161 Phase F — Handle is the public-facing identity
 *            field; the landing page is unauthenticated discovery, so
 *            showing Handles helps users decide whether to join.
 *   REJECTS WHEN: empty rooms list shows the "No active rooms" status
 *                 fallback instead of an empty roster row.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActiveRoomsList from './ActiveRoomsList';
import type { RoomSummary, StorySummary } from '../types/api';

const stories: StorySummary[] = [{ slug: 'zork', title: 'Zork', path: '/' }];

function makeRoom(
  overrides: Partial<RoomSummary> & { handles?: string[] } = {},
): RoomSummary {
  const { handles = ['Alice'], ...rest } = overrides;
  return {
    room_id: 'r1',
    title: 'Test Room',
    story_slug: 'zork',
    participants: handles.map((handle) => ({ handle })),
    last_activity_at: '2026-04-22T17:00:00Z',
    ...rest,
  };
}

describe('ActiveRoomsList — roster preview', () => {
  it('renders each connected Handle inline, comma-separated', () => {
    const rooms = [makeRoom({ handles: ['Alice', 'Bob', 'Carol'] })];

    render(
      <ActiveRoomsList rooms={rooms} stories={stories} onEnter={vi.fn()} />,
    );

    const preview = screen.getByTestId('roster-preview');
    expect(preview).toHaveTextContent('Alice, Bob, Carol');
  });

  it('exposes the full Handle list via the title attribute', () => {
    const rooms = [makeRoom({ handles: ['Alice', 'Bob', 'Carol'] })];

    render(
      <ActiveRoomsList rooms={rooms} stories={stories} onEnter={vi.fn()} />,
    );

    expect(screen.getByTestId('roster-preview')).toHaveAttribute(
      'title',
      'Alice, Bob, Carol',
    );
  });

  it('renders a single Handle without comma artifacts', () => {
    const rooms = [makeRoom({ handles: ['Solo'] })];

    render(
      <ActiveRoomsList rooms={rooms} stories={stories} onEnter={vi.fn()} />,
    );

    expect(screen.getByTestId('roster-preview')).toHaveTextContent(/^Solo$/);
  });

  it('caps inline preview at 5 Handles and appends "+N more" for overflow', () => {
    const rooms = [
      makeRoom({
        handles: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
      }),
    ];

    render(
      <ActiveRoomsList rooms={rooms} stories={stories} onEnter={vi.fn()} />,
    );

    const preview = screen.getByTestId('roster-preview');
    expect(preview).toHaveTextContent('A, B, C, D, E, +2 more');
    // The full roster still appears in the title attribute for hover.
    expect(preview).toHaveAttribute('title', 'A, B, C, D, E, F, G');
  });

  it('renders all 5 Handles inline at the cap (no "+0 more")', () => {
    const rooms = [makeRoom({ handles: ['A', 'B', 'C', 'D', 'E'] })];

    render(
      <ActiveRoomsList rooms={rooms} stories={stories} onEnter={vi.fn()} />,
    );

    expect(screen.getByTestId('roster-preview')).toHaveTextContent(
      /^A, B, C, D, E$/,
    );
  });

  it('shows "No active rooms" fallback when the rooms list is empty', () => {
    render(
      <ActiveRoomsList rooms={[]} stories={stories} onEnter={vi.fn()} />,
    );

    expect(screen.queryByTestId('roster-preview')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/no active rooms/i);
  });
});
