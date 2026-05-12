/**
 * @module zifmia/web/managers/admin-rooms-manager
 * @purpose Admin Rooms tab: lists active rooms (`GET /rooms`) and lets
 *   admin kill any room (`DELETE /admin/rooms/:id`). No confirmation
 *   dialog in v1 — admin actions are audited server-side, and the
 *   row simply disappears after a 204.
 * @owner Zifmia web client.
 */

import { listRooms } from '../api/rooms';
import { killAdminRoom } from '../api/admin';
import type { HttpClientOptions } from '../api/http';
import type { RoomSummary } from '../api/types';

export interface AdminRoomsManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  api?: {
    listRooms: typeof listRooms;
    killAdminRoom: typeof killAdminRoom;
  };
}

export class AdminRoomsManager {
  private readonly options: AdminRoomsManagerOptions;
  private readonly api: NonNullable<AdminRoomsManagerOptions['api']>;
  private container: HTMLElement | null = null;
  private list: HTMLUListElement | null = null;
  private errorElement: HTMLElement | null = null;

  constructor(options: AdminRoomsManagerOptions) {
    this.options = options;
    this.api = options.api ?? { listRooms, killAdminRoom };
  }

  async mount(): Promise<void> {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'admin-rooms');
    container.innerHTML = `
      <header class="sharpee-admin-tab-header">
        <h2>Active rooms</h2>
        <button data-role="admin-rooms-refresh" type="button">Refresh</button>
      </header>
      <p data-role="admin-rooms-error" class="sharpee-admin-tab-error" hidden></p>
      <ul data-role="admin-rooms-list" class="sharpee-admin-rooms-list"></ul>
    `;
    this.options.root.appendChild(container);
    this.container = container;
    this.list = container.querySelector('[data-role="admin-rooms-list"]');
    this.errorElement = container.querySelector('[data-role="admin-rooms-error"]');
    container
      .querySelector('[data-role="admin-rooms-refresh"]')
      ?.addEventListener('click', this.handleRefresh);
    this.list?.addEventListener('click', this.handleListClick);
    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.list) return;
    let result;
    try {
      result = await this.api.listRooms(this.options.httpOptions);
    } catch (err) {
      this.showError(
        `Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`
      );
      return;
    }
    if (!result.ok) {
      this.showError(`Could not load rooms (${result.error}).`);
      return;
    }
    this.clearError();
    this.renderRows(result.value);
  }

  unmount(): void {
    if (!this.container) return;
    this.container
      .querySelector('[data-role="admin-rooms-refresh"]')
      ?.removeEventListener('click', this.handleRefresh);
    this.list?.removeEventListener('click', this.handleListClick);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.list = null;
    this.errorElement = null;
  }

  private renderRows(rooms: RoomSummary[]): void {
    if (!this.list) return;
    const doc = this.list.ownerDocument;
    this.list.replaceChildren();
    if (rooms.length === 0) {
      const empty = doc.createElement('li');
      empty.textContent = 'No active rooms.';
      empty.setAttribute('data-role', 'admin-rooms-empty');
      this.list.appendChild(empty);
      return;
    }
    for (const r of rooms) {
      const li = doc.createElement('li');
      li.setAttribute('data-room-id', r.id);
      const label = doc.createElement('span');
      label.textContent = `${r.title} (${r.storyId}@${r.bundleVersion})`;
      const killBtn = doc.createElement('button');
      killBtn.type = 'button';
      killBtn.setAttribute('data-action', 'kill');
      killBtn.textContent = 'Kill';
      li.append(label, killBtn);
      this.list.appendChild(li);
    }
  }

  private readonly handleRefresh = (): void => {
    void this.refresh();
  };

  private readonly handleListClick = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement | null;
    if (target?.getAttribute('data-action') !== 'kill') return;
    const row = target.closest('[data-room-id]') as HTMLElement | null;
    const roomId = row?.getAttribute('data-room-id');
    if (!roomId) return;
    const result = await this.api.killAdminRoom(
      roomId,
      this.options.httpOptions
    );
    if (!result.ok) {
      this.showError(`Could not kill ${roomId}: ${result.error}.`);
      return;
    }
    // Remove the row optimistically. A refresh would also work; the
    // direct DOM mutation avoids the round-trip and matches the user's
    // intent precisely.
    row?.remove();
  };

  private showError(message: string): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = message;
    this.errorElement.hidden = false;
  }
  private clearError(): void {
    if (!this.errorElement) return;
    this.errorElement.textContent = '';
    this.errorElement.hidden = true;
  }
}
