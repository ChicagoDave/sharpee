/**
 * ChannelRendererHost — renders the engine's `TurnPacket` stream into
 * the room's main pane.
 *
 * Public interface: {@link mountChannelRendererHost}.
 * Owner: web client.
 *
 * Phase-7 default: a simple text renderer that joins `main` channel
 * blocks. The real `@sharpee/platform-browser` Renderer with cmgt
 * dispatch will land when ADR-165's renderer registry stabilizes —
 * for now the host is intentionally bare so authors can swap in
 * custom logic per `feedback_web_client_author_customizable`.
 */

import type { RoomStateStore, RoomStateSnapshot, TurnLine } from '../store/room-state.js';

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

  let lastTurnCount = 0;

  function renderTurn(turn: TurnLine): HTMLElement {
    const block = document.createElement('div');
    block.className = 'sharpee-turn-block';
    if (turn.submitter) {
      const sub = document.createElement('span');
      sub.className = 'sharpee-turn-submitter';
      sub.textContent = `> ${turn.submitter.handle}`;
      block.appendChild(sub);
    }
    for (const [channelId, blocks] of Object.entries(turn.channels)) {
      const chan = document.createElement('div');
      chan.className = `sharpee-channel sharpee-channel-${channelId}`;
      const text = blocks
        .map((b) => {
          if (typeof b === 'string') return b;
          if (b && typeof b === 'object' && 'text' in b) return String((b as { text: unknown }).text);
          return JSON.stringify(b);
        })
        .join('\n');
      chan.textContent = text;
      block.appendChild(chan);
    }
    return block;
  }

  function render(snapshot: RoomStateSnapshot): void {
    if (snapshot.transcript.length < lastTurnCount) {
      // Transcript shorter than before — likely a restore. Re-render fully.
      root.replaceChildren();
      lastTurnCount = 0;
    }
    for (let i = lastTurnCount; i < snapshot.transcript.length; i += 1) {
      root.appendChild(renderTurn(snapshot.transcript[i]));
    }
    lastTurnCount = snapshot.transcript.length;
    if (root.lastElementChild) {
      root.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }

  render(store.snapshot());
  return store.subscribe(render);
}
