/**
 * Browser Entry Point for Dungeo
 *
 * This file is the entry point for the browser bundle.
 * It initializes the game engine and connects it to the browser UI.
 */

import { GameEngine, SequencedEvent } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { ISaveRestoreHooks, ISaveData } from '@sharpee/core';
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { story, config } from './index';
import { STORY_VERSION, ENGINE_VERSION, BUILD_DATE } from './version';

// Game metadata from story config
const GAME_TITLE = config.title;
const GAME_DESCRIPTION = config.description || '';
const GAME_AUTHORS = Array.isArray(config.author) ? config.author.join(', ') : config.author;
const PORTED_BY = config.custom?.portedBy || '';
const SHARPEE_VERSION = ENGINE_VERSION;

// localStorage keys for save/restore
const STORAGE_INDEX_KEY = 'dungeo-saves-index';  // Array of save slot names
const SAVE_PREFIX = 'dungeo-save-';              // Per-slot: dungeo-save-{name}

// Save slot metadata (stored in index)
interface SaveSlotMeta {
  name: string;
  timestamp: number;
  turnCount: number;
  location: string;
}

// Dialog state
let isDialogOpen = false;
let pendingSaveResolve: ((saved: boolean) => void) | null = null;
let pendingRestoreResolve: ((slotName: string | null) => void) | null = null;
let selectedSaveSlot: string | null = null;

// Auto-save key
const AUTOSAVE_SLOT = 'autosave';

// DOM elements
let statusLocation: HTMLElement | null;
let statusScore: HTMLElement | null;
let textContent: HTMLElement | null;
let mainWindow: HTMLElement | null;
let commandInput: HTMLInputElement | null;

// Modal dialog elements
let modalOverlay: HTMLElement | null;
let saveDialog: HTMLElement | null;
let restoreDialog: HTMLElement | null;
let startupDialog: HTMLElement | null;
let saveNameInput: HTMLInputElement | null;
let saveSlotsListEl: HTMLElement | null;
let restoreSlotsListEl: HTMLElement | null;
let noSavesMessage: HTMLElement | null;
let startupSaveInfo: HTMLElement | null;

// Startup dialog state
let pendingStartupResolve: ((shouldContinue: boolean) => void) | null = null;

// Game state
let engine: GameEngine;
let world: WorldModel;
let commandHistory: string[] = [];
let historyIndex = -1;
let currentTurn = 0;
let currentScore = 0;
let turnOffset = 0;  // Offset to add to engine turn after restore

// Audio context for PC speaker beep
let audioContext: AudioContext | null = null;

/**
 * Play classic Infocom PC speaker beep
 * ~800Hz square wave, short duration
 */
function beep(frequency = 800, duration = 100): void {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'square'; // PC speaker was square wave
    oscillator.frequency.value = frequency;

    gainNode.gain.value = 0.1; // Not too loud

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    // Audio not available, silently ignore
  }
}

// ============================================
// Save Slot Management
// ============================================

/**
 * Get list of all saved games from index
 */
function getSaveIndex(): SaveSlotMeta[] {
  try {
    const json = localStorage.getItem(STORAGE_INDEX_KEY);
    if (!json) return [];
    return JSON.parse(json) as SaveSlotMeta[];
  } catch {
    return [];
  }
}

/**
 * Update save index with new/updated slot
 */
function updateSaveIndex(meta: SaveSlotMeta): void {
  const index = getSaveIndex();
  const existing = index.findIndex(s => s.name === meta.name);
  if (existing >= 0) {
    index[existing] = meta;
  } else {
    index.push(meta);
  }
  // Sort by timestamp descending (newest first)
  index.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

/**
 * Get current player location name
 */
function getCurrentLocation(): string {
  try {
    const player = world.getPlayer();
    if (player) {
      const locationId = world.getLocation(player.id);
      if (locationId) {
        const room = world.getEntity(locationId);
        if (room) {
          return room.name || 'Unknown';
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return 'Unknown';
}

/**
 * Generate a suggested save name based on current state
 */
function generateSaveName(): string {
  const location = getCurrentLocation()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 15);
  return `turn-${currentTurn}-${location}`;
}

/**
 * Sanitize save name for storage key
 */
function sanitizeSaveName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30) || 'save';
}

// ============================================
// Modal Dialog Management
// ============================================

/**
 * Show the save dialog
 */
function showSaveDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('[save-dialog] Opening save dialog...');
    console.log('[save-dialog] modalOverlay:', modalOverlay);
    console.log('[save-dialog] saveDialog:', saveDialog);

    if (!modalOverlay || !saveDialog) {
      console.error('[save-dialog] Modal elements not found!');
      resolve(false);
      return;
    }

    pendingSaveResolve = resolve;
    isDialogOpen = true;
    selectedSaveSlot = null;

    // Populate save slots list
    populateSaveSlotsList(saveSlotsListEl, true);

    // Set suggested save name
    if (saveNameInput) {
      saveNameInput.value = generateSaveName();
      saveNameInput.select();
    }

    // Show dialog
    modalOverlay.classList.remove('modal-hidden');
    saveDialog.classList.remove('modal-hidden');
    console.log('[save-dialog] Dialog should now be visible');

    // Focus name input
    saveNameInput?.focus();

    // Disable game input
    if (commandInput) {
      commandInput.disabled = true;
    }
  });
}

