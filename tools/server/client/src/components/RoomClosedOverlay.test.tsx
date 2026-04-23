/**
 * RoomClosedOverlay behaviour tests.
 *
 * Behavior Statement — RoomClosedOverlay
 *   DOES: renders the reason-specific copy (or the server-supplied
 *         message); ticks the countdown down once per second and calls
 *         `onRedirect` when it hits 0; calls `onRedirect` immediately when
 *         the "Leave now" button is clicked.
 *   WHEN: `state.closed !== null` on the room view.
 *   BECAUSE: ADR-153 AC4 / AC6 — participants need a clear exit when the
 *            room is gone.
 *   REJECTS WHEN: N/A — presentational.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomClosedOverlay from './RoomClosedOverlay';

describe('<RoomClosedOverlay>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the canned copy for reason=deleted when no message is supplied', () => {
    render(<RoomClosedOverlay reason="deleted" onRedirect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /room closed/i })).toBeInTheDocument();
    expect(
      screen.getByText(/this room has been closed by the host/i),
    ).toBeInTheDocument();
  });

  it('renders the canned copy for reason=recycled', () => {
    render(<RoomClosedOverlay reason="recycled" onRedirect={vi.fn()} />);
    expect(
      screen.getByText(/recycled after a period of inactivity/i),
    ).toBeInTheDocument();
  });

  it('server message overrides the canned copy', () => {
    render(
      <RoomClosedOverlay
        reason="deleted"
        message="Custom farewell from the host."
        onRedirect={vi.fn()}
      />,
    );
    expect(screen.getByText('Custom farewell from the host.')).toBeInTheDocument();
    expect(
      screen.queryByText(/this room has been closed by the host/i),
    ).toBeNull();
  });

  it('ticks the countdown down and calls onRedirect when it hits zero', () => {
    const onRedirect = vi.fn();
    render(
      <RoomClosedOverlay
        reason="deleted"
        onRedirect={onRedirect}
        countdownSeconds={3}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/in 3 seconds/);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/in 2 seconds/);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/in 1 second/);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onRedirect).toHaveBeenCalledTimes(1);
  });

  it('"Leave now" button fires onRedirect immediately', async () => {
    vi.useRealTimers(); // userEvent + fake timers is fiddly; this test doesn't need the countdown.
    const onRedirect = vi.fn();
    render(
      <RoomClosedOverlay
        reason="deleted"
        onRedirect={onRedirect}
        countdownSeconds={10}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /leave now/i }));
    expect(onRedirect).toHaveBeenCalled();
  });
});
