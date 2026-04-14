/**
 * Shared source navigation utility for Sharpee index panels.
 *
 * Uses VS Code's workspace search commands to find text in source
 * files and navigate to the first match. Avoids shelling out to
 * grep, which triggers SonarQube PATH security warnings.
 *
 * Public interface: navigateToSource()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';

/**
 * Opens the VS Code search panel scoped to matching files, with the
 * query pre-filled and search triggered automatically. The query is
 * used exactly as provided — callers should include surrounding quotes
 * (e.g., `'West of House'`) to avoid false positives from comments.
 *
 * @param query - The text to search for (literal string, include quotes to be precise)
 * @param includePattern - Glob pattern to scope the search (e.g., "stories/** /*.ts")
 */
export function navigateToSource(
  query: string,
  includePattern: string,
): void {
  vscode.commands.executeCommand('workbench.action.findInFiles', {
    query,
    filesToInclude: includePattern,
    triggerSearch: true,
    isCaseSensitive: true,
  });
}
