/**
 * Language Index sidebar webview for Sharpee stories.
 *
 * Displays all registered message IDs and their text from the
 * --world-json introspection output, grouped by namespace prefix.
 * Distinguishes platform messages from story-specific overrides.
 *
 * Public interface: LanguageExplorerProvider, REFRESH_LANGUAGE_COMMAND
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import type { WorldExplorerProvider } from './world-explorer';

// ---------------------------------------------------------------------------
// Command IDs
// ---------------------------------------------------------------------------

/** Command ID for refreshing the language explorer. */
export const REFRESH_LANGUAGE_COMMAND = 'sharpee.refreshLanguageExplorer';

// ---------------------------------------------------------------------------
// Types (from --world-json introspection)
// ---------------------------------------------------------------------------

interface MessageEntry {
  id: string;
  text: string;
  source: 'platform' | 'story';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Sidebar webview provider that renders the Language Index as HTML.
 * Reads cached world data from the WorldExplorerProvider.
 */
export class LanguageExplorerProvider implements vscode.WebviewViewProvider {
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
        this.navigateToMessageSource(msg.name);
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

  private navigateToMessageSource(messageId: string): void {
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!ws) return;

    // Determine search scope from message ID prefix
    const searchDirs = messageId.startsWith('if.') || messageId.startsWith('core.') || messageId.startsWith('game.') || messageId.startsWith('npc.')
      ? ['packages/lang-en-us/', 'packages/stdlib/']
      : ['stories/'];

    for (const dir of searchDirs) {
      try {
        const result = cp.execFileSync(
          'grep',
          ['-rn', '--include=*.ts', '-m', '1', '-F', messageId, dir],
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
        // try next dir
      }
    }

    vscode.commands.executeCommand('workbench.action.findInFiles', {
      query: messageId,
      filesToInclude: '{packages,stories}/**/*.ts',
      triggerSearch: true,
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

    const messages: MessageEntry[] = (data as any).messages ?? [];
    const platform = messages.filter(m => m.source === 'platform');
    const story = messages.filter(m => m.source === 'story');

    // Group by namespace prefix (first two segments of the ID)
    const groupByPrefix = (msgs: MessageEntry[]): Map<string, MessageEntry[]> => {
      const groups = new Map<string, MessageEntry[]>();
      for (const msg of msgs) {
        const parts = msg.id.split('.');
        const prefix = parts.length >= 3 ? `${parts[0]}.${parts[1]}` : parts[0];
        const group = groups.get(prefix) ?? [];
        group.push(msg);
        groups.set(prefix, group);
      }
      return groups;
    };

    const platformGroups = groupByPrefix(platform);
    const storyGroups = groupByPrefix(story);

    // Build platform sections
    const platformSections = [...platformGroups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([prefix, msgs]) => {
        const rows = msgs
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(m => this.renderMessageRow(m, prefix))
          .join('');
        return `<details class="group">
  <summary class="group-header">${this.esc(prefix)} <span class="count">(${msgs.length})</span></summary>
  <table class="msg-table">
    <thead><tr><th>ID</th><th>Text</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</details>`;
      })
      .join('');

    // Build story sections
    const storySections = [...storyGroups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([prefix, msgs]) => {
        const rows = msgs
          .sort((a, b) => a.id.localeCompare(b.id))
          .map(m => this.renderMessageRow(m, prefix))
          .join('');
        return `<details class="group">
  <summary class="group-header story-header">${this.esc(prefix)} <span class="count">(${msgs.length})</span></summary>
  <table class="msg-table">
    <thead><tr><th>ID</th><th>Text</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</details>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>${this.baseStyles()}</style>
</head><body>
<div class="stats">
  <span>${messages.length} messages</span>
  <span>${platform.length} platform</span>
  <span>${story.length} story</span>
  <span>${platformGroups.size + storyGroups.size} namespaces</span>
</div>

<h3 class="section-title">Platform Messages</h3>
${platformSections}

${storySections.length > 0 ? '<h3 class="section-title">Story Messages</h3>' : ''}
${storySections}

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
   * Renders a single message as a table row.
   */
  private renderMessageRow(msg: MessageEntry, prefix: string): string {
    // Strip common prefix for compact display
    const shortId = msg.id.startsWith(prefix + '.')
      ? msg.id.substring(prefix.length + 1)
      : msg.id;

    // Truncate long text and escape template variables
    const displayText = msg.text.length > 120
      ? msg.text.substring(0, 120) + '...'
      : msg.text;

    return `<tr>
  <td><a class="msg-link" data-navigate="${this.esc(msg.id)}" title="${this.esc(msg.id)}">${this.esc(shortId)}</a></td>
  <td class="text-col" title="${this.esc(msg.text)}">${this.esc(displayText)}</td>
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

      .msg-table {
        width: 100%; border-collapse: collapse;
        font-size: 0.85em; margin: 2px 0 6px;
      }
      .msg-table th {
        text-align: left; padding: 2px 6px;
        border-bottom: 1px solid var(--vscode-panel-border);
        font-weight: 600; font-size: 0.85em;
        opacity: 0.7; text-transform: uppercase;
        white-space: nowrap;
      }
      .msg-table td {
        padding: 2px 6px; vertical-align: top;
        border-bottom: 1px solid var(--vscode-panel-border, transparent);
      }
      .msg-table tr:hover td {
        background: var(--vscode-list-hoverBackground);
      }

      .msg-link {
        color: var(--vscode-textLink-foreground);
        cursor: pointer; text-decoration: none;
        font-family: var(--vscode-editor-font-family);
        font-size: 0.95em; white-space: nowrap;
      }
      .msg-link:hover { text-decoration: underline; }

      .text-col {
        color: var(--vscode-sideBar-foreground, var(--vscode-foreground));
        opacity: 0.8;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      details > summary { list-style: revert; }
    `;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
