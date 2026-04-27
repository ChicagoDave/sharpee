/**
 * SettingsSuccessor behaviour tests.
 *
 * Behavior Statement — SettingsSuccessor
 *   DOES: renders the Co-Hosts of the room as a radio group pre-selecting
 *         the current designatedSuccessorId; Save dispatches
 *         `{kind:'nominate_successor', target_participant_id}`; Save is
 *         disabled when there are no Co-Hosts OR when the selection equals
 *         the current designated successor.
 *   WHEN: the PH opens the settings panel.
 *   BECAUSE: ADR-153 Decision 6 — PH must be able to designate a successor
 *            and the choice is authoritative over the server's auto-pick.
 *   REJECTS WHEN: no Co-Hosts → empty state + disabled Save; unchanged
 *                 selection → disabled Save.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsSuccessor from './SettingsSuccessor';
import type { ClientMsg, ParticipantSummary } from '../types/wire';

function cohost(id: string, name: string): ParticipantSummary {
  return {
    participant_id: id,
    handle: name,
    tier: 'co_host',
    connected: true,
    muted: false,
  };
}

describe('<SettingsSuccessor>', () => {
  it('renders a radio group of Co-Hosts with the current designee checked', () => {
    render(
      <SettingsSuccessor
        participants={[cohost('ch-1', 'Alice'), cohost('ch-2', 'Bob')]}
        designatedSuccessorId="ch-2"
        send={vi.fn()}
      />,
    );
    const bob = screen.getByRole('radio', { name: /bob/i }) as HTMLInputElement;
    expect(bob.checked).toBe(true);
    const alice = screen.getByRole('radio', { name: /alice/i }) as HTMLInputElement;
    expect(alice.checked).toBe(false);
  });

  it('Save is disabled when no Co-Hosts exist; empty-state message shown', () => {
    render(
      <SettingsSuccessor
        participants={[]}
        designatedSuccessorId={null}
        send={vi.fn()}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/promote a participant/i);
    expect(screen.getByRole('button', { name: /save successor/i })).toBeDisabled();
  });

  it('Save is disabled when the selection equals the current designee', () => {
    render(
      <SettingsSuccessor
        participants={[cohost('ch-1', 'Alice')]}
        designatedSuccessorId="ch-1"
        send={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /save successor/i })).toBeDisabled();
  });

  it('selecting a different Co-Host enables Save and dispatches nominate_successor', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(
      <SettingsSuccessor
        participants={[cohost('ch-1', 'Alice'), cohost('ch-2', 'Bob')]}
        designatedSuccessorId="ch-1"
        send={send}
      />,
    );
    await userEvent.click(screen.getByRole('radio', { name: /bob/i }));
    const save = screen.getByRole('button', { name: /save successor/i });
    expect(save).toBeEnabled();
    await userEvent.click(save);
    expect(send).toHaveBeenCalledWith({
      kind: 'nominate_successor',
      target_participant_id: 'ch-2',
    });
  });
});
