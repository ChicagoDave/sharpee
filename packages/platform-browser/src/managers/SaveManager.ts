/**
 * `SaveManager` — wraps the engine's `ISaveData` for localStorage
 * persistence and exposes a small UI surface (save index, autosave,
 * transcript decompression).
 *
 * Public interface: {@link SaveManager} class.
 *
 * Bounded context: `@sharpee/platform-browser` host. The host registers
 * `ISaveRestoreHooks` with the engine; on save the engine produces a
 * complete `ISaveData` and the platform wraps it in a
 * {@link BrowserSaveEnvelope}; on restore the platform unwraps the
 * envelope and returns the engine save back to the engine, which
 * applies it via `WorldModel.loadJSON`.
 *
 * History: v3.0.0-delta of this manager implemented its own
 * locations + traits serializer that silently dropped score,
 * capabilities, world state values, relationships, and ID counters.
 * v4.0.0 (this version) routes through the engine's save/restore
 * service and is therefore feature-complete by construction. The save
 * format bumped from `'3.0.0-delta'` → envelope `'4.0.0'`; old slots
 * are rejected.
 */

import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { ISaveData } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import type {
  BrowserSaveEnvelope,
  SaveContext,
  SaveSlotMeta,
} from '../types';
import { AUTOSAVE_SLOT } from '../types';

export interface SaveManagerConfig {
  /** Storage key prefix (e.g., "dungeo-") */
  storagePrefix: string;
  /** WorldModel reference — used only for UI helpers (current location). */
  world: WorldModel;
  /** Callback when state changes (for UI updates) */
  onStateChange?: () => void;
}

const ENVELOPE_VERSION: BrowserSaveEnvelope['envelopeVersion'] = '4.0.0';

export class SaveManager {
  private storagePrefix: string;
  private indexKey: string;
  private savePrefix: string;
  private world: WorldModel;
  private onStateChange?: () => void;

  constructor(config: SaveManagerConfig) {
    this.storagePrefix = config.storagePrefix;
    this.indexKey = `${config.storagePrefix}saves-index`;
    this.savePrefix = `${config.storagePrefix}save-`;
    this.world = config.world;
    this.onStateChange = config.onStateChange;

    // One-shot cleanup of pre-v4 saves. Runs every page load — idempotent
    // once the storage is clean. See {@link cleanupObsoleteSaves}.
    this.cleanupObsoleteSaves();
  }

