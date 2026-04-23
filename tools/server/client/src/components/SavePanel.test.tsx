/**
 * SavePanel + SaveList + SaveButton behaviour tests.
 *
 * Behavior Statements
 *   SaveButton — emits `{kind:'save'}` on click.
 *   SavePanel  — renders the Save button only for CE+; the Save list is
 *                visible to every tier; newest save first.
 *   SaveList   — empty-state copy when no saves; Restore button only
 *                rendered when the parent supplies `onRestore`.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavePanel from './SavePanel';
import SaveList from './SaveList';
import type { ClientMsg, Tier } from '../types/wire';

const SAVES = [
  { save_id: 's-1', name: 'zork t-3', created_at: '2026-04-23T17:00:00Z' },
  { save_id: 's-2', name: 'zork t-7', created_at: '2026-04-23T18:00:00Z' },
];

function renderPanel(
  selfTier: Tier | null,
  send: (m: ClientMsg) => void = vi.fn(),
): ReturnType<typeof render> {
  return render(
    <SavePanel
      open
      onClose={vi.fn()}
      saves={SAVES}
      selfTier={selfTier}
      send={send}
    />,
  );
}

describe('<SavePanel>', () => {
  it('CE+ sees the Save button', () => {
    renderPanel('command_entrant');
    expect(screen.getByRole('button', { name: /save game/i })).toBeInTheDocument();
  });

  it('Participant tier does NOT see the Save button, but sees the save list', () => {
    renderPanel('participant');
    expect(screen.queryByRole('button', { name: /save game/i })).toBeNull();
    const list = screen.getByRole('list', { name: /saves/i });
    expect(list).toBeInTheDocument();
  });

  it('Save button emits a save ClientMsg', async () => {
    const send = vi.fn<(m: ClientMsg) => void>();
    renderPanel('primary_host', send);
    await userEvent.click(screen.getByRole('button', { name: /save game/i }));
    expect(send).toHaveBeenCalledWith({ kind: 'save' });
  });

  it('save list is ordered newest first', () => {
    renderPanel('participant');
    const rows = screen.getAllByRole('listitem');
    // Newest (t-7 @ 18:00) first.
    expect(rows[0]?.textContent).toContain('zork t-7');
    expect(rows[1]?.textContent).toContain('zork t-3');
  });
});

describe('<SaveList>', () => {
  it('renders an empty-state when no saves exist', () => {
    render(<SaveList saves={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(/no saves yet/i);
  });

  it('omits Restore buttons when onRestore is not supplied', () => {
    render(<SaveList saves={SAVES} />);
    expect(screen.queryByRole('button', { name: /restore save/i })).toBeNull();
  });

  it('renders a Restore button per row when onRestore is supplied', async () => {
    const onRestore = vi.fn();
    render(<SaveList saves={SAVES} onRestore={onRestore} />);
    const buttons = screen.getAllByRole('button', { name: /restore save/i });
    expect(buttons).toHaveLength(2);
    await userEvent.click(buttons[0]!);
    // Newest first — s-2 is at index 0.
    expect(onRestore).toHaveBeenCalledWith('s-2');
  });
});
