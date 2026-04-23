/**
 * PasscodeModal behaviour tests.
 *
 * Behavior Statement — PasscodeModal
 *   DOES: validates that passcode and display name are non-empty; calls
 *         resolveCodeFn(code) to translate a passcode to a room_id; if the
 *         modal was opened for a specific expectedRoomId and the resolution
 *         lands on a different room, surfaces an "Invalid passcode." field
 *         error without attempting a join; on a successful resolution, calls
 *         joinRoomFn(room_id, {display_name, captcha_token}); on a successful
 *         join, persists `sharpee.token.<room_id>` and invokes onJoined.
 *   WHEN: the user submits the passcode form.
 *   BECAUSE: the passcode is the room's private gate (ADR-153 Decision 3);
 *            the token is required for reconnect (Decision 5).
 *   REJECTS WHEN: client-side: empty/whitespace code or display name.
 *                 Server: room_not_found (resolve) → passcode field error;
 *                 wrong-room resolution (list click) → passcode field error;
 *                 missing_field for display_name (join) → field error;
 *                 captcha_failed (join) → form-level alert;
 *                 any other error → form-level alert.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasscodeModal from './PasscodeModal';
import { ApiError } from '../api/http';
import type { JoinRoomResponse, ResolveCodeResponse } from '../types/api';

const OK_RESOLVE: ResolveCodeResponse = {
  room_id: 'room-42',
  title: 'Host Session',
  story_slug: 'zork',
  pinned: false,
};

const OK_JOIN: JoinRoomResponse = {
  participant_id: 'p-42',
  token: 'tok-participant',
  tier: 'participant',
};

type Overrides = {
  onJoined?: (room_id: string) => void;
  onClose?: () => void;
  resolveCodeFn?: Parameters<typeof PasscodeModal>[0]['resolveCodeFn'];
  joinRoomFn?: Parameters<typeof PasscodeModal>[0]['joinRoomFn'];
  prefillCode?: string;
  expectedRoomId?: string;
};

function renderModal(overrides: Overrides = {}) {
  return render(
    <PasscodeModal
      open
      onClose={overrides.onClose ?? vi.fn()}
      onJoined={overrides.onJoined ?? vi.fn()}
      prefillCode={overrides.prefillCode}
      expectedRoomId={overrides.expectedRoomId}
      resolveCodeFn={overrides.resolveCodeFn}
      joinRoomFn={overrides.joinRoomFn}
      captchaConfig={{ captcha: { provider: 'none', siteKey: '' } }}
    />,
  );
}

async function fillValidForm(code = 'XYZ123'): Promise<void> {
  await userEvent.clear(screen.getByLabelText('Passcode'));
  await userEvent.type(screen.getByLabelText('Passcode'), code);
  await userEvent.type(screen.getByLabelText(/display name/i), 'Alice');
}

describe('<PasscodeModal>', () => {
  it('resolves the code, joins, persists the token, and invokes onJoined', async () => {
    const resolveCodeFn = vi.fn().mockResolvedValue(OK_RESOLVE);
    const joinRoomFn = vi.fn().mockResolvedValue(OK_JOIN);
    const onJoined = vi.fn();
    renderModal({ resolveCodeFn, joinRoomFn, onJoined });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    await waitFor(() => expect(joinRoomFn).toHaveBeenCalledTimes(1));
    expect(resolveCodeFn).toHaveBeenCalledWith('XYZ123');
    expect(joinRoomFn).toHaveBeenCalledWith('room-42', {
      display_name: 'Alice',
      captcha_token: 'bypass',
    });
    expect(window.localStorage.getItem('sharpee.token.room-42')).toBe(
      'tok-participant',
    );
    expect(onJoined).toHaveBeenCalledWith('room-42');
  });

  it('pre-fills the passcode field when opened with prefillCode', () => {
    renderModal({ prefillCode: 'DEEPLINK' });
    const input = screen.getByLabelText('Passcode') as HTMLInputElement;
    expect(input.value).toBe('DEEPLINK');
  });

  it('client-side rejects empty passcode before resolving', async () => {
    const resolveCodeFn = vi.fn();
    const joinRoomFn = vi.fn();
    renderModal({ resolveCodeFn, joinRoomFn });

    await userEvent.type(screen.getByLabelText(/display name/i), 'Alice');
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(await screen.findByText(/passcode is required/i)).toBeInTheDocument();
    expect(resolveCodeFn).not.toHaveBeenCalled();
    expect(joinRoomFn).not.toHaveBeenCalled();
  });

  it('client-side rejects empty display name before resolving', async () => {
    const resolveCodeFn = vi.fn();
    renderModal({ resolveCodeFn });

    await userEvent.type(screen.getByLabelText('Passcode'), 'XYZ123');
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(await screen.findByText(/display name is required/i)).toBeInTheDocument();
    expect(resolveCodeFn).not.toHaveBeenCalled();
  });

  it('server room_not_found → inline field error on Passcode', async () => {
    const resolveCodeFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(404, { code: 'room_not_found', detail: 'No room with join code XYZ123' }),
      );
    const joinRoomFn = vi.fn();
    renderModal({ resolveCodeFn, joinRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(await screen.findByText(/invalid passcode/i)).toBeInTheDocument();
    expect(joinRoomFn).not.toHaveBeenCalled();
  });

  it('resolution to a different room than expected → Invalid passcode field error', async () => {
    const resolveCodeFn = vi.fn().mockResolvedValue({
      ...OK_RESOLVE,
      room_id: 'room-wrong',
    });
    const joinRoomFn = vi.fn();
    const onJoined = vi.fn();
    renderModal({
      resolveCodeFn,
      joinRoomFn,
      onJoined,
      expectedRoomId: 'room-42',
    });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(await screen.findByText(/invalid passcode/i)).toBeInTheDocument();
    expect(joinRoomFn).not.toHaveBeenCalled();
    expect(onJoined).not.toHaveBeenCalled();
  });

  it('join missing_field for display_name → inline field error', async () => {
    const resolveCodeFn = vi.fn().mockResolvedValue(OK_RESOLVE);
    const joinRoomFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, { code: 'missing_field', detail: 'display_name is required' }),
      );
    renderModal({ resolveCodeFn, joinRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    expect(
      await screen.findByText(/display_name is required/i),
    ).toBeInTheDocument();
  });

  it('join captcha_failed → form-level alert', async () => {
    const resolveCodeFn = vi.fn().mockResolvedValue(OK_RESOLVE);
    const joinRoomFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(403, { code: 'captcha_failed', detail: 'captcha did not verify' }),
      );
    renderModal({ resolveCodeFn, joinRoomFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/captcha failed/i);
  });

  it('network error → generic form-level alert', async () => {
    const resolveCodeFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    renderModal({ resolveCodeFn });

    await fillValidForm();
    await userEvent.click(screen.getByRole('button', { name: /^join room$/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/network error/i);
  });

  it('Esc dismisses the modal via onClose', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
