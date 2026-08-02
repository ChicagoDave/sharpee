/**
 * Save/Restore Service — manages game state persistence and undo.
 *
 * Public interface: {@link SaveRestoreService} class — `createSaveData`,
 * `loadSaveData`, plus undo helpers (`createUndoSnapshot`, `undo`,
 * `canUndo`, `getUndoLevels`, `clearUndoSnapshots`).
 *
 * Bounded context: `@sharpee/engine` runtime. Every Sharpee host (CLI,
 * platform-browser, multi-user sandbox) routes saves through this
 * service.
 *
 * Save format v3.0.0 (versioned reader from v2.0.0 — ADR-293 D7/A1):
 *   - `IEngineState.streamStates` carries the unified
 *     `{ pointName → streamState }` map for every choice point that has
 *     drawn (ADR-293 D7). v2.0.0 saves are READ, not refused: their
 *     `actionRngSeed` maps onto the legacy action point
 *     ({@link ACTION_STREAM_POINT_NAME}) and every other point reseeds
 *     from the master seed. v1 saves remain rejected (known-broken).
 *   - `IEngineState.worldSnapshot` (since v2.0.0) carries the verbatim
 *     `WorldModel.toJSON()` output, gzipped, then base64-encoded for
 *     JSON-safety. Hydration: base64-decode → gunzip → `world.loadJSON()`.
 *     This replaced v1's partial `spatialIndex` serializer, which
 *     captured only entity traits + room contents and silently dropped
 *     the ScoreLedger, capabilities, world state values, relationships,
 *     ID counters, and sub-container containment.
 *
 * Still v3.0.0 — additive changes, 2026-08-02 (ADR-296 D1 + D4, no
 * version bump per the additive-only convention):
 *   - Events in the event-source stream may now carry two additional
 *     opaque `data` fields: `_transactionId` (per-source stamp from the
 *     engine funnels: `txn:{turn}:action` / `txn:{turn}:plugin:{id}`)
 *     and `_narrativeSlot` (chain/reaction phrase placement). They ride
 *     `serializeEventSource` like any other data field — no reader
 *     change required; older saves simply lack them.
 *   - The event stream itself is reorganized by the D4 partition: a
 *     phrase-emission `game.message` (messageless trigger, or
 *     `_chainedFrom` present) now appears as its OWN event in
 *     `turnEvents`, channel packets, and saves, and its formerly-
 *     overridden trigger keeps no injected messageId. Channel consumers
 *     see the same data reorganized.
 */

import { gunzipSync, gzipSync, strFromU8, strToU8 } from 'fflate';

import { WorldModel } from '@sharpee/world-model';
import {
  ISaveData,
  ISaveMetadata,
  IEngineState,
  ISerializedEvent,
  ISerializedTurn,
  ISerializedParserState,
  ISemanticEventSource,
  createSemanticEventSource
} from '@sharpee/core';
import { PluginRegistry } from '@sharpee/plugins';
import { TurnResult, GameContext } from './types.js';
import { Story } from './story.js';
import {
  ACTION_STREAM_POINT_NAME,
  EngineRandomService
} from './engine-random-service.js';

/**
 * Save format version. Bumped `2.0.0` → `3.0.0` for ADR-293 D7: the save
 * gains the unified `{ pointName → streamState }` map (`streamStates`).
 * v2 saves are read through a version-reader branch (A1 ruling 4), not
 * refused — the first real version reader, per the standing ruling
 * against hard breaks. v1 saves are rejected — they are known-broken
 * (drop score / capabilities / state values / relationships); that
 * cutover predates the version-reader ruling.
 *
 * Exported for ADR-294 D3: golden-recording provenance stamps the
 * save-format version it was recorded under, and the transcript tester
 * must read the same constant the save path writes.
 */
export const SAVE_FORMAT_VERSION = '3.0.0';

/** The last hard-cutover format; readable via the version-reader branch. */
const LEGACY_SAVE_FORMAT_VERSION = '2.0.0';

/** btoa/atob are universal across Node 18+, Deno, and modern browsers. */
declare const btoa: (s: string) => string;
declare const atob: (s: string) => string;

/**
 * Encode a `Uint8Array` to a base64 string. Chunked to stay under the
 * call-argument limit on `String.fromCharCode.apply` for snapshots in
 * the hundreds of KB.
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(
      null,
      slice as unknown as number[],
    );
  }
  return btoa(binary);
}

/** Decode a base64 string to a `Uint8Array`. Inverse of `uint8ToBase64`. */
function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Compress a JSON string with gzip and base64-encode the result so it
 * can ride the `ISaveData` JSON envelope without escaping.
 */
function compressWorldSnapshot(json: string): string {
  return uint8ToBase64(gzipSync(strToU8(json)));
}

/**
 * Inverse of {@link compressWorldSnapshot}. Throws if the snapshot is
 * malformed (bad base64 or invalid gzip stream); the caller surfaces
 * the failure rather than partially restoring.
 */
