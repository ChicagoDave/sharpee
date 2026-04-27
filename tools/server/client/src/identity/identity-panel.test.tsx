/**
 * IdentityPanel behavior tests (ADR-161 Phase E).
 *
 * Behavior Statement — IdentityPanel
 *   DOES:
 *     - Renders the user's Handle as visible text.
 *     - Does NOT render the Id or passcode anywhere in the DOM (defends
 *       against casual screenshot leak).
 *     - On Download click, invokes the download trigger with filename
 *       `sharpee-identity.csv` and a CSV payload that round-trips
 *       through `parseIdentityCsv` back to the original triple.
 *     - The default download trigger (no override supplied) builds a
 *       Blob and clicks a hidden anchor with `download="sharpee-identity.csv"`.
 *     - Erase button is initially closed; clicking it opens
 *       EraseIdentityModal mounted with the same identity prop.
 *     - Cancel/close on the modal returns the panel to the closed state
 *       without calling the server.
 *   WHEN: rendered with a non-null StoredIdentity prop. Parent gates
 *         rendering so this component never sees a null identity.
 *   BECAUSE: ADR-161 Phase E — users self-serve portability via download;
 *            Handle is the only public-facing field, while Id/passcode
 *            travel via the downloaded file rather than the DOM.
 *            The Erase button is the entry point to the destructive
 *            confirmation flow that lives in EraseIdentityModal.
 *   REJECTS WHEN: panel itself does not reject — modal handles all
 *                 destructive-action gating and server error mapping.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IdentityPanel from './identity-panel';
import { parseIdentityCsv } from './csv';
import type { StoredIdentity } from './identity-store';

const FIXTURE: StoredIdentity = {
  id: '1234-ABCD',
  handle: 'Alice',
  passcode: 'plate-music',
};

describe('IdentityPanel — Handle display', () => {
  it('renders the user Handle as visible text', () => {
    render(<IdentityPanel identity={FIXTURE} downloadFn={vi.fn()} />);

    const handleEl = screen.getByTestId('identity-handle');
    expect(handleEl).toHaveTextContent('Alice');
  });

  it('does not render the Id anywhere in the DOM', () => {
    const { container } = render(
      <IdentityPanel identity={FIXTURE} downloadFn={vi.fn()} />,
    );

    // textContent covers visible text; innerHTML covers attributes too
    // (e.g. accidentally placing it in `data-*` or `value`).
    expect(container.textContent ?? '').not.toContain(FIXTURE.id);
    expect(container.innerHTML).not.toContain(FIXTURE.id);
  });

  it('does not render the passcode anywhere in the DOM', () => {
    const { container } = render(
      <IdentityPanel identity={FIXTURE} downloadFn={vi.fn()} />,
    );

    expect(container.textContent ?? '').not.toContain(FIXTURE.passcode);
    expect(container.innerHTML).not.toContain(FIXTURE.passcode);
  });
});

describe('IdentityPanel — Download', () => {
  it('clicking Download invokes the download trigger with the canonical filename', async () => {
    const user = userEvent.setup();
    const downloadFn = vi.fn();

    render(<IdentityPanel identity={FIXTURE} downloadFn={downloadFn} />);
    await user.click(screen.getByRole('button', { name: /download identity/i }));

    expect(downloadFn).toHaveBeenCalledTimes(1);
    const [filename] = downloadFn.mock.calls[0] as [string, string];
    expect(filename).toBe('sharpee-identity.csv');
  });

  it('download payload round-trips through parseIdentityCsv to the original triple', async () => {
    const user = userEvent.setup();
    const downloadFn = vi.fn();

    render(<IdentityPanel identity={FIXTURE} downloadFn={downloadFn} />);
    await user.click(screen.getByRole('button', { name: /download identity/i }));

    const [, content] = downloadFn.mock.calls[0] as [string, string];
    const parsed = parseIdentityCsv(content);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed).toMatchObject({
        id: FIXTURE.id,
        handle: FIXTURE.handle,
        passcode: FIXTURE.passcode,
      });
    }
  });
});

describe('IdentityPanel — Erase entry point', () => {
  it('does not render the EraseIdentityModal until the Erase button is clicked', () => {
    render(<IdentityPanel identity={FIXTURE} downloadFn={vi.fn()} />);

    expect(screen.queryByRole('dialog', { name: /erase identity/i })).toBeNull();
  });

  it('clicking Erase opens the EraseIdentityModal', async () => {
    const user = userEvent.setup();
    render(<IdentityPanel identity={FIXTURE} downloadFn={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /erase identity/i }));

    expect(
      screen.getByRole('dialog', { name: /erase identity/i }),
    ).toBeInTheDocument();
  });

  it('Cancel inside the modal closes it without invoking the erase server call', async () => {
    const user = userEvent.setup();
    const eraseIdentityFn = vi.fn();
    render(
      <IdentityPanel
        identity={FIXTURE}
        downloadFn={vi.fn()}
        eraseIdentityFn={eraseIdentityFn}
      />,
    );

    await user.click(screen.getByRole('button', { name: /erase identity/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog', { name: /erase identity/i })).toBeNull();
    expect(eraseIdentityFn).not.toHaveBeenCalled();
  });
});

describe('IdentityPanel — default browser download trigger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Blob URL and clicks a hidden anchor with the canonical filename', async () => {
    const createObjectURL = vi.fn(() => 'blob:test-url');
    const revokeObjectURL = vi.fn();
    // happy-dom may or may not stub these; assign as plain functions so
    // vi.spyOn finds a property to replace and we control the result.
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    // Capture the dynamically-created anchor before its click fires.
    const realCreateElement = document.createElement.bind(document);
    let anchor: HTMLAnchorElement | null = null;
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string, opts?: ElementCreationOptions) => {
        const el = realCreateElement(tag, opts) as HTMLElement;
        if (tag.toLowerCase() === 'a') {
          anchor = el as HTMLAnchorElement;
          // Suppress the actual navigation jsdom would attempt.
          el.click = vi.fn();
        }
        return el;
      });

    const user = userEvent.setup();
    render(<IdentityPanel identity={FIXTURE} />);
    await user.click(screen.getByRole('button', { name: /download identity/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute('download')).toBe('sharpee-identity.csv');
    expect(anchor!.getAttribute('href')).toBe('blob:test-url');
    expect(anchor!.click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');

    createElementSpy.mockRestore();
  });
});
