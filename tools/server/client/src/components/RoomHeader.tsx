/**
 * RoomHeader — sticky header for the room view.
 *
 * Public interface: {@link RoomHeader} default export, {@link RoomHeaderProps}.
 *
 * Bounded context: client room view (ADR-153 frontend, Decisions 3 & 8).
 *
 * Responsibilities:
 *   1. Show the room title.
 *   2. Show the persistent REC indicator (Decision 8).
 *   3. Offer Copy URL / Copy code buttons (Decision 3 — share-out).
 *      URL is `window.location.origin + '/r/' + code` when `code` is known;
 *      falls back to the current URL otherwise. The Copy code button is
 *      hidden when no code is available (e.g., reconnect without stored code).
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import RECIndicator from './RECIndicator';

export interface RoomHeaderProps {
  title: string;
  /** Join code for the room, or null if unknown to this client. */
  code: string | null;
  /** When true, display a pinned marker next to the title. */
  pinned?: boolean;
  /**
   * When set, renders a gear button that invokes this callback. Parent
   * passes it only for viewers who should see the PH settings panel.
   */
  onOpenSettings?: () => void;
  /**
   * When set, renders a save-panel toggle button. Visible to every tier
   * — Participants see the save list; only CE+ can press Save inside.
   */
  onOpenSaves?: () => void;
  /**
   * Test override for `navigator.clipboard.writeText`. Production callers
   * omit this so the browser's clipboard API is used.
   */
  writeClipboard?: (text: string) => Promise<void>;
}

export default function RoomHeader({
  title,
  code,
  pinned = false,
  onOpenSettings,
  onOpenSaves,
  writeClipboard,
}: RoomHeaderProps): JSX.Element {
  const [copiedField, setCopiedField] = useState<'url' | 'code' | null>(null);

  const doCopy = useCallback(
    async (field: 'url' | 'code', text: string) => {
      const writer =
        writeClipboard ?? ((t: string) => navigator.clipboard.writeText(t));
      try {
        await writer(text);
        setCopiedField(field);
        window.setTimeout(() => {
          setCopiedField((prev) => (prev === field ? null : prev));
        }, 1500);
      } catch {
        // Silent: clipboard can refuse in a no-user-gesture context. A Plan 05
        // polish pass can surface a toast; for Phase 7 we just don't update.
      }
    },
    [writeClipboard],
  );

  const urlToCopy = code
    ? `${window.location.origin}/r/${encodeURIComponent(code)}`
    : window.location.href;

  return (
    <header
      role="banner"
      aria-label="Room header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--sharpee-spacing-md)',
        padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
        borderBottom: '1px solid var(--sharpee-border)',
        background: 'var(--sharpee-bg-secondary)',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: '1.1rem',
          fontFamily: 'var(--sharpee-font-ui)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {pinned && (
          <span
            aria-label="Pinned"
            title="Pinned"
            style={{ fontSize: '0.85rem', color: 'var(--sharpee-accent)' }}
          >
            📌
          </span>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      </h1>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sharpee-spacing-sm)',
        }}
      >
        <RECIndicator />
        <Button
          variant="ghost"
          onClick={() => void doCopy('url', urlToCopy)}
          aria-label="Copy room URL"
        >
          {copiedField === 'url' ? 'Copied' : 'Copy URL'}
        </Button>
        {code && (
          <Button
            variant="ghost"
            onClick={() => void doCopy('code', code)}
            aria-label="Copy room code"
          >
            {copiedField === 'code' ? 'Copied' : `Copy code ${code}`}
          </Button>
        )}
        {onOpenSaves && (
          <Button
            variant="ghost"
            onClick={onOpenSaves}
            aria-label="Open saves"
            title="Saves"
          >
            💾
          </Button>
        )}
        {onOpenSettings && (
          <Button
            variant="ghost"
            onClick={onOpenSettings}
            aria-label="Open room settings"
            title="Room settings"
          >
            ⚙
          </Button>
        )}
      </div>
    </header>
  );
}
