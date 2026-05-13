/**
 * CommandInput + lock-on-typing per AC-10.
 *
 * Public interface: {@link mountCommandInput}.
 * Owner: web client.
 *
 * Lifecycle:
 *   - On `input` events, send `lock:acquire` and start a 200ms
 *     heartbeat that re-emits `lock:acquire` while the input has
 *     content.
 *   - On `submit`, send `lock:release` after the HTTP POST returns.
 *   - On blur of an empty input, send `lock:release`.
 *   - When a different participant holds the lock, the textbox is
 *     read-only and a "X is typing" indicator displays.
 *   - The submit affordance disables when own row is muted (AC-12).
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';
import type { WsClient } from '../ws-client.js';
import type { HttpClient, HttpError } from '../http-client.js';
import type { StoredIdentity } from '../identity-store.js';

export interface CommandInputDeps {
  store: RoomStateStore;
  ws: WsClient;
  http: HttpClient;
  identity: StoredIdentity;
  roomId: string;
}

const HEARTBEAT_MS = 200;

export function mountCommandInput(parent: HTMLElement, deps: CommandInputDeps): () => void {
  const form = document.createElement('form');
  form.className = 'sharpee-room-command';
  form.innerHTML = `
    <input type="text" maxlength="1000" placeholder="Type a command (LOOK, GO NORTH, INVENTORY...)" autocomplete="off" />
    <span class="sharpee-lock-indicator" aria-live="polite"></span>
    <button type="submit">Submit</button>
  `;
  parent.appendChild(form);

  const input = form.querySelector<HTMLInputElement>('input')!;
  const button = form.querySelector<HTMLButtonElement>('button')!;
  const lockIndicator = form.querySelector<HTMLSpanElement>('.sharpee-lock-indicator')!;

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  function startHeartbeat(): void {
    if (heartbeatTimer) return;
    deps.ws.send({ type: 'lock:acquire', roomId: deps.roomId });
    heartbeatTimer = setInterval(() => {
      deps.ws.send({ type: 'lock:acquire', roomId: deps.roomId });
    }, HEARTBEAT_MS);
  }

  function stopHeartbeat(release: boolean): void {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (release) deps.ws.send({ type: 'lock:release', roomId: deps.roomId });
  }

  input.addEventListener('input', () => {
    if (input.value.length > 0) startHeartbeat();
    else stopHeartbeat(true);
  });
  input.addEventListener('blur', () => {
    if (input.value.length === 0) stopHeartbeat(true);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    button.disabled = true;
    try {
      await deps.http.submitCommand(deps.roomId, deps.identity.handle, text);
      input.value = '';
    } catch (err) {
      const e = err as HttpError;
      input.title = `Command failed: ${e.status ?? '?'}`;
    } finally {
      button.disabled = false;
      stopHeartbeat(true);
    }
  });

  function render(snapshot: RoomStateSnapshot): void {
    const ownRow = snapshot.roster.find((r) => r.participant_id === snapshot.ownParticipantId);
    const muted = ownRow?.muted === true;

    const lockHolder = snapshot.lock.holder;
    const isOwn = lockHolder === snapshot.ownParticipantId;
    const heldByOther = lockHolder !== null && !isOwn;

    if (muted) {
      input.disabled = true;
      input.placeholder = 'You are muted.';
      button.disabled = true;
      lockIndicator.textContent = '';
      lockIndicator.className = 'sharpee-lock-indicator';
      return;
    }

    if (heldByOther) {
      const typerRow = snapshot.roster.find((r) => r.participant_id === lockHolder);
      const handle = typerRow?.handle ?? '(another participant)';
      input.readOnly = true;
      input.placeholder = `${handle} is typing…`;
      button.disabled = true;
      lockIndicator.textContent = `${handle} typing`;
      lockIndicator.className = 'sharpee-lock-indicator sharpee-lock-held-by-other';
      return;
    }

    input.readOnly = false;
    input.disabled = false;
    button.disabled = false;
    input.placeholder = 'Type a command (LOOK, GO NORTH, INVENTORY...)';
    lockIndicator.textContent = isOwn ? 'you (typing)' : '';
    lockIndicator.className = 'sharpee-lock-indicator' + (isOwn ? ' sharpee-lock-held-by-me' : '');
  }

  render(deps.store.snapshot());
  const unsubscribe = deps.store.subscribe(render);
  return () => {
    stopHeartbeat(false);
    unsubscribe();
  };
}
