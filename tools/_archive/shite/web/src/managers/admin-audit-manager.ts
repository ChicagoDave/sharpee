/**
 * @module zifmia/web/managers/admin-audit-manager
 * @purpose Admin Audit tab: lists `AuditEntry` rows with a "Load more"
 *   pager driven by `sinceTs`. Each load passes the timestamp of the
 *   oldest currently-rendered entry; the server returns the next page.
 *   Latest-first ordering on the server keeps the UX consistent.
 * @owner Zifmia web client.
 */

import { listAdminAudit } from '../api/admin';
import type { HttpClientOptions } from '../api/http';
import type { AdminAuditEntry } from '../api/types';

const PAGE_SIZE = 50;

export interface AdminAuditManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  api?: {
    listAdminAudit: typeof listAdminAudit;
  };
}

export class AdminAuditManager {
  private readonly options: AdminAuditManagerOptions;
  private readonly api: NonNullable<AdminAuditManagerOptions['api']>;
  private container: HTMLElement | null = null;
  private list: HTMLOListElement | null = null;
  private loadMoreBtn: HTMLButtonElement | null = null;
  private errorElement: HTMLElement | null = null;
  private renderedEntries: AdminAuditEntry[] = [];

  constructor(options: AdminAuditManagerOptions) {
    this.options = options;
    this.api = options.api ?? { listAdminAudit };
  }

  async mount(): Promise<void> {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'admin-audit');
    container.innerHTML = `
      <header class="sharpee-admin-tab-header">
        <h2>Audit log</h2>
      </header>
      <p data-role="admin-audit-error" class="sharpee-admin-tab-error" hidden></p>
      <ol data-role="admin-audit-list" class="sharpee-admin-audit-list"></ol>
      <button data-role="admin-audit-more" type="button" disabled>Load more</button>
    `;
    this.options.root.appendChild(container);
    this.container = container;
    this.list = container.querySelector('[data-role="admin-audit-list"]');
    this.loadMoreBtn = container.querySelector('[data-role="admin-audit-more"]');
    this.errorElement = container.querySelector('[data-role="admin-audit-error"]');
    this.loadMoreBtn?.addEventListener('click', this.handleLoadMore);
    await this.loadInitial();
  }

  unmount(): void {
    if (!this.container) return;
    this.loadMoreBtn?.removeEventListener('click', this.handleLoadMore);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.list = null;
    this.loadMoreBtn = null;
    this.errorElement = null;
    this.renderedEntries = [];
  }

  private async loadInitial(): Promise<void> {
    const result = await this.fetchPage(undefined);
    if (!result) return;
    this.renderedEntries = result;
    this.renderAll();
    if (this.loadMoreBtn) {
      this.loadMoreBtn.disabled = result.length < PAGE_SIZE;
    }
  }

  private readonly handleLoadMore = async (): Promise<void> => {
    if (this.renderedEntries.length === 0) return;
    const oldest = this.renderedEntries[this.renderedEntries.length - 1];
    const result = await this.fetchPage(oldest.ts);
    if (!result) return;
    this.renderedEntries = [...this.renderedEntries, ...result];
    this.renderAll();
    if (this.loadMoreBtn) {
      this.loadMoreBtn.disabled = result.length < PAGE_SIZE;
    }
  };

  private async fetchPage(
    sinceTs: number | undefined
  ): Promise<AdminAuditEntry[] | null> {
    let result;
    try {
      result = await this.api.listAdminAudit(
        { sinceTs, limit: PAGE_SIZE },
        this.options.httpOptions
      );
    } catch (err) {
      this.showError(
        `Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`
      );
      return null;
    }
    if (!result.ok) {
      this.showError(`Could not load audit (${result.error}).`);
      return null;
    }
    this.clearError();
    return result.value.entries;
  }

  private renderAll(): void {
    if (!this.list) return;
    const doc = this.list.ownerDocument;
    this.list.replaceChildren();
    for (const entry of this.renderedEntries) {
      const li = doc.createElement('li');
      li.setAttribute('data-audit-id', entry.id);
      const ts = new Date(entry.ts).toISOString();
      const actor = entry.actorId ?? 'system';
      li.textContent = `[${ts}] ${entry.action} (${entry.targetKind}=${entry.targetId}) by ${actor}`;
      this.list.appendChild(li);
    }
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
}
