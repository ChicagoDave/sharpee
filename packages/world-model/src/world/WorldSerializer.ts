/**
 * WorldSerializer — persistence logic for WorldModel.
 *
 * Public interface: serialize, deserialize.
 *
 * Owner context: packages/world-model (issue #70). Extracted from WorldModel
 * to isolate serialization concerns and make the JSON shape independently
 * testable and versionable.
 */

import { IFEntity } from '../entities/if-entity';
import { SpatialIndex } from './SpatialIndex';
import { ICapabilityStore } from './capabilities';
import type { ScoreLedger } from './ScoreLedger';
import type { WorldEventSystem } from './WorldEventSystem';

/**
 * References to WorldModel's internal state needed for serialization.
 * These are the same references returned by WorldModel.getDataStore().
 */
export interface SerializableState {
  entities: Map<string, IFEntity>;
  spatialIndex: SpatialIndex;
  state: Record<string, unknown>;
  playerId?: string;
  relationships: Map<string, Map<string, Set<string>>>;
  idCounters: Map<string, number>;
  capabilities: ICapabilityStore;
}

/**
 * Handles serialization and deserialization of WorldModel state.
 * Composes with ScoreLedger and WorldEventSystem for their
 * respective serialization.
 */
export class WorldSerializer {

  /**
   * Serialize the world state to a JSON string.
   *
   * @param state - References to WorldModel's internal data structures
   * @param scoreLedger - The score ledger instance
   * @returns JSON string of the complete world state
   */
  serialize(state: SerializableState, scoreLedger: ScoreLedger): string {
    const data = {
      entities: Array.from(state.entities.entries()).map(([id, entity]) => ({
        id,
        entity: entity.toJSON()
      })),
      state: state.state,
      playerId: state.playerId,
      spatialIndex: state.spatialIndex.toJSON(),
      relationships: Array.from(state.relationships.entries()).map(([entityId, rels]) => ({
        entityId,
        relationships: Array.from(rels.entries()).map(([type, related]) => ({
          type,
          related: Array.from(related)
        }))
      })),
      idCounters: Array.from(state.idCounters.entries()),
      ...scoreLedger.toJSON(),
      capabilities: Object.entries(state.capabilities).map(([name, cap]) => ({
        name,
        data: cap.data,
        schema: cap.schema
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Deserialize a JSON string into world state.
   *
   * Expects that the caller has already preserved code registrations
   * (event chains, capabilities) and called clear() before invoking this.
   *
   * @param json - JSON string from a previous serialize() call
   * @param state - References to WorldModel's internal data structures
   * @param scoreLedger - The score ledger instance
   */
  deserialize(
    json: string,
    state: SerializableState,
    scoreLedger: ScoreLedger,
  ): void {
    const data = JSON.parse(json);

    // Restore entities
    for (const { id, entity } of data.entities) {
      const newEntity = IFEntity.fromJSON(entity);
      state.entities.set(id, newEntity);
    }

    // Restore state
    Object.assign(state.state, data.state || {});
    state.playerId = data.playerId;

    // Restore spatial index
    if (data.spatialIndex) {
      state.spatialIndex.loadJSON(data.spatialIndex);
    }

    // Restore relationships
    if (data.relationships) {
      for (const { entityId, relationships } of data.relationships) {
        const entityRels = new Map<string, Set<string>>();
        for (const { type, related } of relationships) {
          entityRels.set(type, new Set(related));
        }
        state.relationships.set(entityId, entityRels);
      }
    }

    // Restore ID counters
    if (data.idCounters) {
      state.idCounters.clear();
      for (const [key, value] of data.idCounters) {
        state.idCounters.set(key, value);
      }
    } else {
      // Rebuild from entities for backward compatibility
      WorldSerializer.rebuildIdCounters(state.entities, state.idCounters);
    }

    // Restore capabilities
    if (data.capabilities) {
      for (const { name, data: capData, schema } of data.capabilities) {
        state.capabilities[name] = {
          data: capData,
          schema
        };
      }
    }

    // Restore score ledger
    scoreLedger.fromJSON(data);
  }

  /**
   * Rebuild ID counters by scanning existing entities.
   * Used for backward compatibility when loading saves without idCounters.
   *
   * @param entities - The entity map to scan
   * @param idCounters - The counter map to populate
   */
  static rebuildIdCounters(
    entities: Map<string, IFEntity>,
    idCounters: Map<string, number>
  ): void {
    idCounters.clear();

    for (const entity of entities.values()) {
      const id = entity.id;
      if (id.length >= 3) {
        const prefix = id[0];
        const numPart = id.substring(1);

        const num = parseInt(numPart, 36);
        if (!isNaN(num)) {
          const currentMax = idCounters.get(prefix) || 0;
          if (num > currentMax) {
            idCounters.set(prefix, num);
          }
        }
      }
    }
  }
}
