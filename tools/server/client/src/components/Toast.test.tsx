/**
 * Toast behaviour tests.
 *
 * Behavior Statement — Toast
 *   DOES: renders each entry as a list item inside a labelled
 *         notifications list; invokes onDismiss(id) after `ttlMs` (default
 *         5000) ms; invokes onDismiss(id) when the × button is clicked;
 *         cancels the timer for an entry that's been removed from the
 *         input list (e.g., already dismissed by another path).
 *   WHEN: the room view maintains a toast stack.
 *   BECAUSE: ADR-153 Decision 6 auto-promotion announcement UX.
 *   REJECTS WHEN: N/A — pure presentation + timer bookkeeping.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from './Toast';

describe('<Toast>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders entries and auto-dismisses after ttlMs', () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        entries={[
          { id: 'a', text: 'Alice is now the Primary Host.', ttlMs: 1000 },
        ]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText(/alice is now the primary host/i)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDismiss).toHaveBeenCalledWith('a');
  });

  it('× button dismisses the toast', async () => {
    // Use real timers for this test — userEvent + fake timers needs extra
    // plumbing and we don't care about the ttl here.
    vi.useRealTimers();
    const onDismiss = vi.fn();
    render(
      <Toast
        entries={[{ id: 'a', text: 'Hi', ttlMs: 10_000 }]}
        onDismiss={onDismiss}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /dismiss notification/i }),
    );
    expect(onDismiss).toHaveBeenCalledWith('a');
  });

  it('cancels the timer when an entry is removed from the input list', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <Toast
        entries={[{ id: 'a', text: 'Hi', ttlMs: 1000 }]}
        onDismiss={onDismiss}
      />,
    );
    // Remove the entry via rerender.
    rerender(<Toast entries={[]} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Would have fired if the timer weren't cancelled.
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
