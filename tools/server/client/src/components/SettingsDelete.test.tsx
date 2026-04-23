/**
 * SettingsDelete behaviour tests.
 *
 * Behavior Statement — SettingsDelete
 *   DOES: emits `{kind:'delete_room', confirm_title}` on click, using the
 *         *current room title* from props (not the raw typed text) as
 *         `confirm_title`. Delete button is disabled until the typed input
 *         exactly matches the current title.
 *   WHEN: PH opens the settings panel and reaches the Danger Zone.
 *   BECAUSE: ADR-153 Decision 12 — type-to-confirm delete.
 *   REJECTS WHEN: the typed text doesn't match → button disabled, no dispatch.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsDelete from './SettingsDelete';
import type { ClientMsg } from '../types/wire';

describe('<SettingsDelete>', () => {
  it('Delete button is disabled until the typed title matches exactly', async () => {
    render(<SettingsDelete currentTitle="Alpha Session" send={vi.fn()} />);
    const btn = screen.getByRole('button', { name: /delete room/i });
    expect(btn).toBeDisabled();
    const input = screen.getByLabelText(/type the room title/i);
    await userEvent.type(input, 'alpha session'); // wrong case
    expect(btn).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'Alpha Session');
    expect(btn).toBeEnabled();
  });

  it('clicking Delete while enabled dispatches delete_room with the current title', async () => {
    const send = vi.fn<(msg: ClientMsg) => void>();
    render(<SettingsDelete currentTitle="Alpha Session" send={send} />);
    const input = screen.getByLabelText(/type the room title/i);
    await userEvent.type(input, 'Alpha Session');
    await userEvent.click(screen.getByRole('button', { name: /delete room/i }));
    expect(send).toHaveBeenCalledWith({
      kind: 'delete_room',
      confirm_title: 'Alpha Session',
    });
  });

  it('input field signals invalid via aria-invalid while mismatched', async () => {
    render(<SettingsDelete currentTitle="Alpha" send={vi.fn()} />);
    const input = screen.getByLabelText(/type the room title/i);
    await userEvent.type(input, 'Beta');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    await userEvent.clear(input);
    await userEvent.type(input, 'Alpha');
    // Once matched the invalid flag is cleared.
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });
});
