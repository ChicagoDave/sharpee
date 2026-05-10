/**
 * BrowserStorageProvider — localStorage-backed StorageProvider
 *
 * Save data is compressed with lz-string and stored in localStorage
 * with story-scoped keys.
 *
 * Key scheme:
 *   zifmia-{storyId}-saves-index   → SaveSlotInfo[]
 *   zifmia-{storyId}-save-{slot}   → compressed JSON save data
 *   zifmia-{storyId}-save-autosave → compressed JSON auto-save
 */

import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import type { SaveSlotInfo, StorageProvider } from './storage-provider.js';

const AUTOSAVE_SLOT = 'autosave';

function indexKey(storyId: string): string {
  return `zifmia-${storyId}-saves-index`;
}

function slotKey(storyId: string, slotName: string): string {
  return `zifmia-${storyId}-save-${slotName}`;
}

export class BrowserStorageProvider implements StorageProvider {
  async listSlots(storyId: string): Promise<SaveSlotInfo[]> {
    const json = localStorage.getItem(indexKey(storyId));
    if (!json) return [];
    try {
      return JSON.parse(json) as SaveSlotInfo[];
    } catch {
      return [];
    }
  }

  async save(storyId: string, slotName: string, data: unknown): Promise<void> {
    const compressed = compressToUTF16(JSON.stringify(data));
    localStorage.setItem(slotKey(storyId, slotName), compressed);
    await this.updateIndex(storyId, slotName, data);
  }

  async restore(storyId: string, slotName: string): Promise<unknown | null> {
    const raw = localStorage.getItem(slotKey(storyId, slotName));
    if (!raw) return null;
    try {
      const json = decompressFromUTF16(raw);
      return json ? JSON.parse(json) : null;
    } catch {
      return null;
    }
  }

  async deleteSlot(storyId: string, slotName: string): Promise<void> {
    localStorage.removeItem(slotKey(storyId, slotName));
    const slots = await this.listSlots(storyId);
    const filtered = slots.filter((s) => s.name !== slotName);
    localStorage.setItem(indexKey(storyId), JSON.stringify(filtered));
  }

  async autoSave(storyId: string, data: unknown): Promise<void> {
    await this.save(storyId, AUTOSAVE_SLOT, data);
  }

  async loadAutoSave(storyId: string): Promise<unknown | null> {
    return this.restore(storyId, AUTOSAVE_SLOT);
  }

  async hasAutoSave(storyId: string): Promise<boolean> {
    return localStorage.getItem(slotKey(storyId, AUTOSAVE_SLOT)) !== null;
  }

  private async updateIndex(storyId: string, slotName: string, data: unknown): Promise<void> {
    const slots = await this.listSlots(storyId);
    const saveData = data as Record<string, unknown>;

    const info: SaveSlotInfo = {
      name: slotName,
      timestamp: Date.now(),
      turnCount: (saveData.turnCount as number) ?? 0,
      location: (saveData.locationName as string) ?? 'Unknown',
      storyId,
    };

    const existing = slots.findIndex((s) => s.name === slotName);
    if (existing >= 0) {
      slots[existing] = info;
    } else {
      slots.push(info);
    }

    localStorage.setItem(indexKey(storyId), JSON.stringify(slots));
  }
}
