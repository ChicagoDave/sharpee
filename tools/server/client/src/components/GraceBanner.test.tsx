/**
 * GraceBanner behaviour tests.
 *
 * Behavior Statement — GraceBanner
 *   DOES: renders a banner with the successor's display name and the
 *         remaining time (mm:ss) until `deadline`; when now ≥ deadline,
 *         renders "Succession in progress…"; re-ticks once per second.
 *   WHEN: state.phGraceDeadline is non-null and the room view is rendered.
 *   BECAUSE: ADR-153 Decision 6.
 *   REJECTS WHEN: N/A — RoomView conditionally renders this.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import GraceBanner from './GraceBanner';
import type { ParticipantSummary } from '../types/wire';

const PARTS: ParticipantSummary[] = [
  {
    participant_id: 'p-host',
    display_name: 'Alice',
    tier: 'primary_host',
    connected: false,
    muted: false,
  },
  {
    participant_id: 'p-ch',
    display_name: 'Bob',
    tier: 'co_host',
    connected: true,
    muted: false,
  },
];

describe('<GraceBanner>', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders successor name and remaining countdown', () => {
    const now = 1_000_000;
    const deadline = new Date(now + 4 * 60 * 1000 + 30 * 1000).toISOString(); // 4:30 ahead
    render(
      <GraceBanner
        deadline={deadline}
        participants={PARTS}
        designatedSuccessorId="p-ch"
        nowFn={() => now}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/bob will be promoted in 4:30/i);
  });

  it('falls back to "a Co-Host" when no successor name is known', () => {
    const now = 1_000_000;
    const deadline = new Date(now + 60_000).toISOString();
    render(
      <GraceBanner
        deadline={deadline}
        participants={PARTS}
        designatedSuccessorId={null}
        nowFn={() => now}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/a co-host will be promoted in 1:00/i);
  });

  it('ticks the countdown down as time passes', () => {
    let now = 1_000_000;
    const deadline = new Date(now + 3 * 1000).toISOString(); // 0:03
    render(
      <GraceBanner
        deadline={deadline}
        participants={PARTS}
        designatedSuccessorId="p-ch"
        nowFn={() => now}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/0:03/);
    act(() => {
      now = now + 2000;
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('status')).toHaveTextContent(/0:01/);
  });

  it('once past the deadline, shows "Succession in progress"', () => {
    const now = 1_000_000;
    const deadline = new Date(now - 1000).toISOString(); // past
    render(
      <GraceBanner
        deadline={deadline}
        participants={PARTS}
        designatedSuccessorId="p-ch"
        nowFn={() => now}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(/succession in progress/i);
  });
});
