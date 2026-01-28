/**
 * Save/Restore Service - Manages game state persistence and undo
 *
 * Extracted from GameEngine as part of Phase 4 remediation.
 * Handles save/restore data creation, undo snapshots, and serialization.
 */

import {
  WorldModel,
  IFEntity,
  ITrait,
  TraitType
} from '@sharpee/world-model';
import {
  ISaveData,
  ISaveMetadata,
  IEngineState,
  ISerializedEvent,
  ISerializedSpatialIndex,
  ISerializedEntity,
  ISerializedLocation,
  ISerializedRelationship,
  ISerializedTurn,
  ISerializedParserState,
  ISemanticEventSource,
  createSemanticEventSource
} from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { TurnResult, GameContext } from './types';
import { Story } from './story';
import { toSequencedEvent } from './event-adapter';

/**
 * Interface for accessing engine state needed for save/restore
 */
export interface ISaveRestoreStateProvider {
  getWorld(): WorldModel;
  getContext(): GameContext;
  getStory(): Story | undefined;
  getEventSource(): ISemanticEventSource;
  getPluginRegistry(): PluginRegistry;
  getParser(): unknown | undefined;
}

/**
 * Configuration for the undo system
 */
export interface UndoConfig {
  maxSnapshots: number;
}

/**
 * Service for managing save/restore and undo functionality
 */
export class SaveRestoreService {
  // Undo system - circular buffer of world snapshots
  private undoSnapshots: string[] = [];
  private undoSnapshotTurns: number[] = [];
  private maxUndoSnapshots: number;

  constructor(config?: UndoConfig) {
    this.maxUndoSnapshots = config?.maxSnapshots ?? 10;
  }

  /**
   * Create an undo snapshot of the current world state
   */
  createUndoSnapshot(world: WorldModel, currentTurn: number): void {
    if (this.maxUndoSnapshots <= 0) return; // Undo disabled

    // Serialize world state
    const snapshot = world.toJSON();

    // Add to circular buffer
    this.undoSnapshots.push(snapshot);
    this.undoSnapshotTurns.push(currentTurn);

    // Trim if over limit
    while (this.undoSnapshots.length > this.maxUndoSnapshots) {
      this.undoSnapshots.shift();
      this.undoSnapshotTurns.shift();
    }
  }

  /**
   * Undo to previous turn
   * @returns The turn number restored to, or null if nothing to undo
   */
  undo(world: WorldModel): { turn: number } | null {
    if (this.undoSnapshots.length === 0) {
      return null; // Nothing to undo
    }

    // Pop the most recent snapshot
    const snapshot = this.undoSnapshots.pop()!;
    const turn = this.undoSnapshotTurns.pop()!;

    // Restore world state
    world.loadJSON(snapshot);

    return { turn };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoSnapshots.length > 0;
  }

  /**
   * Get number of undo levels available
   */
  getUndoLevels(): number {
    return this.undoSnapshots.length;
  }

  /**
   * Clear all undo snapshots (e.g., after restore)
   */
  clearUndoSnapshots(): void {
    this.undoSnapshots = [];
    this.undoSnapshotTurns = [];
  }

  /**
   * Create save data from current engine state
   */
  createSaveData(provider: ISaveRestoreStateProvider): ISaveData {
    const context = provider.getContext();
    const story = provider.getStory();
    const eventSource = provider.getEventSource();
    const pluginRegistry = provider.getPluginRegistry();
    const world = provider.getWorld();
    const parser = provider.getParser();

    const metadata: ISaveMetadata = {
      storyId: story?.config.id || 'unknown',
      storyVersion: story?.config.version || '0.0.0',
      turnCount: context.currentTurn - 1,
      playTime: Date.now() - context.metadata.started.getTime(),
      description: `Turn ${context.currentTurn - 1}`
    };

    const engineState: IEngineState = {
      eventSource: this.serializeEventSource(eventSource),
      spatialIndex: this.serializeSpatialIndex(world),
      turnHistory: this.serializeTurnHistory(context.history),
      parserState: this.serializeParserState(parser),
      pluginStates: pluginRegistry.getStates()
    };

    return {
      version: '1.0.0',
      timestamp: Date.now(),
      metadata,
      engineState,
      storyConfig: {
        id: story?.config.id || 'unknown',
        version: story?.config.version || '0.0.0',
        title: story?.config.title || 'Unknown',
        author: Array.isArray(story?.config.author)
          ? story.config.author.join(', ')
          : (story?.config.author || 'Unknown')
      }
    };
  }

