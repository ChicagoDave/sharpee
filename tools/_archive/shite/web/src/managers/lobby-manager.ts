/**
 * @module zifmia/web/managers/lobby-manager
 * @purpose Renders the `.sharpee-lobby` page (ADR-176) and drives
 *   `GET /rooms` + `POST /rooms` round trips. Owns a `<dialog
 *   class="sharpee-dialog">` for room creation, whose story dropdown
 *   is populated from `GET /stories`. On a successful create, the
 *   manager hands the new roomId to an upstream callback which
 *   typically sets `location.hash = '#room/:roomId'`.
 * @owner Zifmia web client.
 *
 * The manager is framework-free: it builds its DOM once on `mount()`,
 * wires its own listeners, and exposes `mount()`, `refresh()`, and
 * `unmount()`. Tests construct it against a jsdom/happy-dom document
 * with stubbed API functions and assert against the rendered DOM.
 */

import * as roomsApi from '../api/rooms';
import * as storiesApi from '../api/stories';
import type { HttpClientOptions } from '../api/http';
import type {
  ApiResult,
  CreatedRoom,
  RoomSummary,
  StoriesResponse,
  StorySummary
} from '../api/types';
import type { PersistedIdentity } from '../identity-store';

export interface LobbyManagerOptions {
  /** Mount target — the manager appends its `.sharpee-lobby` here. */
  root: HTMLElement;
  /** Caller's identity, or `null` if the lobby is being rendered to
   * an unidentified visitor. The lobby is visible either way; the
   * Create-room and click-to-join affordances are gated on
   * `identity !== null` per ADR-161 §Gate semantics. */
  identity?: PersistedIdentity | null;
  /** HTTP options forwarded to every API call. Production omits
   * `baseUrl` (defaults to page origin); tests inject
   * `http://127.0.0.1:<port>` plus a `fetchImpl`. */
  httpOptions: HttpClientOptions;
  /** Fired after a successful `POST /rooms` (room was created OR an
   * existing row was clicked). Receives the target roomId. The shell
   * (main.ts) sets `location.hash = '#room/:roomId'`. */
  onEnterRoom: (roomId: string) => void;
  /** Fired when an unidentified visitor clicks the "Pick a handle"
   * affordance. The shell mounts the IdentityManager in response. */
  onClaimIdentity?: () => void;
  /** Optional API overrides for tests that don't want to stub fetch. */
  api?: {
    listRooms: typeof roomsApi.listRooms;
    createRoom: typeof roomsApi.createRoom;
    listStories: typeof storiesApi.listStories;
  };
}

/**
 * LobbyManager — public lobby view + room creation.
 *
 * Public surface:
 * - `mount()` — build the lobby DOM and load the initial room list.
 * - `refresh()` — re-fetch `GET /rooms` and re-render the list.
 * - `unmount()` — detach listeners and remove the lobby DOM.
 */
export class LobbyManager {
  private readonly options: LobbyManagerOptions;
  private readonly api: {
    listRooms: typeof roomsApi.listRooms;
    createRoom: typeof roomsApi.createRoom;
    listStories: typeof storiesApi.listStories;
  };
  private container: HTMLElement | null = null;
  private listElement: HTMLUListElement | null = null;
  private errorElement: HTMLElement | null = null;
  private createButton: HTMLButtonElement | null = null;
  private dialogElement: HTMLDialogElement | null = null;
  private dialogForm: HTMLFormElement | null = null;
  private dialogError: HTMLElement | null = null;
  private dialogStoryField: HTMLSelectElement | null = null;
  private dialogSubmit: HTMLButtonElement | null = null;
  private dialogCancel: HTMLButtonElement | null = null;
  private dialogStories: StorySummary[] = [];

  constructor(options: LobbyManagerOptions) {
    this.options = options;
    this.api = options.api ?? {
      listRooms: roomsApi.listRooms,
      createRoom: roomsApi.createRoom,
      listStories: storiesApi.listStories
    };
  }

