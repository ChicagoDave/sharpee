/**
 * Landing page behavior tests.
 *
 * Behavior Statement — Landing
 *   DOES: on mount, calls the injected `fetchStories` and `fetchRooms`
 *         helpers in parallel and renders both lists when both resolve;
 *         renders an empty-state message per list when the server returns
 *         an empty array; surfaces an inline alert + Retry button when
 *         either fetch rejects; invokes `onCreate` when the Create button
 *         is clicked and `onEnter(room_id)` when the Enter button on a
 *         room row is clicked.
 *   WHEN: the Landing page is rendered under React.
 *   BECAUSE: the landing surface is the entry point for both creating and
 *            joining rooms; loading and error states must be visible to
 *            screen readers (ADR-153 frontend Accessibility Stance).
 *   REJECTS WHEN: N/A — read-only view.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from './Landing';
import type { CreateRoomResponse, ListRoomsResponse, ListStoriesResponse } from '../types/api';

function resolved<T>(value: T): () => Promise<T> {
  return () => Promise.resolve(value);
}

describe('<Landing>', () => {
  it('renders both stories and active rooms from the fetch helpers', async () => {
    const stories: ListStoriesResponse = {
      stories: [
        { slug: 'zork', title: 'Zork', path: '/s/zork.sharpee' },
        { slug: 'cloak', title: 'Cloak of Darkness', path: '/s/cloak.sharpee' },
      ],
    };
    const rooms: ListRoomsResponse = {
      rooms: [
        {
          room_id: 'room-a',
          title: 'Alpha Session',
          story_slug: 'zork',
          participant_count: 3,
          last_activity_at: '2026-04-22T17:00:00Z',
        },
      ],
    };

    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={vi.fn()}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
        fetchStories={resolved(stories)}
        fetchRooms={resolved(rooms)}
      />,
    );

    expect(await screen.findByText('Alpha Session')).toBeInTheDocument();
    // Active room row shows the resolved story TITLE, not the slug.
    expect(screen.getByText(/Zork · 3 people/)).toBeInTheDocument();
    // Stories list shows title AND slug.
    expect(screen.getByText('Cloak of Darkness')).toBeInTheDocument();
    expect(screen.getByText('cloak')).toBeInTheDocument();
  });

  it('uses singular "person" copy when a room has exactly one participant', async () => {
    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={vi.fn()}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
        fetchStories={resolved({ stories: [] })}
        fetchRooms={resolved({
          rooms: [
            {
              room_id: 'solo',
              title: 'Just me',
              story_slug: 'zork',
              participant_count: 1,
              last_activity_at: '2026-04-22T17:00:00Z',
            },
          ],
        })}
      />,
    );
    expect(await screen.findByText(/1 person\b/)).toBeInTheDocument();
  });

  it('renders empty-state messages when both lists are empty', async () => {
    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={vi.fn()}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
        fetchStories={resolved({ stories: [] })}
        fetchRooms={resolved({ rooms: [] })}
      />,
    );
    expect(await screen.findByText('No active rooms.')).toBeInTheDocument();
    expect(screen.getByText('No stories configured.')).toBeInTheDocument();
  });

  it('shows an alert + Retry on fetch failure and retries both endpoints', async () => {
    const rejectOnce = vi
      .fn<() => Promise<ListStoriesResponse>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ stories: [] });
    const fetchRooms = vi
      .fn<() => Promise<ListRoomsResponse>>()
      .mockResolvedValue({ rooms: [] });

    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={vi.fn()}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
        fetchStories={rejectOnce}
        fetchRooms={fetchRooms}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/boom/);

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('No active rooms.')).toBeInTheDocument();
    expect(rejectOnce).toHaveBeenCalledTimes(2);
    expect(fetchRooms).toHaveBeenCalledTimes(2);
  });

  it('clicking Create opens the CreateRoomModal', async () => {
    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={vi.fn()}
        fetchStories={resolved({
          stories: [{ slug: 'zork', title: 'Zork', path: '/s/zork.sharpee' }],
        })}
        fetchRooms={resolved({ rooms: [] })}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
      />,
    );
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /create a new room/i }));
    expect(
      await screen.findByRole('dialog', { name: /create a room/i }),
    ).toBeInTheDocument();
  });

  it('on successful room creation, closes the modal and invokes onRoomCreated(room_id)', async () => {
    const onRoomCreated = vi.fn();
    const createdResponse: CreateRoomResponse = {
      room_id: 'new-room-1',
      join_code: 'ABC123',
      join_url: '/r/ABC123',
      token: 'tok-1',
      tier: 'primary_host',
      participant_id: 'p-1',
    };
    const createRoomFn = vi.fn().mockResolvedValue(createdResponse);
    render(
      <Landing
        onRoomCreated={onRoomCreated}
        onEnter={vi.fn()}
        fetchStories={resolved({
          stories: [{ slug: 'zork', title: 'Zork', path: '/s/zork.sharpee' }],
        })}
        fetchRooms={resolved({ rooms: [] })}
        createRoomFn={createRoomFn}
        captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
      />,
    );
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /create a new room/i }));
    const dialog = await screen.findByRole('dialog', { name: /create a room/i });
    await userEvent.type(
      screen.getByLabelText(/title/i, { selector: 'input' }),
      'Alpha',
    );
    await userEvent.selectOptions(screen.getByLabelText(/story/i), 'zork');
    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /^create room$/i }));

    await waitFor(() => expect(onRoomCreated).toHaveBeenCalledWith('new-room-1'));
    // Modal closes after success.
    expect(dialog).not.toBeInTheDocument();
  });

  it('clicking Enter on a room invokes onEnter with that room_id', async () => {
    const onEnter = vi.fn();
    const rooms: ListRoomsResponse = {
      rooms: [
        {
          room_id: 'room-123',
          title: 'Pick Me',
          story_slug: 'zork',
          participant_count: 2,
          last_activity_at: '2026-04-22T17:00:00Z',
        },
      ],
    };
    render(
      <Landing
        onRoomCreated={vi.fn()}
        onEnter={onEnter}
        fetchStories={resolved({ stories: [] })}
        fetchRooms={resolved(rooms)}
      />,
    );
    const enterButton = await screen.findByRole('button', { name: /enter room pick me/i });
    await userEvent.click(enterButton);
    expect(onEnter).toHaveBeenCalledWith('room-123');
  });
});