  /**
   * Walk localStorage for entries under this manager's `savePrefix` and
   * delete any whose envelope is not the current `ENVELOPE_VERSION`.
   * Prunes corresponding index entries.
   *
   * Treats malformed payloads (not lz-string compressed, not JSON, no
   * `envelopeVersion`) as obsolete and deletes them — better than
   * leaving unreadable bytes consuming quota.
   *
   * Idempotent: a second call after a clean-up is a no-op (every
   * remaining entry will pass the version check).
   */
  private cleanupObsoleteSaves(): void {
    // Collect keys first; mutating localStorage during iteration shifts
    // indexes and silently skips entries.
    const candidateKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.savePrefix)) {
        candidateKeys.push(key);
      }
    }

    const deleted: string[] = [];
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      let isCurrent = false;
      if (raw) {
        try {
          const decompressed = decompressFromUTF16(raw);
          if (decompressed) {
            const parsed = JSON.parse(decompressed) as {
              envelopeVersion?: string;
            };
            isCurrent = parsed.envelopeVersion === ENVELOPE_VERSION;
          }
        } catch {
          // Treat parse failures as obsolete — see method docs.
        }
      }
      if (!isCurrent) {
        localStorage.removeItem(key);
        deleted.push(key.substring(this.savePrefix.length));
      }
    }

    if (deleted.length === 0) return;

    // Prune index entries pointing at deleted slots so the UI doesn't
    // list ghosts.
    try {
      const index = this.getSaveIndex().filter(
        (meta) => !deleted.includes(meta.name),
      );
      localStorage.setItem(this.indexKey, JSON.stringify(index));
    } catch {
      // If the index itself is corrupted, drop it entirely.
      localStorage.removeItem(this.indexKey);
    }

    console.log(
      '[save] Cleaned up',
      deleted.length,
      'obsolete save(s):',
      deleted,
    );
  }

  // ---------------------------------------------------------------
  // Index management — unchanged from v3.
  // ---------------------------------------------------------------

  /** Get list of all saved games from index. */
  getSaveIndex(): SaveSlotMeta[] {
    try {
      const json = localStorage.getItem(this.indexKey);
      if (!json) return [];
      return JSON.parse(json) as SaveSlotMeta[];
    } catch {
      return [];
    }
  }

  /** Update save index with new/updated slot. */
  updateSaveIndex(meta: SaveSlotMeta): void {
    const index = this.getSaveIndex();
    const existing = index.findIndex((s) => s.name === meta.name);
    if (existing >= 0) {
      index[existing] = meta;
    } else {
      index.push(meta);
    }
    // Sort by timestamp descending (newest first)
    index.sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(this.indexKey, JSON.stringify(index));
  }

  // ---------------------------------------------------------------
  // UI helpers — naming, location lookup. Read-only on the world.
  // ---------------------------------------------------------------

  /** Get current player's containing-room name, or 'Unknown'. */
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

  /** Generate a suggested save name based on current state. */
  generateSaveName(turnCount: number): string {
    const location = this.getCurrentLocation()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 15);
    return `turn-${turnCount}-${location}`;
  }

  /** Sanitize a user-provided save name for use as a storage key. */
  sanitizeSaveName(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30) || 'save'
    );
  }

  // ---------------------------------------------------------------
  // Save / restore — wrap and unwrap the engine's ISaveData.
  // ---------------------------------------------------------------

  /**
   * Wrap an engine save in an envelope and persist it to localStorage.
   *
   * @param slotName - already-sanitized slot key.
   * @param engineSave - the canonical save produced by the engine
   *   (`ISaveData`). Carries the full world state via
   *   `engineState.worldSnapshot`.
   * @param context - browser-only context for UI display: turn count
   *   for the slot meta, score for the envelope, transcript HTML to
   *   restore the visible scrollback.
   */
  performSave(
    slotName: string,
    engineSave: ISaveData,
    context: SaveContext,
    _silent = false,
  ): { success: boolean; error?: string } {
    try {
      const envelope: BrowserSaveEnvelope = {
        envelopeVersion: ENVELOPE_VERSION,
        timestamp: Date.now(),
        engineSave,
        score: context.score,
        transcriptHtml: compressToUTF16(context.transcriptHtml),
      };

      const key = this.savePrefix + slotName;
      const compressed = compressToUTF16(JSON.stringify(envelope));
      localStorage.setItem(key, compressed);

      const meta: SaveSlotMeta = {
        name: slotName,
        timestamp: envelope.timestamp,
        turnCount: context.turnCount,
        location: this.getCurrentLocation(),
      };
      this.updateSaveIndex(meta);

      console.log('[save] Game saved to', key, meta);
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
   * Persist an autosave to the dedicated autosave slot. Same envelope
   * shape as {@link performSave}; only the slot key differs.
   */
  performAutoSave(engineSave: ISaveData, context: SaveContext): void {
    try {
      const envelope: BrowserSaveEnvelope = {
        envelopeVersion: ENVELOPE_VERSION,
        timestamp: Date.now(),
        engineSave,
        score: context.score,
        transcriptHtml: compressToUTF16(context.transcriptHtml),
      };

      const key = this.savePrefix + AUTOSAVE_SLOT;
      const compressed = compressToUTF16(JSON.stringify(envelope));
      localStorage.setItem(key, compressed);

      const meta: SaveSlotMeta = {
        name: AUTOSAVE_SLOT,
        timestamp: envelope.timestamp,
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
   * Load and decompress an envelope from localStorage. Returns `null`
   * for unknown slots, malformed payloads, or wrong-version envelopes.
   * v3.0.0-delta saves are not migrated — they were known-broken.
   */
  loadEnvelope(slotName: string): BrowserSaveEnvelope | null {
    try {
      const key = this.savePrefix + slotName;
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const decompressed = decompressFromUTF16(raw);
      if (!decompressed) return null;

      const parsed = JSON.parse(decompressed) as { envelopeVersion?: string };
      if (parsed.envelopeVersion !== ENVELOPE_VERSION) {
        console.error(
          '[load] Envelope version',
          parsed.envelopeVersion,
          'not supported (expected',
          ENVELOPE_VERSION,
          ')',
        );
        return null;
      }
      return parsed as BrowserSaveEnvelope;
    } catch (error) {
      console.error('[load] Failed to load slot:', slotName, error);
      return null;
    }
  }

  /** Convenience: load the autosave envelope. */
  loadAutosaveEnvelope(): BrowserSaveEnvelope | null {
    return this.loadEnvelope(AUTOSAVE_SLOT);
  }

  /** Decompress transcript HTML from an envelope. */
  decompressTranscript(compressedHtml: string): string {
    try {
      return decompressFromUTF16(compressedHtml) || '';
    } catch {
      return '';
    }
  }

  // ---------------------------------------------------------------
  // World capability sync — unchanged from v3.
  // ---------------------------------------------------------------

  /**
   * Sync localStorage saves to world `sharedData` so stdlib actions
   * know saves exist (used by the `restoring` action's listing).
   */
  syncSavesToWorld(): void {
    const saves = this.getSaveIndex();
    if (saves.length === 0) return;

    const savesObj: Record<
      string,
      { name: string; timestamp: number; moves: number }
    > = {};
    for (const save of saves) {
      savesObj[save.name] = {
        name: save.name,
        timestamp: save.timestamp,
        moves: save.turnCount,
      };
    }

    if (!this.world.hasCapability('sharedData')) {
      this.world.registerCapability('sharedData', {
        initialData: { saves: savesObj },
      });
    } else {
      this.world.updateCapability('sharedData', { saves: savesObj });
    }

    console.log('[sync] Synced', saves.length, 'saves to world sharedData');
  }

  // ---------------------------------------------------------------
  // Slot-management helpers — unchanged from v3.
  // ---------------------------------------------------------------

  /** Clear the autosave slot (used on restart). */
  clearAutosave(): void {
    try {
      const key = this.savePrefix + AUTOSAVE_SLOT;
      localStorage.removeItem(key);
      const index = this.getSaveIndex().filter((s) => s.name !== AUTOSAVE_SLOT);
      localStorage.setItem(this.indexKey, JSON.stringify(index));
      console.log('[autosave] Cleared');
    } catch {
      // Ignore errors
    }
  }

  /**
   * Return the most recent save (by timestamp), or `null` if none. Used
   * by the startup dialog to offer a "continue last game" affordance.
   */
  checkForSavedGame(): SaveSlotMeta | null {
    const saves = this.getSaveIndex();
    if (saves.length === 0) return null;
    return saves[0];
  }

  /** Return user-visible saves (everything but the autosave slot). */
  getUserSaves(): SaveSlotMeta[] {
    return this.getSaveIndex().filter((s) => s.name !== AUTOSAVE_SLOT);
  }
}
