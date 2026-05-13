/**
 * IdentityClaim view — handle entry + erase, persisted to localStorage.
 *
 * Public interface: {@link mountIdentityPanel}.
 * Owner: web client.
 *
 * Per ADR-177 §5 the handle IS the credential. No password, no
 * confirm step. Erase deletes the row and frees the handle.
 */

import { HttpError, type HttpClient } from '../http-client.js';
import {
  readStoredIdentity,
  writeStoredIdentity,
  clearStoredIdentity,
  type StoredIdentity
} from '../identity-store.js';

export interface IdentityPanelHandlers {
  /** Called whenever localStorage identity changes; consumers re-route. */
  onIdentityChange: (identity: StoredIdentity | undefined) => void;
}

export function mountIdentityPanel(parent: HTMLElement, http: HttpClient, handlers: IdentityPanelHandlers): void {
  const stored = readStoredIdentity();

  parent.replaceChildren();
  const panel = document.createElement('div');
  panel.className = 'sharpee-identity-panel';

  const heading = document.createElement('h1');
  heading.textContent = 'Sharpee Multi-user';
  panel.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.textContent = stored
    ? `Identified as ${stored.handle}. Claim a different handle below, or erase the current one.`
    : 'Claim a handle (3-12 letters) to enter the lobby.';
  panel.appendChild(blurb);

  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'handle';
  input.placeholder = 'handle';
  input.required = true;
  input.minLength = 3;
  input.maxLength = 12;
  input.pattern = '[A-Za-z]{3,12}';
  form.appendChild(input);

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = stored ? 'Switch' : 'Claim';
  form.appendChild(submitButton);
  panel.appendChild(form);

  const errorRow = document.createElement('div');
  errorRow.className = 'sharpee-error';
  panel.appendChild(errorRow);

  const setError = (message: string) => { errorRow.textContent = message; };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setError('');
    const handle = input.value.trim();
    if (!/^[A-Za-z]{3,12}$/.test(handle)) {
      setError('Handle must be 3-12 ASCII letters.');
      return;
    }
    submitButton.disabled = true;
    try {
      const identity = await http.claimIdentity(handle);
      writeStoredIdentity({ id: identity.id, handle: identity.handle });
      handlers.onIdentityChange({ id: identity.id, handle: identity.handle });
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) setError('Handle is already taken.');
      else if (err instanceof HttpError && err.status === 400) setError('Invalid handle.');
      else setError('Could not claim handle. Try again.');
    } finally {
      submitButton.disabled = false;
    }
  });

  if (stored) {
    const eraseButton = document.createElement('button');
    eraseButton.type = 'button';
    eraseButton.className = 'sharpee-danger';
    eraseButton.textContent = `Erase ${stored.handle}`;
    eraseButton.style.marginTop = '1rem';
    eraseButton.addEventListener('click', async () => {
      setError('');
      eraseButton.disabled = true;
      try {
        await http.eraseIdentity(stored.handle);
        clearStoredIdentity();
        handlers.onIdentityChange(undefined);
      } catch {
        setError('Erase failed. Try again.');
      } finally {
        eraseButton.disabled = false;
      }
    });
    panel.appendChild(eraseButton);
  }

  parent.appendChild(panel);
  input.focus();
}
