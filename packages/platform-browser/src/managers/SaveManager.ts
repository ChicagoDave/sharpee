/**
 * SaveManager - handles save/restore operations using localStorage
 */

import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { WorldModel } from '@sharpee/world-model';
import type { SaveSlotMeta, BrowserSaveData, SaveContext } from '../types';
import { AUTOSAVE_SLOT } from '../types';

export interface SaveManagerConfig {
  /** Storage key prefix (e.g., "dungeo-") */
  storagePrefix: string;
  /** WorldModel reference for state capture/restore */
  world: WorldModel;
  /** Callback when state changes (for UI updates) */
  onStateChange?: () => void;
}

export class SaveManager {
  private storagePrefix: string;
  private indexKey: string;
  private savePrefix: string;
  private world: WorldModel;
  private onStateChange?: () => void;
  private baseline: { locations: Record<string, string | null>; traits: Record<string, Record<string, unknown>> } | null = null;

  constructor(config: SaveManagerConfig) {
    this.storagePrefix = config.storagePrefix;
    this.indexKey = `${config.storagePrefix}saves-index`;
    this.savePrefix = `${config.storagePrefix}save-`;
    this.world = config.world;
    this.onStateChange = config.onStateChange;
  }

  /**
   * Capture the initial world state as baseline for delta saves.
   * Call after initializeWorld() completes but before the first turn.
   */
  captureBaseline(): void {
    this.baseline = this.captureWorldState();
    console.log('[save] Baseline captured:', Object.keys(this.baseline.locations).length, 'entities');
  }

  /**
   * Get list of all saved games from index
   */
  getSaveIndex(): SaveSlotMeta[] {
    try {
      const json = localStorage.getItem(this.indexKey);
      if (!json) return [];
      return JSON.parse(json) as SaveSlotMeta[];
    } catch {
      return [];
    }
  }

  /**
   * Update save index with new/updated slot
   */
  updateSaveIndex(meta: SaveSlotMeta): void {
    const index = this.getSaveIndex();
    const existing = index.findIndex(s => s.name === meta.name);
    if (existing >= 0) {
      index[existing] = meta;
    } else {
      index.push(meta);
    }
    // Sort by timestamp descending (newest first)
    index.sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(this.indexKey, JSON.stringify(index));
  }

  /**
   * Get current player location name
   */
  getCurrentLocation(): string {
    try {
      const player = this.world.getPlayer();
      if (player) {
        const locationId = this.world.getLocation(player.id);
        if (locationId) {
          const room = this.world.getEntity(locationId);
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
  generateSaveName(turnCount: number): string {
    const location = this.getCurrentLocation()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 15);
    return `turn-${turnCount}-${location}`;
  }

  /**
   * Sanitize save name for storage key
   */
  sanitizeSaveName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30) || 'save';
  }

  /**
   * Capture current world state (locations and traits) without full serialization
   */
  captureWorldState(): { locations: Record<string, string | null>; traits: Record<string, Record<string, unknown>> } {
    const locations: Record<string, string | null> = {};
    const traits: Record<string, Record<string, unknown>> = {};

    for (const entity of this.world.getAllEntities()) {
      // Capture location
      const locationId = this.world.getLocation(entity.id);
      locations[entity.id] = locationId || null;

      // Capture all trait data
      const entityTraits: Record<string, unknown> = {};
      for (const [traitName, trait] of entity.traits) {
        // Serialize trait by spreading its properties (excluding methods)
        const traitData: Record<string, unknown> = {};
        const traitAsAny = trait as unknown as Record<string, unknown>;
        for (const key of Object.keys(trait)) {
          const value = traitAsAny[key];
          if (typeof value !== 'function') {
            traitData[key] = value;
          }
        }
        entityTraits[traitName] = traitData;
      }
      traits[entity.id] = entityTraits as Record<string, Record<string, unknown>>;
    }

    return { locations, traits };
  }

  /**
   * Capture only the state that changed from the baseline.
   * Falls back to full capture if no baseline is set.
   */
  private captureDelta(): { locations: Record<string, string | null>; traits: Record<string, Record<string, unknown>> } {
    const current = this.captureWorldState();
    if (!this.baseline) {
      return current;
    }

    const deltaLocations: Record<string, string | null> = {};
    const deltaTraits: Record<string, Record<string, unknown>> = {};

    // Diff locations
    for (const [id, loc] of Object.entries(current.locations)) {
      if (loc !== this.baseline.locations[id]) {
        deltaLocations[id] = loc;
      }
    }

    // Diff traits
    for (const [id, entityTraits] of Object.entries(current.traits)) {
      const baseEntityTraits = this.baseline.traits[id] || {};
      for (const [traitName, traitData] of Object.entries(entityTraits)) {
        const baseTrait = baseEntityTraits[traitName] as Record<string, unknown> | undefined;
        if (!baseTrait || !this.shallowEqual(traitData as Record<string, unknown>, baseTrait)) {
          if (!deltaTraits[id]) deltaTraits[id] = {};
          deltaTraits[id][traitName] = traitData;
        }
      }
    }

    return { locations: deltaLocations, traits: deltaTraits };
  }

  /**
   * Shallow equality check for trait data objects.
   */
  private shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }

