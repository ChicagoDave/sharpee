/**
 * DmPanel — PH/Co-Host-only DM thread per AC-13. Visible only when
 * own tier ∈ {primary_host, co_host}; the server filters broadcasts
 * to the same set, so non-hosts never see DM frames.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';
import type { HttpClient } from '../http-client.js';
import type { StoredIdentity } from '../identity-store.js';

export interface DmPanelDeps {
  store: RoomStateStore;
  http: HttpClient;
  identity: StoredIdentity;
  roomId: string;
}

export function mountDmPanel(parent: HTMLElement, deps: DmPanelDeps): () => void {
  const panel = document.createElement('div');
  panel.className = 'sharpee-panel sharpee-dm-panel';
  panel.innerHTML = `
    <h2>Host sidebar</h2>
    <div class="sharpee-chat-log"></div>
    <form class="sharpee-chat-form">
      <input type="text" maxlength="1000" placeholder="DM to PH and Co-Hosts..." />
      <button type="submit">Send DM</button>
    </form>
  `;
  parent.appendChild(panel);

  const log = panel.querySelector<HTMLDivElement>('.sharpee-chat-log')!;
  const form = panel.querySelector<HTMLFormElement>('.sharpee-chat-form')!;
  const input = form.querySelector<HTMLInputElement>('input')!;
  let lastCount = 0;

  function visible(snapshot: RoomStateSnapshot): boolean {
    return snapshot.ownTier === 'primary_host' || snapshot.ownTier === 'co_host';
  }

  function render(snapshot: RoomStateSnapshot): void {
    panel.style.display = visible(snapshot) ? '' : 'none';
    if (!visible(snapshot)) return;

    if (snapshot.dms.length < lastCount) {
      log.replaceChildren();
      lastCount = 0;
    }
    for (let i = lastCount; i < snapshot.dms.length; i += 1) {
      const line = snapshot.dms[i];
      const div = document.createElement('div');
      div.className = 'sharpee-dm-message';
      const from = document.createElement('span');
      from.className = 'sharpee-dm-from';
      from.textContent = `${line.fromHandle}:`;
      const text = document.createElement('span');
      text.textContent = ` ${line.text}`;
      div.append(from, text);
      log.appendChild(div);
    }
    lastCount = snapshot.dms.length;
    log.scrollTop = log.scrollHeight;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    try {
      await deps.http.sendDm(deps.roomId, deps.identity.handle, text);
      input.value = '';
    } catch {
      // Surfaces as a server-side error; the UI keeps the input intact.
    }
  });

  render(deps.store.snapshot());
  return deps.store.subscribe(render);
}