/**
 * Hide the save dialog
 */
function hideSaveDialog(saved: boolean): void {
  modalOverlay?.classList.add('modal-hidden');
  saveDialog?.classList.add('modal-hidden');
  isDialogOpen = false;

  // Re-enable game input
  if (commandInput) {
    commandInput.disabled = false;
    commandInput.focus();
  }

  if (pendingSaveResolve) {
    pendingSaveResolve(saved);
    pendingSaveResolve = null;
  }
}

/**
 * Show the restore dialog
 */
function showRestoreDialog(): Promise<string | null> {
  return new Promise((resolve) => {
    console.log('[restore-dialog] Opening restore dialog...');
    console.log('[restore-dialog] modalOverlay:', modalOverlay);
    console.log('[restore-dialog] restoreDialog:', restoreDialog);

    if (!modalOverlay || !restoreDialog) {
      console.error('[restore-dialog] Modal elements not found!');
      resolve(null);
      return;
    }

    pendingRestoreResolve = resolve;
    isDialogOpen = true;
    selectedSaveSlot = null;

    // Get user saves (excluding autosave)
    const userSaves = getSaveIndex().filter(s => s.name !== AUTOSAVE_SLOT);
    console.log('[restore-dialog] Available saves:', userSaves);

    // Populate restore slots list
    populateSaveSlotsList(restoreSlotsListEl, false);

    // Show/hide no saves message
    if (noSavesMessage) {
      if (userSaves.length === 0) {
        noSavesMessage.classList.remove('modal-hidden');
        restoreSlotsListEl?.classList.add('modal-hidden');
      } else {
        noSavesMessage.classList.add('modal-hidden');
        restoreSlotsListEl?.classList.remove('modal-hidden');
      }
    }

    // Restore button disabled until a slot is selected
    const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement;
    if (restoreBtn) {
      restoreBtn.disabled = true;
    }

    // Show dialog
    modalOverlay?.classList.remove('modal-hidden');
    restoreDialog?.classList.remove('modal-hidden');

    // Disable game input
    if (commandInput) {
      commandInput.disabled = true;
    }

    // Focus first save slot or cancel button
    if (userSaves.length > 0) {
      const firstSlot = restoreSlotsListEl?.querySelector('.save-slot') as HTMLElement;
      firstSlot?.focus();
    }
  });
}

/**
 * Hide the restore dialog
 */
function hideRestoreDialog(slotName: string | null): void {
  modalOverlay?.classList.add('modal-hidden');
  restoreDialog?.classList.add('modal-hidden');
  isDialogOpen = false;

  // Re-enable game input
  if (commandInput) {
    commandInput.disabled = false;
    commandInput.focus();
  }

  if (pendingRestoreResolve) {
    pendingRestoreResolve(slotName);
    pendingRestoreResolve = null;
  }
}

/**
 * Show the startup dialog (continue saved game or start new?)
 */
function showStartupDialog(meta: SaveSlotMeta): Promise<boolean> {
  return new Promise((resolve) => {
    if (!modalOverlay || !startupDialog) {
      // Fall back to starting new game if dialog not available
      resolve(false);
      return;
    }

    pendingStartupResolve = resolve;
    isDialogOpen = true;

    // Populate save info
    if (startupSaveInfo) {
      const date = new Date(meta.timestamp);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      startupSaveInfo.textContent = `Found "${meta.name}" from ${dateStr} ${timeStr} (Turn ${meta.turnCount}, ${meta.location})`;
    }

    // Show dialog
    modalOverlay.classList.remove('modal-hidden');
    startupDialog.classList.remove('modal-hidden');

    // Focus continue button
    const continueBtn = document.getElementById('startup-continue-btn');
    continueBtn?.focus();
  });
}

/**
 * Hide the startup dialog
 */
function hideStartupDialog(shouldContinue: boolean): void {
  modalOverlay?.classList.add('modal-hidden');
  startupDialog?.classList.add('modal-hidden');
  isDialogOpen = false;

  if (pendingStartupResolve) {
    pendingStartupResolve(shouldContinue);
    pendingStartupResolve = null;
  }
}

/**
 * Populate a save slots list element
 */
