/**
 * RoomStatusBar — three-slot status line (location / score / turn) at
 * the top of the room view.
 *
 * Public interface: {@link mountRoomStatusBar}.
 * Owner: web client.
 *
 * Wires the engine's `location`, `score`, and `turn` channels into
 * dedicated DOM slots via the canonical renderers from
 * `@sharpee/platform-browser/channels/status`. Per ADR-165 §8, these
 * channels are "replace, latest-wins" — every turn's value overwrites
 * the slot's previous content. The host watches the store's transcript
 * and forwards each turn's per-channel values to the renderers.
 */

import type { RoomStateStore, RoomStateSnapshot, TurnLine } from '../store/room-state.js';
import {
  createLocationChannelRenderer,
  createScoreChannelRenderer,
  createTurnChannelRenderer
} from '@sharpee/platform-browser/channels/status';
import type { ChannelRenderer } from '@sharpee/channel-service';

export function mountRoomStatusBar(parent: HTMLElement, store: RoomStateStore): () => void {
  const bar = document.createElement('div');
  bar.className = 'sharpee-status-bar';

  const locationEl = document.createElement('span');
  locationEl.className = 'sharpee-status-location';
  const scoreEl = document.createElement('span');
  scoreEl.className = 'sharpee-status-score';
  const turnEl = document.createElement('span');
  turnEl.className = 'sharpee-status-turn';

  bar.append(locationEl, scoreEl, turnEl);
  parent.appendChild(bar);

  const locationR: ChannelRenderer = createLocationChannelRenderer(locationEl);
  const scoreR: ChannelRenderer = createScoreChannelRenderer(scoreEl);
  const turnR: ChannelRenderer = createTurnChannelRenderer(turnEl);

  let lastTurnCount = 0;

  function applyTurn(turn: TurnLine): void {
    const loc = turn.channels.location;
    if (Array.isArray(loc) && loc.length > 0) locationR.onValue?.(loc[0]);
    const score = turn.channels.score;
    if (Array.isArray(score) && score.length > 0) scoreR.onValue?.(score[0]);
    const turnVal = turn.channels.turn;
    if (Array.isArray(turnVal) && turnVal.length > 0) {
      const v = turnVal[0];
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) turnR.onValue?.(n);
    }
  }

  function render(snapshot: RoomStateSnapshot): void {
    if (snapshot.transcript.length < lastTurnCount) {
      lastTurnCount = 0;
      locationEl.textContent = '';
      scoreEl.textContent = '';
      turnEl.textContent = '';
    }
    for (let i = lastTurnCount; i < snapshot.transcript.length; i += 1) {
      applyTurn(snapshot.transcript[i]);
    }
    lastTurnCount = snapshot.transcript.length;
  }

  render(store.snapshot());
  return store.subscribe(render);
}
