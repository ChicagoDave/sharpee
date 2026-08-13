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

    if (document.querySelector('.sharpee-create-dialog')) return;

    const stories = await http.listStories();
    if (stories.stories.length === 0) {
      alert('No stories are installed on this server.');
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'sharpee-create-dialog';

    const card = document.createElement('form');
    card.className = 'sharpee-create-dialog-card';
    overlay.appendChild(card);

    const heading = document.createElement('h2');
    heading.textContent = 'Create room';
    card.appendChild(heading);

    const slugRow = document.createElement('label');
    slugRow.className = 'sharpee-create-dialog-row';
    const slugLabel = document.createElement('span');
    slugLabel.textContent = 'Story';
    const slugSelect = document.createElement('select');
    for (const story of stories.stories) {
      const option = document.createElement('option');
      option.value = story.slug;
      option.textContent = story.slug;
      slugSelect.appendChild(option);
    }
    slugSelect.value = stories.stories[0].slug;
    slugRow.append(slugLabel, slugSelect);
    card.appendChild(slugRow);

    const titleRow = document.createElement('label');
    titleRow.className = 'sharpee-create-dialog-row';
    const titleLabel = document.createElement('span');
    titleLabel.textContent = 'Room title';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.maxLength = 80;
    titleInput.required = true;
    titleInput.placeholder = '1–80 characters';
    titleRow.append(titleLabel, titleInput);
    card.appendChild(titleRow);

    const actions = document.createElement('div');
    actions.className = 'sharpee-create-dialog-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'sharpee-secondary';
    cancel.textContent = 'Cancel';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Create';
    actions.append(cancel, submit);
    card.appendChild(actions);

    const close = (): void => {
      overlay.remove();
    };
    cancel.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close();
    });

    card.addEventListener('submit', async (event) => {
      event.preventDefault();
      const slug = slugSelect.value;
      const title = titleInput.value.trim();
      if (!slug || !title) return;
      submit.disabled = true;
      try {
        const result = await http.createRoom({ handle: identity.handle, story_slug: slug, title });
        close();
        handlers.onEnterRoom(result.room.id);
      } catch (err) {
        submit.disabled = false;
        if (err instanceof HttpError) {
          alert(`Create failed: ${JSON.stringify(err.body)}`);
        } else {
          alert('Create failed.');
        }
      }
    });

    document.body.appendChild(overlay);
    titleInput.focus();
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