function populateSaveSlotsList(listEl: HTMLElement | null, forSave: boolean): void {
  if (!listEl) return;

  // Get saves, filtering out autosave for restore dialog
  const allSaves = getSaveIndex();
  const saves = forSave ? allSaves : allSaves.filter(s => s.name !== AUTOSAVE_SLOT);
  listEl.innerHTML = '';

  if (saves.length === 0 && forSave) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'no-saves-message';
    emptyMsg.textContent = 'No existing saves';
    listEl.appendChild(emptyMsg);
    return;
  }

  for (const save of saves) {
    const slot = document.createElement('div');
    slot.className = 'save-slot';
    slot.tabIndex = 0;
    slot.dataset.slotName = save.name;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'save-slot-name';
    nameSpan.textContent = save.name;

    const infoSpan = document.createElement('span');
    infoSpan.className = 'save-slot-info';
    const date = new Date(save.timestamp);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    infoSpan.textContent = `Turn ${save.turnCount} | ${save.location} | ${dateStr} ${timeStr}`;

    slot.appendChild(nameSpan);
    slot.appendChild(infoSpan);

    // Click handler
    slot.addEventListener('click', () => {
      selectSaveSlot(listEl, save.name, forSave);
    });

    // Double-click for quick restore
    if (!forSave) {
      slot.addEventListener('dblclick', () => {
        hideRestoreDialog(save.name);
      });
    }

    // Keyboard handler
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSaveSlot(listEl, save.name, forSave);
        if (!forSave) {
          // For restore, Enter on selected slot confirms
          if (selectedSaveSlot === save.name) {
            hideRestoreDialog(save.name);
          }
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = slot.nextElementSibling as HTMLElement;
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = slot.previousElementSibling as HTMLElement;
        prev?.focus();
      }
    });

    listEl.appendChild(slot);
  }
}

/**
 * Select a save slot
 */
function selectSaveSlot(listEl: HTMLElement, slotName: string, forSave: boolean): void {
  // Remove selection from all slots
  listEl.querySelectorAll('.save-slot').forEach(el => el.classList.remove('selected'));

  // Select clicked slot
  const slot = listEl.querySelector(`[data-slot-name="${slotName}"]`);
  slot?.classList.add('selected');

  selectedSaveSlot = slotName;

  // For save dialog, also update the name input
  if (forSave && saveNameInput) {
    saveNameInput.value = slotName;
  }

  // For restore dialog, enable the restore button
  if (!forSave) {
    const restoreBtn = document.getElementById('restore-confirm-btn') as HTMLButtonElement;
    if (restoreBtn) {
      restoreBtn.disabled = false;
    }
  }
}

/**
 * Set up modal dialog event handlers
 */
function setupDialogHandlers(): void {
  // Save dialog buttons
  const saveConfirmBtn = document.getElementById('save-confirm-btn');
  const saveCancelBtn = document.getElementById('save-cancel-btn');

  saveConfirmBtn?.addEventListener('click', () => {
    const name = sanitizeSaveName(saveNameInput?.value || generateSaveName());
    if (name) {
      performSave(name);
      hideSaveDialog(true);
    }
  });

  saveCancelBtn?.addEventListener('click', () => {
    hideSaveDialog(false);
  });

  // Restore dialog buttons
  const restoreConfirmBtn = document.getElementById('restore-confirm-btn');
  const restoreCancelBtn = document.getElementById('restore-cancel-btn');

  restoreConfirmBtn?.addEventListener('click', () => {
    if (selectedSaveSlot) {
      hideRestoreDialog(selectedSaveSlot);
    }
  });

  restoreCancelBtn?.addEventListener('click', () => {
    hideRestoreDialog(null);
  });

  // Startup dialog buttons
  const startupContinueBtn = document.getElementById('startup-continue-btn');
  const startupNewBtn = document.getElementById('startup-new-btn');

  startupContinueBtn?.addEventListener('click', () => {
    hideStartupDialog(true);
  });

  startupNewBtn?.addEventListener('click', () => {
    hideStartupDialog(false);
  });

  // Enter key in save name input
  saveNameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = sanitizeSaveName(saveNameInput?.value || generateSaveName());
      if (name) {
        performSave(name);
        hideSaveDialog(true);
      }
    } else if (e.key === 'Escape') {
      hideSaveDialog(false);
    }
  });

  // Escape key closes dialogs
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDialogOpen) {
      if (saveDialog && !saveDialog.classList.contains('modal-hidden')) {
        hideSaveDialog(false);
      } else if (restoreDialog && !restoreDialog.classList.contains('modal-hidden')) {
        hideRestoreDialog(null);
      } else if (startupDialog && !startupDialog.classList.contains('modal-hidden')) {
        hideStartupDialog(false);
      }
    }
  });

  // Click overlay to close
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      if (saveDialog && !saveDialog.classList.contains('modal-hidden')) {
        hideSaveDialog(false);
      } else if (restoreDialog && !restoreDialog.classList.contains('modal-hidden')) {
        hideRestoreDialog(null);
      } else if (startupDialog && !startupDialog.classList.contains('modal-hidden')) {
        hideStartupDialog(false);
      }
    }
  });
}

