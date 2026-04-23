/**
 * Per-user theme persistence.
 *
 * Public interface: {@link ThemeName}, {@link THEMES}, {@link readTheme},
 * {@link writeTheme}, {@link applyThemeToDocument}, {@link initThemeOnBoot}.
 *
 * Bounded context: client UI chrome (ADR-153 frontend). Theme is global per
 * user (not per-room) and persisted under the localStorage key `sharpee.theme`.
 */

export const THEMES = ['classic-light', 'modern-dark', 'retro-terminal', 'paper'] as const;
export type ThemeName = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeName = 'modern-dark';
const STORAGE_KEY = 'sharpee.theme';

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * Read the persisted theme, falling back to {@link DEFAULT_THEME} if absent
 * or corrupted. Never throws: a broken localStorage read is treated as absent.
 */
export function readTheme(): ThemeName {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isThemeName(stored)) return stored;
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fall through
  }
  return DEFAULT_THEME;
}

/**
 * Persist a theme selection. Silently no-ops if storage is unavailable so a
 * failed write never breaks the page.
 */
export function writeTheme(theme: ThemeName): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore — storage failures must not crash theme switching
  }
}

/**
 * Apply the theme to the document root by setting `data-theme` on <html>.
 * Callers should invoke this before React mounts to avoid a theme flash.
 */
export function applyThemeToDocument(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Idempotent boot hook: read the stored theme and apply it to <html>. Runs
 * synchronously from main.tsx before ReactDOM renders.
 */
export function initThemeOnBoot(): ThemeName {
  const theme = readTheme();
  applyThemeToDocument(theme);
  return theme;
}
