/**
 * @module zifmia/web/managers/admin-identities-manager
 * @purpose Admin Identities tab: handle lookup + admin-driven erase.
 *   The admin types a handle, server returns the matching identity
 *   (or none), and an Erase button POSTs to the erase endpoint.
 *   The user re-claims their handle (or picks a different one) via
 *   the lobby's identity form.
 * @owner Zifmia web client.
 *
 * Per the 2026-05-12 ADR-161 amendment: there's no passcode to
 * reset. "Rescue the user" = admin erases the row, user re-claims
 * the handle. No plaintext-once dialog, no copy button.
 */

import { eraseAdminIdentity, lookupAdminIdentities } from '../api/admin';
import type { HttpClientOptions } from '../api/http';
import type { AdminIdentitySummary } from '../api/types';

export interface AdminIdentitiesManagerOptions {
  root: HTMLElement;
  httpOptions: HttpClientOptions;
  api?: {
    lookupAdminIdentities: typeof lookupAdminIdentities;
    eraseAdminIdentity: typeof eraseAdminIdentity;
  };
}

export class AdminIdentitiesManager {
  private readonly options: AdminIdentitiesManagerOptions;
  private readonly api: NonNullable<AdminIdentitiesManagerOptions['api']>;
  private container: HTMLElement | null = null;
  private form: HTMLFormElement | null = null;
  private resultElement: HTMLElement | null = null;
  private errorElement: HTMLElement | null = null;
  private currentIdentity: AdminIdentitySummary | null = null;

  constructor(options: AdminIdentitiesManagerOptions) {
    this.options = options;
    this.api = options.api ?? { lookupAdminIdentities, eraseAdminIdentity };
  }

  mount(): void {
    if (this.container) return;
    const doc = this.options.root.ownerDocument;
    const container = doc.createElement('div');
    container.setAttribute('data-role', 'admin-identities');
    container.innerHTML = `
      <header class="sharpee-admin-tab-header">
        <h2>Identities</h2>
      </header>
      <form data-role="admin-identities-form" class="sharpee-admin-identities-form" novalidate>
        <label>
          Handle
          <input data-role="admin-identities-handle" name="target" type="text" autocomplete="off" required />
        </label>
        <button type="submit">Look up</button>
      </form>
      <p data-role="admin-identities-error" class="sharpee-admin-tab-error" hidden></p>
      <div data-role="admin-identities-result" hidden></div>
    `;
    this.options.root.appendChild(container);
    this.container = container;
    this.form = container.querySelector('[data-role="admin-identities-form"]');
    this.resultElement = container.querySelector('[data-role="admin-identities-result"]');
    this.errorElement = container.querySelector('[data-role="admin-identities-error"]');

    this.form?.addEventListener('submit', this.handleSubmit);
    this.resultElement?.addEventListener('click', this.handleResultClick);
  }

  unmount(): void {
    if (!this.container) return;
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.resultElement?.removeEventListener('click', this.handleResultClick);
    this.container.parentNode?.removeChild(this.container);
    this.container = null;
    this.form = null;
    this.resultElement = null;
    this.errorElement = null;
    this.currentIdentity = null;
  }

  private readonly handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const form = this.form;
    if (!form) return;
    const target = String(new FormData(form).get('target') ?? '').trim();
    if (target.length === 0) {
      this.showError('Enter a handle.');
      return;
    }
    this.clearError();
    let result;
    try {
      result = await this.api.lookupAdminIdentities(target, this.options.httpOptions);
    } catch (err) {
      this.showError(
        `Could not reach the server (${err instanceof Error ? err.message : 'network error'}).`
      );
      return;
    }
    if (!result.ok) {
      this.showError(`Lookup failed: ${result.error}.`);
      return;
    }
    this.renderResult(result.value.identities[0] ?? null);
  };

  private renderResult(identity: AdminIdentitySummary | null): void {
    const target = this.resultElement;
    if (!target) return;
    const doc = target.ownerDocument;
    target.replaceChildren();
    target.hidden = false;
    if (!identity) {
      this.currentIdentity = null;
      const p = doc.createElement('p');
      p.textContent = 'No identity with that handle.';
      p.setAttribute('data-role', 'admin-identities-empty');
      target.appendChild(p);
      return;
    }
    this.currentIdentity = identity;
    const wrapper = doc.createElement('div');
    wrapper.setAttribute('data-role', 'admin-identities-card');
    const label = doc.createElement('span');
    label.textContent = `${identity.handle}${identity.isAdmin ? ' (admin)' : ''}`;
    const idSmall = doc.createElement('small');
    idSmall.textContent = identity.id;
    const eraseBtn = doc.createElement('button');
    eraseBtn.type = 'button';
    eraseBtn.setAttribute('data-action', 'erase');
    eraseBtn.textContent = 'Erase identity';
    wrapper.append(label, idSmall, eraseBtn);
    target.appendChild(wrapper);
  }

  private readonly handleResultClick = async (event: Event): Promise<void> => {
    const target = event.target as HTMLElement | null;
    if (target?.getAttribute('data-action') !== 'erase') return;
    const identity = this.currentIdentity;
    if (!identity) return;
    const result = await this.api.eraseAdminIdentity(
      identity.id,
      this.options.httpOptions
    );
    if (!result.ok) {
      this.showError(`Erase failed: ${result.error}.`);
      return;
    }
    // After erase the row is gone — clear the rendered card.
    this.renderResult(null);
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
