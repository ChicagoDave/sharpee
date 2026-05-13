/**
 * LobbyPanel — public room list + "create" + "I have a code" + identity strip.
 *
 * Public interface: {@link mountLobbyPanel}.
 * Owner: web client.
 *
 * Per ADR-177 §4 the lobby is readable by anyone (including
 * unidentified users); create/join are gated client-side and
 * server-side rejects with 401 on unknown handles.
 */

import { HttpError, type HttpClient, type RoomLobbyRow } from '../http-client.js';
import { readStoredIdentity, clearStoredIdentity, type StoredIdentity } from '../identity-store.js';

export interface LobbyPanelHandlers {
  /** Navigate to a room. */
  onEnterRoom: (roomId: string) => void;
  /** Return to identity claim view. */
  onLogout: () => void;
}

export function mountLobbyPanel(parent: HTMLElement, http: HttpClient, handlers: LobbyPanelHandlers): () => void {
  const identity = readStoredIdentity();
  let pollHandle: ReturnType<typeof setInterval> | null = null;

  parent.replaceChildren();
  const root = document.createElement('div');
  root.className = 'sharpee-lobby';

  const header = document.createElement('header');
  header.className = 'sharpee-lobby-header';
  header.innerHTML = '<h1>Lobby</h1>';
  const identityStrip = document.createElement('div');
  identityStrip.className = 'sharpee-lobby-identity-strip';
  header.appendChild(identityStrip);
  root.appendChild(header);

  const actions = document.createElement('div');
  actions.className = 'sharpee-lobby-actions';
  root.appendChild(actions);

  const roomsList = document.createElement('div');
  roomsList.className = 'sharpee-lobby-rooms';
  root.appendChild(roomsList);

  parent.appendChild(root);

  function renderIdentityStrip(): void {
    if (identity) {
      identityStrip.innerHTML = '';
      const span = document.createElement('span');
      span.textContent = `Signed in as ${identity.handle}`;
      const logout = document.createElement('button');
      logout.textContent = 'Logout';
      logout.className = 'sharpee-secondary';
      logout.addEventListener('click', () => {
        clearStoredIdentity();
        handlers.onLogout();
      });
      identityStrip.append(span, logout);
    } else {
      identityStrip.textContent = 'Browsing as guest';
    }
  }

  function renderActions(): void {
    actions.replaceChildren();

    if (identity) {
      const createButton = document.createElement('button');
      createButton.textContent = 'Create room';
      createButton.addEventListener('click', () => openCreateDialog());
      actions.appendChild(createButton);
    }

    const codeForm = document.createElement('form');
    codeForm.style.display = 'flex';
    codeForm.style.gap = '0.25rem';
    const codeInput = document.createElement('input');
    codeInput.placeholder = 'Join code';
    codeInput.maxLength = 16;
    codeForm.appendChild(codeInput);
    const codeButton = document.createElement('button');
    codeButton.type = 'submit';
    codeButton.className = 'sharpee-secondary';
    codeButton.textContent = 'Enter';
    codeForm.appendChild(codeButton);
    codeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = codeInput.value.trim();
      if (!code) return;
      try {
        const room = await http.resolveJoinCode(code);
        if (identity) {
          await http.joinRoom(room.id, identity.handle).catch(() => undefined);
        }
        handlers.onEnterRoom(room.id);
      } catch {
        codeInput.setCustomValidity('Code not found');
        codeInput.reportValidity();
        setTimeout(() => codeInput.setCustomValidity(''), 1500);
      }
    });
    actions.appendChild(codeForm);
  }

  async function openCreateDialog(): Promise<void> {
    if (!identity) return;
    const stories = await http.listStories();
    if (stories.stories.length === 0) {
      alert('No stories are installed on this server.');
      return;
    }
    const slug = prompt(
      `Available stories: ${stories.stories.map((s) => s.slug).join(', ')}\n\nEnter slug:`,
      stories.stories[0].slug
    );
    if (!slug) return;
    const title = prompt('Room title (1-80 chars):');
    if (!title) return;
    try {
      const result = await http.createRoom({ handle: identity.handle, story_slug: slug, title });
      handlers.onEnterRoom(result.room.id);
    } catch (err) {
      if (err instanceof HttpError) {
        alert(`Create failed: ${JSON.stringify(err.body)}`);
      } else {
        alert('Create failed.');
      }
    }
  }

  function renderRoomRow(room: RoomLobbyRow): HTMLElement {
    const row = document.createElement('div');
    row.className = 'sharpee-lobby-room' + (room.pinned ? ' sharpee-pinned' : '');

    const left = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = room.title;
    const meta = document.createElement('div');
    meta.className = 'sharpee-lobby-room-meta';
    const handles = room.participants.map((p) => p.handle).join(', ');
    meta.textContent = `${room.story_slug} · ${room.participants.length} in room${handles ? ' (' + handles + ')' : ''} · code: ${room.join_code}`;
    left.append(title, meta);

    const right = document.createElement('div');
    const enterButton = document.createElement('button');
    enterButton.textContent = identity ? 'Join' : 'View';
    enterButton.addEventListener('click', async () => {
      if (identity) {
        try { await http.joinRoom(room.id, identity.handle); } catch { /* idempotent / already in */ }
      }
      handlers.onEnterRoom(room.id);
    });
    if (!identity) enterButton.disabled = true;
    right.appendChild(enterButton);

    row.append(left, right);
    return row;
  }

  async function refreshRooms(): Promise<void> {
    try {
      const { rooms } = await http.listLobby();
      roomsList.replaceChildren();
      if (rooms.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sharpee-lobby-room-meta';
        empty.textContent = 'No rooms yet. Create one to start a session.';
        roomsList.appendChild(empty);
        return;
      }
      for (const room of rooms) roomsList.appendChild(renderRoomRow(room));
    } catch {
      // Silent — the next poll will retry.
    }
  }

  renderIdentityStrip();
  renderActions();
  refreshRooms();
  pollHandle = setInterval(refreshRooms, 4000);

  // Cleanup function — caller invokes when navigating away.
  return () => {
    if (pollHandle) clearInterval(pollHandle);
  };
}
