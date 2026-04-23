/**
 * SettingsPin behaviour tests.
 *
 * Behavior Statement — SettingsPin
 *   DOES: renders a button that dispatches `{kind:'unpin'}` when the room
 *         is currently pinned and `{kind:'pin'}` when currently unpinned;
 *         reflects the pinned state via aria-pressed.
 *   WHEN: rendered inside the PH settings panel.
 *   BECAUSE: ADR-153 Decision 12.
 *   REJECTS WHEN: N/A — component is only rendered for the PH.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPin from './SettingsPin';
import type { ClientMsg } from '../types/wire';

describe('<SettingsPin>', () => {
  it('unpinned: button label "Pin room"; click dispatches kind=pin', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<SettingsPin pinned={false} send={send} />);
    const btn = screen.getByRole('button', { name: /pin room/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(btn);
    expect(send).toHaveBeenCalledWith({ kind: 'pin' });
  });

  it('pinned: button label "Unpin room"; click dispatches kind=unpin', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<SettingsPin pinned={true} send={send} />);
    const btn = screen.getByRole('button', { name: /unpin room/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(btn);
    expect(send).toHaveBeenCalledWith({ kind: 'unpin' });
  });
});
