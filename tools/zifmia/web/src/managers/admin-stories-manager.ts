/**
 * @module zifmia/web/managers/admin-stories-manager
 * @purpose Admin Stories tab: lists installed story versions, lets
 *   admin upload a new bundle (`POST /admin/stories` with
 *   `application/octet-stream`) and remove a storyId entirely
 *   (`DELETE /admin/stories/:id`).
 * @owner Zifmia web client.
 */

import {
  listAdminStories,
  removeAdminStory,
  uploadAdminStory
} from '../api/admin';
import type { HttpClientOptions } from '../api/http';
import type { AdminStoryEntry } from '../api/types';

export interface AdminStoriesManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  api?: {
    listAdminStories: typeof listAdminStories;
    uploadAdminStory: typeof uploadAdminStory;
    removeAdminStory: typeof removeAdminStory;
  };
}

export class AdminStoriesManager {
  private readonly options: AdminStoriesManagerOptions;
  private readonly api: NonNullable<AdminStoriesManagerOptions['api']>;
  private container: HTMLElement | null = null;
  private list: HTMLUListElement | null = null;
  private fileInput: HTMLInputElement | null = null;
  private uploadButton: HTMLButtonElement | null = null;
  private errorElement: HTMLElement | null = null;

  constructor(options: AdminStoriesManagerOptions) {
    this.options = options;
    this.api = options.api ?? {
      listAdminStories,
      uploadAdminStory,
      removeAdminStory
    };
  }

  async mount(): Promise<void> {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'admin-stories');
    container.innerHTML = `
      <header class="sharpee-admin-tab-header">
        <h2>Story library</h2>
        <input data-role="admin-stories-file" type="file" accept=".sharpee,application/octet-stream" />
        <button data-role="admin-stories-upload" type="button" disabled>Upload</button>
      </header>
      <p data-role="admin-stories-error" class="sharpee-admin-tab-error" hidden></p>
      <ul data-role="admin-stories-list" class="sharpee-admin-stories-list"></ul>
    `;
    this.options.root.appendChild(container);
    this.container = container;
    this.list = container.querySelector('[data-role="admin-stories-list"]');
    this.fileInput = container.querySelector('[data-role="admin-stories-file"]');
    this.uploadButton = container.querySelector('[data-role="admin-stories-upload"]');
    this.errorElement = container.querySelector('[data-role="admin-stories-error"]');

    this.fileInput?.addEventListener('change', this.handleFileChange);
    this.uploadButton?.addEventListener('click', this.handleUpload);
    this.list?.addEventListener('click', this.handleListClick);

    await this.refresh();
  }

  async refresh(): Promise<void> {
    if (!this.list) return;
    let result;
    try {
      result = await this.api.listAdminStories(this.options.httpOptions);
    } catch (err) {
      this.showError(`Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`);
      return;
    }
    if (!result.ok) {
      this.showError(`Could not load stories (${result.error}).`);
      return;
    }
    this.clearError();
    this.renderRows(result.value.stories);
  }

  unmount(): void {
    if (!this.container) return;
    this.fileInput?.removeEventListener('change', this.handleFileChange);
    this.uploadButton?.removeEventListener('click', this.handleUpload);
    this.list?.removeEventListener('click', this.handleListClick);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.list = null;
    this.fileInput = null;
    this.uploadButton = null;
    this.errorElement = null;
  }

  private renderRows(stories: AdminStoryEntry[]): void {
    if (!this.list) return;
    const doc = this.list.ownerDocument;
    this.list.replaceChildren();
    if (stories.length === 0) {
      const empty = doc.createElement('li');
      empty.textContent = 'No stories installed.';
      empty.setAttribute('data-role', 'admin-stories-empty');
      this.list.appendChild(empty);
      return;
    }
    for (const s of stories) {
      const li = doc.createElement('li');
      li.setAttribute('data-story-id', s.storyId);
      li.setAttribute('data-version', s.version);
      const label = doc.createElement('span');
      label.textContent = `${s.title} (${s.storyId}@${s.version})`;
      const removeBtn = doc.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('data-action', 'remove');
      removeBtn.textContent = 'Remove';
      li.append(label, removeBtn);
      if (!s.active) {
        const flag = doc.createElement('em');
        flag.textContent = ' (inactive)';
        li.appendChild(flag);
      }
      this.list.appendChild(li);
    }
  }

  private readonly handleFileChange = (): void => {
    if (this.uploadButton) {
      this.uploadButton.disabled = !this.fileInput?.files?.length;
    }
  };

  private readonly handleUpload = async (): Promise<void> => {
    const file = this.fileInput?.files?.[0];
    if (!file) return;
    if (this.uploadButton) this.uploadButton.disabled = true;
    this.clearError();
    try {
      const buffer = await file.arrayBuffer();
      const result = await this.api.uploadAdminStory(
        buffer,
        this.options.httpOptions
      );
      if (!result.ok) {
        this.showError(
          `Upload failed: ${result.error}${result.detail ? `:${result.detail}` : ''}`
        );
        return;
      }
      if (this.fileInput) this.fileInput.value = '';
      await this.refresh();
    } catch (err) {
      this.showError(
        `Upload failed (${err instanceof Error ? err.message : 'unknown error'}).`
      );
    } finally {
      if (this.uploadButton) {
        this.uploadButton.disabled = !this.fileInput?.files?.length;
      }
    }
  };

  private readonly handleListClick = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement | null;
    if (target?.getAttribute('data-action') !== 'remove') return;
    const row = target.closest('[data-story-id]') as HTMLElement | null;
    const storyId = row?.getAttribute('data-story-id');
    if (!storyId) return;
    const result = await this.api.removeAdminStory(
      storyId,
      this.options.httpOptions
    );
    if (!result.ok) {
      this.showError(`Could not remove ${storyId}: ${result.error}.`);
      return;
    }
    await this.refresh();
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
