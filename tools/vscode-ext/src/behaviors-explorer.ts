/**
 * Behaviors Index sidebar webview for Sharpee stories.
 *
 * Displays all capability behavior and interceptor bindings from the
 * --world-json introspection output. Each binding shows the trait type,
 * action it handles, which phases are implemented, and whether it's a
 * capability behavior or an interceptor.
 *
 * Public interface: BehaviorsExplorerProvider, REFRESH_BEHAVIORS_COMMAND
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { navigateToSource } from './source-navigation';
import type { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the behaviors explorer. */
export const REFRESH_BEHAVIORS_COMMAND = 'sharpee.refreshBehaviorsExplorer';

// ---------------------------------------------------------------------------
// Types (from --world-json introspection)
// ---------------------------------------------------------------------------

interface BehaviorEntry {
  traitType: string;
  actionId: string;
  priority: number;
  phases: string[];
  kind: 'capability' | 'interceptor';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the Behaviors Index as HTML.
 * Reads cached world data from the WorldExplorerProvider.
 */
export class BehaviorsExplorerProvider implements vscode.WebviewViewProvider {
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
        this.navigateToBehaviorSource(msg.name);
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

  private navigateToBehaviorSource(traitType: string): void {
    const pattern = traitType.startsWith('dungeo.')
      ? 'stories/**/src/**/*.ts'
      : '{packages/world-model,packages/stdlib,stories}/**/*.ts';
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

    const behaviors: BehaviorEntry[] = (data as any).behaviors ?? [];
    const caps = behaviors.filter(b => b.kind === 'capability').sort((a, b) => a.traitType.localeCompare(b.traitType));
    const ints = behaviors.filter(b => b.kind === 'interceptor').sort((a, b) => a.traitType.localeCompare(b.traitType));

    // Capability behaviors section
    const capRows = caps.map(b => this.renderBehaviorRow(b)).join('');
    const capSection = caps.length > 0 ? `<details class="group">
  <summary class="group-header">Capability Behaviors <span class="count">(${caps.length})</span></summary>
  <table class="behavior-table">
    <thead><tr><th>Trait</th><th>Action</th><th>Phases</th></tr></thead>
    <tbody>${capRows}</tbody>
  </table>
</details>` : '';

    // Interceptors section
    const intRows = ints.map(b => this.renderBehaviorRow(b)).join('');
    const intSection = ints.length > 0 ? `<details class="group">
  <summary class="group-header int-header">Interceptors <span class="count">(${ints.length})</span></summary>
  <table class="behavior-table">
    <thead><tr><th>Trait</th><th>Action</th><th>Phases</th></tr></thead>
    <tbody>${intRows}</tbody>
  </table>
</details>` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${behaviors.length} bindings</span>
  <span>${caps.length} capabilities</span>
  <span>${ints.length} interceptors</span>
</div>

${capSection}
${intSection}

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
   * Renders a single behavior binding as a table row.
   */
  private renderBehaviorRow(behavior: BehaviorEntry): string {
    const shortTrait = behavior.traitType.replace(/^dungeo\.trait\./, '');
    const shortAction = behavior.actionId.replace(/^if\.action\./, '').replace(/^if\.scope\./, 'scope:');

    const phaseLabels: Record<string, string> = {
      validate: 'V', execute: 'X', report: 'R', blocked: 'B',
      preValidate: 'pre', postValidate: 'post', postExecute: 'exec',
    };

    const phasesHtml = behavior.phases
      .map(p => {
        const label = phaseLabels[p] ?? p;
        const cls = behavior.kind === 'capability' ? 'phase cap' : 'phase int';
        return `<span class="${cls}" title="${this.esc(p)}">${this.esc(label)}</span>`;
      })
      .join(' ');

    return `<tr>
  <td><a class="trait-link" data-navigate="${this.esc(behavior.traitType)}">${this.esc(shortTrait)}</a></td>
  <td class="action-col">${this.esc(shortAction)}</td>
  <td class="phases-col">${phasesHtml}</td>
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
      .int-header {
        border-left-color: var(--vscode-editorWarning-foreground);
      }
      .count { font-weight: 400; opacity: 0.6; }

      .behavior-table {
        width: 100%; border-collapse: collapse;
        font-size: 0.88em; margin: 2px 0 6px;
      }
      .behavior-table th {
        text-align: left; padding: 2px 6px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 600; font-size: 0.85em;
        opacity: 0.7; text-transform: uppercase;
        white-space: nowrap;
      }
      .behavior-table td {
        padding: 2px 6px; vertical-align: top;
        border-bottom: 1px solid var(--vscode-panel-border, transparent);
      }
      .behavior-table tr:hover td {
        background: var(--vscode-list-hoverBackground);
      }

      .trait-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer; text-decoration: none; font-weight: 500;
        font-family: var(--vscode-editor-font-family);
        white-space: nowrap;
      }
      .trait-link:hover { text-decoration: underline; }

      .action-col {
        font-family: var(--vscode-editor-font-family);
        white-space: nowrap;
      }

      .phases-col { white-space: nowrap; }
      .phase {
        display: inline-block; padding: 1px 5px; margin: 1px 1px;
        border-radius: 3px; font-size: 0.85em;
        font-family: var(--vscode-editor-font-family);
        font-weight: 600;
      }
      .phase.cap {
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
      }
      .phase.int {
        border: 1px solid var(--vscode-editorWarning-foreground);
        color: var(--vscode-editorWarning-foreground);
      }

      details > summary { list-style: revert; }
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