  /** Build the lobby DOM and load the initial room list. Idempotent. */
  async mount(): Promise<void> {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;

    const container = doc.createElement('section');
    container.className = 'sharpee-lobby';
    container.innerHTML = renderLobbyHtml();
    this.options.root.appendChild(container);
    this.container = container;
    this.listElement = container.querySelector('[data-role="lobby-list"]');
    this.errorElement = container.querySelector('[data-role="lobby-error"]');
    this.createButton = container.querySelector('[data-role="create-button"]');

    this.dialogElement = container.querySelector('[data-role="create-dialog"]');
    this.dialogForm = container.querySelector('[data-role="create-form"]');
    this.dialogError = container.querySelector('[data-role="create-error"]');
    this.dialogStoryField = container.querySelector(
      '[data-role="create-story"]'
    );
    this.dialogSubmit = container.querySelector('[data-role="create-submit"]');
    this.dialogCancel = container.querySelector('[data-role="create-cancel"]');

    this.listElement?.addEventListener('click', this.handleListClick);
    this.createButton?.addEventListener('click', this.handleOpenDialog);
    this.dialogForm?.addEventListener('submit', this.handleCreateSubmit);
    this.dialogCancel?.addEventListener('click', this.handleCancelDialog);

    this.applyIdentityGate();
    await this.refresh();
  }

  private applyIdentityGate(): void {
    const hasIdentity = this.options.identity != null;
    if (this.createButton) {
      if (hasIdentity) {
        this.createButton.textContent = 'Create room';
        this.createButton.disabled = false;
      } else {
        this.createButton.textContent = 'Pick a handle to create rooms';
        // Don't disable — re-purpose the button to launch the
        // identity claim flow via the shell's `onClaimIdentity` hook.
        this.createButton.disabled = false;
      }
    }
  }

  /** Re-fetch `GET /rooms` and re-render the list. */
  async refresh(): Promise<void> {
    if (!this.listElement) return;
    const result = await this.api.listRooms(this.options.httpOptions);
    if (!result.ok) {
      this.showError(`Could not load rooms (${result.error}).`);
      return;
    }
    this.clearError();
    this.renderRooms(result.value);
  }

  /** Detach. Safe to call without mount. */
  unmount(): void {
    if (!this.container) return;
    this.listElement?.removeEventListener('click', this.handleListClick);
    this.createButton?.removeEventListener('click', this.handleOpenDialog);
    this.dialogForm?.removeEventListener('submit', this.handleCreateSubmit);
    this.dialogCancel?.removeEventListener('click', this.handleCancelDialog);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.listElement = null;
    this.errorElement = null;
    this.createButton = null;
    this.dialogElement = null;
    this.dialogForm = null;
    this.dialogError = null;
    this.dialogStoryField = null;
    this.dialogSubmit = null;
    this.dialogCancel = null;
    this.dialogStories = [];
  }

  private renderRooms(rooms: RoomSummary[]): void {
    const list = this.listElement;
    if (!list) return;
    const doc = list.ownerDocument;
    list.replaceChildren();
    if (rooms.length === 0) {
      const empty = doc.createElement('li');
      empty.className = 'sharpee-lobby-item';
      empty.setAttribute('data-role', 'lobby-empty');
      empty.textContent = 'No rooms yet — create one to get started.';
      list.appendChild(empty);
      return;
    }
    for (const room of rooms) {
      const li = doc.createElement('li');
      li.className = 'sharpee-lobby-item';
      li.setAttribute('data-room-id', room.id);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      const title = doc.createElement('span');
      title.className = 'sharpee-lobby-item-title';
      title.textContent = room.title;
      li.appendChild(title);

      const story = doc.createElement('span');
      story.className = 'sharpee-lobby-item-story';
      story.textContent = room.storyId;
      li.appendChild(story);

      list.appendChild(li);
    }
  }

