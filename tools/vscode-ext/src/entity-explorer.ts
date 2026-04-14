/**
 * Entity Index sidebar webview for Sharpee stories.
 *
 * Displays all entities from the --world-json output grouped by trait
 * category, with a compact table layout. Shares cached world data from
 * the WorldExplorerProvider rather than running the CLI independently.
 *
 * Public interface: EntityExplorerProvider, REFRESH_ENTITIES_COMMAND
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import type { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the entity explorer. */
export const REFRESH_ENTITIES_COMMAND = 'sharpee.refreshEntityExplorer';

// ---------------------------------------------------------------------------
// Trait classification
// ---------------------------------------------------------------------------

/** Well-known stdlib/world-model trait types (platform traits). */
const PLATFORM_TRAITS = new Set([
  'room', 'identity', 'container', 'supporter', 'openable', 'lockable',
  'switchable', 'readable', 'scenery', 'actor', 'combatant', 'light-source',
  'wearable', 'region', 'story-info',
]);

/** Human-readable labels for trait categories. */
const TRAIT_LABELS: Record<string, string> = {
  'container': 'Containers',
  'supporter': 'Supporters',
  'openable': 'Openable',
  'lockable': 'Lockable',
  'switchable': 'Switchable',
  'readable': 'Readable',
  'scenery': 'Scenery',
  'actor': 'Actors',
  'combatant': 'Combatants',
  'light-source': 'Light Sources',
  'wearable': 'Wearable',
};

// ---------------------------------------------------------------------------
// Interfaces (reuse types from world-explorer via the provider)
// ---------------------------------------------------------------------------

interface EntityEntry {
  id: string;
  name: string;
  location: string | null;
  traits: string[];
}