  /**
   * Load save data into engine state
   * @returns New event source with restored events
   */
  loadSaveData(
    saveData: ISaveData,
    provider: ISaveRestoreStateProvider
  ): {
    eventSource: ISemanticEventSource;
    currentTurn: number;
  } {
    const story = provider.getStory();

    // Validate save compatibility
    if (saveData.version !== '1.0.0') {
      throw new Error(`Unsupported save version: ${saveData.version}`);
    }

    if (
      saveData.storyConfig?.id &&
      story?.config.id &&
      saveData.storyConfig.id !== story.config.id
    ) {
      throw new Error(`Save is for different story: ${saveData.storyConfig.id}`);
    }

    // Restore event source
    const eventSource = this.deserializeEventSource(saveData.engineState.eventSource);

    // Restore spatial index (world state)
    const world = provider.getWorld();
    this.deserializeSpatialIndex(saveData.engineState.spatialIndex, world);

    // Restore plugin states if present (ADR-120)
    if (saveData.engineState.pluginStates) {
      provider.getPluginRegistry().setStates(saveData.engineState.pluginStates);
    }

    // Clear undo snapshots after restore
    this.clearUndoSnapshots();

    return {
      eventSource,
      currentTurn: saveData.metadata.turnCount + 1
    };
  }

  /**
   * Serialize event source
   */
  private serializeEventSource(eventSource: ISemanticEventSource): ISerializedEvent[] {
    const events: ISerializedEvent[] = [];

    for (const event of eventSource.getAllEvents()) {
      events.push({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp || Date.now(),
        data: this.serializeEventData(event.data)
      });
    }

    return events;
  }