/**
 * Perform the actual save to localStorage
 * Captures locations and traits without full serialization
 */
function performSave(slotName: string, silent = false): void {
  try {
    // Capture state without full serialization
    const { locations, traits } = captureWorldState();

    // Compress the transcript HTML for storage
    const html = textContent?.innerHTML || '';
    const compressedHtml = compressToUTF16(html);

    const saveData: BrowserSaveData = {
      version: '2.0.0-browser',
      timestamp: Date.now(),
      turnCount: currentTurn,
      score: currentScore,
      locations,
      traits,
      transcriptHtml: compressedHtml,
    };

    const key = SAVE_PREFIX + slotName;
    localStorage.setItem(key, JSON.stringify(saveData));

    // Update index
    const meta: SaveSlotMeta = {
      name: slotName,
      timestamp: saveData.timestamp,
      turnCount: currentTurn,
      location: getCurrentLocation(),
    };
    updateSaveIndex(meta);

    console.log('[save] Game saved to', key, meta);
    if (!silent) {
      displayText(`[Game saved as "${slotName}"]`);
    }

    // Sync to world so stdlib actions know saves exist
    syncSavesToWorld();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[save] Failed:', message);
    if (!silent) {
      displayText(`[Save failed: ${message}]`);
      beep();
    }
  }
}

/**
 * Perform auto-save (silent, no dialog)
 * Captures locations and traits without full serialization
 */
function performAutoSave(): void {
  try {
    // Capture state without full serialization
    const { locations, traits } = captureWorldState();

    // Compress the transcript HTML for storage
    const html = textContent?.innerHTML || '';
    const compressedHtml = compressToUTF16(html);

    const saveData: BrowserSaveData = {
      version: '2.0.0-browser',
      timestamp: Date.now(),
      turnCount: currentTurn,
      score: currentScore,
      locations,
      traits,
      transcriptHtml: compressedHtml,
    };

    const key = SAVE_PREFIX + AUTOSAVE_SLOT;
    localStorage.setItem(key, JSON.stringify(saveData));

    // Update index
    const meta: SaveSlotMeta = {
      name: AUTOSAVE_SLOT,
      timestamp: Date.now(),
      turnCount: currentTurn,
      location: getCurrentLocation(),
    };
    updateSaveIndex(meta);

    console.log('[autosave] Saved at turn', currentTurn);

    // Sync to world so stdlib actions know saves exist
    syncSavesToWorld();
  } catch (error) {
    console.error('[autosave] Failed:', error);
  }
}

// Browser save data format - captures state without replacing entities
interface BrowserSaveData {
  version: string;
  timestamp: number;
  turnCount: number;
  score: number;
  // Entity locations: entityId -> locationId
  locations: Record<string, string | null>;
  // Entity trait states: entityId -> { traitName -> traitData }
  traits: Record<string, Record<string, any>>;
  // Compressed HTML transcript (innerHTML of #text-content)
  transcriptHtml?: string;
}

/**
 * Capture current world state (locations and traits) without full serialization
 */
function captureWorldState(): { locations: Record<string, string | null>; traits: Record<string, Record<string, any>> } {
  const locations: Record<string, string | null> = {};
  const traits: Record<string, Record<string, any>> = {};

  for (const entity of world.getAllEntities()) {
    // Capture location
    const locationId = world.getLocation(entity.id);
    locations[entity.id] = locationId || null;

    // Capture all trait data
    const entityTraits: Record<string, any> = {};
    for (const [traitName, trait] of entity.traits) {
      // Serialize trait by spreading its properties (excluding methods)
      const traitData: any = {};
      for (const key of Object.keys(trait)) {
        const value = (trait as any)[key];
        if (typeof value !== 'function') {
          traitData[key] = value;
        }
      }
      entityTraits[traitName] = traitData;
    }
    traits[entity.id] = entityTraits;
  }

  return { locations, traits };
}

/**
 * Restore world state (locations and traits) to existing entities
 * This preserves entity handlers unlike world.loadJSON()
 */
