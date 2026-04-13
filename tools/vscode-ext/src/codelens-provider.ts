/**
 * CodeLens provider for transcript files.
 *
 * Places "Run Transcript" above the first command line and
 * "Run Goal" above each [GOAL: ...] directive.
 *
 * Public interface: TranscriptCodeLensProvider
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';

/** Command ID for running a transcript test from CodeLens. */
export const RUN_TRANSCRIPT_COMMAND = 'sharpee.runTranscript';

/**
 * Provides CodeLens actions for transcript files.
 *
 * - "Run Transcript" above the first `> ` command
 * - "Run Goal" above each `[GOAL: ...]` directive
 */
export class TranscriptCodeLensProvider implements vscode.CodeLensProvider {
  private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  /** Triggers a refresh of all CodeLenses. */
  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const lenses: vscode.CodeLens[] = [];
    let firstCommandFound = false;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;

      // "Run Transcript" above the first command
      if (!firstCommandFound && line.match(/^\s*>\s+/)) {
        firstCommandFound = true;
        const range = new vscode.Range(i, 0, i, line.length);
        lenses.push(new vscode.CodeLens(range, {
          title: '$(play) Run Transcript',
          command: RUN_TRANSCRIPT_COMMAND,
          arguments: [document.uri],
          tooltip: 'Run this transcript test with the Sharpee CLI',
        }));
      }

      // "Run Goal" above each GOAL directive
      const goalMatch = line.match(/^\s*\[GOAL:\s*(.+?)\]/);
      if (goalMatch) {
        const goalName = goalMatch[1];
        const range = new vscode.Range(i, 0, i, line.length);
        lenses.push(new vscode.CodeLens(range, {
          title: `$(beaker) Run Goal: ${goalName}`,
          command: RUN_TRANSCRIPT_COMMAND,
          arguments: [document.uri],
          tooltip: `Run full transcript (goal: ${goalName})`,
        }));
      }
    }

    return lenses;
  }
}
