/**
 * World Explorer sidebar panel for Sharpee stories.
 *
 * Runs `node dist/cli/sharpee.js --world-json` to extract the initialized
 * world model, then presents rooms, entities, and NPCs as a browsable tree
 * in the VS Code sidebar. Clicking a node attempts to navigate to the
 * source file where the entity is defined.
 *
 * Public interface: WorldExplorerProvider, REFRESH_WORLD_COMMAND, getWorldCache()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { resolveStoryId } from './build-provider';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the world explorer. */
export const REFRESH_WORLD_COMMAND = 'sharpee.refreshWorldExplorer';

// ---------------------------------------------------------------------------
// World JSON types
// ---------------------------------------------------------------------------

/** Exit destination from --world-json output. */
interface WorldExit {
  id: string;
  name: string;
}

/** Room entry from --world-json output. */
interface WorldRoom {
  id: string;
  name: string;
  aliases: string[];
  isDark: boolean;
  exits: Record<string, WorldExit>;
}

/** Entity entry from --world-json output. */
interface WorldEntity {
  id: string;
  name: string;
  location: string | null;
  traits: string[];
}

/** NPC entry from --world-json output. */
interface WorldNpc {
  id: string;
  name: string;
  location: string | null;
  traits: string[];
  behaviorId: string | null;
}

/** Full --world-json output shape. */
interface WorldData {
  storyPath: string;
  rooms: WorldRoom[];
  entities: WorldEntity[];
  npcs: WorldNpc[];
}

// ---------------------------------------------------------------------------
// Tree node types
// ---------------------------------------------------------------------------

/** Discriminated union for tree node kinds. */
type WorldNodeKind =
  | 'category'
  | 'room'
  | 'exit'
  | 'entity'
  | 'npc'
  | 'location-group'
  | 'trait-list'
  | 'detail';

