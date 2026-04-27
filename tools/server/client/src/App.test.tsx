/**
 * App shell behavior tests — identity banner gate (ADR-161 R11).
 *
 * Behavior Statement — App
 *   DOES: when getStoredIdentity returns null, renders the
 *         IdentitySetupPanel above Landing; Landing remains visible.
 *         When an identity is stored, the panel is not rendered. The
 *         panel's onIdentityEstablished callback removes it from the
 *         tree without a page reload. Cross-tab erase (storage event)
 *         re-renders the panel.
 *   WHEN: the App renders or any tab mutates the canonical identity key.
 *   BECAUSE: ADR-161 R11 — the panel is a banner, not a page replacement.
 *            Unidentified users can browse rooms and stories; they only
 *            need an identity to act.
 *   REJECTS WHEN: cross-tab events for unrelated localStorage keys do not
 *                 trigger a re-render of the banner state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const STORAGE_KEY = 'sharpee:identity';

describe('App — identity banner gate', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Reset URL to / so router doesn't pull in a Room.
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the IdentitySetupPanel when no identity is stored — Landing is also rendered (banner, not replacement)', () => {
    render(<App />);
    // The panel exposes its accessible name as the section aria-label.
    expect(
      screen.getByRole('region', { name: /set up your sharpee identity/i }),
    ).toBeInTheDocument();
    // Landing's "Active rooms" or "Stories" heading shows below the banner.
    // The page is in a loading state until /api/stories + /api/rooms
    // resolve, which they don't here — but the loading status renders, so
    // we can prove Landing was rendered.
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render the panel when an identity is already stored', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    );
    render(<App />);
    expect(
      screen.queryByRole('region', { name: /set up your sharpee identity/i }),
    ).not.toBeInTheDocument();
  });

  it('cross-tab erase (storage event for our key) re-renders the panel', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    );
    render(<App />);
    expect(
      screen.queryByRole('region', { name: /set up your sharpee identity/i }),
    ).not.toBeInTheDocument();

    // Simulate another tab erasing.
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        oldValue: JSON.stringify({
          id: '1234-ABCD',
          handle: 'Alice',
          passcode: 'plate-music',
        }),
        newValue: null,
        storageArea: window.localStorage,
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: /set up your sharpee identity/i }),
      ).toBeInTheDocument(),
    );
  });

  it('storage events for unrelated keys do not toggle the banner', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    );
    render(<App />);
    expect(
      screen.queryByRole('region', { name: /set up your sharpee identity/i }),
    ).not.toBeInTheDocument();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'sharpee.token.room-A',
        oldValue: null,
        newValue: 'tok-A',
        storageArea: window.localStorage,
      }),
    );

    expect(
      screen.queryByRole('region', { name: /set up your sharpee identity/i }),
    ).not.toBeInTheDocument();
  });
});

describe('App — header IdentityPickerButton visibility (ADR-161 Phase E)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('does not render the IdentityPickerButton when no identity is stored', () => {
    render(<App />);
    expect(screen.queryByTestId('identity-picker')).not.toBeInTheDocument();
  });

  it('renders the IdentityPickerButton in the header when an identity is stored, labelled with the Handle', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    );
    render(<App />);
    const picker = screen.getByTestId('identity-picker');
    expect(picker).toBeInTheDocument();
    // Trigger label embeds the Handle.
    expect(picker.textContent).toContain('Alice');
  });

  it('cross-tab erase removes the IdentityPickerButton and shows the IdentitySetupPanel', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ id: '1234-ABCD', handle: 'Alice', passcode: 'plate-music' }),
    );
    render(<App />);
    expect(screen.getByTestId('identity-picker')).toBeInTheDocument();

    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        oldValue: JSON.stringify({
          id: '1234-ABCD',
          handle: 'Alice',
          passcode: 'plate-music',
        }),
        newValue: null,
        storageArea: window.localStorage,
      }),
    );

    await waitFor(() =>
      expect(screen.queryByTestId('identity-picker')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('region', { name: /set up your sharpee identity/i }),
    ).toBeInTheDocument();
  });
});
