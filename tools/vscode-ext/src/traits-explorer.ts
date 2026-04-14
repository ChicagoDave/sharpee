/**
 * Traits Index sidebar webview for Sharpee stories.
 *
 * Displays all trait types from the --world-json introspection output,
 * grouped into platform and story sections. Each trait shows its type,
 * entity count, properties, and capability/interceptor registrations.
 *
 * Public interface: TraitsExplorerProvider, REFRESH_TRAITS_COMMAND
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { navigateToSource } from './source-navigation';
import type { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the traits explorer. */
export const REFRESH_TRAITS_COMMAND = 'sharpee.refreshTraitsExplorer';

// ---------------------------------------------------------------------------
// Types (from --world-json introspection)
// ---------------------------------------------------------------------------

interface TraitEntry {
  type: string;
  isStandard: boolean;
  entityCount: number;
  entityIds: string[];
  properties: string[];
  capabilities: string[];
  interceptors: string[];
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the Traits Index as HTML.
 * Reads cached world data from the WorldExplorerProvider.
 */
export class TraitsExplorerProvider implements vscode.WebviewViewProvider {
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
        this.navigateToTraitSource(msg.name);
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

  private navigateToTraitSource(traitType: string): void {
    const pattern = traitType.startsWith('dungeo.')
      ? 'stories/**/src/**/*.ts'
      : 'packages/world-model/**/*.ts';
    navigateToSource(`'${traitType}'`, pattern);
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

    const traits: TraitEntry[] = (data as any).traits ?? [];
    const stdTraits = traits.filter(t => t.isStandard).sort((a, b) => a.type.localeCompare(b.type));
    const storyTraits = traits.filter(t => !t.isStandard).sort((a, b) => a.type.localeCompare(b.type));

    const totalEntities = traits.reduce((sum, t) => sum + t.entityCount, 0);
    const withCaps = traits.filter(t => t.capabilities.length > 0 || t.interceptors.length > 0);

    // Platform traits section
    const stdRows = stdTraits.map(t => this.renderTraitRow(t)).join('');
    const stdSection = `<details class="group">
  <summary class="group-header">Platform Traits <span class="count">(${stdTraits.length})</span></summary>
  <table class="trait-table">
    <thead><tr><th>Trait</th><th>Entities</th><th>Properties</th><th>Dispatch</th></tr></thead>
    <tbody>${stdRows}</tbody>
  </table>
</details>`;

    // Story traits section
    let storySection = '';
    if (storyTraits.length > 0) {
      const storyRows = storyTraits.map(t => this.renderTraitRow(t)).join('');
      storySection = `<details class="group">
  <summary class="group-header story-header">Story Traits <span class="count">(${storyTraits.length})</span></summary>
  <table class="trait-table">
    <thead><tr><th>Trait</th><th>Entities</th><th>Properties</th><th>Dispatch</th></tr></thead>
    <tbody>${storyRows}</tbody>
  </table>
</details>`;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${traits.length} traits</span>
  <span>${stdTraits.length} platform</span>
  <span>${storyTraits.length} story</span>
  <span>${withCaps.length} with dispatch</span>
</div>

${stdSection}
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
   * Renders a single trait as a table row.
   */
  private renderTraitRow(trait: TraitEntry): string {
    const shortType = trait.type.replace(/^dungeo\.trait\./, '');

    // Properties as compact list
    const propsHtml = trait.properties.length > 0
      ? trait.properties.map(p => `<span class="prop">${this.esc(p)}</span>`).join(' ')
      : '<span class="muted">none</span>';

    // Capability and interceptor badges
    const dispatchParts: string[] = [];
    for (const cap of trait.capabilities) {
      const short = cap.replace(/^if\.action\./, '').replace(/^if\.scope\./, 'scope:');
      dispatchParts.push(`<span class="cap-badge cap">${this.esc(short)}</span>`);
    }
    for (const int of trait.interceptors) {
      const short = int.replace(/^if\.action\./, '');
      dispatchParts.push(`<span class="cap-badge int">${this.esc(short)}</span>`);
    }
    const dispatchHtml = dispatchParts.length > 0 ? dispatchParts.join(' ') : '';

    return `<tr>
  <td><a class="trait-link" data-navigate="${this.esc(trait.type)}">${this.esc(shortType)}</a></td>
  <td class="count-col">${trait.entityCount}</td>
  <td class="props-col">${propsHtml}</td>
  <td class="dispatch-col">${dispatchHtml}</td>
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
      .story-header {
        border-left-color: var(--vscode-editorWarning-foreground);
      }
      .count { font-weight: 400; opacity: 0.6; }

      .trait-table {
        width: 100%; border-collapse: collapse;
        font-size: 0.88em; margin: 2px 0 6px;
      }
      .trait-table th {
        text-align: left; padding: 2px 6px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 600; font-size: 0.85em;
        opacity: 0.7; text-transform: uppercase;
        white-space: nowrap;
      }
      .trait-table td {
        padding: 2px 6px; vertical-align: top;
        border-bottom: 1px solid var(--vscode-panel-border, transparent);
      }
      .trait-table tr:hover td {
        background: var(--vscode-list-hoverBackground);
      }

      .trait-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer; text-decoration: none; font-weight: 500;
        font-family: var(--vscode-editor-font-family);
        white-space: nowrap;
      }
      .trait-link:hover { text-decoration: underline; }

      .count-col { text-align: right; white-space: nowrap; opacity: 0.8; }

      .props-col { line-height: 1.6; }
      .prop {
        display: inline-block; padding: 0 3px; margin: 1px 1px;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.85em; opacity: 0.7;
      }

      .dispatch-col { line-height: 1.6; }
      .cap-badge {
        display: inline-block; padding: 0 4px; margin: 1px 2px;
        border-radius: 3px; font-size: 0.85em;
        font-family: var(--vscode-editor-font-family);
      }
      .cap-badge.cap {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
      }
      .cap-badge.int {
        border: 1px solid var(--vscode-editorWarning-foreground);
        color: var(--vscode-editorWarning-foreground);
      }

      .muted { opacity: 0.5; font-style: italic; }

      details > summary { list-style: revert; }
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
