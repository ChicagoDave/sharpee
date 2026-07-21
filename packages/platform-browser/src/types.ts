/**
 * Types and interfaces for @sharpee/platform-browser
 */

import type { ISaveData } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';

/**
 * Theme configuration
 */
export interface ThemeConfig {
  /** Theme identifier (used in data-theme attribute) */
  id: string;
  /** Display name for menu */
  name: string;
}

/**
 * Story metadata for display
 */
export interface StoryInfo {
  /** Game title */
  title: string;
  /** Game description */
  description?: string;
  /** Author(s) */
  authors: string | string[];
  /** Who ported/implemented the game */
  portedBy?: string;
  /** Story version */
  version: string;
  /** Engine version */
  engineVersion: string;
  /** Build date string */
  buildDate: string;
}

/**
 * Story-specific callbacks for customizing behavior. Reserved for
 * future hooks; the Phase 4 retirement of `handleStoryEvent`
 * (channel-io-event-retirement) leaves this interface empty.
 *
 * Stories that need to react to engine signals should define
 * `IOChannel`s via `Story.registerChannels` and register browser-side
 * renderers in their entry point — channels are the universal UI
 * surface (per ADR-163 and the project's channel-IO commitment).
 *
 * `getHelpText` / `getAboutText` are accepted by `BrowserClientConfig`
 * via index signatures on the consuming menus and dialogs; they are
 * not declared here yet — that surface still ships ad-hoc and is a
 * separate cleanup target.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BrowserClientCallbacks {}

/**
 * Interface for BrowserClient that callbacks receive
 */
export interface BrowserClientInterface {
  displayText(text: string): void;
  displayCommand(command: string): void;
  clearScreen(): void;
  getWorld(): WorldModel;
  getCurrentTurn(): number;
  getCurrentScore(): number;
}

/**
 * Configuration for BrowserClient
 */
export interface BrowserClientConfig {
  /** Storage key prefix for localStorage (e.g., "dungeo-") */
  storagePrefix: string;

  /** Default theme identifier */
  defaultTheme: string;

  /** Available themes with display names */
  themes: ThemeConfig[];

  /** Auto-save after each turn (default: true) */
  autoSave?: boolean;

  /** Story metadata for display */
  storyInfo: StoryInfo;

  /** Story-specific callbacks */
  callbacks?: BrowserClientCallbacks;

  /**
   * Client capabilities passed to `engine.start({ capabilities })`.
   * Defaults to `BROWSER_CAPABILITIES` (full graphical profile) when
   * omitted. Authors override per surface — e.g., a text-only kiosk
   * mode that suppresses media channels.
   */
  clientCapabilities?: import('@sharpee/if-domain').ClientCapabilities;

  /**
   * Log every `channel:packet` payload to the browser console for
   * debugging. Each turn emits one `console.log('[channel:packet
   * turn=X]', payload)` line; DevTools renders the payload as an
   * expandable JSON tree.
   *
   * Off by default. Authors can also enable at runtime without
   * rebuilding via either:
   *  - URL query: `?debug-channels=1`
   *  - localStorage: `localStorage.setItem('sharpee-debug-channels', '1')`
   * Any of the three (config flag, query, localStorage) turns it on.
   */
  debugChannels?: boolean;

  /**
   * Reboot callback for RESTART (ADR-248): re-runs the story's own boot
   * path — fresh story via `createStory()`, fresh world/engine,
   * `connectEngine`, `client.start()`. Each story's browser entry passes
   * its own top-level `start` function here. Invoked by the client after
   * a confirmed restart's final packet has flushed (never inside the
   * hook itself). When omitted, the client falls back to
   * `window.location.reload()`.
   */
  reboot?: () => Promise<void>;
}

/**
 * DOM element references passed to managers
 */
export interface DOMElements {
  // Status line
  statusLocation: HTMLElement | null;
  statusScore: HTMLElement | null;

  // Main content
  textContent: HTMLElement | null;
  mainWindow: HTMLElement | null;
  commandInput: HTMLInputElement | null;

  // Modal elements (native HTML <dialog> per ADR-170)
  saveDialog: HTMLDialogElement | null;
  restoreDialog: HTMLDialogElement | null;
  startupDialog: HTMLDialogElement | null;
  saveNameInput: HTMLInputElement | null;
  saveSlotsListEl: HTMLElement | null;
  restoreSlotsListEl: HTMLElement | null;
  noSavesMessage: HTMLElement | null;
  startupSaveInfo: HTMLElement | null;

  // Menu bar (discovered by ID pattern)
  menuBar: HTMLElement | null;
}

/**
 * Save slot metadata (stored in index)
 */
export interface SaveSlotMeta {
  name: string;
  timestamp: number;
  turnCount: number;
  location: string;
}

/**
 * Browser-specific save envelope.
 *
 * Wraps the engine's `ISaveData` (which carries the full world state via
 * the gzipped `worldSnapshot` field, post the platform-wide save/restore
 * fix) with browser-only metadata that the engine doesn't model:
 * the rendered transcript HTML and the visible status the user picked
 * the slot by.
 *
 * v4.0.0: cutover from the v3.0.0-delta in-house serializer (which
 * silently dropped score, capabilities, world state values,
 * relationships, and ID counters). The whole envelope is lz-string
 * compressed before writing to localStorage to keep storage compact
 * even though the engine's worldSnapshot is already gzipped — the
 * compression compounds on the surrounding JSON.
 */
export interface BrowserSaveEnvelope {
  /** Envelope format version. Distinct from the engine's save version. */
  envelopeVersion: '4.0.0';
  /** Unix timestamp when the envelope was written. */
  timestamp: number;
  /** Engine save data — the canonical world state. */
  engineSave: ISaveData;
  /** Score at save time, captured for the index display. */
  score: number;
  /** Compressed HTML transcript (innerHTML of #text-content). */
  transcriptHtml?: string;
}

/**
 * Context for save operations
 */
export interface SaveContext {
  turnCount: number;
  score: number;
  transcriptHtml: string;
}

/**
 * Menu action handlers
 */
export interface MenuHandlers {
  onSave: () => Promise<void>;
  onRestore: () => Promise<void>;
  onRestart: () => Promise<void>;
  onQuit: () => void;
  onThemeSelect: (theme: string) => void;
  onHelp: () => void;
  onAbout: () => void;
}

/**
 * Dialog elements subset (native HTML <dialog> per ADR-170)
 */
export interface DialogElements {
  saveDialog: HTMLDialogElement | null;
  restoreDialog: HTMLDialogElement | null;
  startupDialog: HTMLDialogElement | null;
  saveNameInput: HTMLInputElement | null;
  saveSlotsListEl: HTMLElement | null;
  restoreSlotsListEl: HTMLElement | null;
  noSavesMessage: HTMLElement | null;
  startupSaveInfo: HTMLElement | null;
}

/**
 * Display elements subset
 */
export interface DisplayElements {
  textContent: HTMLElement | null;
  mainWindow: HTMLElement | null;
}

/**
 * Status elements subset
 */
export interface StatusElements {
  statusLocation: HTMLElement | null;
  statusScore: HTMLElement | null;
}

/**
 * Autosave slot name constant
 */
export const AUTOSAVE_SLOT = 'autosave';
