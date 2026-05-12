/**
 * @module zifmia/web/managers/saves-manager
 * @purpose Renders the per-room named-saves UI inside
 *   `.sharpee-saves-panel`. Owns:
 *     - `.sharpee-saves-list` of `.sharpee-saves-item` rows from
 *       `GET /rooms/:id/saves`
 *     - Create-save `<dialog class="sharpee-dialog">` (label input)
 *     - Restore confirmation `<dialog class="sharpee-dialog">`
 *   Subscribes to WS `room:restored` to keep the list current after
 *   any participant restores.
 * @owner Zifmia web client.
 *
 * Per `feedback_no_save_delete` named saves persist with the room —
 * there is no delete UI and no DELETE route. Rename is deferred.
 *
 * After a successful restore, the server emits `room:restored` to
 * every subscriber. The RoomManager owns the prose-pane re-render
 * (it wires the frame to `RoomManager.refresh()`). The SavesManager
 * separately refreshes its own list so the row order stays in sync
 * with truncation that the restore performed server-side.
 */

import { createNamedSave, listNamedSaves, restoreNamedSave } from '../api/saves';
import type { HttpClientOptions } from '../api/http';
import type { ApiResult, NamedSave } from '../api/types';
import type { RoomRestoredFrame, WsClient } from '../ws-client';

export interface SavesManagerOptions {
  /** Mount target — typically `.sharpee-saves-panel` from RoomView. */
  root: HTMLElement;
  /** Active room id. */
  roomId: string;
  /** HTTP options forwarded to each API call. */
  httpOptions: HttpClientOptions;
  /** WS client (already opened by the RoomManager). */
  ws: WsClient;
  /** Optional API overrides for tests. */
  api?: {
    listNamedSaves: typeof listNamedSaves;
    createNamedSave: typeof createNamedSave;
    restoreNamedSave: typeof restoreNamedSave;
  };
}

/**
 * SavesManager — `.sharpee-saves-panel` owner.
 *
 * Public surface:
 *  - `mount()` — build DOM scaffold, subscribe to `room:restored`,
 *    load the initial saves list.
 *  - `refresh()` — re-fetch `GET /rooms/:id/saves` and re-render.
 *  - `unmount()` — detach + clean up.
 */
export class SavesManager {
  private readonly options: SavesManagerOptions;
  private readonly api: {
    listNamedSaves: typeof listNamedSaves;
    createNamedSave: typeof createNamedSave;
    restoreNamedSave: typeof restoreNamedSave;
  };
  private container: HTMLElement | null = null;
  private list: HTMLUListElement | null = null;
  private errorElement: HTMLElement | null = null;
  private createButton: HTMLButtonElement | null = null;
  private createDialog: HTMLDialogElement | null = null;
  private createForm: HTMLFormElement | null = null;
  private createError: HTMLElement | null = null;
  private createSubmit: HTMLButtonElement | null = null;
  private createCancel: HTMLButtonElement | null = null;
  private restoreDialog: HTMLDialogElement | null = null;
  private restoreLabel: HTMLElement | null = null;
  private restoreError: HTMLElement | null = null;
  private restoreConfirm: HTMLButtonElement | null = null;
  private restoreCancel: HTMLButtonElement | null = null;
  private restoreTargetSaveId: string | null = null;
  private unsubRestored: (() => void) | null = null;

  constructor(options: SavesManagerOptions) {
    this.options = options;
    this.api = options.api ?? {
      listNamedSaves,
      createNamedSave,
      restoreNamedSave
    };
  }

  async mount(): Promise<void> {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'saves-root');
    container.innerHTML = renderHtml();
    this.options.root.appendChild(container);
    this.container = container;
    this.list = container.querySelector('[data-role="saves-list"]');
    this.errorElement = container.querySelector('[data-role="saves-error"]');
    this.createButton = container.querySelector('[data-role="saves-create"]');
    this.createDialog = container.querySelector('[data-role="saves-dialog"]');
    this.createForm = container.querySelector('[data-role="saves-form"]');
    this.createError = container.querySelector('[data-role="saves-form-error"]');
    this.createSubmit = container.querySelector('[data-role="saves-submit"]');
    this.createCancel = container.querySelector('[data-role="saves-cancel"]');
    this.restoreDialog = container.querySelector('[data-role="restore-dialog"]');
    this.restoreLabel = container.querySelector('[data-role="restore-label"]');
    this.restoreError = container.querySelector('[data-role="restore-error"]');
    this.restoreConfirm = container.querySelector('[data-role="restore-confirm"]');
    this.restoreCancel = container.querySelector('[data-role="restore-cancel"]');

    this.list?.addEventListener('click', this.handleListClick);
    this.createButton?.addEventListener('click', this.handleOpenCreate);
    this.createForm?.addEventListener('submit', this.handleCreateSubmit);
    this.createCancel?.addEventListener('click', this.handleCancelCreate);
    this.restoreConfirm?.addEventListener('click', this.handleRestoreConfirm);
    this.restoreCancel?.addEventListener('click', this.handleCancelRestore);