function restoreWorldState(state: { locations: Record<string, string | null>; traits: Record<string, Record<string, any>> }): void {
  // Restore locations
  for (const [entityId, locationId] of Object.entries(state.locations)) {
    if (locationId) {
      const entity = world.getEntity(entityId);
      if (entity) {
        world.moveEntity(entityId, locationId);
      }
    }
  }

  // Restore trait data
  for (const [entityId, entityTraits] of Object.entries(state.traits)) {
    const entity = world.getEntity(entityId);
    if (!entity) continue;

    for (const [traitName, traitData] of Object.entries(entityTraits)) {
      const trait = entity.get(traitName);
      if (trait) {
        // Update trait properties
        for (const [key, value] of Object.entries(traitData)) {
          if (key !== 'type' && typeof value !== 'function') {
            (trait as any)[key] = value;
          }
        }
      }
    }
  }
}

/**
 * Load autosave data from localStorage (returns null if not found)
 */
function loadAutosave(): BrowserSaveData | null {
  try {
    const key = SAVE_PREFIX + AUTOSAVE_SLOT;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as BrowserSaveData;
  } catch (error) {
    console.error('[autosave] Failed to load:', error);
    return null;
  }
}

/**
 * Load any save slot from localStorage
 */
function loadSaveSlot(slotName: string): BrowserSaveData | null {
  try {
    const key = SAVE_PREFIX + slotName;
    const json = localStorage.getItem(key);
    if (!json) return null;
    return JSON.parse(json) as BrowserSaveData;
  } catch (error) {
    console.error('[load] Failed to load slot:', slotName, error);
    return null;
  }
}

/**
 * Sync localStorage saves to world sharedData so stdlib actions know saves exist
 */
function syncSavesToWorld(): void {
  const saves = getSaveIndex();
  if (saves.length === 0) return;

  // Build saves object that the stdlib restoring action expects
  const savesObj: Record<string, any> = {};
  for (const save of saves) {
    savesObj[save.name] = {
      name: save.name,
      timestamp: save.timestamp,
      moves: save.turnCount,
    };
  }

  // Register sharedData capability if not exists, then update with saves
  if (!world.hasCapability('sharedData')) {
    world.registerCapability('sharedData', {
      initialData: { saves: savesObj }
    });
  } else {
    world.updateCapability('sharedData', { saves: savesObj });
  }

  console.log('[sync] Synced', saves.length, 'saves to world sharedData');
}

/**
 * Save/Restore hooks for localStorage persistence
 */
const saveRestoreHooks: ISaveRestoreHooks = {
  async onSaveRequested(_data: ISaveData): Promise<void> {
    // Ignore the engine's ISaveData - we'll use world.toJSON() for complete state
    // Show save dialog and wait for user input
    const saved = await showSaveDialog();

    if (!saved) {
      // User cancelled
      displayText('[Save cancelled]');
    }
  },

  async onRestoreRequested(): Promise<ISaveData | null> {
    // Show restore dialog and wait for user to select a slot
    const slotName = await showRestoreDialog();

    if (!slotName) {
      console.log('[restore] User cancelled');
      displayText('[Restore cancelled]');
      return null;
    }

    try {
      const saveData = loadSaveSlot(slotName);
      if (!saveData || !saveData.locations) {
        console.log('[restore] Save slot not found or invalid:', slotName);
        displayText(`[Save "${slotName}" not found]`);
        beep();
        return null;
      }

      // Clear screen first
      clearScreen();

      // Restore state without replacing entities (preserves handlers)
      restoreWorldState({ locations: saveData.locations, traits: saveData.traits });
      currentTurn = saveData.turnCount || 0;
      currentScore = saveData.score || 0;
      // Set offset so engine's turn counter aligns with saved turn
      // Engine's next turn will be 1, but we want to show savedTurn
      turnOffset = currentTurn - 1;

      // Restore transcript HTML if available
      if (saveData.transcriptHtml && textContent) {
        const html = decompressFromUTF16(saveData.transcriptHtml);
        textContent.innerHTML = html || '';
      }

      updateStatusLine();

      console.log('[restore] Restored from', slotName, 'to turn', currentTurn, 'offset', turnOffset);
      displayText(`[Restored "${slotName}"]`);
      scrollToBottom();
      syncScoreFromWorld();

      // Return a minimal ISaveData so engine thinks restore succeeded
      // The actual state is already restored via world.loadJSON()
      return {
        version: '1.0.0',
        timestamp: saveData.timestamp,
        metadata: {
          storyId: 'dungeo',
          storyVersion: '1.0.0',
          turnCount: currentTurn,
          playTime: 0,
        },
        engineState: {
          eventSource: [],
          spatialIndex: { entities: {}, locations: {}, relationships: {} },
          turnHistory: [],
        },
        storyConfig: {
          id: 'dungeo',
          version: '1.0.0',
          title: 'DUNGEO',
          author: 'Dave Cornelson',
        },
      };
    } catch (error) {
      console.error('[restore] Failed:', error);
      displayText(`[Restore failed: ${error}]`);
      beep();
      return null;
    }
  },

  async onRestartRequested(_context: any): Promise<boolean> {
    // Clear autosave (but keep manual saves)
    try {
      localStorage.removeItem(SAVE_PREFIX + AUTOSAVE_SLOT);
      // Update index to remove autosave
      const saves = getSaveIndex().filter(s => s.name !== AUTOSAVE_SLOT);
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(saves));
    } catch (error) {
      console.error('[restart] Failed to clear autosave:', error);
    }

    console.log('[restart] Restarting game via page reload...');
    // Reload the page to fully reset - engine doesn't clear scheduler/world state
    window.location.reload();
    return false; // Won't reach this, but signals we're handling it
  },
};

