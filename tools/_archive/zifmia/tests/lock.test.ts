/**
 * Unit tests for the RoomLock state machine — exercised with a
 * deterministic manual scheduler so the heartbeat / expiry semantics
 * can be asserted without real-time waits.
 */

import { describe, it, expect } from 'vitest';
import { createRoomLock, type LockTimerHandle } from '../src/ws/lock.js';

interface ManualScheduler {
  scheduleExpiry: (ms: number, cb: () => void) => LockTimerHandle;
  fire(): void;
  pending(): number;
}

function manualScheduler(): ManualScheduler {
  const queue: Array<() => void> = [];
  return {
    scheduleExpiry: (_ms, cb) => {
      queue.push(cb);
      return {
        cancel: () => {
          const idx = queue.lastIndexOf(cb);
          if (idx >= 0) queue.splice(idx, 1);
        }
      };
    },
    fire: () => {
      const cb = queue.shift();
      if (cb) cb();
    },
    pending: () => queue.length
  };
}

describe('RoomLock — deterministic state machine', () => {
  it('acquires from null → ok:true, broadcast:true', () => {
    const sched = manualScheduler();
    const t = (() => {
      let n = 1000;
      return () => (n += 100);
    })();
    const lock = createRoomLock({ now: t, scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });

    const r = lock.acquire('alice');
    expect(r.ok).toBe(true);
    expect(r.ok && r.broadcast).toBe(true);
    expect(r.ok && r.state.holder).toBe('alice');
    expect(r.ok && r.state.expiresAt).not.toBeNull();
  });

  it('same-holder acquire heartbeats (ok:true, broadcast:false)', () => {
    const sched = manualScheduler();
    let t = 1000;
    const lock = createRoomLock({ now: () => t, scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    t = 1100;
    const r = lock.acquire('alice');
    expect(r.ok).toBe(true);
    expect(r.ok && r.broadcast).toBe(false);
    expect(r.ok && r.state.expiresAt).toBe(1500); // 1100 + 400
  });

  it('different-holder acquire is rejected (ok:false)', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    const r = lock.acquire('bob');
    expect(r.ok).toBe(false);
    expect(r.state.holder).toBe('alice');
  });

  it('release by holder clears state and broadcasts', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    const r = lock.release('alice');
    expect(r.ok).toBe(true);
    expect(r.broadcast).toBe(true);
    expect(r.state.holder).toBeNull();
  });

  it('release by non-holder is a no-op', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    const r = lock.release('bob');
    expect(r.ok).toBe(true);
    expect(r.broadcast).toBe(false);
    expect(r.state.holder).toBe('alice');
  });

  it('auto-expiry fires the onExpiry callback and clears state', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    const expired: Array<{ holder: string | null }> = [];
    lock.onExpiry((s) => expired.push({ holder: s.holder }));

    lock.acquire('alice');
    expect(sched.pending()).toBe(1);
    sched.fire();

    expect(expired).toEqual([{ holder: null }]);
    expect(lock.state().holder).toBeNull();
  });

  it('heartbeat reschedules: previous timer is cancelled', () => {
    const sched = manualScheduler();
    let t = 1000;
    const lock = createRoomLock({ now: () => t, scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    expect(sched.pending()).toBe(1);
    t = 1100;
    lock.acquire('alice'); // heartbeat
    expect(sched.pending()).toBe(1); // old one cancelled
  });

  it('forceRelease clears the lock regardless of holder', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    lock.acquire('alice');
    const r = lock.forceRelease();
    expect(r.broadcast).toBe(true);
    expect(lock.state().holder).toBeNull();
  });

  it('forceRelease on empty lock is a no-op', () => {
    const sched = manualScheduler();
    const lock = createRoomLock({ scheduleExpiry: sched.scheduleExpiry, expiryMs: 400 });
    const r = lock.forceRelease();
    expect(r.broadcast).toBe(false);
  });
});
