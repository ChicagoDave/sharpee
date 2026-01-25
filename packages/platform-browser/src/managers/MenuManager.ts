/**
 * MenuManager - handles menu bar interactions
 */

import type { MenuHandlers } from '../types';

export interface MenuManagerConfig {
  /** Menu bar element */
  menuBar: HTMLElement | null;
  /** Menu action handlers */
  handlers: MenuHandlers;
}

export class MenuManager {
  private handlers: MenuHandlers;

  constructor(config: MenuManagerConfig) {
    this.handlers = config.handlers;
  }

  /**
   * Close all menu dropdowns
   */
  closeAllMenus(): void {
    document.querySelectorAll('.menu-dropdown').forEach(menu => {
      menu.classList.remove('show');
    });
    document.querySelectorAll('.menu-button').forEach(btn => {
      btn.classList.remove('active');
    });
  }

  /**
   * Toggle a menu dropdown
   */
  toggleMenu(menuBtn: HTMLElement, dropdown: HTMLElement): void {
    const isOpen = dropdown.classList.contains('show');
    this.closeAllMenus();
    if (!isOpen) {
      dropdown.classList.add('show');
      menuBtn.classList.add('active');
    }
  }

  /**
   * Set up menu bar event handlers
   */
  setupHandlers(): void {
    const fileMenuBtn = document.getElementById('file-menu-btn');
    const fileMenu = document.getElementById('file-menu');
    const settingsMenuBtn = document.getElementById('settings-menu-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const helpMenuBtn = document.getElementById('help-menu-btn');
    const helpMenu = document.getElementById('help-menu');

    // Menu button clicks
    fileMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (fileMenu) this.toggleMenu(fileMenuBtn, fileMenu);
    });

    settingsMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (settingsMenu) this.toggleMenu(settingsMenuBtn, settingsMenu);
    });

    helpMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (helpMenu) this.toggleMenu(helpMenuBtn, helpMenu);
    });

    // Close menus on outside click
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-item')) {
        this.closeAllMenus();
      }
    });

    // Close menus on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllMenus();
      }
    });

    // File menu actions
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

    // Theme selection
    document.querySelectorAll('.theme-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const theme = (opt as HTMLElement).dataset.theme;
        if (theme) {
          this.handlers.onThemeSelect(theme);
          this.closeAllMenus();
        }
      });
    });

    // Help menu actions
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
