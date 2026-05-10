/**
 * StorageProvider — abstract save/restore interface
 *
 * Pure storage abstraction: stores and retrieves opaque save data blobs.
 * The caller is responsible for capturing/restoring world state.
 * All methods are async to support both localStorage (browser) and
 * filesystem IPC (Tauri).
 */

export interface SaveSlotInfo {
  name: string;
  timestamp: number;
  turnCount: number;
  location: string;
  storyId: string;
}

export interface StorageProvider {
  /** List all save slots for a story */
  listSlots(storyId: string): Promise<SaveSlotInfo[]>;

  /** Save game state to a named slot */
  save(storyId: string, slotName: string, data: unknown): Promise<void>;

  /** Load game state from a named slot */
  restore(storyId: string, slotName: string): Promise<unknown | null>;

  /** Delete a save slot */
  deleteSlot(storyId: string, slotName: string): Promise<void>;

  /** Auto-save (special slot, overwritten each turn) */
  autoSave(storyId: string, data: unknown): Promise<void>;

  /** Load auto-save if it exists, null otherwise */
  loadAutoSave(storyId: string): Promise<unknown | null>;

  /** Check whether an auto-save exists for this story */
  hasAutoSave(storyId: string): Promise<boolean>;
}
