/**
 * TauriStorageProvider — save/restore via Tauri IPC to native filesystem
 *
 * Saves go to the OS app data directory:
 *   Windows: %APPDATA%/sharpee/saves/{storyId}/
 *   macOS:   ~/Library/Application Support/sharpee/saves/{storyId}/
 *   Linux:   ~/.local/share/sharpee/saves/{storyId}/
 */

import type { StorageProvider, SaveSlotInfo } from './storage-provider';

/** Type-safe wrapper around Tauri's invoke() */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // @ts-ignore — Tauri injects this at runtime
  return window.__TAURI__.core.invoke(cmd, args);
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export class TauriStorageProvider implements StorageProvider {
  async listSlots(storyId: string): Promise<SaveSlotInfo[]> {
    const slots = await invoke<Array<{
      name: string;
      timestamp: number;
      turn_count: number;
      location: string;
      story_id: string;
    }>>('list_saves', { storyId });

    return slots.map((s) => ({
      name: s.name,
      timestamp: s.timestamp,
      turnCount: s.turn_count,
      location: s.location,
      storyId: s.story_id,
    }));
  }

  async save(storyId: string, slotName: string, data: unknown): Promise<void> {
    const saveData = data as { turnCount?: number; location?: string } | undefined;
    await invoke('save_game', {
      storyId,
      slotName,
      data,
      timestamp: Date.now(),
      turnCount: saveData?.turnCount ?? 0,
      location: saveData?.location ?? 'unknown',
    });
  }

  async restore(storyId: string, slotName: string): Promise<unknown | null> {
    try {
      return await invoke('restore_game', { storyId, slotName });
    } catch {
      return null;
    }
  }

  async deleteSlot(storyId: string, slotName: string): Promise<void> {
    await invoke('delete_save', { storyId, slotName });
  }

  async autoSave(storyId: string, data: unknown): Promise<void> {
    await invoke('auto_save', { storyId, data });
  }

  async loadAutoSave(storyId: string): Promise<unknown | null> {
    return invoke<unknown | null>('load_auto_save', { storyId });
  }

  async hasAutoSave(storyId: string): Promise<boolean> {
    return invoke<boolean>('has_auto_save', { storyId });
  }
}
