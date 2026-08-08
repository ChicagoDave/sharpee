/**
 * ThemeManager - handles theme switching and persistence
 */

import type { ThemeConfig } from '../types.js';

export interface ThemeManagerConfig {
  /** localStorage key for theme persistence */
  storageKey: string;
  /** Available themes */
  themes: ThemeConfig[];
  /** Default theme if none saved */
  defaultTheme: string;
}

export class ThemeManager {
  private storageKey: string;
  private themes: ThemeConfig[];
  private defaultTheme: string;

  constructor(config: ThemeManagerConfig) {
    this.storageKey = config.storageKey;
    this.themes = config.themes;
    this.defaultTheme = config.defaultTheme;
  }

  /**
   * Apply saved theme immediately (call before DOM ready).
   * This is a static method to be called as IIFE at module load time
   * to prevent flash of default theme.
   *
   * @example
   * // In browser-entry.ts, call immediately:
   * ThemeManager.applyEarlyTheme('dungeo-theme');
   */
  static applyEarlyTheme(storageKey: string): void {
    try {
      const savedTheme = localStorage.getItem(storageKey);
      if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
      }
    } catch {
      // localStorage not available, use default
    }
  }

  /**
   * Get saved theme from localStorage
   */
  getSavedTheme(): string {
    try {
      return localStorage.getItem(this.storageKey) || this.defaultTheme;
    } catch {
      return this.defaultTheme;
    }
  }

  /**
   * Save theme to localStorage
   */
  saveTheme(theme: string): void {
    try {
      localStorage.setItem(this.storageKey, theme);
    } catch {
      // localStorage not available, ignore
    }
  }

  /**
   * Render the theme menu's items from the wired theme list.
   *
   * The menu is DATA — `classic` (the `:root` baseline, ADR-188) plus
   * whatever themes the build wired — so the manager that owns the data
   * renders it (proposal phase-6-fallout P-4). Replaces the build-time
   * `#theme-menu` regex rewrite in devkit's `injectThemes`, which produced
   * markup for a list this class already held.
   *
   * The list PREFERS the page's `#sharpee-wired-themes` JSON (what the build
   * actually wired — the authoritative fact) and falls back to this
   * manager's configured themes (the entry's list): on the TS path the entry
   * constant is scaffold-time-static and can go stale against
   * `sharpee.themes`, and a menu drawn from it alone would silently drop an
   * author theme (ADR-188 AC-5). Safe on custom pages that omit the menu
   * (ADR-253): no element, no work.
   */
  renderMenu(): void {
    const menu = document.getElementById('theme-menu');
    if (!menu) return;
    menu.replaceChildren();
    // Classic is prepended here, so a list that ALSO declares it (dungeo's
    // hand-written entry does) must not double the item.
    const entries: ThemeConfig[] = [
      { id: 'classic', name: 'Classic' },
      ...this.wiredThemes().filter((theme) => theme.id !== 'classic'),
    ];
    for (const theme of entries) {
      const item = document.createElement('li');
      item.setAttribute('role', 'menuitemradio');
      item.className = 'sharpee-menu-option';
      // `data-theme-choice`, deliberately NOT `data-theme`: theme CSS scopes
      // its variables with bare `[data-theme="x"]` selectors, so an item
      // carrying `data-theme` styles ITSELF with its own theme's colors —
      // every menu row in a different palette (David, 2026-08-08: "varying
      // font colors and it can't be read cleanly"). The choice payload must
      // be an attribute no theme stylesheet can ever match.
      item.dataset.themeChoice = theme.id;
      item.textContent = theme.name;
      menu.appendChild(item);
    }
  }

  /**
   * Put the page back on the default theme WITHOUT persisting it.
   *
   * Reset's companion (issue 248): the wipe just deleted the saved theme
   * key, and `applyTheme` would write one straight back. The page must
   * simply look the way a first visit does — attribute and checkmarks
   * only, storage untouched.
   */
  resetToDefault(): void {
    document.documentElement.setAttribute('data-theme', this.defaultTheme);
    this.updateMenuCheckmarks(this.defaultTheme);
  }

  /** The page-declared wired list when present and readable, else the configured one. */
  private wiredThemes(): ThemeConfig[] {
    const block = document.getElementById('sharpee-wired-themes');
    if (block?.textContent) {
      try {
        const parsed: unknown = JSON.parse(block.textContent);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (t): t is ThemeConfig =>
              typeof t === 'object' && t !== null &&
              typeof (t as ThemeConfig).id === 'string' &&
              typeof (t as ThemeConfig).name === 'string',
          )
        ) {
          return parsed;
        }
      } catch {
        // Unreadable page data — the entry's configured list still stands.
      }
    }
    return this.themes;
  }

  /**
   * Apply a theme to the document and update menu checkmarks
   */
  applyTheme(theme: string): void {
    document.documentElement.setAttribute('data-theme', theme);
    this.updateMenuCheckmarks(theme);
    this.saveTheme(theme);
    console.log('[theme] Applied:', theme);
  }

  /**
   * Update theme option checkmarks in the menu. Per ADR-170, the
   * theme picker uses `.sharpee-menu-option[data-theme]` items and the
   * `--checked` state modifier marks the active selection.
   */
  updateMenuCheckmarks(activeTheme: string): void {
    document
      .querySelectorAll('.sharpee-menu-option[data-theme-choice], .sharpee-menu-option[data-theme]')
      .forEach(opt => {
        const el = opt as HTMLElement;
        const optTheme = el.dataset.themeChoice ?? el.dataset.theme;
        if (optTheme === activeTheme) {
          opt.classList.add('sharpee-menu-option--checked');
        } else {
          opt.classList.remove('sharpee-menu-option--checked');
        }
      });
  }

  /**
   * Get the available themes
   */
  getThemes(): ThemeConfig[] {
    return this.themes;
  }

  /**
   * Get the default theme
   */
  getDefaultTheme(): string {
    return this.defaultTheme;
  }
}
