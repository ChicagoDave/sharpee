/**
 * Types and interfaces for @sharpee/platform-browser
 */

import type { ISaveData, ISemanticEvent } from '@sharpee/core';
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
 * Story-specific callbacks for customizing behavior
 */
export interface BrowserClientCallbacks {
  /**
   * Event handler for story-specific events.
   * Return true if handled, false to use default handling.
   */
  handleStoryEvent?: (event: ISemanticEvent, client: BrowserClientInterface) => boolean;
}

/**
 * Interface for BrowserClient that callbacks receive
 */
export interface BrowserClientInterface {
  displayText(text: string): void;
  displayCommand(command: string): void;
  clearScreen(): void;
  beep(frequency?: number, duration?: number): void;
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

  // Modal elements
  modalOverlay: HTMLElement | null;
  saveDialog: HTMLElement | null;
  restoreDialog: HTMLElement | null;
  startupDialog: HTMLElement | null;
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
 * Dialog elements subset
 */
export interface DialogElements {
  modalOverlay: HTMLElement | null;
  saveDialog: HTMLElement | null;
  restoreDialog: HTMLElement | null;
  startupDialog: HTMLElement | null;
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