/**
 * Check for existing saved games
 */
function checkForSavedGame(): { hasSave: boolean; meta?: SaveSlotMeta } {
  const saves = getSaveIndex();
  if (saves.length === 0) {
    return { hasSave: false };
  }
  // Return the most recent save (first in sorted index)
  return { hasSave: true, meta: saves[0] };
}

/**
 * Initialize the game
 */
function initializeGame(): void {
  // Create world and player
  world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser and language
  const language = new LanguageProvider();
  const parser = new Parser(language);

  // Extend parser and language with story-specific vocabulary
  if (story.extendParser) {
    story.extendParser(parser);
  }
  if (story.extendLanguage) {
    story.extendLanguage(language);
  }

  // Create perception service
  const perceptionService = new PerceptionService();

  // Create engine
  engine = new GameEngine({
    world,
    player,
    parser,
    language,
    perceptionService,
  });

  // Set up event handlers
  engine.on('text:output', (text: string, turn: number) => {
    console.log('[text:output]', { text, turn, turnOffset });
    displayText(text);

    // Apply turn offset (set after restore to maintain correct turn count)
    currentTurn = turn + turnOffset;
    updateStatusLine();

    // Auto-save after each turn (debounced - only save if turn changed)
    if (turn > 0) {
      performAutoSave();
    }
  });

  engine.on('event', (event: SequencedEvent) => {
    console.log('[event]', event.type, event.data);

    // Beep on errors/failures (classic Infocom style)
    if (event.type === 'command.failed' ||
        event.type === 'action.blocked' ||
        event.type.includes('.blocked') ||
        event.type === 'game.player_death') {
      beep();
    }

    // Track score changes
    if (event.type === 'game.score_changed' && event.data) {
      currentScore = event.data.newScore ?? currentScore;
      updateStatusLine();
      // Celebratory beep on score increase
      if (event.data.newScore > (event.data.oldScore ?? 0)) {
        beep(1000, 50); // Higher, shorter beep for points
      }
    }

    // Handle platform events for save/restore
    if (event.type === 'platform.save_failed') {
      displayText(`[Save failed: ${event.data?.error || 'Unknown error'}]`);
      beep();
    } else if (event.type === 'platform.restore_failed') {
      displayText(`[Restore failed: ${event.data?.error || 'No saved game found'}]`);
      beep();
    } else if (event.type === 'platform.restore_completed') {
      // Update score/turn from restored state
      if (event.data?.turnCount !== undefined) {
        currentTurn = event.data.turnCount;
      }
      updateStatusLine();
    }

    // Handle ABOUT command
    if (event.type === 'if.action.about') {
      displayText(getTitleInfo());
    }

    // Handle HELP command (1981 Fortran-style help)
    if (event.type === 'if.event.help_displayed') {
      displayText(getHelpText());
    }

    // Handle DIAGNOSE command
    if (event.type === 'dungeo.event.diagnose') {
      displayText(formatDiagnose(event.data));
    }

    // Handle RNAME command (room name only)
    if (event.type === 'dungeo.event.rname') {
      displayText(event.data?.roomName || 'Unknown');
    }

    // Handle OBJECTS command
    if (event.type === 'dungeo.event.objects') {
      displayText(formatObjects(event.data));
    }
  });

  // Set the story and register save/restore hooks
  engine.setStory(story);
  engine.registerSaveRestoreHooks(saveRestoreHooks);
}

/**
 * Set up DOM elements and event handlers
 */
