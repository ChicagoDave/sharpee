/**
 * Sharpee VS Code Extension — entry point.
 *
 * Registers the transcript hover provider, CodeLens provider,
 * test runner command, diagnostics, and gutter decorations for
 * the sharpee-transcript language. Activated when a .transcript
 * file is opened.
 *
 * Public interface: activate(), deactivate()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { TranscriptCodeLensProvider, RUN_TRANSCRIPT_COMMAND } from './codelens-provider';
import { runTranscriptTest, TestResult } from './test-runner';
import { handleNewStory, NEW_STORY_COMMAND } from './new-story-wizard';
import { createSharpeeTestController } from './test-controller';
import {
  SharpeeTaskProvider,
  BUILD_STORY_COMMAND,
  PLAY_STORY_COMMAND,
  PLAY_IN_BROWSER_COMMAND,
  handleBuildStory,
  handlePlayStory,
  handlePlayInBrowser,
  onBuildDone,
} from './build-provider';
import { WorldExplorerProvider, REFRESH_WORLD_COMMAND } from './world-explorer';
import { SharpeeCompletionProvider } from './entity-completions';
import { applyDecorations, clearDecorations, passDecorationType, failDecorationType } from './decorations';

// ---------------------------------------------------------------------------
// Hover documentation
// ---------------------------------------------------------------------------

/** Assertion syntax documentation shown in hover tooltips. */
const ASSERTION_DOCS: Record<string, string> = {
  'OK': [
    '**[OK: matcher "value"]** — Assert the last command output matches.',
    '',
    'Matchers:',
    '- `contains "text"` — output includes the text',
    '- `not contains "text"` — output does NOT include the text',
    '- `contains_any "a" "b"` — output includes at least one of the strings',
    '- `matches /regex/` — output matches the regular expression',
  ].join('\n'),

  'EVENT': [
    '**[EVENT: true|false, type="event.id"]** — Assert an event was (or was not) emitted.',
    '',
    'Parameters:',
    '- `true` / `false` — whether the event should exist',
    '- `type="if.event.pushed"` — the event type ID to check',
    '- `messageId="msg.id"` — (optional) assert the event\'s messageId',
    '- `blocked=true` — (optional) assert the event was blocked',
  ].join('\n'),

  'STATE': [
    '**[STATE: true|false, expression]** — Assert on world state after the command.',
    '',
    'Expression format: `entityId.property = value` or `entityId.location = roomId`',
    '',
    'Example: `[STATE: true, y08.location = r06]`',
  ].join('\n'),

  'ENSURES': [
    '**[ENSURES: condition]** — Postcondition that must hold after the enclosing GOAL.',
    '',
    'Conditions:',
    '- `location = "Room Name"` — player is in the named room',
    '- `not location = "Room Name"` — player is NOT in the named room',
    '- `inventory contains "item"` — player has the item',
    '- `not inventory contains "item"` — player does NOT have the item',
    '- `not entity "name" alive` — the named entity is dead',
    '- `output contains "text"` — last output includes the text',
  ].join('\n'),

  'REQUIRES': [
    '**[REQUIRES: condition]** — Precondition that must hold before the enclosing block executes.',
    '',
    'Same condition syntax as ENSURES.',
  ].join('\n'),

  'FAIL': '**[FAIL]** — Marks the preceding command as expected to fail. The test passes if the command produces an error.',
  'SKIP': '**[SKIP]** — Skips assertion checking for the preceding command. Useful inside loops where output varies.',
  'TODO': '**[TODO]** — Marks an assertion as not yet implemented. The test runner reports it but does not fail.',
};