function decompressWorldSnapshot(b64: string): string {
  return strFromU8(gunzipSync(base64ToUint8(b64)));
}

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
  /**
   * The engine's per-point stream owner (ADR-293 D7), if wired. When
   * present, its `{ pointName → streamState }` map rides the save and is
   * restored through the version reader. Optional: hosts that predate the
   * `GameEngine` wiring save and restore without it.
   */
  getRandomService?(): EngineRandomService | undefined;
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

    // Restore world state.
    //
    // Deliberately NO `story.onWorldRestored?.()` here, and this is a
    // decision rather than an oversight (ADR-289 D2). Undo snapshots are
    // taken from the CURRENT session's world, which was already swept at
    // load or restore, and `clearUndoSnapshots()` runs after every restore
    // — so no pre-D2 key can ever enter the undo buffer. Adding the hook
    // here for symmetry would re-run a sweep that provably has nothing to
    // find, on the hottest path in the service.
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

    const randomService = provider.getRandomService?.();

    const engineState: IEngineState = {
      eventSource: this.serializeEventSource(eventSource),
      worldSnapshot: compressWorldSnapshot(world.toJSON()),
      turnHistory: this.serializeTurnHistory(context.history),
      parserState: this.serializeParserState(parser),
      pluginStates: pluginRegistry.getStates(),
      // ADR-293 D7: the unified per-point map — only points that have drawn.
      // `actionRngSeed` is no longer written: the action surface draws
      // through declared points, so its state lives in this map. The field
      // survives on IEngineState purely for the 2.0.0 reader.
      ...(randomService
        ? { streamStates: randomService.serializeStreamStates() }
        : {})
    };

    return {
      version: SAVE_FORMAT_VERSION,
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

    // Validate save compatibility. v3 is current; v2 is read through the
    // version-reader branch below (ADR-293 D7/A1). v1 saves are rejected
    // outright (no migration shim — see SAVE_FORMAT_VERSION docs above).
    if (
      saveData.version !== SAVE_FORMAT_VERSION &&
      saveData.version !== LEGACY_SAVE_FORMAT_VERSION
    ) {
      throw new Error(`Unsupported save version: ${saveData.version}`);
    }

    if (
      saveData.storyConfig?.id &&
      story?.config.id &&
      saveData.storyConfig.id !== story.config.id
    ) {
      throw new Error(`Save is for different story: ${saveData.storyConfig.id}`);
    }

    // Restore event source.
    const eventSource = this.deserializeEventSource(saveData.engineState.eventSource);

    // Restore world state. The full WorldModel state — entity traits,
    // spatial containment graph, ScoreLedger, capabilities, state
    // values, relationships, ID counters — rides the `worldSnapshot`
    // field. `WorldModel.loadJSON` clears the existing world and
    // rebuilds, so the fresh-engine entities created by `setStory` are
    // replaced wholesale by the saved entities.
    const world = provider.getWorld();
    world.loadJSON(decompressWorldSnapshot(saveData.engineState.worldSnapshot));

    // Restore plugin states if present (ADR-120).
    if (saveData.engineState.pluginStates) {
      provider.getPluginRegistry().setStates(saveData.engineState.pluginStates);
    }

    // Restore the dedicated action RNG stream (ADR-231 D6). Saves that
    // predate the field restore fine — reseed time-based instead of
    // crashing (matches unseeded-construction behavior).
    // Restore per-point stream states (ADR-293 D7), when the host wires a
    // RandomService. The version-reader branch (A1 ruling 4): a 2.0.0 save
    // has no map — its `actionRngSeed` maps onto the legacy action point and
    // every other point reseeds from the master seed (which lazy derivation
    // does without ever reading the clock). A 3.0.0 save reads the map
    // directly.
    const savedActionSeed = saveData.engineState.actionRngSeed;
    const randomService = provider.getRandomService?.();
    if (randomService) {
      if (saveData.version === LEGACY_SAVE_FORMAT_VERSION) {
        randomService.restoreStreamStates(
          typeof savedActionSeed === 'number'
            ? { [ACTION_STREAM_POINT_NAME]: savedActionSeed }
            : {}
        );
      } else {
        randomService.restoreStreamStates(
          saveData.engineState.streamStates ?? {}
        );
      }
    }

    // Clear undo snapshots after restore — they were taken against the
    // pre-restore world and are no longer meaningful.
    this.clearUndoSnapshots();

    // ADR-289 D2: the story's post-restore hook, fired LAST — after the
    // world snapshot, plugin states, the RNG reseed, and undo clearing. The
    // contract is "the engine is fully restored when this runs": a hook
    // placed right after `loadJSON` would hand the story a half-restored
    // engine, which is the same defect class this ADR closes (an observer
    // seeing state mid-mutation). Optional, so stories that do not persist
    // their own keys are unaffected.
    story?.onWorldRestored?.(world);

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
   * Serialize turn history
   */
  private serializeTurnHistory(history: TurnResult[]): ISerializedTurn[] {
    const turns: ISerializedTurn[] = [];

    for (const [index, result] of history.entries()) {
      turns.push({
        turnNumber: index + 1,
        eventIds: result.events.map((e) => e.id),
        timestamp: result.events[0]?.timestamp || Date.now(),
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

      history.push({
        turn: turn.turnNumber,
        input: turn.command || '',
        success: true,
        events
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

}

/**
 * Create a save/restore service instance
 */
export function createSaveRestoreService(config?: UndoConfig): SaveRestoreService {
  return new SaveRestoreService(config);
}