    this.unsubRestored = this.options.ws.on('room:restored', (frame) =>
      this.onRoomRestored(frame)
    );

    await this.refresh();
  }

  /** Public seam: re-fetch + re-render. Tests + the WS handler call it. */
  async refresh(): Promise<void> {
    if (!this.list) return;
    let result: ApiResult<NamedSave[]>;
    try {
      result = await this.api.listNamedSaves(
        this.options.roomId,
        this.options.httpOptions
      );
    } catch (err) {
      // Network-level throws (DNS, offline) — surface a friendly pip
      // rather than letting an unhandled rejection bubble out.
      this.showError(
        `Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`
      );
      return;
    }
    if (!result.ok) {
      this.showError(`Could not load saves (${result.error}).`);
      return;
    }
    this.clearError();
    this.renderRows(result.value);
  }

  unmount(): void {
    if (!this.container) return;
    this.unsubRestored?.();
    this.unsubRestored = null;
    this.list?.removeEventListener('click', this.handleListClick);
    this.createButton?.removeEventListener('click', this.handleOpenCreate);
    this.createForm?.removeEventListener('submit', this.handleCreateSubmit);
    this.createCancel?.removeEventListener('click', this.handleCancelCreate);
    this.restoreConfirm?.removeEventListener('click', this.handleRestoreConfirm);
    this.restoreCancel?.removeEventListener('click', this.handleCancelRestore);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.list = null;
    this.errorElement = null;
    this.createButton = null;
    this.createDialog = null;
    this.createForm = null;
    this.createError = null;
    this.createSubmit = null;
    this.createCancel = null;
    this.restoreDialog = null;
    this.restoreLabel = null;
    this.restoreError = null;
    this.restoreConfirm = null;
    this.restoreCancel = null;
    this.restoreTargetSaveId = null;
  }

  private renderRows(saves: NamedSave[]): void {
    const list = this.list;
    if (!list) return;
    const doc = list.ownerDocument;
    list.replaceChildren();
    if (saves.length === 0) {
      const empty = doc.createElement('li');
      empty.className = 'sharpee-saves-item';
      empty.setAttribute('data-role', 'saves-empty');
      empty.textContent = 'No saves yet.';
      list.appendChild(empty);
      return;
    }
    for (const save of saves) {
      list.appendChild(this.makeRow(save));
    }
  }

  private makeRow(save: NamedSave): HTMLLIElement {
    const doc = this.options.root.ownerDocument;
    const li = doc.createElement('li');
    li.className = 'sharpee-saves-item';
    li.setAttribute('data-save-id', save.saveId);

    const label = doc.createElement('span');
    label.className = 'sharpee-saves-item-label';
    label.textContent = save.label;
    li.appendChild(label);

    const turn = doc.createElement('span');
    turn.className = 'sharpee-saves-item-turn';
    turn.textContent = `turn ${save.atTurn}`;
    li.appendChild(turn);

    const restore = doc.createElement('button');
    restore.type = 'button';
    restore.setAttribute('data-action', 'restore');
    restore.textContent = 'Restore';
    li.appendChild(restore);

    return li;
  }

  private readonly handleListClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    if (target.getAttribute('data-action') !== 'restore') return;
    const row = target.closest('[data-save-id]') as HTMLElement | null;
    if (!row) return;
    const saveId = row.getAttribute('data-save-id');
    if (!saveId) return;
    const labelText =
      row.querySelector('.sharpee-saves-item-label')?.textContent ?? saveId;
    this.openRestoreDialog(saveId, labelText);
  };

  private readonly handleOpenCreate = (event: Event): void => {
    event.preventDefault();
    this.openCreateDialog();
  };

  private readonly handleCancelCreate = (event: Event): void => {
    event.preventDefault();
    this.closeCreateDialog();
  };

  private readonly handleCancelRestore = (event: Event): void => {
    event.preventDefault();
    this.closeRestoreDialog();
  };

  private readonly handleCreateSubmit = async (
    event: Event
  ): Promise<void> => {
    event.preventDefault();
    const form = this.createForm;
    if (!form) return;
    const data = new FormData(form);
    const label = String(data.get('label') ?? '').trim();
    if (label.length === 0) {
      this.showCreateError('Enter a label.');
      return;
    }
    this.setCreateSubmitting(true);
    this.clearCreateError();
    const result = await this.api.createNamedSave(
      this.options.roomId,
      { label },
      this.options.httpOptions
    );
    this.setCreateSubmitting(false);
    if (!result.ok) {
      this.showCreateError(messageForCreateError(result.error, result.detail));
      return;
    }
    this.closeCreateDialog();
    await this.refresh();
  };

  private readonly handleRestoreConfirm = async (
    event: Event
  ): Promise<void> => {
    event.preventDefault();
    const saveId = this.restoreTargetSaveId;
    if (!saveId) return;
    this.setRestoreSubmitting(true);
    this.clearRestoreError();
    const result = await this.api.restoreNamedSave(
      this.options.roomId,
      saveId,
      this.options.httpOptions
    );
    this.setRestoreSubmitting(false);
    if (!result.ok) {
      this.showRestoreError(messageForRestoreError(result.error, result.detail));
      return;
    }
    // Server fans `room:restored` to all subscribers (including this
    // one). The handler refreshes the list; the RoomManager separately
    // refreshes the prose pane.
    this.closeRestoreDialog();
  };

  private onRoomRestored(frame: RoomRestoredFrame): void {
    if (frame.roomId !== this.options.roomId) return;
    void this.refresh();
  }

  private openCreateDialog(): void {
    const dialog = this.createDialog;
    if (!dialog) return;
    this.clearCreateError();
    this.createForm?.reset();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  private closeCreateDialog(): void {
    const dialog = this.createDialog;
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    this.clearCreateError();
    this.createForm?.reset();
  }

  private openRestoreDialog(saveId: string, labelText: string): void {
    const dialog = this.restoreDialog;
    if (!dialog) return;
    this.restoreTargetSaveId = saveId;
    this.clearRestoreError();
    if (this.restoreLabel) this.restoreLabel.textContent = labelText;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  private closeRestoreDialog(): void {
    const dialog = this.restoreDialog;
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    this.restoreTargetSaveId = null;
    this.clearRestoreError();
  }

  private setCreateSubmitting(submitting: boolean): void {
    if (this.createSubmit) this.createSubmit.disabled = submitting;
    if (this.createCancel) this.createCancel.disabled = submitting;
  }

  private setRestoreSubmitting(submitting: boolean): void {
    if (this.restoreConfirm) this.restoreConfirm.disabled = submitting;
    if (this.restoreCancel) this.restoreCancel.disabled = submitting;
  }

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
  private showCreateError(message: string): void {
    if (!this.createError) return;
    this.createError.textContent = message;
    this.createError.hidden = false;
  }
  private clearCreateError(): void {
    if (!this.createError) return;
    this.createError.textContent = '';
    this.createError.hidden = true;
  }
  private showRestoreError(message: string): void {
    if (!this.restoreError) return;
    this.restoreError.textContent = message;
    this.restoreError.hidden = false;
  }
  private clearRestoreError(): void {
    if (!this.restoreError) return;
    this.restoreError.textContent = '';
    this.restoreError.hidden = true;
  }
}

function renderHtml(): string {
  return `
    <header class="sharpee-saves-panel-header">
      <h2 class="sharpee-saves-panel-title">Named saves</h2>
      <button data-role="saves-create" type="button">New save</button>
    </header>
    <p data-role="saves-error" class="sharpee-saves-error" hidden></p>
    <ul data-role="saves-list" class="sharpee-saves-list"></ul>

    <dialog data-role="saves-dialog" class="sharpee-dialog">
      <form data-role="saves-form" method="dialog" novalidate>
        <h2 class="sharpee-dialog-title">Create a named save</h2>
        <div class="sharpee-dialog-body">
          <label class="sharpee-dialog-field">
            <span>Label</span>
            <input
              name="label"
              type="text"
              minlength="1"
              maxlength="80"
              required
              autocomplete="off"
            />
          </label>
          <p data-role="saves-form-error" class="sharpee-dialog-error" hidden></p>
        </div>
        <div class="sharpee-dialog-buttons">
          <button data-role="saves-cancel" type="button" class="sharpee-dialog-button">Cancel</button>
          <button data-role="saves-submit" type="submit" class="sharpee-dialog-button">Save</button>
        </div>
      </form>
    </dialog>

    <dialog data-role="restore-dialog" class="sharpee-dialog">
      <h2 class="sharpee-dialog-title">Restore to this save?</h2>
      <div class="sharpee-dialog-body">
        <p>Restoring rewinds the room to <strong data-role="restore-label"></strong>. All later turns in this room will be erased.</p>
        <p data-role="restore-error" class="sharpee-dialog-error" hidden></p>
      </div>
      <div class="sharpee-dialog-buttons">
        <button data-role="restore-cancel" type="button" class="sharpee-dialog-button">Cancel</button>
        <button data-role="restore-confirm" type="button" class="sharpee-dialog-button">Restore</button>
      </div>
    </dialog>
  `;
}

function messageForCreateError(error: string, detail?: string): string {
  if (error === 'invalid_body') return 'Label is invalid.';
  if (error === 'no_turns_yet') return 'Run a turn first, then save.';
  if (error === 'turn_not_saved') return 'That turn was not saved.';
  if (error === 'room_not_found') return 'This room no longer exists.';
  if (detail) return `${error}: ${detail}`;
  return error;
}

function messageForRestoreError(error: string, detail?: string): string {
  if (error === 'save_not_found') return 'That save was deleted.';
  if (error === 'save_room_mismatch') return 'That save belongs to a different room.';
  if (error === 'restore_failed') return 'Restore could not complete.';
  if (error === 'room_not_found') return 'This room no longer exists.';
  if (detail) return `${error}: ${detail}`;
  return error;
}
