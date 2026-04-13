/**
 * Webview panel manager for Sharpee reference panels.
 *
 * Opens, reveals, and tracks named WebviewPanel instances.
 * Handles disposal and provides a message-passing bridge
 * between the extension host and the webview content.
 *
 * Public interface: PanelManager
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';

/** Configuration for creating a panel. */
export interface PanelConfig {
  /** Unique panel identifier (used as viewType). */
  id: string;
  /** Human-readable title shown in the tab. */
  title: string;
  /** HTML content to render. */
  html: string;
  /** Which editor column to open in. */
  column?: vscode.ViewColumn;
}

/**
 * Manages lifecycle of webview panels. Re-reveals existing panels
 * instead of creating duplicates. Tracks disposal so stale
 * references are cleaned up.
 */
export class PanelManager {
  private panels = new Map<string, vscode.WebviewPanel>();

  /**
   * Opens a panel or reveals it if already open.
   * Updates the HTML content either way.
   *
   * @param config - Panel configuration
   * @returns The webview panel instance
   */
  open(config: PanelConfig): vscode.WebviewPanel {
    const existing = this.panels.get(config.id);
    if (existing) {
      existing.webview.html = config.html;
      existing.reveal(config.column ?? vscode.ViewColumn.One);
      return existing;
    }

    const panel = vscode.window.createWebviewPanel(
      config.id,
      config.title,
      config.column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = config.html;

    panel.onDidDispose(() => {
      this.panels.delete(config.id);
    });

    this.panels.set(config.id, panel);
    return panel;
  }

  /**
   * Updates the HTML content of an existing panel without changing focus.
   * No-op if the panel is not open.
   *
   * @param id - Panel identifier
   * @param html - New HTML content
   */
  update(id: string, html: string): void {
    const panel = this.panels.get(id);
    if (panel) {
      panel.webview.html = html;
    }
  }

  /**
   * Returns true if the named panel is currently open.
   */
  isOpen(id: string): boolean {
    return this.panels.has(id);
  }

  /** Disposes all managed panels. */
  dispose(): void {
    for (const panel of this.panels.values()) {
      panel.dispose();
    }
    this.panels.clear();
  }
}