  /**
   * Serialize event data, handling functions and special types
   */
  private serializeEventData(data: unknown): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return (data || {}) as Record<string, unknown>;
    }

    const serialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'function') {
        // Mark functions for special handling during deserialization
        serialized[key] = { __type: 'function', __marker: '[Function]' };
      } else if (value && typeof value === 'object') {
        // Recursively serialize nested objects
        if (Array.isArray(value)) {
          serialized[key] = value.map((item) =>
            typeof item === 'object' ? this.serializeEventData(item) : item
          );
        } else {
          serialized[key] = this.serializeEventData(value);
        }
      } else {
        // Primitive values can be stored directly
        serialized[key] = value;
      }
    }

    return serialized;
  }

  /**
   * Deserialize event source
   */
  private deserializeEventSource(events: ISerializedEvent[]): ISemanticEventSource {
    const eventSource = createSemanticEventSource();

    for (const event of events) {
      eventSource.emit({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: this.deserializeEventData(event.data),
        entities: {}
      });
    }

    return eventSource;
  }

  /**
   * Deserialize event data, handling function markers
   */
  private deserializeEventData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Check if this is a function marker
    if ((data as Record<string, unknown>).__type === 'function') {
      // Return a placeholder function
      return () => '[Serialized Function]';
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.deserializeEventData(item));
    }

    const deserialized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      deserialized[key] = this.deserializeEventData(value);
    }

    return deserialized;
  }

  /**
   * Serialize spatial index (world state)
   */
  private serializeSpatialIndex(world: WorldModel): ISerializedSpatialIndex {
    const entities: Record<string, ISerializedEntity> = {};
    const locations: Record<string, ISerializedLocation> = {};
    const relationships: Record<string, ISerializedRelationship[]> = {};

    // Serialize all entities
    for (const entity of world.getAllEntities()) {
      const traits: Record<string, unknown> = {};

      // Serialize each trait
      for (const [name, trait] of entity.traits) {
        traits[name] = this.serializeTrait(trait);
      }

      entities[entity.id] = {
        id: entity.id,
        traits,
        entityType: entity.constructor.name
      };
    }

    // Serialize locations and their contents
    const allLocations = world.getAllEntities().filter(
      (e) => e.type === 'room' || e.type === 'location' || e.has('if.trait.room')
    );
    for (const location of allLocations) {
      const contents = world.getContents(location.id);
      locations[location.id] = {
        id: location.id,
        properties: {
          name: (location.get(TraitType.IDENTITY) as { name?: string })?.name || 'Unknown',
          description: (location.get(TraitType.IDENTITY) as { description?: string })?.description || ''
        },
        contents: contents.map((e) => e.id),
        connections: this.extractConnections(location, world)
      };
    }

    return { entities, locations, relationships };
  }

  /**
   * Deserialize spatial index
   */
  private deserializeSpatialIndex(
    index: ISerializedSpatialIndex,
    world: WorldModel
  ): void {
    // Note: Full deserialization would need to clear and recreate the world
    // For now, this restores entity traits and locations

    // Restore entity traits
    for (const [id, data] of Object.entries(index.entities)) {
      const entity = world.getEntity(id);
      if (entity) {
        // Restore traits
        for (const [name, traitData] of Object.entries(data.traits)) {
          const trait = this.deserializeTrait(name, traitData);
          if (trait) {
            // Remove existing trait if present, then add the restored one
            if (entity.has(name)) {
              entity.remove(name);
            }
            entity.add(trait);
          }
        }
      }
    }

    // Restore locations and contents
    for (const [locationId, data] of Object.entries(index.locations)) {
      for (const entityId of data.contents) {
        const entity = world.getEntity(entityId);
        if (entity) {
          world.moveEntity(entity.id, locationId);
        }
      }
    }
  }

  /**
   * Serialize turn history
   */
  private serializeTurnHistory(history: TurnResult[]): ISerializedTurn[] {
    const turns: ISerializedTurn[] = [];

    for (const [index, result] of history.entries()) {
      turns.push({
        turnNumber: index + 1,
        eventIds: result.events.map((e) => e.source || `${e.turn}-${e.sequence}`),
        timestamp: result.events[0]?.timestamp.getTime() || Date.now(),
        command: result.input
      });
    }

    return turns;
  }

  /**
   * Deserialize turn history
   */
  deserializeTurnHistory(
    turns: ISerializedTurn[],
    eventSource: ISemanticEventSource
  ): TurnResult[] {
    const history: TurnResult[] = [];

    for (const turn of turns) {
      // Find the events for this turn
      const events = eventSource.getAllEvents().filter((e) =>
        turn.eventIds.includes(e.id)
      );

      // Convert SemanticEvents to SequencedEvents
      const sequencedEvents = events.map((event, index) =>
        toSequencedEvent(event, turn.turnNumber, index)
      );

      history.push({
        turn: turn.turnNumber,
        input: turn.command || '',
        success: true,
        events: sequencedEvents
      });
    }

    return history;
  }

  /**
   * Serialize parser state
   */
  private serializeParserState(parser: unknown): ISerializedParserState | undefined {
    if (!parser) {
      return undefined;
    }

    // Parser state serialization is parser-specific
    // For now, return empty object
    return {};
  }

  /**
   * Serialize a trait
   */
  private serializeTrait(trait: unknown): unknown {
    if (typeof trait === 'object' && trait !== null) {
      return { ...trait };
    }
    return trait;
  }

  /**
   * Deserialize a trait
   */
  private deserializeTrait(name: string, data: unknown): ITrait | null {
    if (data && typeof data === 'object') {
      return { type: name, ...data } as ITrait;
    }
    return null;
  }

  /**
   * Extract connections from a location entity
   */
  private extractConnections(
    location: IFEntity,
    world: WorldModel
  ): Record<string, string> {
    const connections: Record<string, string> = {};

    // Check for ROOM trait with exits
    const roomTrait = location.get('if.trait.room') as {
      exits?: Record<string, { destination?: string }>;
    };
    if (roomTrait?.exits) {
      Object.entries(roomTrait.exits).forEach(([direction, exit]) => {
        if (exit.destination) {
          connections[direction] = exit.destination;
        }
      });
    }

    // Check for doors in this location
    const contents = world.getContents(location.id);
    contents.forEach((entity) => {
      const doorTrait = entity.get('if.trait.door') as {
        room1?: string;
        room2?: string;
      };
      if (doorTrait) {
        const otherRoom =
          doorTrait.room1 === location.id ? doorTrait.room2 : doorTrait.room1;
        if (otherRoom) {
          // Try to determine direction from door name
          const name = entity.name?.toLowerCase() || '';
          if (name.includes('north')) connections.north = otherRoom;
          else if (name.includes('south')) connections.south = otherRoom;
          else if (name.includes('east')) connections.east = otherRoom;
          else if (name.includes('west')) connections.west = otherRoom;
          else connections.door = otherRoom;
        }
      }
    });

    return connections;
  }
}

/**
 * Create a save/restore service instance
 */
export function createSaveRestoreService(config?: UndoConfig): SaveRestoreService {
  return new SaveRestoreService(config);
}
