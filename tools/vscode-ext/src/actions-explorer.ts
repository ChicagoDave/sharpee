/**
 * Actions Index sidebar webview for Sharpee stories.
 *
 * Displays all registered actions from the --world-json output, grouped
 * into stdlib (platform) and story-specific sections. Each action shows
 * its ID, group, verb patterns, and help text in a compact table layout.
 *
 * Public interface: ActionsExplorerProvider, REFRESH_ACTIONS_COMMAND
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { navigateToSource } from './source-navigation';
import type { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the actions explorer. */
export const REFRESH_ACTIONS_COMMAND = 'sharpee.refreshActionsExplorer';

// ---------------------------------------------------------------------------
// Types (from --world-json introspection)
// ---------------------------------------------------------------------------

interface ActionEntry {
  id: string;
  group: string | null;
  priority: number;
  isStandard: boolean;
  patterns: string[];
  help: { description: string; verbs: string[]; examples: string[] } | null;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the Actions Index as HTML.
 * Reads cached world data from the WorldExplorerProvider.
 */
export class ActionsExplorerProvider implements vscode.WebviewViewProvider {
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
        this.navigateToActionSource(msg.name);
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

  private navigateToActionSource(actionId: string): void {
    const pattern = actionId.startsWith('if.action.')
      ? 'packages/{stdlib,lang-en-us}/**/*.ts'
      : 'stories/**/src/**/*.ts';
    navigateToSource(`'${actionId}'`, pattern);
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

    const actions: ActionEntry[] = (data as any).actions ?? [];
    const stdActions = actions.filter(a => a.isStandard).sort((a, b) => a.id.localeCompare(b.id));
    const storyActions = actions.filter(a => !a.isStandard).sort((a, b) => a.id.localeCompare(b.id));

    // Group stdlib actions by group
    const byGroup = new Map<string, ActionEntry[]>();
    for (const action of stdActions) {
      const key = action.group ?? '(ungrouped)';
      const group = byGroup.get(key) ?? [];
      group.push(action);
      byGroup.set(key, group);
    }

    // Stdlib sections grouped by action group
    const stdSections = [...byGroup.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([group, groupActions]) => {
        const rows = groupActions.map(a => this.renderActionRow(a)).join('');
        return `<details class="group">
  <summary class="group-header">${this.esc(group)} <span class="count">(${groupActions.length})</span></summary>
  <table class="action-table">
    <thead><tr><th>Action</th><th>Patterns</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</details>`;
      })
      .join('');

    // Story actions section
    let storySection = '';
    if (storyActions.length > 0) {
      const rows = storyActions.map(a => this.renderActionRow(a)).join('');
      storySection = `<details class="group">
  <summary class="group-header story-header">Story Actions <span class="count">(${storyActions.length})</span></summary>
  <table class="action-table">
    <thead><tr><th>Action</th><th>Patterns</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</details>`;
    }

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${actions.length} actions</span>
  <span>${stdActions.length} stdlib</span>
  <span>${storyActions.length} story</span>
  <span>${byGroup.size} groups</span>
</div>

<h3 class="section-title">Platform Actions</h3>
${stdSections}

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
   * Renders a single action as a table row.
   */
  private renderActionRow(action: ActionEntry): string {
    const shortId = action.id.replace(/^if\.action\./, '').replace(/^dungeo\.action\./, '');

    let patternsHtml: string;
    if (action.patterns.length > 0) {
      patternsHtml = action.patterns
        .map(p => `<span class="pattern">${this.esc(p)}</span>`)
        .join(' ');
    } else {
      patternsHtml = '<span class="muted">grammar-only</span>';
    }

    const helpTip = action.help?.description
      ? ` title="${this.esc(action.help.description)}"`
      : '';

    return `<tr>
  <td><a class="action-link" data-navigate="${this.esc(action.id)}"${helpTip}>${this.esc(shortId)}</a></td>
  <td class="patterns-col">${patternsHtml}</td>
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

      .section-title {
        font-size: 1em; font-weight: 600; margin: 10px 0 4px;
        opacity: 0.8;
      }

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

      .action-table {
        width: 100%; border-collapse: collapse;
        font-size: 0.88em; margin: 2px 0 6px;
      }
      .action-table th {
        text-align: left; padding: 2px 6px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 600; font-size: 0.85em;
        opacity: 0.7; text-transform: uppercase;
        white-space: nowrap;
      }
      .action-table td {
        padding: 2px 6px; vertical-align: top;
        border-bottom: 1px solid var(--vscode-panel-border, transparent);
      }
      .action-table tr:hover td {
        background: var(--vscode-list-hoverBackground);
      }

      .action-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer; text-decoration: none; font-weight: 500;
        font-family: var(--vscode-editor-font-family);
        white-space: nowrap;
      }
      .action-link:hover { text-decoration: underline; }

      .patterns-col { line-height: 1.6; }
      .pattern {
        display: inline-block; padding: 0 4px; margin: 1px 2px;
        border-radius: 3px; font-size: 0.9em;
        font-family: var(--vscode-editor-font-family);
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
      }

      .muted { opacity: 0.5; font-style: italic; }

      details > summary { list-style: revert; }
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