  /**
   * Restore world state (locations and traits) to existing entities.
   * This preserves entity handlers unlike world.loadJSON().
   */
  restoreWorldState(state: BrowserSaveData): void {
    // Restore locations
    for (const [entityId, locationId] of Object.entries(state.locations)) {
      if (locationId) {
        const entity = this.world.getEntity(entityId);
        if (entity) {
          this.world.moveEntity(entityId, locationId);
        }
      }
    }

    // Restore trait data
    for (const [entityId, entityTraits] of Object.entries(state.traits)) {
      const entity = this.world.getEntity(entityId);
      if (!entity) continue;

      for (const [traitName, traitData] of Object.entries(entityTraits)) {
        const trait = entity.get(traitName);
        if (trait) {
          // Update trait properties
          const traitAsAny = trait as unknown as Record<string, unknown>;
          for (const [key, value] of Object.entries(traitData as Record<string, unknown>)) {
            if (key !== 'type' && typeof value !== 'function') {
              traitAsAny[key] = value;
            }
          }
        }
      }
    }
  }

  /**
   * Perform the actual save to localStorage
   */
  performSave(slotName: string, context: SaveContext, silent = false): { success: boolean; error?: string } {
    try {
      // Capture only changed state (delta from baseline)
      const { locations, traits } = this.captureDelta();

      // Compress the transcript HTML for storage
      const compressedHtml = compressToUTF16(context.transcriptHtml);

      const saveData: BrowserSaveData = {
        version: '3.0.0-delta',
        timestamp: Date.now(),
        turnCount: context.turnCount,
        score: context.score,
        locations,
        traits,
        transcriptHtml: compressedHtml,
      };

      // Compress entire payload to obscure contents and reduce size
      const key = this.savePrefix + slotName;
      const compressed = compressToUTF16(JSON.stringify(saveData));
      localStorage.setItem(key, compressed);

      // Update index
      const meta: SaveSlotMeta = {
        name: slotName,
        timestamp: saveData.timestamp,
        turnCount: context.turnCount,
        location: this.getCurrentLocation(),
      };
      this.updateSaveIndex(meta);

      console.log('[save] Game saved to', key, meta);

      // Sync to world so stdlib actions know saves exist
      this.syncSavesToWorld();

      this.onStateChange?.();

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[save] Failed:', message);
      return { success: false, error: message };
    }
  }

