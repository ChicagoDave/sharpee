/**
 * SettingsPanel — PH-only room actions: rename, pin/unpin, delete
 * (with title confirmation), force-release (PH/CoHost), save / restore.
 *
 * Public interface: {@link mountSettingsPanel}.
 * Owner: web client.
 *
 * Visibility is gated by `ownTier`. Save / restore is visible to
 * every connected participant; mutations restrict to the host tiers
 * server-side.
 */

import type { RoomStateStore, RoomStateSnapshot } from '../store/room-state.js';
import type { HttpClient } from '../http-client.js';
import type { StoredIdentity } from '../identity-store.js';

export interface SettingsPanelDeps {
  store: RoomStateStore;
  http: HttpClient;
  identity: StoredIdentity;
  roomId: string;
  onRequireHydrate: () => void;
}

export function mountSettingsPanel(parent: HTMLElement, deps: SettingsPanelDeps): () => void {
  const panel = document.createElement('div');
  panel.className = 'sharpee-panel sharpee-settings-panel';
  panel.innerHTML = `
    <h2>Room settings</h2>
    <div class="sharpee-settings-actions"></div>
  `;
  parent.appendChild(panel);
  const actions = panel.querySelector<HTMLDivElement>('.sharpee-settings-actions')!;

  function render(snapshot: RoomStateSnapshot): void {
    actions.replaceChildren();
    if (!snapshot.room) return;
    const isPh = snapshot.ownTier === 'primary_host';
    const isCoHost = snapshot.ownTier === 'co_host';

    // Rename (PH only).
    if (isPh) {
      const row = document.createElement('div');
      row.className = 'sharpee-settings-row';
      const renameInput = document.createElement('input');
      renameInput.placeholder = 'New title';
      renameInput.maxLength = 80;
      const renameButton = document.createElement('button');
      renameButton.className = 'sharpee-secondary';
      renameButton.textContent = 'Rename';
      renameButton.addEventListener('click', async () => {
        const title = renameInput.value.trim();
        if (!title) return;
        try {
          await deps.http.renameRoom(deps.roomId, deps.identity.handle, title);
          renameInput.value = '';
        } catch { /* error UI lives elsewhere */ }
      });
      row.append(renameInput, renameButton);
      actions.appendChild(row);

      // Pin / unpin.
      const pinButton = document.createElement('button');
      pinButton.className = 'sharpee-secondary';
      pinButton.textContent = snapshot.room.pinned ? 'Unpin from lobby' : 'Pin to lobby';
      pinButton.addEventListener('click', async () => {
        await deps.http.pinRoom(deps.roomId, deps.identity.handle, !snapshot.room!.pinned).catch(() => undefined);
      });
      actions.appendChild(pinButton);
    }

    // Force-release (PH + CoHost).
    if (isPh || isCoHost) {
      const fr = document.createElement('button');
      fr.className = 'sharpee-secondary';
      fr.textContent = 'Force-release lock';
      fr.disabled = snapshot.lock.holder === null;
      fr.addEventListener('click', async () => {
        await deps.http.forceRelease(deps.roomId, deps.identity.handle).catch(() => undefined);
      });
      actions.appendChild(fr);
    }

    // Save (everyone), Restore (everyone — but the routes require
    // membership which the gate already enforces).
    const saveButton = document.createElement('button');
    saveButton.className = 'sharpee-secondary';
    saveButton.textContent = 'Save snapshot';
    saveButton.addEventListener('click', async () => {
      const name = prompt('Save name?');
      if (!name) return;
      await deps.http.createSave(deps.roomId, deps.identity.handle, name).catch(() => undefined);
    });
    actions.appendChild(saveButton);

    const restoreButton = document.createElement('button');
    restoreButton.className = 'sharpee-secondary';
    restoreButton.textContent = 'Restore from save…';
    restoreButton.addEventListener('click', async () => {
      try {
        const { saves } = await deps.http.listSaves(deps.roomId, deps.identity.handle);
        if (saves.length === 0) { alert('No saves yet.'); return; }
        const label = prompt(
          `Pick a save name:\n${saves.map((s) => `  ${s.name}`).join('\n')}`,
          saves[0].name
        );
        if (!label) return;
        const target = saves.find((s) => s.name === label);
        if (!target) { alert('No save with that name.'); return; }
        await deps.http.restore(deps.roomId, deps.identity.handle, target.save_id);
        deps.onRequireHydrate();
      } catch { /* swallow */ }
    });
    actions.appendChild(restoreButton);

    // Delete (PH only, with title confirmation).
    if (isPh) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'sharpee-danger';
      deleteButton.textContent = 'Delete room…';
      deleteButton.addEventListener('click', async () => {
        const confirm = prompt(`Type the room title to confirm deletion:\n\nTitle: ${snapshot.room!.title}`);
        if (confirm !== snapshot.room!.title) return;
        await deps.http.deleteRoom(deps.roomId, deps.identity.handle, confirm).catch(() => undefined);
      });
      actions.appendChild(deleteButton);
    }
  }

  render(deps.store.snapshot());
  return deps.store.subscribe(render);
}
