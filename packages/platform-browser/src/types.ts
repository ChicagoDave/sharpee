/**
 * Types and interfaces for @sharpee/platform-browser
 */

import type { SequencedEvent } from '@sharpee/engine';
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
  handleStoryEvent?: (event: SequencedEvent, client: BrowserClientInterface) => boolean;
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
 * Browser-specific save data format.
 * Captures state without replacing entities - allows restoring state to existing world.
 *
 * v3.0.0-delta: Only stores entities whose locations or traits changed from
 * the initial world state (baseline). The entire payload is lz-string
 * compressed before writing to localStorage.
 */
export interface BrowserSaveData {
  /** Save format version */
  version: string;
  /** Unix timestamp when save was created */
  timestamp: number;
  /** Number of turns at save time */
  turnCount: number;
  /** Score at save time */
  score: number;
  /** Entity locations: entityId -> locationId (delta: only changed entries) */
  locations: Record<string, string | null>;
  /** Entity trait states: entityId -> { traitName -> traitData } (delta: only changed entries) */
  traits: Record<string, Record<string, unknown>>;
  /** Compressed HTML transcript (innerHTML of #text-content) */
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
