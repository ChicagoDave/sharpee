/**
 * RestoreConfirmDialog behaviour tests.
 *
 * Behavior Statement — RestoreConfirmDialog
 *   DOES: renders the save name in the confirmation body; Restore button
 *         invokes onConfirm; Cancel button invokes onCancel.
 *   WHEN: the user clicks Restore on a save row.
 *   BECAUSE: ADR-153 Decision 2 — a restore rolls back the whole room.
 *   REJECTS WHEN: N/A — purely presentational.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RestoreConfirmDialog from './RestoreConfirmDialog';

describe('<RestoreConfirmDialog>', () => {
  it('renders the save name in the body', () => {
    render(
      <RestoreConfirmDialog
        saveName="zork turn 12"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText(/zork turn 12/)).toBeInTheDocument();
  });

  it('Restore dispatches onConfirm', async () => {
    const onConfirm = vi.fn();
    render(
      <RestoreConfirmDialog
        saveName="zork"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /confirm restore/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('Cancel dispatches onCancel', async () => {
    const onCancel = vi.fn();
    render(
      <RestoreConfirmDialog
        saveName="zork"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
