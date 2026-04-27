/**
 * First-visit identity setup — banner rendered above Landing/Room when no
 * identity is stored.
 *
 * Public interface: {@link IdentitySetupPanel} default export,
 * {@link IdentitySetupPanelProps}.
 *
 * Bounded context: client identity onboarding (ADR-161 R11). Two
 * affordances side-by-side:
 *
 *   1. **Create Identity** — a Handle text input that posts to
 *      `POST /api/identities`. The server returns `(id, handle, passcode)`;
 *      we persist the triple and signal the parent.
 *
 *   2. **Upload Identity (CSV)** — a file picker that parses a previously
 *      downloaded `(id, handle, passcode)` CSV and posts to
 *      `POST /api/identities/upload`. The server returns the canonical
 *      `(id, handle)`; we store the triple (passcode unchanged from the
 *      file) and signal the parent.
 *
 * No "save your secret" copy gate — the user has the file via download
 * (Phase E) when they need it. This panel does not block the user with
 * modal acknowledgements.
 *
 * Error mapping is per-affordance: server codes (`handle_taken`,
 * `bad_passcode`, `id_mismatch`, `malformed_id`, `invalid_handle`) become
 * inline copy on the offending field; network failures become a
 * form-level alert with retry copy.
 */

import { useCallback, useState } from 'react';
import Button from '../components/Button';
import {
  ApiError,
  createIdentity as apiCreateIdentity,
  uploadIdentity as apiUploadIdentity,
} from '../api/http';
import type {
  CreateIdentityRequest,
  CreateIdentityResponse,
  UploadIdentityRequest,
  UploadIdentityResponse,
} from '../types/api';
import {
  storeIdentity,
  type StoredIdentity,
} from './identity-store';
import { parseIdentityCsv, type IdentityCsvError } from './csv';

export interface IdentitySetupPanelProps {
  /** Called once the identity has been persisted, with the fresh triple. */
  onIdentityEstablished: (identity: StoredIdentity) => void;
  /** Test override: replaces the real POST /api/identities call. */
  createIdentityFn?: (
    body: CreateIdentityRequest,
  ) => Promise<CreateIdentityResponse>;
  /** Test override: replaces the real POST /api/identities/upload call. */
  uploadIdentityFn?: (
    body: UploadIdentityRequest,
  ) => Promise<UploadIdentityResponse>;
}

const HANDLE_MIN = 3;
const HANDLE_MAX = 12;
const HANDLE_PATTERN = /^[A-Za-z]+$/;

const CSV_ERROR_COPY: Record<IdentityCsvError, string> = {
  empty_input: 'The file is empty.',
  wrong_column_count: 'Expected one row of three fields (id, handle, passcode).',
  missing_field: 'A field is missing or blank.',
  malformed_id: 'The id field is malformed (expected XXXX-XXXX).',
  invalid_handle: 'The handle is invalid (3–12 letters only).',
  malformed_passcode: 'The passcode field is empty.',
};

