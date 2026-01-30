/**
 * SaveRestoreManager — bridges world state capture/restore with StorageProvider
 *
 * Captures entity locations and trait data as delta from baseline (post-initializeWorld).
 * Includes transcript entries in save data for full session restoration.
 */

import type { TranscriptEntry } from '../types/game-state.js';

/** Snapshot of world entity locations and traits */
interface WorldSnapshot {
  locations: Record<string, string | null>;
  traits: Record<string, Record<string, Record<string, unknown>>>;
}

/** Complete save data blob stored by StorageProvider */
export interface SaveData {
  version: '4.0.0-delta';
  timestamp: number;
  turnCount: number;
  score: number;
  locationName: string;
  locations: Record<string, string | null>;
  traits: Record<string, Record<string, Record<string, unknown>>>;
  transcript: TranscriptEntry[];
}

/**
 * Minimal WorldModel interface — avoids importing @sharpee/world-model directly
 * so the runner module stays decoupled from platform package internals.
 */
interface TraitLike {
  [key: string]: unknown;
}

interface EntityLike {
  id: string;
  name?: string;
  traits: Map<string, TraitLike>;
  get(traitName: string): TraitLike | undefined;
}

interface WorldModelLike {
  getAllEntities(): EntityLike[];
  getEntity(id: string): EntityLike | undefined;
  getLocation(entityId: string): string | undefined;
  moveEntity(entityId: string, targetId: string): boolean;
  getPlayer(): { id: string } | undefined;
}

export class SaveRestoreManager {
  private world: WorldModelLike;
  private storyId: string;
  private baseline: WorldSnapshot | null = null;

  constructor(world: WorldModelLike, storyId: string) {
    this.world = world;
    this.storyId = storyId;
  }

  getStoryId(): string {
    return this.storyId;
  }

  /**
   * Capture initial world state after initializeWorld().
   * Must be called before the first turn.
   */
  captureBaseline(): void {
    this.baseline = this.captureWorldSnapshot();
  }

  /**
   * Capture current game state as a save-ready data blob.
   * Uses delta compression against baseline for locations and traits.
   */
  captureState(transcript: TranscriptEntry[], turnCount: number, score: number): SaveData {
    const { locations, traits } = this.captureDelta();

    return {
      version: '4.0.0-delta',
      timestamp: Date.now(),
      turnCount,
      score,
      locationName: this.getCurrentLocationName(),
      locations,
      traits,
      transcript,
    };
  }

  /**
   * Restore world state from save data.
   * Applies location and trait changes to existing entities (preserves handlers).
   * Returns the transcript entries for UI restoration.
   */
  restoreState(data: SaveData): { transcript: TranscriptEntry[]; turnCount: number; score: number } {
    // First, reset all entities to baseline locations
    if (this.baseline) {
      for (const [entityId, locationId] of Object.entries(this.baseline.locations)) {
        if (locationId) {
          this.world.moveEntity(entityId, locationId);
        }
      }
      // Reset all traits to baseline
      for (const [entityId, entityTraits] of Object.entries(this.baseline.traits)) {
        const entity = this.world.getEntity(entityId);
        if (!entity) continue;
        for (const [traitName, traitData] of Object.entries(entityTraits)) {
          this.applyTraitData(entity, traitName, traitData);
        }
      }
    }

    // Then apply saved deltas on top
    for (const [entityId, locationId] of Object.entries(data.locations)) {
      if (locationId) {
        this.world.moveEntity(entityId, locationId);
      }
    }

    for (const [entityId, entityTraits] of Object.entries(data.traits)) {
      const entity = this.world.getEntity(entityId);
      if (!entity) continue;
      for (const [traitName, traitData] of Object.entries(entityTraits)) {
        this.applyTraitData(entity, traitName, traitData);
      }
    }

    return {
      transcript: data.transcript ?? [],
      turnCount: data.turnCount,
      score: data.score,
    };
  }

  /**
   * Get a suggested save name based on current turn and location.
   */
  suggestSaveName(turnCount: number): string {
    const location = this.getCurrentLocationName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 15);
    return `turn-${turnCount}-${location}`;
  }

  // --- Private ---

  private captureWorldSnapshot(): WorldSnapshot {
    const locations: Record<string, string | null> = {};
    const traits: Record<string, Record<string, Record<string, unknown>>> = {};

    for (const entity of this.world.getAllEntities()) {
      locations[entity.id] = this.world.getLocation(entity.id) || null;

      const entityTraits: Record<string, Record<string, unknown>> = {};
      for (const [traitName, trait] of entity.traits) {
        entityTraits[traitName] = this.serializeTrait(trait);
      }
      traits[entity.id] = entityTraits;
    }

    return { locations, traits };
  }

  private captureDelta(): { locations: Record<string, string | null>; traits: Record<string, Record<string, Record<string, unknown>>> } {
    const current = this.captureWorldSnapshot();
    if (!this.baseline) return current;

    const deltaLocations: Record<string, string | null> = {};
    for (const [id, loc] of Object.entries(current.locations)) {
      if (loc !== this.baseline.locations[id]) {
        deltaLocations[id] = loc;
      }
    }

    const deltaTraits: Record<string, Record<string, Record<string, unknown>>> = {};
    for (const [id, entityTraits] of Object.entries(current.traits)) {
      const baseEntityTraits = this.baseline.traits[id] || {};
      for (const [traitName, traitData] of Object.entries(entityTraits)) {
        const baseTrait = baseEntityTraits[traitName];
        if (!baseTrait || !this.shallowEqual(traitData, baseTrait)) {
          if (!deltaTraits[id]) deltaTraits[id] = {};
          deltaTraits[id][traitName] = traitData;
        }
      }
    }

    return { locations: deltaLocations, traits: deltaTraits };
  }

  private serializeTrait(trait: TraitLike): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(trait)) {
      const value = trait[key];
      if (typeof value !== 'function') {
        data[key] = value;
      }
    }
    return data;
  }

  private applyTraitData(
    entity: EntityLike,
    traitName: string,
    traitData: Record<string, unknown>,
  ): void {
    const trait = entity.get(traitName);
    if (!trait) return;
    for (const [key, value] of Object.entries(traitData)) {
      if (key !== 'type' && typeof value !== 'function') {
        (trait as Record<string, unknown>)[key] = value;
      }
    }
  }

  private shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  }

  private getCurrentLocationName(): string {
    try {
      const player = this.world.getPlayer();
      if (player) {
        const locationId = this.world.getLocation(player.id);
        if (locationId) {
          const room = this.world.getEntity(locationId);
          if (room) return room.name || 'Unknown';
        }
      }
    } catch {
      // Ignore
    }
    return 'Unknown';
  }
}
