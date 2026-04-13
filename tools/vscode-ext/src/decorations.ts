/**
 * Gutter decorations for pass/fail indicators on transcript commands.
 *
 * After a test run, applies green/red circle decorations in the gutter
 * next to each command line based on the test results.
 *
 * Public interface: applyDecorations(), clearDecorations(), passDecorationType, failDecorationType
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import type { CommandResult } from './test-runner';

/** Green circle gutter decoration for passing commands. */
export const passDecorationType = vscode.window.createTextEditorDecorationType({
  gutterIconPath: undefined,
  overviewRulerColor: new vscode.ThemeColor('testing.iconPassed'),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  light: {
    after: {
      contentText: '',
    },
  },
  dark: {
    after: {
      contentText: '',
    },
  },
  // Use a colored dot in the gutter via a unicode character
  before: {
    contentText: '\u25CF',
    color: new vscode.ThemeColor('testing.iconPassed'),
    margin: '0 4px 0 0',
    fontWeight: 'bold',
  },
});

/** Red circle gutter decoration for failing commands. */
export const failDecorationType = vscode.window.createTextEditorDecorationType({
  gutterIconPath: undefined,
  overviewRulerColor: new vscode.ThemeColor('testing.iconFailed'),
  overviewRulerLane: vscode.OverviewRulerLane.Left,
  before: {
    contentText: '\u25CF',
    color: new vscode.ThemeColor('testing.iconFailed'),
    margin: '0 4px 0 0',
    fontWeight: 'bold',
  },
});

/**
 * Applies pass/fail gutter decorations to the active editor.
 *
 * @param editor - The editor showing the transcript file
 * @param results - Command results from the test run
 */
export function applyDecorations(
  editor: vscode.TextEditor,
  results: CommandResult[],
): void {
  const passRanges: vscode.DecorationOptions[] = [];
  const failRanges: vscode.DecorationOptions[] = [];

  for (const result of results) {
    if (result.line < 0) continue;

    const range = new vscode.Range(result.line, 0, result.line, 0);

    if (result.passed) {
      passRanges.push({ range });
    } else {
      failRanges.push({
        range,
        hoverMessage: result.failureMessage
          ? new vscode.MarkdownString(`**Failed:** ${result.failureMessage}`)
          : new vscode.MarkdownString('**Failed**'),
      });
    }
  }

  editor.setDecorations(passDecorationType, passRanges);
  editor.setDecorations(failDecorationType, failRanges);
}

/**
 * Clears all pass/fail decorations from the editor.
 *
 * @param editor - The editor to clear decorations from
 */
export function clearDecorations(editor: vscode.TextEditor): void {
  editor.setDecorations(passDecorationType, []);
  editor.setDecorations(failDecorationType, []);
}