interface NpcEntry {
  id: string;
  name: string;
  location: string | null;
  traits: string[];
  behaviorId: string | null;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the Entity Index as an HTML table.
 * Reads cached world data from the WorldExplorerProvider.
 */
export class EntityExplorerProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly worldProvider: WorldExplorerProvider) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.type === 'navigate') {
        this.navigateToEntitySource(msg.name);
      }
    });

    webviewView.webview.html = this.buildHtml();
  }

  /** Re-renders the panel using current cached world data. */
  refresh(): void {
    if (this._view) {
      this._view.webview.html = this.buildHtml();
    }
  }

  // -----------------------------------------------------------------------
  // Source navigation
  // -----------------------------------------------------------------------

  /**
   * Searches story source files for an entity name and opens at the line.
   *
   * @param entityName - The entity's display name
   */
  private navigateToEntitySource(entityName: string): void {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) return;

    try {
      const result = cp.execFileSync(
        'grep',
        ['-rn', '--include=*.ts', '-m', '1', '-F', `'${entityName}'`, 'stories/'],
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
      // no match — fall through
    }

    vscode.commands.executeCommand('workbench.action.findInFiles', {
      query: entityName,
      filesToInclude: 'stories/*/src/**/*.ts',
      triggerSearch: true,
      isCaseSensitive: true,
    });
  }

  // -----------------------------------------------------------------------
  // HTML rendering
  // -----------------------------------------------------------------------

  private buildHtml(): string {
    const data = this.worldProvider.getWorldData();
    if (!data) {
      return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>${this.baseStyles()}</style>
</head><body>
<div class="empty-state">
  <p>No world data loaded.</p>
  <p>Build the story and refresh the World Index first.</p>
</div>
</body></html>`;
    }

    const entities: EntityEntry[] = data.entities ?? [];
    const npcs: NpcEntry[] = (data as any).npcs ?? [];

    // Build room name lookup for location display
    const roomNameById = new Map<string, string>();
    for (const room of data.rooms ?? []) {
      roomNameById.set(room.id, room.name);
    }

    // Classify entities into trait groups
    const byTrait = new Map<string, EntityEntry[]>();
    const storyEntities: EntityEntry[] = [];

    for (const ent of entities) {
      const platformTraits = ent.traits.filter(t => PLATFORM_TRAITS.has(t));
      const storyTraits = ent.traits.filter(t => !PLATFORM_TRAITS.has(t));

      if (storyTraits.length > 0) {
        storyEntities.push(ent);
      }

      for (const trait of platformTraits) {
        if (trait === 'identity' || trait === 'room' || trait === 'region' || trait === 'story-info') continue;
        const group = byTrait.get(trait) ?? [];
        group.push(ent);
        byTrait.set(trait, group);
      }
    }

    // Build sections for platform trait groups
    const traitSections = [...byTrait.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([trait, items]) => {
        const label = TRAIT_LABELS[trait] ?? trait;
        const rows = items
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(e => this.renderEntityRow(e, roomNameById))
          .join('');
        return `<details class="group">
  <summary class="group-header">${this.esc(label)} <span class="count">(${items.length})</span></summary>
  <table class="entity-table">
    <thead><tr><th>Name</th><th>ID</th><th>Location</th><th>Traits</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</details>`;
      })
      .join('');

    // NPC section
    let npcSection = '';
    if (npcs.length > 0) {
      const npcRows = npcs
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(npc => {
          const loc = npc.location ? (roomNameById.get(npc.location) ?? npc.location) : '—';
          const traitBadges = npc.traits
            .filter(t => t !== 'identity' && t !== 'actor')
            .map(t => `<span class="trait">${this.esc(t)}</span>`)
            .join(' ');
          return `<tr>
  <td><a class="entity-link" data-navigate="${this.esc(npc.name)}">${this.esc(npc.name)}</a></td>
  <td class="id-col">${this.esc(npc.id)}</td>
  <td class="loc-col">${this.esc(loc)}</td>
  <td class="traits-col">${traitBadges}</td>
</tr>`;
        })
        .join('');
      npcSection = `<details class="group">
  <summary class="group-header">NPCs <span class="count">(${npcs.length})</span></summary>
  <table class="entity-table">
    <thead><tr><th>Name</th><th>ID</th><th>Location</th><th>Traits</th></tr></thead>
    <tbody>${npcRows}</tbody>
  </table>
</details>`;
    }

    // Story-specific entities section
    let storySection = '';
    if (storyEntities.length > 0) {
      const storyRows = storyEntities
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(e => this.renderEntityRow(e, roomNameById))
        .join('');
      storySection = `<details class="group">
  <summary class="group-header">Story-Specific <span class="count">(${storyEntities.length})</span></summary>
  <table class="entity-table">
    <thead><tr><th>Name</th><th>ID</th><th>Location</th><th>Traits</th></tr></thead>
    <tbody>${storyRows}</tbody>
  </table>
</details>`;
    }

    // Stats bar
    const totalItems = entities.length;
    const totalNpcs = npcs.length;
    const totalStory = storyEntities.length;

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${totalItems} entities</span>
  <span>${totalNpcs} NPCs</span>
  <span>${totalStory} story-specific</span>
  <span>${byTrait.size} trait groups</span>
</div>

${npcSection}
${traitSections}
${storySection}

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
   * Renders a single entity table row.
   */
  private renderEntityRow(
    entity: EntityEntry,
    roomNameById: Map<string, string>,
  ): string {
    const loc = entity.location
      ? (roomNameById.get(entity.location) ?? entity.location)
      : '—';
    const traitBadges = entity.traits
      .filter(t => t !== 'identity')
      .map(t => {
        const cls = PLATFORM_TRAITS.has(t) ? 'trait' : 'trait story';
        return `<span class="${cls}">${this.esc(t)}</span>`;
      })
      .join(' ');

    return `<tr>
  <td><a class="entity-link" data-navigate="${this.esc(entity.name)}">${this.esc(entity.name)}</a></td>
  <td class="id-col">${this.esc(entity.id)}</td>
  <td class="loc-col">${this.esc(loc)}</td>
  <td class="traits-col">${traitBadges}</td>
</tr>`;
  }

  private baseStyles(): string {
    return `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        background: var(--vscode-sideBar-background);
        color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size, 13px);
        padding: 8px;
        line-height: 1.4;
      }

      .empty-state { padding: 24px 8px; text-align: center; opacity: 0.7; }
      .empty-state p + p { margin-top: 8px; }

      .stats {
        display: flex; flex-wrap: wrap; gap: 8px;
        padding: 6px 0 10px; border-bottom: 1px solid var(--vscode-panel-border);
        margin-bottom: 10px; font-size: 0.9em;
      }
      .stats span { opacity: 0.8; }

      .group { margin-bottom: 4px; }
      .group-header {
        cursor: pointer; font-weight: 600; padding: 4px 0;
        user-select: none; font-size: 0.95em;
        border-left: 3px solid var(--vscode-textLink-foreground);
        padding-left: 4px; margin: 6px 0 2px;
      }
      .count { font-weight: 400; opacity: 0.6; }

      .entity-table {
        width: 100%; border-collapse: collapse;
        font-size: 0.88em; margin: 2px 0 6px;
      }
      .entity-table th {
        text-align: left; padding: 2px 6px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 600; font-size: 0.85em;
        opacity: 0.7; text-transform: uppercase;
        white-space: nowrap;
      }
      .entity-table td {
        padding: 2px 6px; vertical-align: top;
        border-bottom: 1px solid var(--vscode-panel-border, transparent);
      }
      .entity-table tr:hover td {
        background: var(--vscode-list-hoverBackground);
      }

      .entity-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer; text-decoration: none; font-weight: 500;
        white-space: nowrap;
      }
      .entity-link:hover { text-decoration: underline; }

      .id-col {
        font-family: var(--vscode-editor-font-family);
        font-size: 0.9em; opacity: 0.5; white-space: nowrap;
      }
      .loc-col { white-space: nowrap; }

      .traits-col { line-height: 1.6; }
      .trait {
        display: inline-block; padding: 0 4px; margin: 1px 2px;
        border-radius: 3px; font-size: 0.85em;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
      }
      .trait.story {
        border: 1px solid var(--vscode-textLink-foreground);
        background: transparent;
        color: var(--vscode-textLink-foreground);
      }

      details > summary { list-style: revert; }
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
