/**
 * Checkpoint Store
 *
 * File-based storage for checkpoints.
 * Supports both Node.js (filesystem) and browser (localStorage) environments.
 */

import type { CheckpointData, CheckpointStore } from '../types.js';
import { validateCheckpoint } from './serializer.js';

/**
 * Create a file-based checkpoint store (Node.js)
 */
export function createFileStore(directory: string): CheckpointStore {
  // Dynamic import for Node.js fs module
  let fs: typeof import('fs') | undefined;
  let path: typeof import('path') | undefined;

  const ensureFs = async () => {
    if (!fs) {
      fs = await import('fs');
      path = await import('path');
    }
    return { fs, path: path! };
  };

  const getFilePath = (pathModule: typeof import('path'), name: string): string => {
    return pathModule.join(directory, `${name}.json`);
  };

  const store: CheckpointStore = {
    async save(name: string, data: CheckpointData): Promise<void> {
      const { fs, path } = await ensureFs();

      // Ensure directory exists
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filePath = getFilePath(path, name);
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(filePath, json, 'utf-8');
    },

    async load(name: string): Promise<CheckpointData | undefined> {
      const { fs, path } = await ensureFs();

      const filePath = getFilePath(path, name);

      if (!fs.existsSync(filePath)) {
        return undefined;
      }

      try {
        const json = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(json);

        if (!validateCheckpoint(data)) {
          console.warn(`Invalid checkpoint data in ${filePath}`);
          return undefined;
        }

        return data;
      } catch (error) {
        console.error(`Failed to load checkpoint ${name}:`, error);
        return undefined;
      }
    },

    async list(): Promise<string[]> {
      const { fs } = await ensureFs();

      if (!fs.existsSync(directory)) {
        return [];
      }

      const files = fs.readdirSync(directory);
      return files
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''));
    },

    async delete(name: string): Promise<boolean> {
      const { fs, path } = await ensureFs();

      const filePath = getFilePath(path, name);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    },

    async exists(name: string): Promise<boolean> {
      const { fs, path } = await ensureFs();

      const filePath = getFilePath(path, name);
      return fs.existsSync(filePath);
    },
  };

  return store;
}

/**
 * Create a memory-based checkpoint store (for testing or browser)
 */
export function createMemoryStore(): CheckpointStore {
  const checkpoints = new Map<string, CheckpointData>();

  return {
    async save(name: string, data: CheckpointData): Promise<void> {
      checkpoints.set(name, data);
    },

    async load(name: string): Promise<CheckpointData | undefined> {
      return checkpoints.get(name);
    },

    async list(): Promise<string[]> {
      return Array.from(checkpoints.keys());
    },

    async delete(name: string): Promise<boolean> {
      return checkpoints.delete(name);
    },

    async exists(name: string): Promise<boolean> {
      return checkpoints.has(name);
    },
  };
}

/**
 * Create a localStorage-based checkpoint store (browser)
 */
export function createLocalStorageStore(prefix: string = 'sharpee-checkpoint-'): CheckpointStore {
  const getKey = (name: string) => `${prefix}${name}`;

  return {
    async save(name: string, data: CheckpointData): Promise<void> {
      const json = JSON.stringify(data);
      localStorage.setItem(getKey(name), json);
    },

    async load(name: string): Promise<CheckpointData | undefined> {
      const json = localStorage.getItem(getKey(name));
      if (!json) return undefined;

      try {
        const data = JSON.parse(json);
        if (!validateCheckpoint(data)) {
          console.warn(`Invalid checkpoint data for ${name}`);
          return undefined;
        }
        return data;
      } catch {
        return undefined;
      }
    },

    async list(): Promise<string[]> {
      const names: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          names.push(key.slice(prefix.length));
        }
      }
      return names;
    },

    async delete(name: string): Promise<boolean> {
      const key = getKey(name);
      if (localStorage.getItem(key) === null) {
        return false;
      }
      localStorage.removeItem(key);
      return true;
    },

    async exists(name: string): Promise<boolean> {
      return localStorage.getItem(getKey(name)) !== null;
    },
  };
}
