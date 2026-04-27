/**
 * EraseIdentityModal behavior tests (ADR-161 Phase E2).
 *
 * Behavior Statement — EraseIdentityModal
 *   DOES:
 *     - Renders the user's Handle in the prompt copy and in the
 *       confirm-input label.
 *     - Confirm button starts disabled.
 *     - Confirm button enables only when the typed value matches the
 *       Handle exactly (case-sensitive); mismatching strings keep it
 *       disabled.
 *     - On Confirm with a matching typed Handle, calls
 *       `eraseIdentityFn({ handle, passcode })` exactly once with the
 *       stored credentials, then calls `clearStoredIdentity()` so the
 *       persisted triple is removed and same-tab subscribers fire.
 *     - On Cancel / close-button / Esc, calls `onClose` without invoking
 *       the server.
 *   WHEN: opened from IdentityPanel for a user with a stored identity.
 *   BECAUSE: ADR-161 Phase E — erase is irreversible and must be
 *            deliberate; a Handle-typed gate (GitHub-style) prevents
 *            accidental destruction. Only the modal calls the server;
 *            the panel's role is to mount/unmount the modal.
 *   REJECTS WHEN:
 *     - Handle mismatch → Confirm disabled, no server call.
 *     - Server `bad_passcode` or `unknown_handle` → form-level alert
 *       directing the user to reload and re-set up identity; the
 *       persisted identity is NOT cleared (the user's stored copy may
 *       still be useful for diagnosis or upload).
 *     - Server `rate_limited` → "Too many attempts" alert; no clear.
 *     - Other ApiError → server `detail` is shown.
 *     - Network error (non-ApiError throw) → generic alert.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EraseIdentityModal from './erase-identity-modal';
import { ApiError } from '../api/http';
import { getStoredIdentity, storeIdentity } from './identity-store';
import type { StoredIdentity } from './identity-store';

const FIXTURE: StoredIdentity = {
  id: '1234-ABCD',
  handle: 'Alice',
  passcode: 'plate-music',
};

beforeEach(() => {
  window.localStorage.clear();
  storeIdentity(FIXTURE);
});

afterEach(() => {
  window.localStorage.clear();
});

describe('EraseIdentityModal — confirmation gate', () => {
  it('renders the modal with the Handle in the prompt copy', () => {
    render(<EraseIdentityModal identity={FIXTURE} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: /erase identity/i });
    expect(dialog).toBeInTheDocument();
    // The Handle appears in the prompt — at least once.
    expect(dialog.textContent).toContain('Alice');
  });

  it('Confirm button is disabled when the input is empty', () => {
    render(<EraseIdentityModal identity={FIXTURE} onClose={vi.fn()} />);

    const confirm = screen.getByRole('button', { name: /^erase identity$/i });
    expect(confirm).toBeDisabled();
  });

  it('Confirm button stays disabled when the typed value does not match the Handle', async () => {
    const user = userEvent.setup();
    render(<EraseIdentityModal identity={FIXTURE} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/type your handle/i);
    await user.type(input, 'Bob');

    expect(screen.getByRole('button', { name: /^erase identity$/i })).toBeDisabled();
  });

  it('Confirm button stays disabled for a case-mismatched Handle (case-sensitive)', async () => {
    const user = userEvent.setup();
    render(<EraseIdentityModal identity={FIXTURE} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/type your handle/i);
    await user.type(input, 'alice');

    expect(screen.getByRole('button', { name: /^erase identity$/i })).toBeDisabled();
  });

  it('Confirm button becomes enabled when the typed value exactly matches the Handle', async () => {
    const user = userEvent.setup();
    render(<EraseIdentityModal identity={FIXTURE} onClose={vi.fn()} />);

    const input = screen.getByLabelText(/type your handle/i);
    await user.type(input, 'Alice');

    expect(screen.getByRole('button', { name: /^erase identity$/i })).toBeEnabled();
  });
});

describe('EraseIdentityModal — successful erase', () => {
  it('Confirm with matching Handle calls eraseIdentityFn with stored credentials', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi.fn().mockResolvedValue({ erased: true });

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() => expect(eraseIdentityFn).toHaveBeenCalledTimes(1));
    expect(eraseIdentityFn).toHaveBeenCalledWith({
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('successful erase clears the stored identity from localStorage', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi.fn().mockResolvedValue({ erased: true });

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    expect(getStoredIdentity()).toEqual(FIXTURE);

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() => expect(getStoredIdentity()).toBeNull());
  });
});

describe('EraseIdentityModal — server error mapping', () => {
  it('maps bad_passcode to the reload-identity alert and does NOT clear localStorage', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, { code: 'bad_passcode', detail: 'wrong passcode' }),
      );

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /no longer valid.*reload/i,
      ),
    );
    expect(getStoredIdentity()).toEqual(FIXTURE);
  });

  it('maps unknown_handle to the same reload-identity alert', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(404, { code: 'unknown_handle', detail: 'no such handle' }),
      );

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /no longer valid.*reload/i,
      ),
    );
  });

  it('maps rate_limited to a "too many attempts" alert', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(429, { code: 'rate_limited', detail: 'slow down' }),
      );

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i),
    );
  });

  it('maps a non-ApiError throw to a generic network-error alert', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi.fn().mockRejectedValue(new Error('connection lost'));

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.type(screen.getByLabelText(/type your handle/i), 'Alice');
    await user.click(screen.getByRole('button', { name: /^erase identity$/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/network error/i),
    );
  });
});

describe('EraseIdentityModal — cancel paths', () => {
  it('clicking Cancel calls onClose and does not invoke the server', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const eraseIdentityFn = vi.fn();

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={onClose}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(eraseIdentityFn).not.toHaveBeenCalled();
  });

  it('clicking the close (X) button calls onClose and does not invoke the server', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const eraseIdentityFn = vi.fn();

    render(
      <EraseIdentityModal
        identity={FIXTURE}
        onClose={onClose}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(eraseIdentityFn).not.toHaveBeenCalled();
  });
});