function setupDOM(): void {
  statusLocation = document.getElementById('location-name');
  statusScore = document.getElementById('score-turns');
  textContent = document.getElementById('text-content');
  mainWindow = document.getElementById('main-window');
  commandInput = document.getElementById('command-input') as HTMLInputElement;

  // Modal elements
  modalOverlay = document.getElementById('modal-overlay');
  saveDialog = document.getElementById('save-dialog');
  restoreDialog = document.getElementById('restore-dialog');
  startupDialog = document.getElementById('startup-dialog');
  saveNameInput = document.getElementById('save-name-input') as HTMLInputElement;
  saveSlotsListEl = document.getElementById('save-slots-list');
  restoreSlotsListEl = document.getElementById('restore-slots-list');
  noSavesMessage = document.getElementById('no-saves-message');
  startupSaveInfo = document.getElementById('startup-save-info');

  console.log('[setup] Modal elements:', {
    modalOverlay: !!modalOverlay,
    saveDialog: !!saveDialog,
    restoreDialog: !!restoreDialog,
    startupDialog: !!startupDialog,
    saveNameInput: !!saveNameInput,
  });

  if (!commandInput) {
    console.error('Command input element not found');
    return;
  }

  // Set up dialog handlers
  setupDialogHandlers();

  // Handle keyboard input
  commandInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory(1);
    }
  });

  // Keep focus on input (but not when dialog is open)
  document.addEventListener('click', (e) => {
    if (commandInput && !commandInput.disabled && !isDialogOpen) {
      // Don't steal focus from dialog elements
      const target = e.target as HTMLElement;
      if (!target.closest('.modal-dialog')) {
        commandInput.focus();
      }
    }
  });
}

/**
 * Handle command submission
 */
async function handleCommand(): Promise<void> {
  if (!commandInput) return;

  const command = commandInput.value.trim();
  if (!command) return;

  // Add to history
  commandHistory.push(command);
  historyIndex = commandHistory.length;

  // Clear input
  commandInput.value = '';

  // Display command echo
  displayCommand(command);

  // Execute command
  try {
    await engine.executeTurn(command);
    // Sync score from world after each turn
    syncScoreFromWorld();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    displayText(`[Error: ${message}]`);
  }
}

/**
 * Sync score from world capability to currentScore and update status line
 */
function syncScoreFromWorld(): void {
  const scoring = world.getCapability('scoring');
  if (scoring && typeof scoring.scoreValue === 'number') {
    const newScore = scoring.scoreValue;
    if (newScore !== currentScore) {
      currentScore = newScore;
      updateStatusLine();
    }
  }
}

/**
 * Navigate command history
 */
function navigateHistory(direction: number): void {
  if (!commandInput) return;

  const newIndex = historyIndex + direction;

  if (newIndex < 0) return;

  if (newIndex >= commandHistory.length) {
    historyIndex = commandHistory.length;
    commandInput.value = '';
    return;
  }

  historyIndex = newIndex;
  commandInput.value = commandHistory[historyIndex];

  // Move cursor to end
  commandInput.setSelectionRange(
    commandInput.value.length,
    commandInput.value.length
  );
}

/**
 * Display text in the main window
 * Double newlines create paragraph breaks, single newlines preserved with pre-line
 */
function displayText(text: string): void {
  if (!textContent) return;

  // Split on double newlines to get paragraphs
  const paragraphs = text.split(/\n\n+/);

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (trimmed) {
      const p = document.createElement('p');
      // Use pre-line to preserve single newlines within paragraph
      p.style.whiteSpace = 'pre-line';
      p.textContent = trimmed;
      textContent.appendChild(p);
    }
  }

  scrollToBottom();
}

/**
 * Display command echo
 */
function displayCommand(command: string): void {
  if (!textContent) return;

  const div = document.createElement('div');
  div.className = 'command-echo';
  div.textContent = `> ${command}`;
  textContent.appendChild(div);

  scrollToBottom();
}

/**
 * Clear the screen
 */
function clearScreen(): void {
  if (textContent) {
    textContent.innerHTML = '';
  }
}

/**
 * Get the title info for ABOUT command
 */
function getTitleInfo(): string {
  return [
    GAME_TITLE,
    GAME_DESCRIPTION,
    `By ${GAME_AUTHORS}`,
    `Ported by ${PORTED_BY}`,
    '',
    `Sharpee v${SHARPEE_VERSION} | Game v${STORY_VERSION}`,
    `Built: ${BUILD_DATE}`,
  ].join('\n');
}

/**
 * Get the HELP text (1981 Fortran-style, updated for browser)
 */
function getHelpText(): string {
  return `Commands to DUNGEO are simple sentences: <verb>, <verb> <object>,
and <verb> <object> <indirect object> are examples.

Some useful commands are:

<direction>     Walk in that direction. Common directions
                are N, S, E, W, NE, NW, SE, SW, U(p), and D(own).
AGAIN (G)       Repeat the last command.
LOOK (L)        Describe the surroundings.
ROOM            Print the verbose room description without objects.
RNAME           Print the short room name.
OBJECTS         Print the objects in the room.
INVENTORY (I)   Describe your possessions.
DIAGNOSE        Describe your state of health.
WAIT (Z)        Causes "time" to pass.
SCORE           Print your score and number of moves.
SAVE            Save the game to a named slot.
RESTORE         Restore a saved game.
RESTART         Start the game over.
QUIT (Q)        Leave the game.`;
}

/**
 * Format DIAGNOSE output (1981 MDL-style)
 */