  private readonly handleListClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const row = target.closest('[data-room-id]') as HTMLElement | null;
    if (!row) return;
    const roomId = row.getAttribute('data-room-id');
    if (!roomId) return;
    if (this.options.identity == null) {
      // Unidentified clicks on a row open the "pick a handle" flow.
      this.options.onClaimIdentity?.();
      return;
    }
    this.options.onEnterRoom(roomId);
  };

  private readonly handleOpenDialog = async (event: Event): Promise<void> => {
    event.preventDefault();
    if (this.options.identity == null) {
      // The button doubles as the "pick a handle" entry point for
      // unidentified visitors.
      this.options.onClaimIdentity?.();
      return;
    }
    await this.openCreateDialog();
  };

  private readonly handleCancelDialog = (event: Event): void => {
    event.preventDefault();
    this.closeCreateDialog();
  };

  private readonly handleCreateSubmit = async (
    event: Event
  ): Promise<void> => {
    event.preventDefault();
    const form = this.dialogForm;
    if (!form) return;
    const data = new FormData(form);
    const storyId = String(data.get('storyId') ?? '').trim();
    const title = String(data.get('title') ?? '').trim();
    const isPublic = String(data.get('public') ?? 'true') === 'true';

    if (storyId.length === 0 || title.length === 0) {
      this.showDialogError('Pick a story and enter a title.');
      return;
    }

    this.setDialogSubmitting(true);
    this.clearDialogError();
    const result: ApiResult<CreatedRoom> = await this.api.createRoom(
      { storyId, title, public: isPublic },
      this.options.httpOptions
    );
    this.setDialogSubmitting(false);

    if (!result.ok) {
      this.showDialogError(messageForCreateError(result.error, result.detail));
      return;
    }
    this.closeCreateDialog();
    this.options.onEnterRoom(result.value.id);
  };

  private async openCreateDialog(): Promise<void> {
    const dialog = this.dialogElement;
    const field = this.dialogStoryField;
    if (!dialog || !field) return;

    this.clearDialogError();
    this.resetForm();

    const result = await this.api.listStories(this.options.httpOptions);
    if (!result.ok) {
      this.showError(`Could not load story list (${result.error}).`);
      return;
    }
    this.dialogStories = result.value.stories;
    this.populateStoryDropdown(field, this.dialogStories);

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  private closeCreateDialog(): void {
    const dialog = this.dialogElement;
    if (!dialog) return;
    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    this.resetForm();
    this.clearDialogError();
  }

  private resetForm(): void {
    const form = this.dialogForm;
    if (!form) return;
    form.reset();
  }

  private populateStoryDropdown(
    field: HTMLSelectElement,
    stories: StorySummary[]
  ): void {
    const doc = field.ownerDocument;
    field.replaceChildren();
    if (stories.length === 0) {
      const placeholder = doc.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'No stories installed';
      placeholder.disabled = true;
      placeholder.selected = true;
      field.appendChild(placeholder);
      if (this.dialogSubmit) this.dialogSubmit.disabled = true;
      return;
    }
    if (this.dialogSubmit) this.dialogSubmit.disabled = false;
    const placeholder = doc.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Pick a story…';
    placeholder.disabled = true;
    placeholder.selected = true;
    field.appendChild(placeholder);
    for (const story of stories) {
      const option = doc.createElement('option');
      option.value = story.storyId;
      option.textContent = `${story.title} (${story.version})`;
      field.appendChild(option);
    }
  }

  private setDialogSubmitting(submitting: boolean): void {
    if (this.dialogSubmit) this.dialogSubmit.disabled = submitting;
    if (this.dialogCancel) this.dialogCancel.disabled = submitting;
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

  private showDialogError(message: string): void {
    if (!this.dialogError) return;
    this.dialogError.textContent = message;
    this.dialogError.hidden = false;
  }

  private clearDialogError(): void {
    if (!this.dialogError) return;
    this.dialogError.textContent = '';
    this.dialogError.hidden = true;
  }
}

function renderLobbyHtml(): string {
  return `
    <header class="sharpee-lobby-header">
      <h1 class="sharpee-lobby-title">Rooms</h1>
      <button data-role="create-button" type="button">Create room</button>
    </header>
    <p data-role="lobby-error" class="sharpee-lobby-error" hidden></p>
    <ul data-role="lobby-list" class="sharpee-lobby-list"></ul>
    <dialog data-role="create-dialog" class="sharpee-dialog">
      <form data-role="create-form" method="dialog" novalidate>
        <h2 class="sharpee-dialog-title">Create a room</h2>
        <div class="sharpee-dialog-body">
          <label class="sharpee-dialog-field">
            <span>Story</span>
            <select data-role="create-story" name="storyId" required></select>
          </label>
          <label class="sharpee-dialog-field">
            <span>Title</span>
            <input
              name="title"
              type="text"
              minlength="1"
              maxlength="80"
              required
              autocomplete="off"
            />
          </label>
          <fieldset class="sharpee-dialog-field">
            <legend>Visibility</legend>
            <label>
              <input type="radio" name="public" value="true" checked />
              Public (listed in the lobby)
            </label>
            <label>
              <input type="radio" name="public" value="false" />
              Private (only people with the link)
            </label>
          </fieldset>
          <p data-role="create-error" class="sharpee-dialog-error" hidden></p>
        </div>
        <div class="sharpee-dialog-buttons">
          <button data-role="create-cancel" type="button" class="sharpee-dialog-button">Cancel</button>
          <button data-role="create-submit" type="submit" class="sharpee-dialog-button">Create</button>
        </div>
      </form>
    </dialog>
  `;
}

function messageForCreateError(error: string, detail?: string): string {
  if (error === 'invalid_body') return 'Title or story is invalid.';
  if (error === 'story_not_found') {
    return 'That story is not installed on this server.';
  }
  if (error === 'unauthorized' || error === 'invalid_token') {
    return 'Your session expired. Please sign in again.';
  }
  if (detail) return `${error}: ${detail}`;
  return error;
}
