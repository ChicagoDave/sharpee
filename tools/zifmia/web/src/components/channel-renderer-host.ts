/**
 * ChannelRendererHost — renders the engine's `TurnPacket` stream into
 * the room's main pane.
 *
 * Public interface: {@link mountChannelRendererHost}.
 * Owner: web client.
 *
 * Uses `@sharpee/platform-browser/channels/main` so the same canonical
 * decoration → DOM rendering that drives the single-player browser
 * client also drives the multi-user surface (ADR-163 + ADR-165). The
 * multi-user layer adds a per-turn submitter label between turn blocks
 * so authors and players can attribute commands.
 *
 * Sidebar channels (`location`, `score`, `turn`, etc.) are not handled
 * here — they belong to {@link mountRoomStatusBar} in the room header.
 */

import type { RoomStateStore, RoomStateSnapshot, TurnLine } from '../store/room-state.js';
import { createMainChannelRenderer } from '@sharpee/platform-browser/channels/main';
import type { ChannelRenderer } from '@sharpee/channel-service';

export interface ChannelRendererHostHandlers {
  onScrollAnchor?: () => void;
}

export function mountChannelRendererHost(
  parent: HTMLElement,
  store: RoomStateStore,
  _handlers: ChannelRendererHostHandlers = {}
): () => void {
  const root = document.createElement('div');
  root.className = 'sharpee-channel-renderer-host';
  parent.appendChild(root);

  const mainRenderer: ChannelRenderer = createMainChannelRenderer(root, {
    onAfterAppend: (slot) => {
      slot.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  });

  let lastTurnCount = 0;

  function formatStamp(ts: number): string {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12 || 12;
    const tz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
        .formatToParts(d)
        .find((p) => p.type === 'timeZoneName')?.value ?? '';
    return `${yyyy}-${mm}-${dd} ${hours}:${minutes}${ampm}${tz ? ' ' + tz : ''}`;
  }

  function appendTurn(turn: TurnLine): void {
    if (turn.submitter || turn.text) {
      const header = document.createElement('p');
      header.className = 'sharpee-turn-submitter';

      if (turn.text) {
        const echo = document.createElement('span');
        echo.className = 'sharpee-turn-command';
        echo.textContent = `> ${turn.text.toUpperCase()}`;
        header.appendChild(echo);
      }

      if (turn.submitter || typeof turn.ts === 'number') {
        const meta = document.createElement('span');
        meta.className = 'sharpee-turn-meta';
        const parts: string[] = ['—'];
        if (turn.submitter) parts.push(turn.submitter.handle);
        if (typeof turn.ts === 'number') parts.push(formatStamp(turn.ts));
        meta.textContent = parts.join(' ');
        header.appendChild(meta);
      }
      root.appendChild(header);
    }
    const mainBlocks = turn.channels.main;
    if (Array.isArray(mainBlocks) && mainBlocks.length > 0) {
      mainRenderer.onValue?.(mainBlocks);
    }
  }

  function render(snapshot: RoomStateSnapshot): void {
    if (snapshot.transcript.length < lastTurnCount) {
      mainRenderer.onClear?.('main');
      lastTurnCount = 0;
    }
    for (let i = lastTurnCount; i < snapshot.transcript.length; i += 1) {
      appendTurn(snapshot.transcript[i]);
    }
    lastTurnCount = snapshot.transcript.length;
  }

  render(store.snapshot());
  return store.subscribe(render);
}
