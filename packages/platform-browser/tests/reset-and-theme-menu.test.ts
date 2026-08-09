/**
 * Phase 6a (proposal phase-6-fallout P-3 + P-4) behavior tests.
 *
 * P-3: `wipeStoryStorage` deletes exactly one story's prefixed keys — the
 * Reset menu action's mutation — and `MenuManager` reaches the onReset
 * handler from the real `#menu-reset` element.
 *
 * P-4: `ThemeManager.renderMenu` owns the `#theme-menu` markup at runtime,
 * preferring the page's `#sharpee-wired-themes` JSON (what the build wired)
 * over the entry's configured list (scaffold-time-static on the TS path),
 * and theme selection is DELEGATED so items rendered after handler setup
 * still select — the ordering trap the delegation exists to remove.
 *
 * Real localStorage semantics are stubbed in full (length/key included —
 * `wipeStoryStorage` iterates by index, and happy-dom's own localStorage is
 * non-functional, per the restart-reboot suite's precedent).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wipeStoryStorage } from '../src/managers/SaveManager';
import { ThemeManager } from '../src/managers/ThemeManager';
import { MenuManager } from '../src/managers/MenuManager';
import type { MenuHandlers } from '../src/types';

const storageBacking = new Map<string, string>();
beforeEach(() => {
  storageBacking.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storageBacking.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storageBacking.set(k, String(v));
    },
    removeItem: (k: string) => {
      storageBacking.delete(k);
    },
    clear: () => storageBacking.clear(),
    key: (i: number) => [...storageBacking.keys()][i] ?? null,
    get length() {
      return storageBacking.size;
    },
  });
});

describe('wipeStoryStorage (P-3 — the Reset mutation)', () => {
  it('deletes every key under the prefix and nothing else, and names what it removed', () => {
    localStorage.setItem('fernhill-saves-index', '[]');
    localStorage.setItem('fernhill-save-den', 'x');
    localStorage.setItem('fernhill-save-autosave', 'x');
    localStorage.setItem('fernhill-theme', 'paper');
    localStorage.setItem('dungeo-theme', 'retro-terminal');
    localStorage.setItem('unrelated', 'y');

    const removed = wipeStoryStorage('fernhill-');

    expect(removed.sort()).toEqual([
      'fernhill-save-autosave',
      'fernhill-save-den',
      'fernhill-saves-index',
      'fernhill-theme',
    ]);
    expect(localStorage.getItem('fernhill-theme')).toBeNull();
    expect(localStorage.getItem('fernhill-saves-index')).toBeNull();
    // Another story on the same origin keeps every key it had.
    expect(localStorage.getItem('dungeo-theme')).toBe('retro-terminal');
    expect(localStorage.getItem('unrelated')).toBe('y');
  });

  it('is a no-op on a store with nothing under the prefix', () => {
    localStorage.setItem('dungeo-theme', 'paper');
    expect(wipeStoryStorage('fernhill-')).toEqual([]);
    expect(localStorage.getItem('dungeo-theme')).toBe('paper');
  });
});

describe('ThemeManager.renderMenu (P-4 — the menu has one owner)', () => {
  const manager = (themes: Array<{ id: string; name: string }>) =>
    new ThemeManager({ storageKey: 't-theme', themes, defaultTheme: 'classic' });

  it('renders classic + the page-declared wired list, names included', () => {
    document.body.innerHTML = `
      <script id="sharpee-wired-themes" type="application/json">[{"id":"modern-dark","name":"Modern Dark"},{"id":"my-theme","name":"My Theme"}]</script>
      <ul id="theme-menu"></ul>`;
    // The entry's configured list is stale (TS path) — the page data wins,
    // so the author theme still gets its menu entry (ADR-188 AC-5).
    manager([{ id: 'modern-dark', name: 'modern-dark' }]).renderMenu();

    const items = [...document.querySelectorAll('#theme-menu li')];
    expect(items.map((i) => (i as HTMLElement).dataset.themeChoice)).toEqual([
      'classic',
      'modern-dark',
      'my-theme',
    ]);
    expect(items.map((i) => i.textContent)).toEqual(['Classic', 'Modern Dark', 'My Theme']);
    expect(items.every((i) => i.getAttribute('role') === 'menuitemradio')).toBe(true);
    // The color-bleed guard (David, 2026-08-08: "varying font colors"):
    // theme CSS scopes with bare [data-theme=…] selectors, so a rendered
    // item must NEVER carry data-theme — it would paint itself in its own
    // theme's palette.
    expect(items.every((i) => !(i as HTMLElement).hasAttribute('data-theme'))).toBe(true);
  });

  it('falls back to the configured list when the page declares nothing', () => {
    document.body.innerHTML = `<ul id="theme-menu"><li data-theme="stale">Old</li></ul>`;
    manager([{ id: 'paper', name: 'Paper' }]).renderMenu();
    const items = [...document.querySelectorAll('#theme-menu li')];
    expect(items.map((i) => (i as HTMLElement).dataset.themeChoice)).toEqual(['classic', 'paper']);
  });

  it('falls back to the configured list when the page data is unreadable', () => {
    document.body.innerHTML = `
      <script id="sharpee-wired-themes" type="application/json">not json</script>
      <ul id="theme-menu"></ul>`;
    manager([{ id: 'paper', name: 'Paper' }]).renderMenu();
    expect(
      [...document.querySelectorAll('#theme-menu li')].map((i) => (i as HTMLElement).dataset.themeChoice),
    ).toEqual(['classic', 'paper']);
  });

  it('never doubles Classic when the configured list declares it too (dungeo entry shape)', () => {
    document.body.innerHTML = `<ul id="theme-menu"></ul>`;
    manager([
      { id: 'classic', name: 'Classic' },
      { id: 'paper', name: 'Paper' },
    ]).renderMenu();
    expect(
      [...document.querySelectorAll('#theme-menu li')].map((i) => (i as HTMLElement).dataset.themeChoice),
    ).toEqual(['classic', 'paper']);
  });

  it('does nothing on a custom page without the menu (ADR-253)', () => {
    document.body.innerHTML = `<main></main>`;
    expect(() => manager([]).renderMenu()).not.toThrow();
  });
});

describe('MenuManager (P-3 binding + P-4 delegation)', () => {
  const handlers = (): MenuHandlers => ({
    onSave: vi.fn(async () => {}),
    onRestore: vi.fn(async () => {}),
    onRestart: vi.fn(async () => {}),
    onReset: vi.fn(async () => {}),
    onQuit: vi.fn(),
    onThemeSelect: vi.fn(),
    onHelp: vi.fn(),
    onAbout: vi.fn(),
  });

  it('reaches onReset from the real #menu-reset element', () => {
    document.body.innerHTML = `<menu id="menu-bar"><li id="menu-reset" class="sharpee-menu-option">Reset Story Data…</li></menu>`;
    const h = handlers();
    new MenuManager({ menuBar: document.getElementById('menu-bar'), handlers: h }).setupHandlers();
    (document.getElementById('menu-reset') as HTMLElement).click();
    expect(h.onReset).toHaveBeenCalledTimes(1);
  });

  it('selects a theme rendered AFTER handler setup — delegation, not per-item binding', () => {
    document.body.innerHTML = `<menu id="menu-bar"><ul id="theme-menu"></ul></menu>`;
    const h = handlers();
    new MenuManager({ menuBar: document.getElementById('menu-bar'), handlers: h }).setupHandlers();

    // Items arrive later, as renderMenu's runtime render does.
    new ThemeManager({ storageKey: 't', themes: [{ id: 'paper', name: 'Paper' }], defaultTheme: 'classic' }).renderMenu();
    const paper = document.querySelector('[data-theme-choice="paper"]') as HTMLElement;
    paper.click();
    expect(h.onThemeSelect).toHaveBeenCalledWith('paper');
  });
});
