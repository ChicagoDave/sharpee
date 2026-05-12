/**
 * @module zifmia/web/managers/admin-manager
 * @purpose Orchestrator for the `#admin` hash route. Builds the
 *   `AdminView`, switches between the four tab managers (Stories,
 *   Rooms, Identities, Audit), and enforces the admin gate by
 *   `GET /identity/me` before exposing any UI.
 * @owner Zifmia web client.
 */

import { getMe } from '../api/identity';
import type { HttpClientOptions } from '../api/http';
import type { IdentityMe } from '../api/types';
import { AdminAuditManager } from './admin-audit-manager';
import { AdminIdentitiesManager } from './admin-identities-manager';
import { AdminRoomsManager } from './admin-rooms-manager';
import { AdminStoriesManager } from './admin-stories-manager';
import { AdminView, type AdminTabId } from '../views/admin';

export interface AdminManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  /** Fired when the gate fails (no session / non-admin token). The
   * shell (main.ts) typically clears `location.hash` so the
   * hashchange listener falls back to the lobby. */
  onAccessDenied: () => void;
  /** Fired when the admin clicks the "Back to lobby" affordance. */
  onLeave: () => void;
  /** Optional override for tests — bypass the live `getMe` round trip. */
  deps?: {
    getMe?: typeof getMe;
  };
}

interface ActiveTab {
  unmount(): void;
}

export class AdminManager {
  private readonly options: AdminManagerOptions;
  private readonly api: { getMe: typeof getMe };
  private view: AdminView | null = null;
  private activeTab: ActiveTab | null = null;
  private mounted = false;

  constructor(options: AdminManagerOptions) {
    this.options = options;
    this.api = { getMe: options.deps?.getMe ?? getMe };
  }

  /**
   * Build the view (after admin gate passes) and mount the default
   * tab (Stories). Idempotent — a second call no-ops if the view is
   * already up.
   */
  async enter(): Promise<void> {
    if (this.mounted) return;
    let me: IdentityMe;
    try {
      const result = await this.api.getMe(this.options.httpOptions);
      if (!result.ok) {
        this.options.onAccessDenied();
        return;
      }
      me = result.value;
    } catch {
      this.options.onAccessDenied();
      return;
    }
    if (!me.isAdmin) {
      this.options.onAccessDenied();
      return;
    }
    this.mounted = true;

    this.view = new AdminView({
      root: this.options.root,
      onTabChange: (id) => this.switchTab(id),
      onLeave: () => this.options.onLeave()
    });
    this.view.mount();
    await this.switchTab(this.view.getActiveTab());
  }

  unmount(): void {
    this.activeTab?.unmount();
    this.activeTab = null;
    this.view?.unmount();
    this.view = null;
    this.mounted = false;
  }

  private async switchTab(id: AdminTabId): Promise<void> {
    if (!this.view) return;
    const slots = this.view.mount();
    this.activeTab?.unmount();
    this.activeTab = null;
    switch (id) {
      case 'stories': {
        const mgr = new AdminStoriesManager({
          root: slots.content,
          httpOptions: this.options.httpOptions
        });
        this.activeTab = mgr;
        await mgr.mount();
        break;
      }
      case 'rooms': {
        const mgr = new AdminRoomsManager({
          root: slots.content,
          httpOptions: this.options.httpOptions
        });
        this.activeTab = mgr;
        await mgr.mount();
        break;
      }
      case 'identities': {
        const mgr = new AdminIdentitiesManager({
          root: slots.content,
          httpOptions: this.options.httpOptions
        });
        this.activeTab = mgr;
        mgr.mount();
        break;
      }
      case 'audit': {
        const mgr = new AdminAuditManager({
          root: slots.content,
          httpOptions: this.options.httpOptions
        });
        this.activeTab = mgr;
        await mgr.mount();
        break;
      }
    }
  }
}