  /**
   * Perform auto-save (silent, no dialog)
   */
  performAutoSave(context: SaveContext): void {
    try {
      const { locations, traits } = this.captureDelta();

      const compressedHtml = compressToUTF16(context.transcriptHtml);

      const saveData: BrowserSaveData = {
        version: '3.0.0-delta',
        timestamp: Date.now(),
        turnCount: context.turnCount,
        score: context.score,
        locations,
        traits,
        transcriptHtml: compressedHtml,
      };

      const key = this.savePrefix + AUTOSAVE_SLOT;
      const compressed = compressToUTF16(JSON.stringify(saveData));
      localStorage.setItem(key, compressed);

      const meta: SaveSlotMeta = {
        name: AUTOSAVE_SLOT,
        timestamp: Date.now(),
        turnCount: context.turnCount,
        location: this.getCurrentLocation(),
      };
      this.updateSaveIndex(meta);

      console.log('[autosave] Saved at turn', context.turnCount);

      this.syncSavesToWorld();
    } catch (error) {
      console.error('[autosave] Failed:', error);
    }
  }

  /**
   * Load autosave data from localStorage
   */
  loadAutosave(): BrowserSaveData | null {
    return this.loadSaveSlot(AUTOSAVE_SLOT);
  }

  /**
   * Load any save slot from localStorage
   */
  loadSaveSlot(slotName: string): BrowserSaveData | null {
    try {
      const key = this.savePrefix + slotName;
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      // v3 saves are lz-string compressed; v2 saves are raw JSON
      let json: string;
      if (raw.startsWith('{')) {
        // Legacy v2 uncompressed JSON
        json = raw;
      } else {
        const decompressed = decompressFromUTF16(raw);
        if (!decompressed) return null;
        json = decompressed;
      }

      return JSON.parse(json) as BrowserSaveData;
    } catch (error) {
      console.error('[load] Failed to load slot:', slotName, error);
      return null;
    }
  }

  /**
   * Decompress transcript HTML from save data
   */
  decompressTranscript(compressedHtml: string): string {
    try {
      return decompressFromUTF16(compressedHtml) || '';
    } catch {
      return '';
    }
  }

  /**
   * Sync localStorage saves to world sharedData so stdlib actions know saves exist
   */
  syncSavesToWorld(): void {
    const saves = this.getSaveIndex();
    if (saves.length === 0) return;

    // Build saves object that the stdlib restoring action expects
    const savesObj: Record<string, { name: string; timestamp: number; moves: number }> = {};
    for (const save of saves) {
      savesObj[save.name] = {
        name: save.name,
        timestamp: save.timestamp,
        moves: save.turnCount,
      };
    }

    // Register sharedData capability if not exists, then update with saves
    if (!this.world.hasCapability('sharedData')) {
      this.world.registerCapability('sharedData', {
        initialData: { saves: savesObj }
      });
    } else {
      this.world.updateCapability('sharedData', { saves: savesObj });
    }

    console.log('[sync] Synced', saves.length, 'saves to world sharedData');
  }

  /**
   * Clear autosave (for restart)
   */
  clearAutosave(): void {
    try {
      const key = this.savePrefix + AUTOSAVE_SLOT;
      localStorage.removeItem(key);

      // Also update index
      const index = this.getSaveIndex().filter(s => s.name !== AUTOSAVE_SLOT);
      localStorage.setItem(this.indexKey, JSON.stringify(index));

      console.log('[autosave] Cleared');
    } catch {
      // Ignore errors
    }
  }

  /**
   * Check if there's a recent save to continue from
   * Returns the most recent save or null
   */
  checkForSavedGame(): SaveSlotMeta | null {
    const saves = this.getSaveIndex();
    if (saves.length === 0) return null;

    // Return most recent save (already sorted by timestamp desc)
    return saves[0];
  }

  /**
   * Get user saves (excluding autosave)
   */
  getUserSaves(): SaveSlotMeta[] {
    return this.getSaveIndex().filter(s => s.name !== AUTOSAVE_SLOT);
  }
}