function formatDiagnose(data: any): string {
  const lines: string[] = [];

  // Health status
  if (data.woundLevel === 0) {
    lines.push('You are in perfect health.');
  } else {
    let woundText = '';
    switch (data.woundLevel) {
      case 1: woundText = 'You have a light wound,'; break;
      case 2: woundText = 'You have a serious wound,'; break;
      case 3: woundText = 'You have several wounds,'; break;
      default: woundText = 'You have serious wounds,'; break;
    }
    if (data.turnsToHeal) {
      woundText += ` which will be cured after ${data.turnsToHeal} moves.`;
    }
    lines.push(woundText);
  }

  // Strength/resilience status
  switch (data.strengthLevel) {
    case 0: lines.push("You are at death's door."); break;
    case 1: lines.push('You can be killed by one more light wound.'); break;
    case 2: lines.push('You can be killed by a serious wound.'); break;
    case 3: lines.push('You can survive one serious wound.'); break;
    default: lines.push('You are strong enough to take several wounds.'); break;
  }

  // Death count
  if (data.deaths === 1) {
    lines.push('You have been killed once.');
  } else if (data.deaths === 2) {
    lines.push('You have been killed twice.');
  } else if (data.deaths > 2) {
    lines.push(`You have been killed ${data.deaths} times.`);
  }

  return lines.join('\n');
}

/**
 * Format OBJECTS output
 */
function formatObjects(data: any): string {
  if (!data.hasItems || !data.items || data.items.length === 0) {
    return 'There is nothing here.';
  }

  const lines: string[] = [];

  // List items directly in room
  for (const item of data.items) {
    lines.push(`There is a ${item.name} here.`);
  }

  // List contents of open containers
  if (data.containerContents) {
    for (const container of data.containerContents) {
      const itemNames = container.items.map((i: any) => i.name).join(', ');
      const prep = container.preposition === 'in' ? 'In' : 'On';
      lines.push(`${prep} the ${container.containerName}: ${itemNames}`);
    }
  }

  return lines.join('\n');
}

/**
 * Update the status line
 */
function updateStatusLine(): void {
  // Get current location
  const player = world.getPlayer();
  let locationName = '';

  if (player) {
    const locationId = world.getLocation(player.id);
    if (locationId) {
      const room = world.getEntity(locationId);
      if (room) {
        locationName = room.name || 'Unknown';
      }
    }
  }

  if (statusLocation) {
    statusLocation.textContent = locationName;
  }

  if (statusScore) {
    statusScore.textContent = `Score: ${currentScore} | Turns: ${currentTurn}`;
  }
}

/**
 * Scroll main window to bottom
 */
function scrollToBottom(): void {
  if (mainWindow) {
    mainWindow.scrollTop = mainWindow.scrollHeight;
  }
}

/**
 * Start the game
 */
async function start(): Promise<void> {
  console.log('=== DUNGEO BROWSER START ===');

  try {
    setupDOM();
    console.log('DOM setup complete');

    initializeGame();
    console.log('Game initialized');

    // Start the engine first
    await engine.start();

    // Sync localStorage saves to world so stdlib actions know saves exist
    syncSavesToWorld();

    // Check for autosave and silently restore
    const autosaveData = loadAutosave();
    if (autosaveData && autosaveData.locations) {
      console.log('[startup] Found autosave, restoring...');
      try {
        // Restore state without replacing entities (preserves handlers)
        restoreWorldState({ locations: autosaveData.locations, traits: autosaveData.traits });
        currentTurn = autosaveData.turnCount || 0;
        currentScore = autosaveData.score || 0;
        // Set offset so engine's turn counter aligns with saved turn
        // Engine's next turn will be 1, but we want to show savedTurn
        turnOffset = currentTurn - 1;

        // Restore transcript HTML if available
        if (autosaveData.transcriptHtml && textContent) {
          const html = decompressFromUTF16(autosaveData.transcriptHtml);
          textContent.innerHTML = html || '';
        }

        console.log('[startup] Restored to turn', currentTurn, 'score', currentScore, 'offset', turnOffset);
        updateStatusLine();

        // Show restored message (transcript already shows game state)
        displayText('[Session restored]');
        scrollToBottom();
        syncScoreFromWorld();
      } catch (error) {
        console.error('[startup] Failed to restore autosave:', error);
        // Fall through to new game - banner is displayed by engine.start()
        await engine.executeTurn('look');
      }
    } else {
      // New game - banner is displayed by engine.start() via text-service
      console.log('Executing initial look command...');
      await engine.executeTurn('look');
      console.log('Initial look complete');
    }

    // Focus input
    if (commandInput) {
      commandInput.focus();
    }
  } catch (error) {
    console.error('=== STARTUP ERROR ===', error);
    displayText(`[Startup Error: ${error}]`);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
