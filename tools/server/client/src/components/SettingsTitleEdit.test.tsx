/**
 * SettingsTitleEdit behaviour tests.
 *
 * Behavior Statement — SettingsTitleEdit
 *   DOES: on submit with a trimmed, non-empty, ≤80 char title that differs
 *         from the current title, calls renameRoomFn(room_id, trimmed,
 *         token); surfaces an ApiError's detail as an inline alert; surfaces
 *         a generic "Network error" for non-ApiError throws; Save button
 *         disabled when unchanged or empty.
 *   WHEN: the PH settings panel is open.
 *   BECAUSE: ADR-153 Decision 3 — PH must rename without recreating.
 *   REJECTS WHEN: empty/whitespace title; title >80 chars (client-side
 *                 check); server error surfaced inline.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsTitleEdit from './SettingsTitleEdit';
import { ApiError } from '../api/http';

const OK = { room_id: 'room-1', title: 'New' };

describe('<SettingsTitleEdit>', () => {
  it('submit with a changed title calls renameRoomFn with trimmed input', async () => {
    const renameRoomFn = vi.fn().mockResolvedValue(OK);
    render(
      <SettingsTitleEdit
        roomId="room-1"
        currentTitle="Old"
        token="tok-ph"
        renameRoomFn={renameRoomFn}
      />,
    );
    const input = screen.getByLabelText(/shown on the landing page/i);
    await userEvent.clear(input);
    await userEvent.type(input, '   New Name   ');
    await userEvent.click(screen.getByRole('button', { name: /save title/i }));
    await waitFor(() => expect(renameRoomFn).toHaveBeenCalledTimes(1));
    expect(renameRoomFn).toHaveBeenCalledWith('room-1', 'New Name', 'tok-ph');
  });

  it('Save button is disabled when the input matches the current title', async () => {
    const renameRoomFn = vi.fn();
    render(
      <SettingsTitleEdit
        roomId="room-1"
        currentTitle="Alpha"
        token="tok-ph"
        renameRoomFn={renameRoomFn}
      />,
    );
    expect(screen.getByRole('button', { name: /save title/i })).toBeDisabled();
  });

  it('client-side rejects empty input', async () => {
    const renameRoomFn = vi.fn();
    render(
      <SettingsTitleEdit
        roomId="room-1"
        currentTitle="Alpha"
        token="tok-ph"
        renameRoomFn={renameRoomFn}
      />,
    );
    const input = screen.getByLabelText(/shown on the landing page/i);
    await userEvent.clear(input);
    // Save is disabled on empty — verify no dispatch.
    expect(screen.getByRole('button', { name: /save title/i })).toBeDisabled();
    expect(renameRoomFn).not.toHaveBeenCalled();
  });

  it('server invalid_title surfaces the detail inline', async () => {
    const renameRoomFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, {
          code: 'invalid_title',
          detail: 'title must be 80 characters or fewer',
        }),
      );
    render(
      <SettingsTitleEdit
        roomId="room-1"
        currentTitle="Old"
        token="tok-ph"
        renameRoomFn={renameRoomFn}
      />,
    );
    const input = screen.getByLabelText(/shown on the landing page/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'Will fail server-side');
    await userEvent.click(screen.getByRole('button', { name: /save title/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/80 characters or fewer/i);
  });

  it('network error surfaces a generic alert', async () => {
    const renameRoomFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    render(
      <SettingsTitleEdit
        roomId="room-1"
        currentTitle="Old"
        token="tok-ph"
        renameRoomFn={renameRoomFn}
      />,
    );
    const input = screen.getByLabelText(/shown on the landing page/i);
    await userEvent.clear(input);
    await userEvent.type(input, 'New');
    await userEvent.click(screen.getByRole('button', { name: /save title/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/network error/i);
  });
});
