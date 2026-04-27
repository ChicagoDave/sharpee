/**
 * IdentityPickerButton behavior tests (ADR-161 Phase E3).
 *
 * Behavior Statement — IdentityPickerButton
 *   DOES:
 *     - Renders a header trigger button labelled with the user's Handle.
 *     - The popover is closed by default; clicking the trigger opens it
 *       and renders the IdentityPanel inside.
 *     - Esc closes the popover without affecting any open EraseIdentityModal.
 *     - Click outside the trigger + popover closes the popover.
 *     - Forwards `downloadFn` and `eraseIdentityFn` test overrides into
 *       the IdentityPanel inside the popover so consumers can stub the
 *       browser-blob pipeline and the server call.
 *   WHEN: rendered with a non-null StoredIdentity. App-level gating
 *         keeps it out of the tree when identity is null.
 *   BECAUSE: ADR-161 Phase E — identity management is accessed from the
 *           same header chrome as the theme picker, mirroring that
 *           pattern so the two controls feel symmetric. The popover
 *           avoids stacking two Modal layers when the EraseIdentityModal
 *           opens.
 *   REJECTS WHEN: N/A — purely a UI affordance with no server calls
 *                 of its own.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentityPickerButton from './identity-picker-button';
import { storeIdentity, type StoredIdentity } from './identity-store';

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

describe('IdentityPickerButton — trigger button', () => {
  it('renders a button labelled with the user Handle', () => {
    render(<IdentityPickerButton identity={FIXTURE} />);

    const trigger = screen.getByRole('button', {
      name: /identity: alice/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  it('starts with the popover closed', () => {
    render(<IdentityPickerButton identity={FIXTURE} />);

    expect(
      screen.queryByRole('dialog', { name: /identity management/i }),
    ).toBeNull();
  });

  it('clicking the trigger opens the popover containing IdentityPanel content', async () => {
    const user = userEvent.setup();
    render(<IdentityPickerButton identity={FIXTURE} />);

    await user.click(screen.getByRole('button', { name: /identity: alice/i }));

    expect(
      screen.getByRole('dialog', { name: /identity management/i }),
    ).toBeInTheDocument();
    // IdentityPanel renders the Handle inside the popover via testid.
    expect(screen.getByTestId('identity-handle')).toHaveTextContent('Alice');
    // Download + Erase buttons are reachable.
    expect(
      screen.getByRole('button', { name: /download identity/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /erase identity/i }),
    ).toBeInTheDocument();
  });

  it('clicking the trigger again closes the popover (toggle)', async () => {
    const user = userEvent.setup();
    render(<IdentityPickerButton identity={FIXTURE} />);

    const trigger = screen.getByRole('button', { name: /identity: alice/i });
    await user.click(trigger);
    expect(
      screen.getByRole('dialog', { name: /identity management/i }),
    ).toBeInTheDocument();

    await user.click(trigger);
    expect(
      screen.queryByRole('dialog', { name: /identity management/i }),
    ).toBeNull();
  });
});

describe('IdentityPickerButton — popover dismissal', () => {
  it('Esc closes the popover', async () => {
    const user = userEvent.setup();
    render(<IdentityPickerButton identity={FIXTURE} />);

    await user.click(screen.getByRole('button', { name: /identity: alice/i }));
    expect(
      screen.getByRole('dialog', { name: /identity management/i }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: /identity management/i }),
    ).toBeNull();
  });

  it('mousedown outside the picker closes the popover', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <IdentityPickerButton identity={FIXTURE} />
        <button data-testid="outside">outside</button>
      </div>,
    );

    await user.click(screen.getByRole('button', { name: /identity: alice/i }));
    expect(
      screen.getByRole('dialog', { name: /identity management/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));

    expect(
      screen.queryByRole('dialog', { name: /identity management/i }),
    ).toBeNull();
  });
});

describe('IdentityPickerButton — test overrides forward to IdentityPanel', () => {
  it('downloadFn flows through to the panel inside the popover', async () => {
    const user = userEvent.setup();
    const downloadFn = vi.fn();

    render(
      <IdentityPickerButton identity={FIXTURE} downloadFn={downloadFn} />,
    );

    await user.click(screen.getByRole('button', { name: /identity: alice/i }));
    await user.click(screen.getByRole('button', { name: /download identity/i }));

    expect(downloadFn).toHaveBeenCalledTimes(1);
    expect(downloadFn.mock.calls[0]?.[0]).toBe('sharpee-identity.csv');
  });
});
