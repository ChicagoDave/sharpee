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
    document.querySelectorAll('.sharpee-menu-option[data-theme]').forEach(opt => {
      const optTheme = (opt as HTMLElement).dataset.theme;
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
