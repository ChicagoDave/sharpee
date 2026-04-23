/**
 * Theme picker — shared header control visible on both the landing page and
 * in-room views. Renders a button showing the current theme and a dropdown
 * menu for switching.
 *
 * Public interface: {@link ThemePicker} default export.
 *
 * Bounded context: client UI chrome (ADR-153 frontend). The picker writes the
 * selection through {@link writeTheme} and updates `data-theme` on <html> via
 * {@link applyThemeToDocument} so the change is immediate.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  THEMES,
  type ThemeName,
  applyThemeToDocument,
  readTheme,
  writeTheme,
} from '../storage/theme';

const THEME_LABELS: Record<ThemeName, string> = {
  'classic-light': 'Classic Light',
  'modern-dark': 'Modern Dark',
  'retro-terminal': 'Retro Terminal',
  paper: 'Paper',
};

export default function ThemePicker(): JSX.Element {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const select = useCallback((next: ThemeName) => {
    setTheme(next);
    writeTheme(next);
    applyThemeToDocument(next);
    setOpen(false);
  }, []);

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

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="theme-picker"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${THEME_LABELS[theme]}. Click to change.`}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'var(--sharpee-panel-bg)',
          color: 'var(--sharpee-text)',
          border: '1px solid var(--sharpee-border)',
          borderRadius: 'var(--sharpee-border-radius)',
          padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-sm)',
          font: 'inherit',
          cursor: 'pointer',
        }}
      >
        Theme: {THEME_LABELS[theme]}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Select theme"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            listStyle: 'none',
            margin: 0,
            padding: 4,
            background: 'var(--sharpee-panel-bg)',
            color: 'var(--sharpee-text)',
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            minWidth: 180,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {THEMES.map((name) => (
            <li key={name} role="none">
              <button
                type="button"
                role="option"
                aria-selected={name === theme}
                onClick={() => select(name)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: name === theme ? 'var(--sharpee-bg-secondary)' : 'transparent',
                  color: 'inherit',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: 'var(--sharpee-border-radius)',
                  font: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {THEME_LABELS[name]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
