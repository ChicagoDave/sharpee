/**
 * GraceBanner — shows the PH-disconnect grace countdown when present.
 * Hidden when no grace is pending.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';

export function mountGraceBanner(parent: HTMLElement, store: RoomStateStore): () => void {
  const banner = document.createElement('div');
  banner.className = 'sharpee-grace-banner';
  banner.style.display = 'none';
  parent.prepend(banner);

  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  function tick(deadline: number | null): void {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (deadline === null) return;
    const render = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      banner.textContent = `Primary host disconnected — succession in ${remaining}s`;
      if (remaining === 0 && countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    };
    render();
    countdownTimer = setInterval(render, 500);
  }

  function render(snapshot: RoomStateSnapshot): void {
    if (snapshot.gracePending) {
      banner.style.display = '';
      tick(snapshot.graceDeadline);
    } else {
      banner.style.display = 'none';
      tick(null);
    }
  }

  render(store.snapshot());
  const unsubscribe = store.subscribe(render);
  return () => {
    if (countdownTimer) clearInterval(countdownTimer);
    unsubscribe();
  };
}
