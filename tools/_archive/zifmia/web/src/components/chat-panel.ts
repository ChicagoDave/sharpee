/**
 * ChatPanel — public chat between all participants in a room.
 * Muted senders' messages are dropped server-side (AC-12); the panel
 * disables the send affordance locally when own participant is muted.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';
import type { WsClient } from '../ws-client.js';

export interface ChatPanelDeps {
  store: RoomStateStore;
  ws: WsClient;
  roomId: string;
}

export function mountChatPanel(parent: HTMLElement, deps: ChatPanelDeps): () => void {
  const panel = document.createElement('div');
  panel.className = 'sharpee-panel sharpee-chat-panel';
  panel.innerHTML = `
    <h2>Chat</h2>
    <div class="sharpee-chat-log"></div>
    <form class="sharpee-chat-form">
      <input type="text" maxlength="500" placeholder="Say something..." />
      <button type="submit">Send</button>
    </form>
  `;
  parent.appendChild(panel);

  const log = panel.querySelector<HTMLDivElement>('.sharpee-chat-log')!;
  const form = panel.querySelector<HTMLFormElement>('.sharpee-chat-form')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  const sendButton = form.querySelector<HTMLButtonElement>('button')!;
  let lastCount = 0;

  function render(snapshot: RoomStateSnapshot): void {
    // Append-only render of new messages.
    if (snapshot.chat.length < lastCount) {
      log.replaceChildren();
      lastCount = 0;
    }
    for (let i = lastCount; i < snapshot.chat.length; i += 1) {
      const line = snapshot.chat[i];
      const div = document.createElement('div');
      div.className = 'sharpee-chat-message';
      const from = document.createElement('span');
      from.className = 'sharpee-chat-from';
      from.textContent = `${line.fromHandle}:`;
      const text = document.createElement('span');
      text.textContent = ` ${line.text}`;
      div.append(from, text);
      log.appendChild(div);
    }
    lastCount = snapshot.chat.length;
    log.scrollTop = log.scrollHeight;

    // Mute UI gating.
    const ownRow = snapshot.roster.find((r) => r.participant_id === snapshot.ownParticipantId);
    const muted = ownRow?.muted === true;
    input.disabled = muted;
    sendButton.disabled = muted;
    input.placeholder = muted ? 'You are muted.' : 'Say something...';
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    deps.ws.send({ type: 'chat:send', roomId: deps.roomId, text });
    input.value = '';
  });

  render(deps.store.snapshot());
  return deps.store.subscribe(render);
}
