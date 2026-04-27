/**
 * DmPanel behaviour tests.
 *
 * Behavior Statement — DmPanel
 *   DOES: renders each entry with author name (or "(you)" marker) + body +
 *         local-time timestamp; on Enter-with-non-empty-text, emits
 *         `{kind:'dm', to_participant_id, text}` via the injected send;
 *         trims whitespace; Shift+Enter does not submit. On first mount per
 *         browser, also renders a dismissible recording-transparency notice;
 *         Got-it persists `sharpee.dm_notice_ack` and skips the notice on
 *         subsequent mounts.
 *   WHEN: the PH or a Co-Host opens the DM tab for their peer.
 *   BECAUSE: ADR-153 Decision 8 — PH↔Co-Host DM axis. Decision 11 —
 *            recording transparency.
 *   REJECTS WHEN: empty/whitespace-only input (no dispatch).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DmPanel from './DmPanel';
import type { ClientMsg, ParticipantSummary } from '../types/wire';
import type { DmEntry } from '../state/types';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

const PARTS: ParticipantSummary[] = [
  {
    participant_id: 'p-host',
    handle: 'Alice',
    tier: 'primary_host',
    connected: true,
    muted: false,
  },
  {
    participant_id: 'p-ch',
    handle: 'Bob',
    tier: 'co_host',
    connected: true,
    muted: false,
  },
];

const ENTRIES: DmEntry[] = [
  {
    event_id: 1,
    from: 'p-host',
    to: 'p-ch',
    text: 'hey',
    ts: '2026-04-23T17:00:00Z',
  },
  {
    event_id: 2,
    from: 'p-ch',
    to: 'p-host',
    text: 'hi',
    ts: '2026-04-23T17:00:05Z',
  },
];

describe('<DmPanel>', () => {
  it('renders each entry with author name and marks self messages', () => {
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={ENTRIES}
        participants={PARTS}
        selfId="p-host"
        send={vi.fn()}
      />,
    );
    const list = screen.getByRole('list', { name: /dm messages/i });
    expect(list).toHaveTextContent('Alice');
    expect(list).toHaveTextContent('Bob');
    expect(list).toHaveTextContent(/\(you\)/); // Alice is the viewer
  });

  it('renders an empty state when no entries', () => {
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/no messages yet/i);
  });

  it('Enter with non-empty trimmed text dispatches a dm ClientMsg to the peer', async () => {
    const send = vi.fn<(m: ClientMsg) => void>();
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={send}
      />,
    );
    const input = screen.getByLabelText(/direct message to bob/i) as HTMLInputElement;
    await userEvent.type(input, '  hello there  {Enter}');
    expect(send).toHaveBeenCalledWith({
      kind: 'dm',
      to_participant_id: 'p-ch',
      text: 'hello there',
    });
    expect(input.value).toBe('');
  });

  it('empty-input Enter does not dispatch', async () => {
    const send = vi.fn<(m: ClientMsg) => void>();
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={send}
      />,
    );
    await userEvent.type(screen.getByLabelText(/direct message to bob/i), '   {Enter}');
    expect(send).not.toHaveBeenCalled();
  });

  it('Shift+Enter does not submit', async () => {
    const send = vi.fn<(m: ClientMsg) => void>();
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={send}
      />,
    );
    const input = screen.getByLabelText(/direct message to bob/i);
    await userEvent.type(input, 'draft');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(send).not.toHaveBeenCalled();
  });

  // ---------- Plan 04 Phase 5 — DM recording notice ----------

  it('first mount renders the recording-transparency notice', () => {
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={vi.fn()}
      />,
    );
    const notice = screen.getByRole('note', { name: /recording notice/i });
    expect(notice).toHaveTextContent(/logged in this room/i);
    expect(
      screen.getByRole('button', { name: /dismiss dm recording notice/i }),
    ).toBeInTheDocument();
  });

  it('dismissing the notice persists the acknowledgment and hides the notice', async () => {
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /dismiss dm recording notice/i }),
    );
    expect(screen.queryByRole('note', { name: /recording notice/i })).toBeNull();
    expect(window.localStorage.getItem('sharpee.dm_notice_ack')).toBe('1');
  });

  it('subsequent mounts skip the notice when the ack is already in storage', () => {
    window.localStorage.setItem('sharpee.dm_notice_ack', '1');
    render(
      <DmPanel
        peerId="p-ch"
        peerName="Bob"
        entries={[]}
        participants={PARTS}
        selfId="p-host"
        send={vi.fn()}
      />,
    );
    expect(screen.queryByRole('note', { name: /recording notice/i })).toBeNull();
  });
});
