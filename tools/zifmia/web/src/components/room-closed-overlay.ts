/**
 * RoomClosedOverlay — full-screen overlay shown when the WS closes
 * with a terminal code (4001/4003/4004/4005/4006/4007). Clears on
 * navigation back to the lobby.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';

const REASON_BY_CODE: Record<number, string> = {
  4001: 'Handle not recognized. Re-claim from the lobby.',
  4003: 'You are not a member of this room.',
  4004: 'This room is no longer available.',
  4005: 'Connection protocol error.',
  4006: 'Connection timed out before hello.',
  4007: 'Your identity was erased.'
};

export interface RoomClosedOverlayHandlers {
  onReturnToLobby: () => void;
}

export function mountRoomClosedOverlay(
  parent: HTMLElement,
  store: RoomStateStore,
  handlers: RoomClosedOverlayHandlers
): () => void {
  let overlay: HTMLElement | null = null;

  function show(close: { code: number; reason: string }): void {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'sharpee-room-closed-overlay';
    const reasonEl = document.createElement('div');
    reasonEl.className = 'sharpee-overlay-reason';
    reasonEl.textContent = REASON_BY_CODE[close.code] ?? `Connection closed (code ${close.code}).`;
    overlay.appendChild(reasonEl);

    const returnButton = document.createElement('button');
    returnButton.textContent = 'Return to lobby';
    returnButton.addEventListener('click', () => {
      hide();
      handlers.onReturnToLobby();
    });
    overlay.appendChild(returnButton);
    parent.appendChild(overlay);
  }

  function hide(): void {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
  }

  function render(snapshot: RoomStateSnapshot): void {
    if (snapshot.terminalClose) show(snapshot.terminalClose);
    else hide();
  }

  render(store.snapshot());
  const unsubscribe = store.subscribe(render);
  return () => {
    unsubscribe();
    hide();
  };
}
