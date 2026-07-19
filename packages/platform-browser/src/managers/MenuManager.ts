/**
 * MenuManager - handles menu bar interactions.
 *
 * Queries DOM by stable ids for individual controls and by .sharpee-*
 * classes for generic affordances (per ADR-170 component contract).
 * State is expressed via the `--open` modifier on .sharpee-menu-bar-item
 * and the native `aria-expanded` attribute on the trigger button.
 */

import type { MenuHandlers } from '../types.js';

export interface MenuManagerConfig {
  menuBar: HTMLElement | null;
  handlers: MenuHandlers;
}

const ITEM_OPEN_CLASS = 'sharpee-menu-bar-item--open';

export class MenuManager {
  private handlers: MenuHandlers;

  constructor(config: MenuManagerConfig) {
    this.handlers = config.handlers;
  }

  /**
   * Close every open menu and clear all aria-expanded flags.
   */
  closeAllMenus(): void {
    document.querySelectorAll('.sharpee-menu-bar-item').forEach(item => {
      item.classList.remove(ITEM_OPEN_CLASS);
    });
    document.querySelectorAll('.sharpee-menu-bar-trigger').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  /**
   * Toggle the menu owned by the given trigger button. The trigger's
   * parent .sharpee-menu-bar-item carries the --open state modifier
   * that theme CSS reacts to.
   */
  toggleMenu(triggerEl: HTMLElement): void {
    const item = triggerEl.closest('.sharpee-menu-bar-item') as HTMLElement | null;
    if (!item) return;

    const isOpen = item.classList.contains(ITEM_OPEN_CLASS);
    this.closeAllMenus();
    if (!isOpen) {
      item.classList.add(ITEM_OPEN_CLASS);
      triggerEl.setAttribute('aria-expanded', 'true');
    }
  }

  setupHandlers(): void {
    const fileMenuBtn = document.getElementById('file-menu-btn');
    const settingsMenuBtn = document.getElementById('settings-menu-btn');
    const helpMenuBtn = document.getElementById('help-menu-btn');

    fileMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu(fileMenuBtn);
    });

    settingsMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu(settingsMenuBtn);
    });

    helpMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu(helpMenuBtn);
    });

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.sharpee-menu-bar-item')) {
        this.closeAllMenus();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllMenus();
      }
    });

    document.getElementById('menu-save')?.addEventListener('click', async () => {
      this.closeAllMenus();
      await this.handlers.onSave();
    });

    document.getElementById('menu-restore')?.addEventListener('click', async () => {
      this.closeAllMenus();
      await this.handlers.onRestore();
    });

    document.getElementById('menu-restart')?.addEventListener('click', async () => {
      this.closeAllMenus();
      await this.handlers.onRestart();
    });

    document.getElementById('menu-quit')?.addEventListener('click', () => {
      this.closeAllMenus();
      this.handlers.onQuit();
    });

    document.querySelectorAll('.sharpee-menu-option[data-theme]').forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = (opt as HTMLElement).dataset.theme;
        if (theme) {
          this.handlers.onThemeSelect(theme);
          this.closeAllMenus();
        }
      });
    });

    document.getElementById('menu-help')?.addEventListener('click', () => {
      this.closeAllMenus();
      this.handlers.onHelp();
    });

    document.getElementById('menu-about')?.addEventListener('click', () => {
      this.closeAllMenus();
      this.handlers.onAbout();
    });

    console.log('[menu] Handlers set up');
  }
}
