/**
 * @module zifmia/web/managers/identity-manager
 * @purpose Renders the `.sharpee-identity-form` (ADR-176) and drives
 *   register / login round trips against the Zifmia API. On success,
 *   persists the session via `SessionStore` and notifies an upstream
 *   callback so the shell can transition to the lobby. On failure,
 *   surfaces the server-provided error code inside the form without
 *   ever throwing into the page.
 * @owner Zifmia web client.
 *
 * The manager is framework-free: it owns a single `<form>` element
 * (built once on `mount()`), wires its own listeners, and exposes a
 * single subscription surface (`onAuthenticated`). Tests construct
 * it against a jsdom `document` and a stub HTTP client.
 */

import * as identityApi from '../api/identity';
import type { HttpClientOptions } from '../api/http';
import { SessionStore, type PersistedSession } from '../session-store';

export type IdentityMode = 'login' | 'register';

export interface IdentityManagerOptions {
  /** Mount target — the manager appends its `<form>` here. */
  root: HTMLElement;
  /** HTTP options forwarded to every `identityApi` call. The
   * `baseUrl` defaults to the page origin in production; tests inject
   * `http://127.0.0.1:<port>` plus a custom `fetchImpl`. */
  httpOptions?: HttpClientOptions;
  /** Persistence layer (defaults to `localStorage`-backed). */
  sessionStore?: SessionStore;
  /** Fires after a successful register or login round trip. The
   * persisted session has already been written to storage. */
  onAuthenticated: (session: PersistedSession) => void;
  /** Optional override of `register`/`login` for tests that want to
   * isolate the manager from the network entirely. */
  api?: {
    register: typeof identityApi.register;
    login: typeof identityApi.login;
  };
}

/**
 * IdentityManager — login/register form.
 *
 * Public surface:
 * - `mount()` — build and attach the form element to the root. Idempotent.
 * - `setMode(mode)` — switch between login and register tabs.
 * - `unmount()` — remove the form and detach listeners.
 */
export class IdentityManager {
  private readonly options: IdentityManagerOptions;
  private readonly sessionStore: SessionStore;
  private readonly api: {
    register: typeof identityApi.register;
    login: typeof identityApi.login;
  };
  private mode: IdentityMode = 'login';
  private formElement: HTMLFormElement | null = null;
  private errorElement: HTMLElement | null = null;
  private titleElement: HTMLElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private modeToggle: HTMLButtonElement | null = null;

  constructor(options: IdentityManagerOptions) {
    this.options = options;
    this.sessionStore = options.sessionStore ?? new SessionStore();
    this.api = options.api ?? { register: identityApi.register, login: identityApi.login };
  }

  /** Build the form DOM and attach to `options.root`. Idempotent. */
  mount(): void {
    if (this.formElement) return;
    const form = this.options.root.ownerDocument.createElement('form');
    form.className = 'sharpee-identity-form';
    form.setAttribute('novalidate', '');
    form.innerHTML = renderFormHtml();
    this.options.root.appendChild(form);

    this.formElement = form;
    this.errorElement = form.querySelector('[data-role="error"]');
    this.titleElement = form.querySelector('[data-role="title"]');
    this.submitButton = form.querySelector('[data-role="submit"]');
    this.modeToggle = form.querySelector('[data-role="mode-toggle"]');

    form.addEventListener('submit', this.handleSubmit);
    this.modeToggle?.addEventListener('click', this.handleModeToggle);

    this.applyMode();
  }

  /** Switch tabs. */
  setMode(mode: IdentityMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.applyMode();
    this.clearError();
  }

  /** Detach. Safe to call without mount. */
  unmount(): void {
    if (!this.formElement) return;
    this.formElement.removeEventListener('submit', this.handleSubmit);
    this.modeToggle?.removeEventListener('click', this.handleModeToggle);
    // Detach via parentNode so an already-detached form (e.g., the
    // caller cleared `root.innerHTML` earlier) is a no-op rather than
    // a DOM exception. `Element.remove()` is supposed to be idempotent
    // by spec, but happy-dom throws on detached nodes.
    this.formElement.parentNode?.removeChild(this.formElement);
    this.formElement = null;
    this.errorElement = null;
    this.titleElement = null;
    this.submitButton = null;
    this.modeToggle = null;
  }

  private readonly handleSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();
    const form = this.formElement;
    if (!form) return;
    const data = new FormData(form);
    const handle = String(data.get('handle') ?? '').trim();
    const passcode = String(data.get('passcode') ?? '');

    if (handle.length === 0 || passcode.length === 0) {
      this.showError('Enter a handle and a passcode.');
      return;
    }

    this.setSubmitting(true);
    this.clearError();

    const result =
      this.mode === 'register'
        ? await this.api.register({ handle, passcode }, this.options.httpOptions)
        : await this.api.login({ handle, passcode }, this.options.httpOptions);

    this.setSubmitting(false);

    if (!result.ok) {
      this.showError(messageForError(this.mode, result.error, result.detail));
      return;
    }

    const session: PersistedSession = {
      id: result.value.id,
      handle: result.value.handle,
      sessionToken: result.value.sessionToken
    };
    this.sessionStore.save(session);
    this.options.onAuthenticated(session);
  };

  private readonly handleModeToggle = (event: Event): void => {
    event.preventDefault();
    this.setMode(this.mode === 'login' ? 'register' : 'login');
  };

  private applyMode(): void {
    if (this.titleElement) {
      this.titleElement.textContent = this.mode === 'login' ? 'Sign in' : 'Create account';
    }
    if (this.submitButton) {
      this.submitButton.textContent = this.mode === 'login' ? 'Sign in' : 'Register';
    }
    if (this.modeToggle) {
      this.modeToggle.textContent =
        this.mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in';
    }
  }

  private setSubmitting(submitting: boolean): void {
    if (this.submitButton) this.submitButton.disabled = submitting;
    if (this.modeToggle) this.modeToggle.disabled = submitting;
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

function renderFormHtml(): string {
  return `
    <h1 data-role="title" class="sharpee-identity-form-title"></h1>
    <label class="sharpee-identity-form-field">
      <span>Handle</span>
      <input
        name="handle"
        type="text"
        autocomplete="username"
        autocapitalize="none"
        spellcheck="false"
        minlength="3"
        maxlength="40"
        required
      />
    </label>
    <label class="sharpee-identity-form-field">
      <span>Passcode</span>
      <input
        name="passcode"
        type="password"
        autocomplete="current-password"
        minlength="8"
        maxlength="256"
        required
      />
    </label>
    <p data-role="error" class="sharpee-identity-form-error" hidden></p>
    <button data-role="submit" type="submit"></button>
    <button data-role="mode-toggle" type="button"></button>
  `;
}

/**
 * Translate a server error envelope into user-visible copy. The map
 * is small and deliberately favors familiarity (AC-11 already
 * compresses login failures to "invalid_credentials").
 */
function messageForError(mode: IdentityMode, error: string, detail?: string): string {
  if (mode === 'register') {
    if (error === 'handle_taken') return 'That handle is taken.';
    if (error === 'invalid_body') return 'Handle or passcode is invalid.';
  }
  if (mode === 'login' && error === 'invalid_credentials') {
    return 'Invalid handle or passcode.';
  }
  if (detail) return `${error}: ${detail}`;
  return error;
}
