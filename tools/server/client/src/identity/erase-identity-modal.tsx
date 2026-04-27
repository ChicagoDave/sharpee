/**
 * EraseIdentityModal — Handle-typed confirmation gate for the irreversible
 * `POST /api/identities/erase` flow (ADR-161 Phase E).
 *
 * Public interface: {@link EraseIdentityModal} default export,
 * {@link EraseIdentityModalProps}.
 *
 * Bounded context: client identity management. Wraps the destructive
 * server call in a deliberate-action gate: the Confirm button stays
 * disabled until the user types the exact Handle shown in the modal
 * (case-sensitive, GitHub-style). On server success the panel calls
 * {@link clearStoredIdentity}; the resulting same-tab notification
 * reaches App's identity subscriber and re-renders back to the
 * `IdentitySetupPanel` banner without an explicit callback chain.
 *
 * Server error mapping:
 *   - `bad_passcode` / `unknown_handle` — the stored identity is no longer
 *     valid; surface a single "reload and set up a new identity" alert.
 *   - `rate_limited` — try again shortly.
 *   - other ApiError — show the server detail.
 *   - non-ApiError — generic network-error alert.
 *
 * Cross-tab erase race: if another tab erases between modal-open and
 * Confirm, the server call returns `unknown_handle` / `bad_passcode`,
 * which we map to the reload alert. The cross-tab subscriber will also
 * unmount this modal as soon as it processes the `storage` event.
 */

import { useCallback, useState } from 'react';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { ApiError, eraseIdentity as apiEraseIdentity } from '../api/http';
import type { EraseIdentityRequest, EraseIdentityResponse } from '../types/api';
import { clearStoredIdentity, type StoredIdentity } from './identity-store';

export interface EraseIdentityModalProps {
  /** Currently-stored identity. The modal shows `handle` for retyping. */
  identity: StoredIdentity;
  /** Called on cancel, Esc, backdrop click, or close-button click. */
  onClose: () => void;
  /** Test override: replaces the real `POST /api/identities/erase` call. */
  eraseIdentityFn?: (
    body: EraseIdentityRequest,
  ) => Promise<EraseIdentityResponse>;
}

export default function EraseIdentityModal({
  identity,
  onClose,
  eraseIdentityFn = apiEraseIdentity,
}: EraseIdentityModalProps): JSX.Element {
  const [typed, setTyped] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const matches = typed === identity.handle;

  const close = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [submitting, onClose]);

  const submit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!matches) return;

      setFormError(null);
      setSubmitting(true);
      try {
        await eraseIdentityFn({
          handle: identity.handle,
          passcode: identity.passcode,
        });
        clearStoredIdentity();
        // The same-tab identity-change event will unmount the parent
        // panel and this modal with it — no explicit close needed.
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'bad_passcode' || err.code === 'unknown_handle') {
            setFormError(
              'Your stored identity is no longer valid. Reload and set up a new identity.',
            );
          } else if (err.code === 'rate_limited') {
            setFormError('Too many attempts. Please wait a minute and try again.');
          } else {
            setFormError(err.detail);
          }
        } else {
          setFormError('Network error — please try again.');
        }
        setSubmitting(false);
      }
    },
    [matches, identity, eraseIdentityFn],
  );

  return (
    <Modal
      title="Erase identity"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="erase-identity-form"
            disabled={!matches || submitting}
            style={{
              background: 'var(--sharpee-error, #b14b4b)',
              borderColor: 'var(--sharpee-error, #b14b4b)',
            }}
          >
            {submitting ? 'Erasing…' : 'Erase identity'}
          </Button>
        </>
      }
    >
      <form id="erase-identity-form" onSubmit={submit} noValidate>
        <p style={{ marginTop: 0 }}>
          Erasing your identity is{' '}
          <strong>permanent and cannot be undone</strong>. Any rooms you
          host will close immediately. Your handle will become available
          for someone else to claim.
        </p>

        {formError && (
          <div
            role="alert"
            style={{
              marginBottom: 'var(--sharpee-spacing-md)',
              padding: 'var(--sharpee-spacing-sm) var(--sharpee-spacing-md)',
              border: '1px solid var(--sharpee-error)',
              color: 'var(--sharpee-error)',
              borderRadius: 'var(--sharpee-border-radius)',
            }}
          >
            {formError}
          </div>
        )}

        <label
          htmlFor="erase-confirm-handle"
          style={{
            display: 'block',
            fontWeight: 600,
            fontSize: '0.9em',
            marginBottom: 4,
          }}
        >
          Type your handle <strong>{identity.handle}</strong> to confirm
        </label>
        <input
          id="erase-confirm-handle"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="erase-confirm-hint"
          style={{
            width: '100%',
            padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            background: 'var(--sharpee-bg-secondary)',
            color: 'var(--sharpee-text)',
            font: 'inherit',
          }}
        />
        <div
          id="erase-confirm-hint"
          style={{
            fontSize: '0.8em',
            color: 'var(--sharpee-text-muted)',
            marginTop: 4,
          }}
        >
          Case-sensitive. The Erase button stays disabled until the typed
          value matches.
        </div>
      </form>
    </Modal>
  );
}
