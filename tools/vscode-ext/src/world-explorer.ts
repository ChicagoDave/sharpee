/**
 * World Index sidebar webview for Sharpee stories.
 *
 * Runs `node dist/cli/sharpee.js --world-json` to extract the initialized
 * world model, then renders an HTML World Index in the VS Code sidebar
 * webview. Shows rooms grouped by region, with exits, contained entities,
 * dead-end and one-way exit highlighting.
 *
 * Public interface: WorldExplorerProvider, REFRESH_WORLD_COMMAND, getWorldData()
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
// World JSON types (exported for entity-completions.ts)
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
  regionId: string | null;
  exits: Record<string, WorldExit>;
}

/** Region entry from --world-json output (ADR-149). */
interface WorldRegion {
  id: string;
  name: string;
  parentRegionId: string | null;
}

/** Scene entry from --world-json output (ADR-149). */
interface WorldScene {
  id: string;
  name: string;
  state: 'waiting' | 'active' | 'ended';
  recurring: boolean;
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
  regions: WorldRegion[];
  scenes: WorldScene[];
}

// ---------------------------------------------------------------------------
// Provider — WebviewViewProvider (sidebar webview)
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the World Index as HTML.
 * Replaces the former TreeDataProvider. Data is fetched by running the CLI
 * with --world-json and cached in memory until explicitly refreshed.
 */
