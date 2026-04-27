/**
 * Persistent identity-management panel — rendered for identified users
 * (ADR-161 Phase E).
 *
 * Public interface: {@link IdentityPanel} default export,
 * {@link IdentityPanelProps}.
 *
 * Bounded context: client identity management. Surfaces only the user's
 * Handle in the DOM. The Id and passcode never render — they live in
 * localStorage and travel through the download flow as the file's contents.
 *
 * Affordances:
 *   1. **Download identity** — triggers a `sharpee-identity.csv` download
 *      using {@link formatIdentityCsv}. The browser save-as dialog handles
 *      destination; the panel does not mediate filesystem access.
 *   2. **Erase identity** — opens {@link EraseIdentityModal}; the modal
 *      gates the destructive `POST /api/identities/erase` call behind a
 *      Handle-typed confirmation. On server success the modal calls
 *      `clearStoredIdentity()`, App's same-tab subscriber re-renders, and
 *      this panel unmounts.
 *
 * Test overrides: `downloadFn` replaces the blob-and-anchor-click
 * pipeline; `eraseIdentityFn` is forwarded into the modal so callers can
 * stub the server call without mocking `fetch`.
 */

import { useCallback, useState } from 'react';
import Button from '../components/Button';
import { formatIdentityCsv } from './csv';
import type { StoredIdentity } from './identity-store';
import EraseIdentityModal from './erase-identity-modal';
import type { EraseIdentityRequest, EraseIdentityResponse } from '../types/api';

export interface IdentityPanelProps {
  /** The currently-stored identity. Render gating happens at the parent. */
  identity: StoredIdentity;
  /**
   * Test override: replaces the default browser-blob download pipeline.
   * Receives the filename the panel would offer and the CSV payload.
   */
  downloadFn?: (filename: string, content: string) => void;
  /** Test override forwarded into the EraseIdentityModal. */
  eraseIdentityFn?: (
    body: EraseIdentityRequest,
  ) => Promise<EraseIdentityResponse>;
}

const DOWNLOAD_FILENAME = 'sharpee-identity.csv';

export default function IdentityPanel({
  identity,
  downloadFn = defaultDownload,
  eraseIdentityFn,
}: IdentityPanelProps): JSX.Element {
  const [eraseOpen, setEraseOpen] = useState(false);

  const handleDownload = useCallback(() => {
    downloadFn(DOWNLOAD_FILENAME, formatIdentityCsv(identity));
  }, [identity, downloadFn]);

  return (
    <section
      aria-label="Identity"
      style={{
        border: '1px solid var(--sharpee-border)',
        borderRadius: 'var(--sharpee-border-radius)',
        padding: 'var(--sharpee-spacing-md)',
        background: 'var(--sharpee-bg-secondary)',
      }}
    >
      <header style={{ marginBottom: 'var(--sharpee-spacing-sm)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>Identity</h3>
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--sharpee-spacing-sm)',
          marginBottom: 'var(--sharpee-spacing-sm)',
        }}
      >
        <span
          style={{
            fontSize: '0.85em',
            color: 'var(--sharpee-text-muted)',
          }}
        >
          Handle
        </span>
        <strong data-testid="identity-handle" style={{ fontSize: '1rem' }}>
          {identity.handle}
        </strong>
      </div>

      <p
        style={{
          margin: '0 0 var(--sharpee-spacing-sm)',
          fontSize: '0.85em',
          color: 'var(--sharpee-text-muted)',
        }}
      >
        Download your identity to reuse it on another browser or device.
        Keep the file private — anyone with it can act as you.
      </p>

      <div style={{ display: 'flex', gap: 'var(--sharpee-spacing-sm)' }}>
        <Button variant="secondary" onClick={handleDownload}>
          Download identity
        </Button>
        <Button variant="secondary" onClick={() => setEraseOpen(true)}>
          Erase identity
        </Button>
      </div>

      {eraseOpen && (
        <EraseIdentityModal
          identity={identity}
          onClose={() => setEraseOpen(false)}
          eraseIdentityFn={eraseIdentityFn}
        />
      )}
    </section>
  );
}

/**
 * Default download trigger: build a `Blob` from the CSV and click a hidden
 * anchor. Wrapped so tests can swap it without mocking the URL API.
 */
function defaultDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