/** A node in the World Explorer tree. */
class WorldNode extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly kind: WorldNodeKind,
    collapsible: vscode.TreeItemCollapsibleState,
    public readonly children: WorldNode[] = [],
  ) {
    super(label, collapsible);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Tree data provider that shows rooms, entities, and NPCs from the
 * initialized world model. Data is fetched by running the CLI with
 * --world-json and cached in memory until explicitly refreshed.
 */
export class WorldExplorerProvider implements vscode.TreeDataProvider<WorldNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<WorldNode | undefined | null>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** Cached world data from the last --world-json run. */
  private worldData: WorldData | null = null;

  /** Timestamp of the last successful fetch. */
  private lastFetchMs = 0;

  /** Root category nodes, built from worldData. */
  private rootNodes: WorldNode[] = [];

  /** Room ID → room name lookup, for labeling entity locations. */
  private roomNameById: Map<string, string> = new Map();

  /**
   * Returns the current cached world data (or null).
   * Used by other providers (e.g., entity autocomplete) that
   * share this data without running a separate CLI call.
   */
  getWorldData(): WorldData | null {
    return this.worldData;
  }

  getTreeItem(element: WorldNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WorldNode): WorldNode[] {
    if (!element) {
      return this.rootNodes;
    }
    return element.children;
  }

  /**
   * Refreshes the tree by re-running --world-json.
   * Shows a progress notification during the fetch.
   */
  async refresh(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Sharpee: Loading world data...' },
      () => this.fetchWorldData(),
    );
    this.buildTree();
    this._onDidChangeTreeData.fire(undefined);
  }

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  /**
   * Runs `node dist/cli/sharpee.js --world-json` and parses stdout.
   */
  private async fetchWorldData(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('Open a Sharpee workspace first.');
      return;
    }

    const storyId = await resolveStoryId();
    if (!storyId) return;

    const config = vscode.workspace.getConfiguration('sharpee');
    const cliBundlePath = config.get<string>('cliBundlePath', 'dist/cli/sharpee.js');
    const cliAbsolute = path.join(workspaceFolder.uri.fsPath, cliBundlePath);

    try {
      const json = await this.runCli(cliAbsolute, workspaceFolder.uri.fsPath, storyId);
      this.worldData = JSON.parse(json) as WorldData;
      this.lastFetchMs = Date.now();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`World Explorer: ${message}`);
      this.worldData = null;
    }
  }

  /**
   * Spawns the CLI process and collects stdout.
   *
   * @param cliPath - Absolute path to the CLI bundle
   * @param cwd - Working directory (workspace root)
   * @param storyId - Story identifier for the --story flag
   * @returns Resolved with the raw stdout string
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

  // -----------------------------------------------------------------------
  // Tree building
  // -----------------------------------------------------------------------

  /**
   * Builds the tree node hierarchy from cached worldData.
   */
  private buildTree(): void {
    if (!this.worldData) {
      this.rootNodes = [
        new WorldNode(
          'No world data — build the story and refresh',
          'detail',
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
      return;
    }

    // Build room name lookup
    this.roomNameById.clear();
    for (const room of this.worldData.rooms) {
      this.roomNameById.set(room.id, room.name);
    }

    const roomsCategory = this.buildRoomsCategory(this.worldData.rooms);
    const entitiesCategory = this.buildEntitiesCategory(this.worldData.entities);
    const npcsCategory = this.buildNpcsCategory(this.worldData.npcs);

    this.rootNodes = [roomsCategory, entitiesCategory, npcsCategory];
  }

  /**
   * Builds the Rooms category with room nodes and exit children.
   */
  private buildRoomsCategory(rooms: WorldRoom[]): WorldNode {
    const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));

    const children = sorted.map(room => {
      const exitChildren = Object.entries(room.exits).map(([dir, dest]) => {
        const exitNode = new WorldNode(
          `${dir} → ${dest.name}`,
          'exit',
          vscode.TreeItemCollapsibleState.None,
        );
        exitNode.description = dest.id;
        exitNode.iconPath = new vscode.ThemeIcon('arrow-right');
        return exitNode;
      });

      const hasExits = exitChildren.length > 0;
      const roomNode = new WorldNode(
        room.name,
        'room',
        hasExits ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        exitChildren,
      );
      roomNode.description = room.id;
      roomNode.tooltip = this.buildRoomTooltip(room);
      roomNode.iconPath = new vscode.ThemeIcon(room.isDark ? 'eye-closed' : 'home');

      // Enable source navigation via the search command
      roomNode.command = {
        command: 'workbench.action.quickOpen',
        title: 'Go to source',
        arguments: [room.name],
      };

      return roomNode;
    });

    const category = new WorldNode(
      `Rooms (${rooms.length})`,
      'category',
      vscode.TreeItemCollapsibleState.Expanded,
      children,
    );
    category.iconPath = new vscode.ThemeIcon('map');
    return category;
  }

  /**
   * Builds the Entities category, grouped by location.
   */
  private buildEntitiesCategory(entities: WorldEntity[]): WorldNode {
    // Group by location
    const byLocation = new Map<string, WorldEntity[]>();
    for (const entity of entities) {
      const locKey = entity.location ?? '(no location)';
      const group = byLocation.get(locKey) ?? [];
      group.push(entity);
      byLocation.set(locKey, group);
    }

    // Sort groups by room name
    const sortedGroups = [...byLocation.entries()].sort((a, b) => {
      const nameA = this.roomNameById.get(a[0]) ?? a[0];
      const nameB = this.roomNameById.get(b[0]) ?? b[0];
      return nameA.localeCompare(nameB);
    });

    const groupNodes = sortedGroups.map(([locId, ents]) => {
      const locName = this.roomNameById.get(locId) ?? locId;
      const sortedEnts = [...ents].sort((a, b) => a.name.localeCompare(b.name));

      const entityChildren = sortedEnts.map(ent => {
        const entityNode = new WorldNode(
          ent.name,
          'entity',
          vscode.TreeItemCollapsibleState.None,
        );
        entityNode.description = ent.id;
        entityNode.tooltip = `${ent.name} (${ent.id})\nTraits: ${ent.traits.join(', ')}`;
        entityNode.iconPath = this.entityIcon(ent.traits);

        entityNode.command = {
          command: 'workbench.action.quickOpen',
          title: 'Go to source',
          arguments: [ent.name],
        };

        return entityNode;
      });

      const groupNode = new WorldNode(
        locName,
        'location-group',
        vscode.TreeItemCollapsibleState.Collapsed,
        entityChildren,
      );
      groupNode.description = `${ents.length} item${ents.length === 1 ? '' : 's'}`;
      groupNode.iconPath = new vscode.ThemeIcon('folder');
      return groupNode;
    });

    const category = new WorldNode(
      `Entities (${entities.length})`,
      'category',
      vscode.TreeItemCollapsibleState.Collapsed,
      groupNodes,
    );
    category.iconPath = new vscode.ThemeIcon('package');
    return category;
  }

  /**
   * Builds the NPCs category.
   */
  private buildNpcsCategory(npcs: WorldNpc[]): WorldNode {
    const sorted = [...npcs].sort((a, b) => a.name.localeCompare(b.name));

    const children = sorted.map(npc => {
      const details: WorldNode[] = [];

      // Location detail
      if (npc.location) {
        const locName = this.roomNameById.get(npc.location) ?? npc.location;
        const locNode = new WorldNode(
          `Location: ${locName}`,
          'detail',
          vscode.TreeItemCollapsibleState.None,
        );
        locNode.iconPath = new vscode.ThemeIcon('home');
        details.push(locNode);
      }

      // Behavior detail
      if (npc.behaviorId) {
        const behavNode = new WorldNode(
          `Behavior: ${npc.behaviorId}`,
          'detail',
          vscode.TreeItemCollapsibleState.None,
        );
        behavNode.iconPath = new vscode.ThemeIcon('symbol-event');
        details.push(behavNode);
      }

      const npcNode = new WorldNode(
        npc.name,
        'npc',
        details.length > 0
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None,
        details,
      );
      npcNode.description = npc.id;
      npcNode.tooltip = `${npc.name} (${npc.id})\nTraits: ${npc.traits.join(', ')}`;
      npcNode.iconPath = new vscode.ThemeIcon('person');

      npcNode.command = {
        command: 'workbench.action.quickOpen',
        title: 'Go to source',
        arguments: [npc.name],
      };

      return npcNode;
    });

    const category = new WorldNode(
      `NPCs (${npcs.length})`,
      'category',
      vscode.TreeItemCollapsibleState.Collapsed,
      children,
    );
    category.iconPath = new vscode.ThemeIcon('person');
    return category;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Selects a ThemeIcon based on an entity's trait list.
   */
  private entityIcon(traits: string[]): vscode.ThemeIcon {
    if (traits.includes('light_source')) return new vscode.ThemeIcon('lightbulb');
    if (traits.includes('container')) return new vscode.ThemeIcon('archive');
    if (traits.includes('supporter')) return new vscode.ThemeIcon('layout');
    if (traits.includes('openable') || traits.includes('lockable')) return new vscode.ThemeIcon('lock');
    if (traits.includes('weapon')) return new vscode.ThemeIcon('zap');
    if (traits.includes('readable')) return new vscode.ThemeIcon('book');
    if (traits.includes('wearable')) return new vscode.ThemeIcon('jersey');
    if (traits.includes('edible')) return new vscode.ThemeIcon('heart');
    return new vscode.ThemeIcon('symbol-variable');
  }

  /**
   * Builds a markdown tooltip string for a room.
   */
  private buildRoomTooltip(room: WorldRoom): vscode.MarkdownString {
    const lines: string[] = [
      `**${room.name}** \`${room.id}\``,
    ];

    if (room.isDark) {
      lines.push('*Dark room*');
    }

    if (room.aliases.length > 0) {
      lines.push(`Aliases: ${room.aliases.join(', ')}`);
    }

    const exitCount = Object.keys(room.exits).length;
    if (exitCount > 0) {
      lines.push('', `**Exits** (${exitCount}):`);
      for (const [dir, dest] of Object.entries(room.exits)) {
        lines.push(`- ${dir} → ${dest.name}`);
      }
    }

    const md = new vscode.MarkdownString(lines.join('\n'));
    md.isTrusted = true;
    return md;
  }
}