export class WorldExplorerProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  /** Cached world data from the last --world-json run. */
  private worldData: WorldData | null = null;

  /**
   * Returns the current cached world data (or null).
   * Used by other providers (e.g., entity autocomplete).
   */
  getWorldData(): WorldData | null {
    return this.worldData;
  }

  /**
   * Called by VS Code when the sidebar view becomes visible.
   */
  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
    };

    // Handle click-to-navigate: grep for room name in region source, open at line
    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'navigate') {
        this.navigateToRoomSource(msg.name);
      }
    });

    // Render initial state
    webviewView.webview.html = this.buildHtml();
  }

  /**
   * Refreshes the webview by re-running --world-json.
   */
  async refresh(): Promise<void> {
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: 'Sharpee: Loading world data...' },
      () => this.fetchWorldData(),
    );

    if (this._view) {
      this._view.webview.html = this.buildHtml();
    }
  }

  // -----------------------------------------------------------------------
  // Source navigation
  // -----------------------------------------------------------------------

  /**
   * Searches region source files for a room name and opens the file at
   * the matching line. Falls back to workspace search if grep finds nothing.
   *
   * @param roomName - The room's display name (e.g., "West of House")
   */
  private navigateToRoomSource(roomName: string): void {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) return;

    try {
      const result = cp.execFileSync(
        'grep',
        ['-rn', '--include=*.ts', '-m', '1', '-F', `'${roomName}'`, 'stories/'],
        { cwd: ws, encoding: 'utf-8' },
      );
      const match = result.match(/^([^:]+):(\d+):/);
      if (match) {
        const uri = vscode.Uri.file(path.join(ws, match[1]));
        const line = parseInt(match[2], 10) - 1;
        const pos = new vscode.Position(line, 0);
        vscode.window.showTextDocument(uri, { selection: new vscode.Range(pos, pos) });
        return;
      }
    } catch {
      // grep returned no matches — fall through to workspace search
    }

    // Fallback: open search panel with the room name
    vscode.commands.executeCommand('workbench.action.findInFiles', {
      query: roomName,
      filesToInclude: 'stories/*/src/regions/**/*.ts',
      triggerSearch: true,
      isCaseSensitive: true,
    });
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
      let json = await this.runCli(cliAbsolute, workspaceFolder.uri.fsPath, storyId);
      // The CLI may emit trailing text after the JSON. Trim to the closing brace.
      const lastBrace = json.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace < json.length - 1) {
        json = json.substring(0, lastBrace + 1);
      }
      this.worldData = JSON.parse(json) as WorldData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`World Explorer: ${message}`);
      this.worldData = null;
    }
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

  // -----------------------------------------------------------------------
  // HTML rendering
  // -----------------------------------------------------------------------

  /**
   * Builds the complete HTML string for the sidebar webview.
   */
  private buildHtml(): string {
    if (!this.worldData) {
      return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${this.baseStyles()}</style>
</head><body>
<div class="empty-state">
  <p>No world data loaded.</p>
  <p>Build the story, then click the refresh button above.</p>
</div>
</body></html>`;
    }

    const data = this.worldData;
    const rooms = data.rooms ?? [];
    const entities = data.entities ?? [];
    const npcs = data.npcs ?? [];
    const regions = data.regions ?? [];
    const scenes = data.scenes ?? [];

    // Build lookups
    const roomById = new Map<string, WorldRoom>();
    for (const room of rooms) {
      roomById.set(room.id, room);
    }
    const regionNameById = new Map<string, string>();
    for (const reg of regions) {
      regionNameById.set(reg.id, reg.name);
    }

    // Group entities by location
    const entitiesByRoom = new Map<string, WorldEntity[]>();
    for (const ent of entities) {
      if (ent.location) {
        const group = entitiesByRoom.get(ent.location) ?? [];
        group.push(ent);
        entitiesByRoom.set(ent.location, group);
      }
    }

    // Group NPCs by location
    const npcsByRoom = new Map<string, WorldNpc[]>();
    for (const npc of npcs) {
      if (npc.location) {
        const group = npcsByRoom.get(npc.location) ?? [];
        group.push(npc);
        npcsByRoom.set(npc.location, group);
      }
    }

    // Detect one-way exits
    const oneWayExits = new Set<string>(); // "roomId:direction"
    for (const room of rooms) {
      for (const [dir, dest] of Object.entries(room.exits)) {
        const destRoom = roomById.get(dest.id);
        if (destRoom) {
          const hasReturn = Object.values(destRoom.exits).some(e => e.id === room.id);
          if (!hasReturn) {
            oneWayExits.add(`${room.id}:${dir}`);
          }
        }
      }
    }

    // Group rooms by region
    const hasRegions = regions.length > 0 && rooms.some(r => r.regionId);
    let roomSections: string;

    if (hasRegions) {
      const byRegion = new Map<string, WorldRoom[]>();
      for (const room of rooms) {
        const key = room.regionId ?? '(unassigned)';
        const group = byRegion.get(key) ?? [];
        group.push(room);
        byRegion.set(key, group);
      }

      const sortedGroups = [...byRegion.entries()].sort((a, b) => {
        if (a[0] === '(unassigned)') return 1;
        if (b[0] === '(unassigned)') return -1;
        const nameA = regionNameById.get(a[0]) ?? a[0];
        const nameB = regionNameById.get(b[0]) ?? b[0];
        return nameA.localeCompare(nameB);
      });

      roomSections = sortedGroups.map(([regionId, regionRooms]) => {
        const regionName = regionId === '(unassigned)'
          ? 'Unassigned'
          : this.esc(regionNameById.get(regionId) ?? regionId);
        const roomHtml = regionRooms
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(r => this.renderRoom(r, entitiesByRoom, npcsByRoom, oneWayExits))
          .join('');
        return `<details class="region">
          <summary class="region-header">${regionName} <span class="count">(${regionRooms.length})</span></summary>
          ${roomHtml}
        </details>`;
      }).join('');
    } else {
      const sorted = [...rooms].sort((a, b) => a.name.localeCompare(b.name));
      roomSections = sorted
        .map(r => this.renderRoom(r, entitiesByRoom, npcsByRoom, oneWayExits))
        .join('');
    }

    // Scenes section
    let scenesSection = '';
    if (scenes.length > 0) {
      const sceneItems = scenes
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(s => {
          const icon = s.state === 'active' ? '&#9654;' : s.state === 'ended' ? '&#10003;' : '&#9675;';
          const label = s.recurring ? `${s.state} (recurring)` : s.state;
          return `<div class="scene"><span class="scene-icon">${icon}</span> <strong>${this.esc(s.name)}</strong> <span class="muted">${this.esc(s.id)}</span> &mdash; ${this.esc(label)}</div>`;
        })
        .join('');
      scenesSection = `<details class="section" open>
        <summary class="section-header">Scenes <span class="count">(${scenes.length})</span></summary>
        ${sceneItems}
      </details>`;
    }

    // Stats
    const deadEnds = rooms.filter(r => Object.keys(r.exits).length <= 1);
    const darkRooms = rooms.filter(r => r.isDark);

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${rooms.length} rooms</span>
  <span>${entities.length} entities</span>
  <span>${npcs.length} NPCs</span>
  ${darkRooms.length > 0 ? `<span>${darkRooms.length} dark</span>` : ''}
  ${deadEnds.length > 0 ? `<span class="warn">${deadEnds.length} dead-ends</span>` : ''}
  ${oneWayExits.size > 0 ? `<span class="warn">${oneWayExits.size} one-way exits</span>` : ''}
</div>

<details class="section" open>
  <summary class="section-header">Rooms <span class="count">(${rooms.length})</span></summary>
  ${roomSections}
</details>

${scenesSection}

<script>
  const vscode = acquireVsCodeApi();
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-navigate]');
    if (link) {
      vscode.postMessage({ type: 'navigate', name: link.dataset.navigate });
    }
  });
</script>
</body></html>`;
  }

  /**
   * Renders a single room card.
   */
  private renderRoom(
    room: WorldRoom,
    entitiesByRoom: Map<string, WorldEntity[]>,
    npcsByRoom: Map<string, WorldNpc[]>,
    oneWayExits: Set<string>,
  ): string {
    const exitCount = Object.keys(room.exits).length;
    const isDeadEnd = exitCount <= 1;
    const roomEntities = entitiesByRoom.get(room.id) ?? [];
    const roomNpcs = npcsByRoom.get(room.id) ?? [];

    const exitHtml = Object.entries(room.exits).map(([dir, dest]) => {
      const isOneWay = oneWayExits.has(`${room.id}:${dir}`);
      const cls = isOneWay ? ' class="one-way"' : '';
      const marker = isOneWay ? ' <span class="one-way-badge">one-way</span>' : '';
      return `<span${cls}>${this.esc(dir)} &rarr; <a data-navigate="${this.esc(dest.name)}">${this.esc(dest.name)}</a>${marker}</span>`;
    }).join(', ');

    const contentsHtml = [...roomEntities, ...roomNpcs]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(e => {
        const icon = 'behaviorId' in e ? '&#128100;' : '&#128230;';
        return `<span class="entity-chip">${icon} ${this.esc(e.name)}</span>`;
      })
      .join(' ');

    const darkBadge = room.isDark ? '<span class="badge dark">dark</span>' : '';
    const deadEndBadge = isDeadEnd ? '<span class="badge dead-end">dead-end</span>' : '';

    return `<div class="room${isDeadEnd ? ' is-dead-end' : ''}">
  <div class="room-header">
    <a class="room-name" data-navigate="${this.esc(room.name)}">${this.esc(room.name)}</a>
    <span class="room-id">${this.esc(room.id)}</span>
    ${darkBadge}${deadEndBadge}
  </div>
  ${exitCount > 0 ? `<div class="exits">${exitHtml}</div>` : '<div class="exits muted">No exits</div>'}
  ${contentsHtml ? `<div class="contents">${contentsHtml}</div>` : ''}
</div>`;
  }

  /**
   * CSS styles using VS Code theme variables.
   */
  private baseStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: var(--vscode-sideBar-background);
        color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size, 13px);
        padding: 8px;
        line-height: 1.5;
      }

      .empty-state { padding: 24px 8px; text-align: center; opacity: 0.7; }
      .empty-state p + p { margin-top: 8px; }

      .stats {
        display: flex; flex-wrap: wrap; gap: 8px;
        padding: 6px 0 10px; border-bottom: 1px solid var(--vscode-panel-border);
        margin-bottom: 10px; font-size: 0.9em;
      }
      .stats span { opacity: 0.8; }
      .stats .warn { color: var(--vscode-editorWarning-foreground); }

      .section, .region { margin-bottom: 4px; }
      .section-header, .region-header {
        cursor: pointer; font-weight: 600; padding: 4px 0;
        user-select: none;
      }
      .section-header { font-size: 1.05em; }
      .region-header {
        font-size: 0.95em; padding-left: 4px;
        border-left: 3px solid var(--vscode-textLink-foreground);
        margin: 8px 0 4px;
      }
      .count { font-weight: 400; opacity: 0.6; }

      .room {
        padding: 6px 8px; margin: 2px 0;
        border-radius: 3px;
        border-left: 3px solid transparent;
      }
      .room:hover { background: var(--vscode-list-hoverBackground); }
      .room.is-dead-end { border-left-color: var(--vscode-editorWarning-foreground); }

      .room-header { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .room-name {
        font-weight: 600; cursor: pointer;
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
      }
      .room-name:hover { text-decoration: underline; }
      .room-id { font-size: 0.85em; opacity: 0.5; font-family: var(--vscode-editor-font-family); }

      .badge {
        font-size: 0.75em; padding: 1px 5px; border-radius: 3px;
        font-weight: 600; text-transform: uppercase;
      }
      .badge.dark {
        background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
      }
      .badge.dead-end {
        background: var(--vscode-editorWarning-foreground); color: var(--vscode-editor-background);
      }

      .exits { font-size: 0.9em; padding: 2px 0; }
      .exits a {
        color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: none;
      }
      .exits a:hover { text-decoration: underline; }
      .one-way { color: var(--vscode-editorWarning-foreground); }
      .one-way-badge {
        font-size: 0.7em; opacity: 0.8; font-style: italic;
      }

      .contents { font-size: 0.85em; padding: 2px 0; }
      .entity-chip {
        display: inline-block; padding: 1px 4px; margin: 1px 2px;
        background: var(--vscode-badge-background); color: var(--vscode-badge-foreground);
        border-radius: 3px; font-size: 0.9em;
      }

      .muted { opacity: 0.5; }

      .scene { padding: 4px 8px; }
      .scene-icon { font-size: 0.9em; }

      details > summary { list-style: revert; }
    `;
  }

  /**
   * Escapes a string for safe HTML insertion.
   */
  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
