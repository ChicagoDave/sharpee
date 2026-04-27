/**
 * Header trigger button + popover wrapping the IdentityPanel
 * (ADR-161 Phase E).
 *
 * Public interface: {@link IdentityPickerButton} default export,
 * {@link IdentityPickerButtonProps}.
 *
 * Bounded context: client UI chrome. Mirrors {@link ThemePicker}'s
 * button-with-dropdown pattern so the two header controls feel
 * consistent: a button labelled with the current value (Handle here,
 * theme name there), opening a panel positioned beneath it.
 *
 * The Erase confirmation lives inside the popover's IdentityPanel — but
 * is itself a Modal. To avoid stacking two Modal layers, the popover is
 * a click-outside-to-close dropdown (no overlay backdrop), so the only
 * Modal mounted at any time is EraseIdentityModal. While the Erase
 * modal is open, click-outside on the popover is suppressed: the
 * Modal's overlay sits above the popover and absorbs clicks, so the
 * popover's outside-click handler does not see them.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import IdentityPanel from './identity-panel';
import type { StoredIdentity } from './identity-store';
import type { EraseIdentityRequest, EraseIdentityResponse } from '../types/api';

export interface IdentityPickerButtonProps {
  /** Currently-stored identity. Header should not render this when null. */
  identity: StoredIdentity;
  /** Test override forwarded into IdentityPanel's download trigger. */
  downloadFn?: (filename: string, content: string) => void;
  /** Test override forwarded into the EraseIdentityModal. */
  eraseIdentityFn?: (
    body: EraseIdentityRequest,
  ) => Promise<EraseIdentityResponse>;
}

export default function IdentityPickerButton({
  identity,
  downloadFn,
  eraseIdentityFn,
}: IdentityPickerButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Click-outside and Esc close the popover. Same pattern as ThemePicker.
  // Note: when the EraseIdentityModal is open, its overlay div absorbs
  // mousedown events before they reach document, so this handler is a no-op
  // for clicks on the modal — that's the intended behavior.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="identity-picker"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Identity: ${identity.handle}. Click to manage.`}
        onClick={toggle}
        style={{
          background: 'var(--sharpee-panel-bg)',
          color: 'var(--sharpee-text)',
          border: '1px solid var(--sharpee-border)',
          borderRadius: 'var(--sharpee-border-radius)',
          padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
          font: 'inherit',
          cursor: 'pointer',
          marginRight: 'var(--sharpee-spacing-sm)',
        }}
      >
        Identity: {identity.handle}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Identity management"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            minWidth: 320,
            maxWidth: 420,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <IdentityPanel
            identity={identity}
            downloadFn={downloadFn}
            eraseIdentityFn={eraseIdentityFn}
          />
        </div>
      )}
    </div>
  );
}