export default function IdentitySetupPanel({
  onIdentityEstablished,
  createIdentityFn = apiCreateIdentity,
  uploadIdentityFn = apiUploadIdentity,
}: IdentitySetupPanelProps): JSX.Element {
  // ---------- Create Identity state ----------
  const [handle, setHandle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // ---------- Upload Identity state ----------
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  const submitCreate = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = handle.trim();
      if (!trimmed) {
        setCreateError('Handle is required.');
        return;
      }
      if (trimmed.length < HANDLE_MIN || trimmed.length > HANDLE_MAX) {
        setCreateError(`Handle must be ${HANDLE_MIN}–${HANDLE_MAX} characters.`);
        return;
      }
      if (!HANDLE_PATTERN.test(trimmed)) {
        setCreateError('Handle must be letters only.');
        return;
      }

      setCreateError(null);
      setCreateSubmitting(true);
      try {
        const res = await createIdentityFn({ handle: trimmed });
        const triple: StoredIdentity = {
          id: res.id,
          handle: res.handle,
          passcode: res.passcode,
        };
        storeIdentity(triple);
        onIdentityEstablished(triple);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'handle_taken') {
            setCreateError('That handle is already taken — pick another.');
          } else if (err.code === 'invalid_handle' || err.code === 'missing_field') {
            setCreateError(err.detail);
          } else if (err.code === 'rate_limited') {
            setCreateError('Too many attempts. Please wait a minute and try again.');
          } else {
            setCreateError(err.detail);
          }
        } else {
          setCreateError('Network error — please try again.');
        }
      } finally {
        setCreateSubmitting(false);
      }
    },
    [handle, createIdentityFn, onIdentityEstablished],
  );

  const submitUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      setUploadSubmitting(true);
      try {
        const text = await file.text();
        const parsed = parseIdentityCsv(text);
        if (!parsed.ok) {
          setUploadError(CSV_ERROR_COPY[parsed.error]);
          return;
        }
        const res = await uploadIdentityFn({
          id: parsed.id,
          handle: parsed.handle,
          passcode: parsed.passcode,
        });
        // Server canonicalises (id, handle); passcode comes from the CSV
        // and is what we'll need for future authentication.
        const triple: StoredIdentity = {
          id: res.id,
          handle: res.handle,
          passcode: parsed.passcode,
        };
        storeIdentity(triple);
        onIdentityEstablished(triple);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === 'bad_passcode') {
            setUploadError('That passcode does not match the identity on file.');
          } else if (err.code === 'handle_taken') {
            setUploadError(
              'A different identity already owns that handle on this server.',
            );
          } else if (err.code === 'id_mismatch') {
            setUploadError('The id and handle do not refer to the same identity.');
          } else if (err.code === 'malformed_id' || err.code === 'invalid_handle') {
            setUploadError(err.detail);
          } else if (err.code === 'rate_limited') {
            setUploadError('Too many attempts. Please wait a minute and try again.');
          } else {
            setUploadError(err.detail);
          }
        } else {
          setUploadError('Network error — please try again.');
        }
      } finally {
        setUploadSubmitting(false);
      }
    },
    [uploadIdentityFn, onIdentityEstablished],
  );

  return (
    <section
      aria-label="Set up your Sharpee identity"
      style={{
        border: '1px solid var(--sharpee-border)',
        borderRadius: 'var(--sharpee-border-radius)',
        padding: 'var(--sharpee-spacing-lg)',
        background: 'var(--sharpee-bg-secondary)',
        margin: 'var(--sharpee-spacing-md) auto',
        maxWidth: 960,
      }}
    >
      <header style={{ marginBottom: 'var(--sharpee-spacing-md)' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Set up your identity</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--sharpee-text-muted)' }}>
          Pick a handle to create a new identity, or upload a previously
          downloaded identity file to reuse one.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gap: 'var(--sharpee-spacing-lg)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        }}
      >
        {/* ---------- Create Identity ---------- */}
        <form onSubmit={submitCreate} noValidate aria-label="Create identity">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Create identity</h3>
          <p
            style={{
              margin: '4px 0 var(--sharpee-spacing-sm)',
              color: 'var(--sharpee-text-muted)',
              fontSize: '0.85em',
            }}
          >
            The server generates a unique id and passcode for you.
          </p>

          <label
            htmlFor="identity-handle"
            style={{ fontWeight: 600, fontSize: '0.9em' }}
          >
            Handle
          </label>
          <input
            id="identity-handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="e.g. Alice"
            required
            aria-invalid={createError ? 'true' : undefined}
            style={fieldInputStyle}
          />
          {createError && (
            <div
              role="alert"
              style={{
                fontSize: '0.85em',
                color: 'var(--sharpee-error)',
                marginTop: 4,
              }}
            >
              {createError}
            </div>
          )}

          <Button
            variant="primary"
            type="submit"
            disabled={createSubmitting}
            style={{ marginTop: 'var(--sharpee-spacing-sm)' }}
          >
            {createSubmitting ? 'Creating…' : 'Create identity'}
          </Button>
        </form>

        {/* ---------- Upload Identity ---------- */}
        <div aria-label="Upload identity">
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Upload identity</h3>
          <p
            style={{
              margin: '4px 0 var(--sharpee-spacing-sm)',
              color: 'var(--sharpee-text-muted)',
              fontSize: '0.85em',
            }}
          >
            Pick the CSV file you downloaded from another browser or device.
          </p>

          <label
            htmlFor="identity-csv"
            style={{ fontWeight: 600, fontSize: '0.9em' }}
          >
            Identity file
          </label>
          <input
            id="identity-csv"
            type="file"
            accept=".csv,text/csv,text/plain"
            disabled={uploadSubmitting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void submitUpload(file);
                // Clear the input so picking the same file again re-triggers.
                e.target.value = '';
              }
            }}
            aria-invalid={uploadError ? 'true' : undefined}
            style={{ ...fieldInputStyle, padding: 'var(--sharpee-spacing-xs)' }}
          />
          {uploadError && (
            <div
              role="alert"
              style={{
                fontSize: '0.85em',
                color: 'var(--sharpee-error)',
                marginTop: 4,
              }}
            >
              {uploadError}
            </div>
          )}
          {uploadSubmitting && (
            <div
              role="status"
              aria-live="polite"
              style={{
                fontSize: '0.85em',
                color: 'var(--sharpee-text-muted)',
                marginTop: 4,
              }}
            >
              Uploading…
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const fieldInputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
  border: '1px solid var(--sharpee-border)',
  borderRadius: 'var(--sharpee-border-radius)',
  background: 'var(--sharpee-bg)',
  color: 'var(--sharpee-text)',
  font: 'inherit',
  marginTop: 4,
};
