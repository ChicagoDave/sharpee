/**
 * Modal — reusable dialog shell with focus trap, Esc-to-close, and backdrop
 * click-to-close. Shared by CreateRoomModal, PasscodeModal, and the
 * recording-transparency notice.
 *
 * Public interface: {@link Modal} default export, {@link ModalProps}.
 *
 * Bounded context: client UI primitive (ADR-153 frontend). Accessibility:
 *   - Rendered as `role="dialog"` with `aria-modal="true"`.
 *   - Labelled by the title heading via `aria-labelledby`.
 *   - Traps Tab/Shift+Tab within the modal while open.
 *   - Restores focus to the previously active element on close.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

export interface ModalProps {
  /** Accessible title shown in the header and wired to `aria-labelledby`. */
  title: string;
  /** Called when the user dismisses the modal (Esc, backdrop click, or close button). */
  onClose: () => void;
  /** When false, the modal does not render — callers can conditional-render or toggle this. */
  open?: boolean;
  /** Dialog body. */
  children: ReactNode;
  /**
   * Optional footer row (typically action buttons). Rendered with a top
   * border so it visually groups as a footer.
   */
  footer?: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export default function Modal({
  title,
  onClose,
  open = true,
  children,
  footer,
}: ModalProps): JSX.Element | null {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // On open, remember the previously-focused element and move focus into the
  // modal. On close, restore focus to the originator.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusables?.[0]?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Esc closes. Registered on document so the modal doesn't need to own focus
  // for the shortcut to work.
  useEffect(() => {
    if (!open) return;
    function onDocKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [open, onClose]);

  // Tab / Shift+Tab loop inside the modal.
  const onKeyDown = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusables = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => !el.hasAttribute('disabled'));
    if (focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const onBackdropClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={onBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--sharpee-spacing-lg)',
        zIndex: 2000,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        style={{
          background: 'var(--sharpee-bg)',
          color: 'var(--sharpee-text)',
          border: '1px solid var(--sharpee-border)',
          borderRadius: 'var(--sharpee-border-radius)',
          minWidth: 320,
          maxWidth: 520,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--sharpee-spacing-md)',
            padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
            borderBottom: '1px solid var(--sharpee-border)',
          }}
        >
          <h2 id={titleId} style={{ margin: 0, fontSize: '1.1rem' }}>
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sharpee-text-muted)',
              cursor: 'pointer',
              fontSize: '1.25rem',
              lineHeight: 1,
              padding: 4,
            }}
          >
            {'✕'}
          </button>
        </header>
        <div
          style={{
            padding: 'var(--sharpee-spacing-lg)',
            overflowY: 'auto',
          }}
        >
          {children}
        </div>
        {footer && (
          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--sharpee-spacing-sm)',
              padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
              borderTop: '1px solid var(--sharpee-border)',
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
