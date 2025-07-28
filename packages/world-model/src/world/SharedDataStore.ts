// SharedDataStore.ts - Shared state wrapper for WorldModel and AuthorModel

import { IFEntity } from '../entities/if-entity';
import { SpatialIndex } from './SpatialIndex';

/**
 * Wrapper class that holds references to shared state between WorldModel and AuthorModel.
 * This ensures that changes made by one model are visible to the other.
 */
export class SharedDataStore {
  entities: Map<string, IFEntity>;
  spatialIndex: SpatialIndex;
  state: Record<string, any>;
  private _playerId?: string;
  relationships: Map<string, Map<string, Set<string>>>;
  idCounters: Map<string, number>;
  nameToId: Map<string, string>;
  idToName: Map<string, string>;

  constructor() {
    this.entities = new Map();
    this.spatialIndex = new SpatialIndex();
    this.state = {};
    this._playerId = undefined;
    this.relationships = new Map();
    this.idCounters = new Map();
    this.nameToId = new Map();
    this.idToName = new Map();
  }

  get playerId(): string | undefined {
    return this._playerId;
  }

  set playerId(value: string | undefined) {
    this._playerId = value;
  }

  /**
   * Clear all data in the store
   */
  clear(): void {
    this.entities.clear();
    this.spatialIndex.clear();
    this.state = {};
    this._playerId = undefined;
    this.relationships.clear();
    this.idCounters.clear();
    this.nameToId.clear();
    this.idToName.clear();
  }
}
