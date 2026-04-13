/**
 * Data loader for Sharpee reference panels.
 *
 * Runs `node dist/cli/sharpee.js --world-json` as a child process,
 * parses the JSON output, tags each item with origin (platform vs. story),
 * and caches the result per build. Shared by all panel builders.
 *
 * Public interface: PanelDataLoader
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { resolveStoryId } from '../build-provider';

// ---------------------------------------------------------------------------
// Known stdlib trait types — used to classify origin
// ---------------------------------------------------------------------------

/**
 * All trait type values from packages/world-model/src/traits/trait-types.ts.
 * Traits not in this set are classified as story-defined.
 */
const STDLIB_TRAITS = new Set([
  // Standard
  'identity', 'container', 'supporter', 'room', 'wearable',
  'clothing', 'edible', 'scenery',
  // Interactive
  'openable', 'lockable', 'switchable', 'readable', 'lightSource',
  // Manipulation
  'pullable', 'attached', 'pushable', 'button', 'moveableScenery',
  // Spatial
  'door', 'climbable', 'exit',
  // Basic
  'actor',
  // Combat
  'weapon', 'breakable', 'destructible', 'combatant', 'equipped',
  // NPC
  'npc', 'openInventory',
  // Character model
  'characterModel',
  // Transport
  'vehicle', 'enterable',
  // Concealment
  'if.trait.concealment', 'if.trait.concealed_state',
  // System
  'storyInfo',
]);

// ---------------------------------------------------------------------------
// Tagged data types
// ---------------------------------------------------------------------------

/** Origin classification for platform vs. story content. */
export type ItemOrigin = 'platform' | 'story';

/** A trait reference with origin classification. */
export interface TaggedTrait {
  type: string;
  origin: ItemOrigin;
}

/** Exit destination from --world-json output. */
export interface WorldExit {
  id: string;
  name: string;
}

/** Room with origin tagging and classified traits. */
export interface TaggedRoom {
  id: string;
  name: string;
  aliases: string[];
  isDark: boolean;
  exits: Record<string, WorldExit>;
  /** Entities located in this room (populated during enrichment). */
  contents: TaggedEntity[];
  /** NPCs located in this room (populated during enrichment). */
  npcs: TaggedNpc[];
  origin: ItemOrigin; // Always 'story' — rooms are story-defined
}

/** Entity with origin tagging and classified traits. */
export interface TaggedEntity {
  id: string;
  name: string;
  location: string | null;
  traits: TaggedTrait[];
  /** True if any trait is story-defined. */
  hasCustomTraits: boolean;
  origin: ItemOrigin;
}

/** NPC with origin tagging and classified traits. */
export interface TaggedNpc {
  id: string;
  name: string;
  location: string | null;
  traits: TaggedTrait[];
  behaviorId: string | null;
  hasCustomTraits: boolean;
  origin: ItemOrigin; // Always 'story' — NPCs are story-defined
}

/** Full tagged world data ready for panel rendering. */
export interface PanelData {
  storyPath: string;
  storyId: string;
  rooms: TaggedRoom[];
  entities: TaggedEntity[];
  npcs: TaggedNpc[];
  /** Room ID → room name lookup. */
  roomNames: Map<string, string>;
  /** Timestamp of this data fetch. */
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// Raw --world-json types (before tagging)
// ---------------------------------------------------------------------------

interface RawWorldData {
  storyPath: string;
  rooms: { id: string; name: string; aliases: string[]; isDark: boolean; exits: Record<string, WorldExit> }[];
  entities: { id: string; name: string; location: string | null; traits: string[] }[];
  npcs: { id: string; name: string; location: string | null; traits: string[]; behaviorId: string | null }[];
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Loads, tags, and caches world data for reference panels.
 * Runs the CLI once and shares the result across all panels.
 */
export class PanelDataLoader {
  private cached: PanelData | null = null;

  /** Returns cached data, or null if no data has been loaded. */
  getData(): PanelData | null {
    return this.cached;
  }

  /**
   * Fetches fresh world data from the CLI.
   * Shows a progress notification during the fetch.
   *
   * @returns The tagged panel data, or null on failure
   */
  async refresh(): Promise<PanelData | null> {
    const data = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Sharpee: Loading world data...' },
      () => this.fetchAndTag(),
    );
    this.cached = data;
    return data;
  }

  /**
   * Runs the CLI, parses output, and tags all items.
   */
  private async fetchAndTag(): Promise<PanelData | null> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('Open a Sharpee workspace first.');
      return null;
    }

    const storyId = await resolveStoryId();
    if (!storyId) return null;

    const config = vscode.workspace.getConfiguration('sharpee');
    const cliBundlePath = config.get<string>('cliBundlePath', 'dist/cli/sharpee.js');
    const cliAbsolute = path.join(workspaceFolder.uri.fsPath, cliBundlePath);

    let raw: RawWorldData;
    try {
      const json = await this.runCli(cliAbsolute, workspaceFolder.uri.fsPath, storyId);
      raw = JSON.parse(json) as RawWorldData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`World data: ${message}`);
      return null;
    }

    return this.tag(raw, storyId);
  }

  /**
   * Tags raw data with origin classifications and builds cross-references.
   */
  private tag(raw: RawWorldData, storyId: string): PanelData {
    const roomNames = new Map<string, string>();
    for (const r of raw.rooms) {
      roomNames.set(r.id, r.name);
    }

    // Tag entities
    const taggedEntities: TaggedEntity[] = raw.entities.map(e => {
      const traits = e.traits.map(t => classifyTrait(t));
      return {
        id: e.id,
        name: e.name,
        location: e.location,
        traits,
        hasCustomTraits: traits.some(t => t.origin === 'story'),
        origin: traits.some(t => t.origin === 'story') ? 'story' as const : 'platform' as const,
      };
    });

    // Tag NPCs
    const taggedNpcs: TaggedNpc[] = raw.npcs.map(n => {
      const traits = n.traits.map(t => classifyTrait(t));
      return {
        id: n.id,
        name: n.name,
        location: n.location,
        traits,
        behaviorId: n.behaviorId,
        hasCustomTraits: traits.some(t => t.origin === 'story'),
        origin: 'story' as const,
      };
    });

    // Tag rooms and populate contents
    const taggedRooms: TaggedRoom[] = raw.rooms.map(r => ({
      id: r.id,
      name: r.name,
      aliases: r.aliases,
      isDark: r.isDark,
      exits: r.exits,
      contents: taggedEntities.filter(e => e.location === r.id),
      npcs: taggedNpcs.filter(n => n.location === r.id),
      origin: 'story' as const,
    }));

    return {
      storyPath: raw.storyPath,
      storyId,
      rooms: taggedRooms,
      entities: taggedEntities,
      npcs: taggedNpcs,
      roomNames,
      fetchedAt: Date.now(),
    };
  }

  /**
   * Spawns the CLI process and collects stdout.
   */
  private runCli(cliPath: string, cwd: string, storyId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = cp.spawn(
        'node',
        [cliPath, '--world-json', '--story', `stories/${storyId}`],
        { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
      );

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr.trim() || `CLI exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to run CLI: ${err.message}`));
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Classification helper
// ---------------------------------------------------------------------------

/**
 * Classifies a trait type string as platform or story.
 *
 * @param traitType - The trait type string (e.g., 'openable', 'dungeo.trait.troll')
 * @returns Tagged trait with origin
 */
function classifyTrait(traitType: string): TaggedTrait {
  const origin: ItemOrigin = STDLIB_TRAITS.has(traitType) ? 'platform' : 'story';
  return { type: traitType, origin };
}