/** Directive syntax documentation shown in hover tooltips. */
const DIRECTIVE_DOCS: Record<string, string> = {
  'GOAL': [
    '**[GOAL: label]** — Named test section with optional postconditions.',
    '',
    'Use `[ENSURES: condition]` after the GOAL line to set postconditions.',
    'Close with `[END GOAL]`.',
  ].join('\n'),

  'IF': [
    '**[IF: condition]** — Conditional block. Commands inside only execute if the condition is true.',
    '',
    'Conditions: `location = "Room"`, `inventory contains "item"`, `room contains "item"`',
    'Close with `[END IF]`.',
  ].join('\n'),

  'WHILE': [
    '**[WHILE: condition]** — Loop block. Repeats commands until the condition becomes false.',
    '',
    'Same condition syntax as IF.',
    'Close with `[END WHILE]`.',
  ].join('\n'),

  'RETRY': [
    '**[RETRY: max=N]** — Retry block for non-deterministic actions (e.g., combat).',
    '',
    'Wraps a `[DO]...[UNTIL]` loop. If the UNTIL condition is not met after N attempts,',
    'the game state is restored and the block retries from the beginning.',
    'Close with `[END RETRY]`.',
  ].join('\n'),

  'DO': [
    '**[DO]** — Marks the start of a do/until loop inside a RETRY block.',
    '',
    'Commands between `[DO]` and `[UNTIL]` repeat until the UNTIL condition matches.',
  ].join('\n'),

  'UNTIL': [
    '**[UNTIL "text" OR "text"]** — End of a do/until loop.',
    '',
    'The loop ends when the command output contains any of the quoted strings.',
  ].join('\n'),

  'NAVIGATE TO': [
    '**[NAVIGATE TO: "Room Name"]** — Automatically navigate to the named room.',
    '',
    'The test runner uses pathfinding to issue movement commands.',
    'Fails if the room is unreachable from the current location.',
  ].join('\n'),
};

/** Returns documentation for annotation commands. */
function getAnnotationDoc(cmd: string): string | null {
  const docs: Record<string, string> = {
    'session': '**$session start|end [name]** — Start or end a named playtest session. Sessions group annotations for export.',
    'bookmark': '**$bookmark name** — Save a named checkpoint. Can be restored with `$restore name`.',
    'save': '**$save name** — Save the current game state with a name.',
    'restore': '**$restore name** — Restore a previously saved game state.',
    'note': '**$note text** — Record a playtester note attached to the current game context.',
    'bug': '**$bug text** — Report a bug at the current game position.',
    'confusing': '**$confusing** — Flag the last command/output as confusing to the playtester.',
    'expected': '**$expected text** — Record what the playtester expected to happen.',
    'review': '**$review** — Show all annotations collected in the current session.',
    'export': '**$export** — Export all session annotations as a formatted report.',
    'teleport': '**$teleport room** — (GDT) Teleport the player to a room. Avoid in walkthroughs.',
    'gdt': '**$gdt** — Enter Game Debugging Tool mode.',
    'tk': '**$tk item** — (GDT) Take an item directly into inventory.',
    'ah': '**$ah room** — (GDT) Teleport to a room by name.',
    'kill': '**$kill entity** — (GDT) Kill an entity.',
    'ex': '**$ex** — (GDT) Exit Game Debugging Tool mode.',
  };
  return docs[cmd] ?? null;
}

/**
 * Provides hover tooltips for assertion and directive syntax in transcript files.
 */
class TranscriptHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position).text;

    // Match assertions
    const assertionMatch = line.match(/\[(OK|EVENT|STATE|ENSURES|REQUIRES|FAIL|SKIP|TODO)\b/);
    if (assertionMatch) {
      const doc = ASSERTION_DOCS[assertionMatch[1]];
      if (doc) {
        return new vscode.Hover(new vscode.MarkdownString(doc));
      }
    }

    // Match directives
    const directiveMatch = line.match(/\[(GOAL|IF|WHILE|RETRY|DO|UNTIL|NAVIGATE TO|END\s+\w+)\b/);
    if (directiveMatch) {
      let keyword = directiveMatch[1];
      if (keyword.startsWith('END ')) {
        keyword = keyword.replace('END ', '');
      }
      const doc = DIRECTIVE_DOCS[keyword];
      if (doc) {
        return new vscode.Hover(new vscode.MarkdownString(doc));
      }
    }

    // Match annotation commands
    const annotationMatch = line.match(/^\s*\$(\S+)/);
    if (annotationMatch) {
      const doc = getAnnotationDoc(annotationMatch[1]);
      if (doc) {
        return new vscode.Hover(new vscode.MarkdownString(doc));
      }
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------------

/** Status bar item showing test results. */
let statusBarItem: vscode.StatusBarItem;

/** Diagnostic collection for transcript test failures. */
let diagnosticCollection: vscode.DiagnosticCollection;

/** CodeLens provider instance (for refresh on test completion). */
let codeLensProvider: TranscriptCodeLensProvider;

/** Output channel for full test output. */
let outputChannel: vscode.OutputChannel;

/**
 * Applies diagnostics to the Problems panel from test results.
 *
 * @param result - The test result to create diagnostics from
 */
function applyDiagnostics(result: TestResult): void {
  const uri = vscode.Uri.file(result.filePath);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const cmd of result.commands) {
    if (!cmd.passed && cmd.line >= 0) {
      const range = new vscode.Range(cmd.line, 0, cmd.line, 1000);
      const message = cmd.failureMessage || `Command failed: > ${cmd.command}`;
      const diag = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
      diag.source = 'sharpee-transcript';
      diagnostics.push(diag);
    }
  }

  diagnosticCollection.set(uri, diagnostics);
}

/**
 * Updates the status bar with test results.
 *
 * @param result - The test result to display
 */
function updateStatusBar(result: TestResult): void {
  if (result.error) {
    statusBarItem.text = `$(error) Sharpee: ${result.error}`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else if (result.failCount > 0) {
    statusBarItem.text = `$(testing-failed-icon) Sharpee: ${result.passCount} passing, ${result.failCount} failing (${result.durationMs}ms)`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else {
    statusBarItem.text = `$(testing-passed-icon) Sharpee: ${result.passCount} passing (${result.durationMs}ms)`;
    statusBarItem.backgroundColor = undefined;
  }
  statusBarItem.show();
}

/**
 * Handles the "Run Transcript" command. Runs the test, applies
 * decorations, diagnostics, and updates the status bar.
 *
 * @param uri - The URI of the transcript file to test
 */
async function handleRunTranscript(uri?: vscode.Uri): Promise<void> {
  // Resolve the document to test
  const targetUri = uri ?? vscode.window.activeTextEditor?.document.uri;
  if (!targetUri) {
    vscode.window.showWarningMessage('No transcript file is open.');
    return;
  }

  const document = await vscode.workspace.openTextDocument(targetUri);
  if (document.languageId !== 'sharpee-transcript') {
    vscode.window.showWarningMessage('The active file is not a .transcript file.');
    return;
  }

  // Show progress
  statusBarItem.text = '$(loading~spin) Sharpee: Running...';
  statusBarItem.backgroundColor = undefined;
  statusBarItem.show();

  // Clear previous results
  diagnosticCollection.delete(targetUri);
  const editor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === targetUri.toString());
  if (editor) {
    clearDecorations(editor);
  }

  // Run the test
  outputChannel.clear();
  outputChannel.appendLine(`Running: ${document.uri.fsPath}`);
  outputChannel.appendLine('');

  const result = await runTranscriptTest(document);

  // Show raw output
  outputChannel.appendLine(result.rawOutput);
  if (result.error) {
    outputChannel.appendLine(`Error: ${result.error}`);
  }

  // Apply results
  updateStatusBar(result);
  applyDiagnostics(result);

  // Apply gutter decorations to the editor if it's still visible
  const currentEditor = vscode.window.visibleTextEditors.find(
    e => e.document.uri.toString() === targetUri.toString()
  );
  if (currentEditor) {
    applyDecorations(currentEditor, result.commands);
  }

  // Refresh CodeLenses
  codeLensProvider.refresh();

  // Show output channel on failure
  if (!result.success) {
    outputChannel.show(true);
  }
}

/** Activates the extension. Registers all providers and commands. */
export function activate(context: vscode.ExtensionContext): void {
  const selector: vscode.DocumentSelector = { language: 'sharpee-transcript' };

  // Output channel
  outputChannel = vscode.window.createOutputChannel('Sharpee Tests');

  // Diagnostics
  diagnosticCollection = vscode.languages.createDiagnosticCollection('sharpee-transcript');

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = RUN_TRANSCRIPT_COMMAND;
  statusBarItem.tooltip = 'Click to run the current transcript test';

  // Hover provider
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(selector, new TranscriptHoverProvider()),
  );

  // CodeLens provider
  codeLensProvider = new TranscriptCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(selector, codeLensProvider),
  );

  // Run Transcript command
  context.subscriptions.push(
    vscode.commands.registerCommand(RUN_TRANSCRIPT_COMMAND, handleRunTranscript),
  );

  // New Story wizard command
  context.subscriptions.push(
    vscode.commands.registerCommand(NEW_STORY_COMMAND, handleNewStory),
  );

  // Test Explorer controller
  createSharpeeTestController(context);

  // Build & Play commands
  context.subscriptions.push(
    vscode.commands.registerCommand(BUILD_STORY_COMMAND, handleBuildStory),
    vscode.commands.registerCommand(PLAY_STORY_COMMAND, handlePlayStory),
    vscode.commands.registerCommand(PLAY_IN_BROWSER_COMMAND, handlePlayInBrowser),
  );

  // Build task provider
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(SharpeeTaskProvider.type, new SharpeeTaskProvider()),
  );

  // World Index sidebar webview
  const worldExplorer = new WorldExplorerProvider();
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('sharpee.worldExplorer', worldExplorer),
    vscode.commands.registerCommand(REFRESH_WORLD_COMMAND, () => worldExplorer.refresh()),
  );

  // Entity ID autocomplete in TypeScript story files
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: 'typescript' },
      new SharpeeCompletionProvider(worldExplorer),
      "'", '"', '`',
    ),
  );

  // Update status bar after builds and auto-refresh world explorer
  onBuildDone((success, storyId) => {
    if (success) {
      statusBarItem.text = `$(pass) Sharpee: Build OK (${storyId})`;
      statusBarItem.backgroundColor = undefined;
      // Auto-refresh world explorer after successful build
      worldExplorer.refresh();
    } else {
      statusBarItem.text = `$(error) Sharpee: Build failed (${storyId})`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    statusBarItem.show();
  });

  // Show status bar persistently — show build state or transcript state
  statusBarItem.text = '$(play) Sharpee: Ready';
  statusBarItem.show();

  // Update status bar context when switching editors
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'sharpee-transcript') {
        statusBarItem.command = RUN_TRANSCRIPT_COMMAND;
        statusBarItem.tooltip = 'Click to run the current transcript test';
      } else {
        statusBarItem.command = BUILD_STORY_COMMAND;
        statusBarItem.tooltip = 'Click to build the current story';
      }
    }),
  );

  // Clear diagnostics when a transcript file is edited
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId === 'sharpee-transcript') {
        diagnosticCollection.delete(e.document.uri);
        const editor = vscode.window.visibleTextEditors.find(
          ed => ed.document.uri.toString() === e.document.uri.toString()
        );
        if (editor) {
          clearDecorations(editor);
        }
        statusBarItem.text = '$(play) Sharpee: Ready';
        statusBarItem.backgroundColor = undefined;
      }
    }),
  );

  // Register disposables
  context.subscriptions.push(statusBarItem, diagnosticCollection, outputChannel);
}

/** Deactivates the extension. Disposes decoration types. */
export function deactivate(): void {
  passDecorationType.dispose();
  failDecorationType.dispose();
}
