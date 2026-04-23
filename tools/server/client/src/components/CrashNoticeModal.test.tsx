/**
 * CrashNoticeModal behaviour tests.
 *
 * Behavior Statement — CrashNoticeModal
 *   DOES: renders the crash copy and, when `latestSave` is non-null, a
 *         primary "Restore from last save" button that calls
 *         `onRestoreLatest` on click; when `latestSave` is null, renders an
 *         explanatory empty-state and omits the Restore button entirely.
 *   WHEN: `state.sandboxCrashed === true`.
 *   BECAUSE: ADR-153 AC7 — the room must visibly recover from a sandbox
 *            crash without the server going down.
 *   REJECTS WHEN: N/A — presentational.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CrashNoticeModal from './CrashNoticeModal';

describe('<CrashNoticeModal>', () => {
  it('with a save: shows the save name and a working Restore button', async () => {
    const onRestoreLatest = vi.fn();
    render(
      <CrashNoticeModal
        latestSave={{
          save_id: 's-1',
          name: 'zork t-3',
          created_at: '2026-04-23T17:00:00Z',
        }}
        onRestoreLatest={onRestoreLatest}
      />,
    );
    expect(screen.getByText(/story process stopped/i)).toBeInTheDocument();
    expect(screen.getByText(/zork t-3/)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /restore from last save/i }),
    );
    expect(onRestoreLatest).toHaveBeenCalledTimes(1);
  });

  it('without a save: omits the Restore button and shows the empty-state copy', () => {
    render(<CrashNoticeModal latestSave={null} onRestoreLatest={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /restore from last save/i }),
    ).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/no saves are available/i);
  });
});
