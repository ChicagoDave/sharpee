/**
 * RoomView behaviour tests — the purely presentational room layout.
 *
 * Behavior Statement — RoomView
 *   DOES: renders "Connecting…" while `state.hydrated` is false; renders the
 *         header (title + REC), transcript, roster, and placeholder command
 *         input when hydrated; renders the "Room closed" page when
 *         `state.closed !== null`.
 *   WHEN: rendered with a `RoomState` fixture.
 *   BECAUSE: `Room` (the container) is kept thin so the UI can be tested
 *            without mocking the WebSocket.
 *   REJECTS WHEN: N/A — presentational only.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RoomView } from './Room';
import { initialRoomState, type RoomState } from '../state/types';

function hydrated(overrides: Partial<RoomState> = {}): RoomState {
  return {
    hydrated: true,
    selfId: 'p-me',
    room: {
      room_id: 'room-1',
      title: 'Alpha Session',
      story_slug: 'zork',
      pinned: false,
      last_activity_at: '2026-04-22T17:00:00Z',
      lock_holder_id: null,
      saves: [],
    },
    recordingNotice: 'Recorded.',
    participants: [
      {
        participant_id: 'p-me',
        display_name: 'Alice',
        tier: 'primary_host',
        connected: true,
        muted: false,
      },
      {
        participant_id: 'p-other',
        display_name: 'Bob',
        tier: 'command_entrant',
        connected: true,
        muted: false,
      },
    ],
    lockHolderId: null,
    draft: null,
    designatedSuccessorId: null,
    phGraceDeadline: null,
    transcript: [],
    chatMessages: [],
    dmThreads: {},
    lastError: null,
    closed: null,
    sandboxCrashed: false,
    ...overrides,
  };
}

describe('<RoomView>', () => {
  it('shows a Connecting status when state is not hydrated', () => {
    render(
      <RoomView
        roomId="room-1"
        code={null}
        state={initialRoomState}
        connection="connecting"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/connecting to room/i);
  });

  it('shows reconnect copy when not hydrated and connection is closed', () => {
    render(
      <RoomView
        roomId="room-1"
        code={null}
        state={initialRoomState}
        connection="closed"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/disconnected/i);
  });

  it('renders header, transcript, roster, and command input when hydrated', () => {
    render(
      <RoomView
        roomId="room-1"
        code="XYZ123"
        state={hydrated()}
        connection="open"
      />,
    );
    // Header
    expect(screen.getByRole('heading', { name: 'Alpha Session' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /recorded/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy room code/i })).toBeInTheDocument();
    // Roster
    const roster = screen.getByRole('list', { name: /participants/i });
    expect(within(roster).getByText(/alice/i)).toBeInTheDocument();
    expect(within(roster).getByText(/bob/i)).toBeInTheDocument();
    // Command input — Alice is a primary_host and no one holds the lock,
    // so the idle placeholder is shown.
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
  });

  it('transcript entries render as paragraphs in order', () => {
    const state = hydrated({
      transcript: [
        {
          turn_id: 't-1',
          text_blocks: [
            { kind: 'paragraph', text: 'You are in a dusty room.' },
            { kind: 'paragraph', text: 'There is a lantern here.' },
          ],
          events: [],
        },
        {
          turn_id: 't-2',
          text_blocks: [{ kind: 'paragraph', text: 'Taken.' }],
          events: [],
        },
      ],
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(screen.getByText(/you are in a dusty room/i)).toBeInTheDocument();
    expect(screen.getByText(/there is a lantern here/i)).toBeInTheDocument();
    expect(screen.getByText(/taken\./i)).toBeInTheDocument();
  });

  it('PH viewer sees a roster action menu on non-self rows', () => {
    render(
      <RoomView roomId="room-1" code={null} state={hydrated()} connection="open" />,
    );
    // Alice is the PH (self) — no menu on her own row.
    expect(
      screen.queryByRole('button', { name: /actions for alice/i }),
    ).toBeNull();
    // Bob is a Command Entrant — PH can moderate him.
    expect(
      screen.getByRole('button', { name: /actions for bob/i }),
    ).toBeInTheDocument();
  });

  it('Participant viewer sees no action menus on the roster', () => {
    const state = hydrated({
      selfId: 'p-obs',
      participants: [
        {
          participant_id: 'p-obs',
          display_name: 'Eve',
          tier: 'participant',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-other',
          display_name: 'Bob',
          tier: 'command_entrant',
          connected: true,
          muted: false,
        },
      ],
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(
      screen.queryByRole('button', { name: /actions for bob/i }),
    ).toBeNull();
  });

  it('lock holder gets the command-lock marker in the roster', () => {
    const state = hydrated({ lockHolderId: 'p-other' });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(screen.getByLabelText(/holds command lock/i)).toBeInTheDocument();
  });

  it('when another participant holds the lock, the command placeholder reflects it', () => {
    const state = hydrated({ lockHolderId: 'p-other' });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(
      screen.getByPlaceholderText(/another participant is typing/i),
    ).toBeInTheDocument();
  });

  it('renders chat messages from state.chatMessages and an input', () => {
    const state = hydrated({
      chatMessages: [
        {
          event_id: 1,
          from: 'p-other',
          text: 'welcome in',
          ts: '2026-04-22T17:00:00Z',
        },
        {
          event_id: 2,
          from: 'p-me',
          text: 'thanks',
          ts: '2026-04-22T17:00:05Z',
        },
      ],
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    const chatList = screen.getByRole('list', { name: /chat messages/i });
    expect(within(chatList).getByText(/welcome in/)).toBeInTheDocument();
    expect(within(chatList).getByText(/thanks/)).toBeInTheDocument();
    expect(screen.getByLabelText('Chat message')).toBeInTheDocument();
  });

  it('muted self disables the chat input', () => {
    const state = hydrated({
      participants: [
        {
          participant_id: 'p-me',
          display_name: 'Alice',
          tier: 'primary_host',
          connected: true,
          muted: true,
        },
      ],
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(screen.getByLabelText('Chat message')).toBeDisabled();
  });

  it('PH viewer with a token sees the gear icon; clicking it opens the settings dialog', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(
      <RoomView
        roomId="room-1"
        code="XYZ"
        state={hydrated()}
        connection="open"
        token="tok-ph"
      />,
    );
    const gear = screen.getByRole('button', { name: /open room settings/i });
    await userEvent.click(gear);
    expect(
      screen.getByRole('dialog', { name: /room settings/i }),
    ).toBeInTheDocument();
  });

  it('non-PH viewer does not see the gear icon', () => {
    const state = hydrated({
      selfId: 'p-obs',
      participants: [
        {
          participant_id: 'p-obs',
          display_name: 'Eve',
          tier: 'participant',
          connected: true,
          muted: false,
        },
      ],
    });
    render(<RoomView roomId="room-1" code="XYZ" state={state} connection="open" token="tok-obs" />);
    expect(
      screen.queryByRole('button', { name: /open room settings/i }),
    ).toBeNull();
  });

  it('PH clicking a Co-Host row\'s DM item opens a DM tab and renders the DM input', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const state = hydrated({
      participants: [
        {
          participant_id: 'p-me',
          display_name: 'Alice',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Bob',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
    });
    render(
      <RoomView roomId="room-1" code={null} state={state} connection="open" />,
    );
    await userEvent.click(screen.getByRole('button', { name: /actions for bob/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^dm bob$/i }));
    // New DM tab is present and activated.
    const tab = screen.getByRole('tab', { name: /^bob$/i });
    expect(tab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/direct message to bob/i)).toBeInTheDocument();
  });

  it('incoming dm creates a tab in RoomView when the reducer stores the thread', () => {
    const state = hydrated({
      participants: [
        {
          participant_id: 'p-me',
          display_name: 'Alice',
          tier: 'primary_host',
          connected: true,
          muted: false,
        },
        {
          participant_id: 'p-ch',
          display_name: 'Bob',
          tier: 'co_host',
          connected: true,
          muted: false,
        },
      ],
      dmThreads: {
        'p-ch': [
          {
            event_id: 1,
            from: 'p-ch',
            to: 'p-me',
            text: 'psst',
            ts: '2026-04-23T17:00:00Z',
          },
        ],
      },
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(screen.getByRole('tab', { name: /^bob$/i })).toBeInTheDocument();
  });

  it('clicking the saves toggle opens the SavePanel', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    render(
      <RoomView roomId="room-1" code={null} state={hydrated()} connection="open" />,
    );
    await userEvent.click(screen.getByRole('button', { name: /open saves/i }));
    expect(
      await screen.findByRole('dialog', { name: /^saves$/i }),
    ).toBeInTheDocument();
  });

  it('Restore flow: clicking Restore in the panel opens the confirm dialog; confirming dispatches sendRestore', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const sendSpy = vi.fn();
    const state = hydrated({
      room: {
        room_id: 'room-1',
        title: 'Alpha Session',
        story_slug: 'zork',
        pinned: false,
        last_activity_at: '2026-04-23T17:00:00Z',
        lock_holder_id: null,
        saves: [{ save_id: 's-1', name: 'zork t-3', created_at: '2026-04-23T17:00:00Z' }],
      },
    });
    render(
      <RoomView
        roomId="room-1"
        code={null}
        state={state}
        connection="open"
        send={sendSpy}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /open saves/i }));
    await userEvent.click(screen.getByRole('button', { name: /restore save zork t-3/i }));
    const dialog = await screen.findByRole('dialog', { name: /restore save/i });
    expect(dialog).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirm restore/i }));
    expect(sendSpy).toHaveBeenCalledWith({ kind: 'restore', save_id: 's-1' });
  });

  it('sandbox crash: mounts the crash modal with the latest save and Restore routes through the confirm dialog', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const sendSpy = vi.fn();
    const state = hydrated({
      sandboxCrashed: true,
      room: {
        room_id: 'room-1',
        title: 'Alpha Session',
        story_slug: 'zork',
        pinned: false,
        last_activity_at: '2026-04-23T17:00:00Z',
        lock_holder_id: null,
        saves: [
          { save_id: 's-1', name: 'zork t-3', created_at: '2026-04-23T17:00:00Z' },
          { save_id: 's-2', name: 'zork t-7', created_at: '2026-04-23T18:00:00Z' },
        ],
      },
    });
    render(
      <RoomView
        roomId="room-1"
        code={null}
        state={state}
        connection="open"
        send={sendSpy}
      />,
    );
    // Crash modal is up.
    expect(
      screen.getByRole('dialog', { name: /story runtime stopped/i }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /restore from last save/i }),
    );
    // Confirm dialog for the latest save (t-7).
    const confirm = await screen.findByRole('dialog', { name: /restore save/i });
    expect(confirm).toHaveTextContent(/zork t-7/);
    await userEvent.click(screen.getByRole('button', { name: /confirm restore/i }));
    expect(sendSpy).toHaveBeenCalledWith({ kind: 'restore', save_id: 's-2' });
  });

  it('sandbox crash with no saves: modal still renders; Restore button is absent', () => {
    const state = hydrated({ sandboxCrashed: true });
    render(
      <RoomView roomId="room-1" code={null} state={state} connection="open" />,
    );
    expect(
      screen.getByRole('dialog', { name: /story runtime stopped/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /restore from last save/i }),
    ).toBeNull();
  });

  it('Room closed overlay: Leave now clears the stored token and code for the room', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    // Seed storage with a token and code for the room about to be closed.
    window.localStorage.setItem('sharpee.token.room-1', 'stale-token');
    window.localStorage.setItem('sharpee.code.room-1', 'STALE');
    const state = hydrated({
      closed: { reason: 'deleted', message: 'Host deleted the room.' },
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    await userEvent.click(screen.getByRole('button', { name: /leave now/i }));
    expect(window.localStorage.getItem('sharpee.token.room-1')).toBeNull();
    expect(window.localStorage.getItem('sharpee.code.room-1')).toBeNull();
  });

  it('renders the Room closed view when state.closed is set', () => {
    const state = hydrated({
      closed: { reason: 'deleted', message: 'Host deleted the room.' },
    });
    render(<RoomView roomId="room-1" code={null} state={state} connection="open" />);
    expect(screen.getByRole('heading', { name: /room closed/i })).toBeInTheDocument();
    expect(screen.getByText(/host deleted the room/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Alpha Session' }),
    ).not.toBeInTheDocument();
  });
});
