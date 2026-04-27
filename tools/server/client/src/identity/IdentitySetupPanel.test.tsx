/**
 * IdentitySetupPanel behavior tests (ADR-161).
 *
 * Behavior Statement — IdentitySetupPanel
 *   DOES: renders Create + Upload affordances. On Create-success, persists
 *         the (id, handle, passcode) triple to localStorage via
 *         storeIdentity and invokes onIdentityEstablished(triple). On
 *         Upload-success, persists the triple (passcode from the CSV,
 *         id+handle from the canonical server response) and invokes
 *         onIdentityEstablished. On Create or Upload failure, surfaces
 *         inline error copy mapped from server codes; localStorage is not
 *         touched and onIdentityEstablished is not invoked.
 *   WHEN: rendered as a banner above Landing/Room when getStoredIdentity
 *         returns null.
 *   BECAUSE: ADR-161 R11 — Landing remains visible to unidentified users;
 *            the panel sits above as a banner that unlocks action buttons
 *            once identity exists.
 *   REJECTS WHEN: client validation (empty/short/long/non-alpha handle,
 *                 malformed CSV) → inline error before any network call;
 *                 server `handle_taken`, `bad_passcode`, `id_mismatch`,
 *                 `malformed_id`, `invalid_handle` → mapped inline copy;
 *                 network failure → form-level error.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentitySetupPanel from './IdentitySetupPanel';
import { ApiError } from '../api/http';
import { getStoredIdentity } from './identity-store';

describe('IdentitySetupPanel — Create Identity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('happy path: posts handle, persists triple, invokes onIdentityEstablished', async () => {
    const user = userEvent.setup();
    const onEstablished = vi.fn();
    const createIdentityFn = vi.fn().mockResolvedValue({
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });

    render(
      <IdentitySetupPanel
        onIdentityEstablished={onEstablished}
        createIdentityFn={createIdentityFn}
        uploadIdentityFn={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Handle'), 'Alice');
    await user.click(screen.getByRole('button', { name: /create identity/i }));

    await waitFor(() => expect(createIdentityFn).toHaveBeenCalledWith({ handle: 'Alice' }));
    expect(onEstablished).toHaveBeenCalledWith({
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
    expect(getStoredIdentity()).toEqual({
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('client validation: empty handle → inline error, no network call', async () => {
    const user = userEvent.setup();
    const createIdentityFn = vi.fn();
    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={createIdentityFn}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /create identity/i }));

    expect(await screen.findByText(/handle is required/i)).toBeInTheDocument();
    expect(createIdentityFn).not.toHaveBeenCalled();
  });

  it('client validation: too-short handle → inline error', async () => {
    const user = userEvent.setup();
    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Handle'), 'ab');
    await user.click(screen.getByRole('button', { name: /create identity/i }));
    expect(await screen.findByText(/3.*12 characters/i)).toBeInTheDocument();
  });

  it('client validation: handle with digits → inline error', async () => {
    const user = userEvent.setup();
    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Handle'), 'Alice7');
    await user.click(screen.getByRole('button', { name: /create identity/i }));
    expect(await screen.findByText(/letters only/i)).toBeInTheDocument();
  });

  it('server handle_taken → maps to "already taken" copy, no persist', async () => {
    const user = userEvent.setup();
    const onEstablished = vi.fn();
    const createIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, { code: 'handle_taken', detail: 'that handle is already in use' }),
      );

    render(
      <IdentitySetupPanel
        onIdentityEstablished={onEstablished}
        createIdentityFn={createIdentityFn}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Handle'), 'Alice');
    await user.click(screen.getByRole('button', { name: /create identity/i }));

    expect(await screen.findByText(/already taken/i)).toBeInTheDocument();
    expect(onEstablished).not.toHaveBeenCalled();
    expect(getStoredIdentity()).toBeNull();
  });

  it('server rate_limited → maps to wait-a-minute copy', async () => {
    const user = userEvent.setup();
    const createIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(429, { code: 'rate_limited', detail: 'too many requests' }),
      );

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={createIdentityFn}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Handle'), 'Alice');
    await user.click(screen.getByRole('button', { name: /create identity/i }));

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });

  it('network error (non-ApiError) → maps to "Network error" copy', async () => {
    const user = userEvent.setup();
    const createIdentityFn = vi.fn().mockRejectedValue(new Error('TypeError: failed'));

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={createIdentityFn}
        uploadIdentityFn={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText('Handle'), 'Alice');
    await user.click(screen.getByRole('button', { name: /create identity/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});

describe('IdentitySetupPanel — Upload Identity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  function makeCsvFile(text: string): File {
    return new File([text], 'identity.csv', { type: 'text/csv' });
  }

  it('happy path (matrix row 2 — same identity): parses CSV, posts triple, persists, fires onEstablished', async () => {
    const user = userEvent.setup();
    const onEstablished = vi.fn();
    const uploadIdentityFn = vi
      .fn()
      .mockResolvedValue({ id: '1234-ABCD', handle: 'Alice' });

    render(
      <IdentitySetupPanel
        onIdentityEstablished={onEstablished}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('1234-ABCD,Alice,plate-music\n');
    await user.upload(screen.getByLabelText('Identity file'), file);

    await waitFor(() =>
      expect(uploadIdentityFn).toHaveBeenCalledWith({
        id: '1234-ABCD',
        handle: 'Alice',
        passcode: 'plate-music',
      }),
    );
    expect(onEstablished).toHaveBeenCalledWith({
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
    expect(getStoredIdentity()).toEqual({
      id: '1234-ABCD',
      handle: 'Alice',
      passcode: 'plate-music',
    });
  });

  it('upload row 2 (bad_passcode) → maps to inline copy, no persist', async () => {
    const user = userEvent.setup();
    const onEstablished = vi.fn();
    const uploadIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, { code: 'bad_passcode', detail: 'incorrect passcode' }),
      );

    render(
      <IdentitySetupPanel
        onIdentityEstablished={onEstablished}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('1234-ABCD,Alice,wrong-passcode\n');
    await user.upload(screen.getByLabelText('Identity file'), file);

    expect(
      await screen.findByText(/passcode does not match/i),
    ).toBeInTheDocument();
    expect(onEstablished).not.toHaveBeenCalled();
    expect(getStoredIdentity()).toBeNull();
  });

  it('upload row 6 (handle_taken) → maps to inline copy', async () => {
    const user = userEvent.setup();
    const uploadIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, { code: 'handle_taken', detail: 'handle in use' }),
      );

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('WXYZ-1234,Alice,plate-music\n');
    await user.upload(screen.getByLabelText('Identity file'), file);

    expect(
      await screen.findByText(/different identity already owns/i),
    ).toBeInTheDocument();
  });

  it('upload row 5 (id_mismatch) → maps to inline copy', async () => {
    const user = userEvent.setup();
    const uploadIdentityFn = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, { code: 'id_mismatch', detail: 'mismatch' }),
      );

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('1234-ABCD,Alice,plate-music\n');
    await user.upload(screen.getByLabelText('Identity file'), file);

    expect(
      await screen.findByText(/do not refer to the same identity/i),
    ).toBeInTheDocument();
  });

  it('client-side malformed CSV → no network call, inline error', async () => {
    const user = userEvent.setup();
    const uploadIdentityFn = vi.fn();

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('not,a,valid,csv\n'); // 4 columns
    await user.upload(screen.getByLabelText('Identity file'), file);

    expect(
      await screen.findByText(/one row of three fields/i),
    ).toBeInTheDocument();
    expect(uploadIdentityFn).not.toHaveBeenCalled();
  });

  it('upload network error (non-ApiError) → form-level network error', async () => {
    const user = userEvent.setup();
    const uploadIdentityFn = vi
      .fn()
      .mockRejectedValue(new Error('failed to fetch'));

    render(
      <IdentitySetupPanel
        onIdentityEstablished={vi.fn()}
        createIdentityFn={vi.fn()}
        uploadIdentityFn={uploadIdentityFn}
      />,
    );

    const file = makeCsvFile('1234-ABCD,Alice,plate-music\n');
    await user.upload(screen.getByLabelText('Identity file'), file);

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
