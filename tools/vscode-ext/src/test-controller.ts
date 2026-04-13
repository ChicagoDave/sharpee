/**
 * Native Test Explorer integration for Sharpee transcript tests.
 *
 * Discovers all .transcript files in the workspace, creates TestItems
 * per file and per [GOAL: ...] block, and runs them via the CLI.
 * Supports watch mode (re-run on save) and re-run-failures.
 *
 * Public interface: createSharpeeTestController()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import { runTranscriptTest } from './test-runner';

/** Parses a transcript file to extract GOAL blocks as child test items. */
function parseGoals(
  document: vscode.TextDocument,
  parent: vscode.TestItem,
  controller: vscode.TestController,
): void {
  // Clear existing children
  parent.children.forEach(child => parent.children.delete(child.id));

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i).text;
    const match = line.match(/^\s*\[GOAL:\s*(.+?)\]/);
    if (match) {
      const goalName = match[1];
      const goalId = `${parent.id}::goal::${i}`;
      const goalItem = controller.createTestItem(goalId, goalName, parent.uri);
      goalItem.range = new vscode.Range(i, 0, i, line.length);
      parent.children.add(goalItem);
    }
  }
}

/** Discovers transcript files and builds the test tree. */
async function discoverTests(
  controller: vscode.TestController,
  pattern: vscode.RelativePattern | string,
): Promise<void> {
  const files = await vscode.workspace.findFiles(
    pattern instanceof vscode.RelativePattern ? pattern : new vscode.RelativePattern(vscode.workspace.workspaceFolders![0], pattern),
    '**/node_modules/**',
  );

  for (const uri of files) {
    await addTestFile(controller, uri);
  }
}

/** Adds a single transcript file to the test tree. */
async function addTestFile(
  controller: vscode.TestController,
  uri: vscode.Uri,
): Promise<vscode.TestItem> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  const relativePath = workspaceFolder
    ? vscode.workspace.asRelativePath(uri, false)
    : uri.fsPath;

  // Check if item already exists
  let existing: vscode.TestItem | undefined;
  controller.items.forEach(item => {
    if (item.uri?.toString() === uri.toString()) {
      existing = item;
    }
  });
  if (existing) return existing;

  const item = controller.createTestItem(uri.toString(), relativePath, uri);
  item.canResolveChildren = true;
  controller.items.add(item);

  // Parse goals as children
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    parseGoals(document, item, controller);
  } catch {
    // File may not be readable yet
  }

  return item;
}

/** Removes a transcript file from the test tree. */
function removeTestFile(controller: vscode.TestController, uri: vscode.Uri): void {
  controller.items.forEach(item => {
    if (item.uri?.toString() === uri.toString()) {
      controller.items.delete(item.id);
    }
  });
}

/**
 * Runs transcript tests for the given test items.
 *
 * @param controller - The test controller
 * @param request - The test run request (which items to run)
 * @param token - Cancellation token
 */
async function runTests(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
): Promise<void> {
  const run = controller.createTestRun(request);

  // Collect the file-level items to run
  const itemsToRun: vscode.TestItem[] = [];

  if (request.include) {
    for (const item of request.include) {
      // If it's a goal child, run the parent file
      if (item.parent) {
        if (!itemsToRun.find(i => i.id === item.parent!.id)) {
          itemsToRun.push(item.parent);
        }
      } else {
        itemsToRun.push(item);
      }
    }
  } else {
    // Run all
    controller.items.forEach(item => itemsToRun.push(item));
  }

  for (const fileItem of itemsToRun) {
    if (token.isCancellationRequested) break;

    if (!fileItem.uri) continue;

    // Mark file and children as running
    run.started(fileItem);
    fileItem.children.forEach(child => run.started(child));

    try {
      const document = await vscode.workspace.openTextDocument(fileItem.uri);
      const result = await runTranscriptTest(document);

      if (token.isCancellationRequested) break;

      // Build a map of goal line ranges to results
      const goalResults = new Map<number, { passed: number; failed: number; messages: vscode.TestMessage[] }>();

      // Track which goal range each command falls into
      const goalRanges: { line: number; item: vscode.TestItem }[] = [];
      fileItem.children.forEach(child => {
        if (child.range) {
          goalRanges.push({ line: child.range.start.line, item: child });
        }
      });
      goalRanges.sort((a, b) => a.line - b.line);

      // Initialize goal results
      for (const gr of goalRanges) {
        goalResults.set(gr.line, { passed: 0, failed: 0, messages: [] });
      }

      // Assign command results to goals
      let fileHasFailure = false;
      for (const cmd of result.commands) {
        if (cmd.line < 0) continue;

        // Find which goal this command belongs to
        let goalLine = -1;
        for (let i = goalRanges.length - 1; i >= 0; i--) {
          if (cmd.line >= goalRanges[i].line) {
            goalLine = goalRanges[i].line;
            break;
          }
        }

        if (!cmd.passed) {
          fileHasFailure = true;
          if (goalLine >= 0) {
            const gr = goalResults.get(goalLine)!;
            gr.failed++;
            const msg = new vscode.TestMessage(cmd.failureMessage || `> ${cmd.command} — FAIL`);
            msg.location = new vscode.Location(fileItem.uri!, new vscode.Position(cmd.line, 0));
            gr.messages.push(msg);
          }
        } else {
          if (goalLine >= 0) {
            goalResults.get(goalLine)!.passed++;
          }
        }
      }

      // Report goal-level results
      for (const gr of goalRanges) {
        const stats = goalResults.get(gr.line)!;
        if (stats.failed > 0) {
          run.failed(gr.item, stats.messages, result.durationMs);
        } else if (stats.passed > 0) {
          run.passed(gr.item, result.durationMs);
        } else {
          run.skipped(gr.item);
        }
      }

      // Report file-level result
      if (result.error) {
        const msg = new vscode.TestMessage(result.error);
        run.errored(fileItem, msg);
      } else if (fileHasFailure) {
        const failMsgs = result.commands
          .filter(c => !c.passed && c.line >= 0)
          .map(c => {
            const msg = new vscode.TestMessage(c.failureMessage || `> ${c.command} — FAIL`);
            msg.location = new vscode.Location(fileItem.uri!, new vscode.Position(c.line, 0));
            return msg;
          });
        run.failed(fileItem, failMsgs, result.durationMs);
      } else {
        run.passed(fileItem, result.durationMs);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      run.errored(fileItem, new vscode.TestMessage(message));
    }
  }

  run.end();
}

/**
 * Creates and configures the Sharpee test controller.
 * Discovers transcript files, sets up file watchers, and registers
 * the run handler.
 *
 * @param context - The extension context for disposable management
 * @returns The created test controller
 */
export function createSharpeeTestController(
  context: vscode.ExtensionContext,
): vscode.TestController {
  const controller = vscode.tests.createTestController(
    'sharpee-transcripts',
    'Sharpee Transcripts',
  );

  // Resolve handler — lazily parse goals when a test item is expanded
  controller.resolveHandler = async (item) => {
    if (!item) {
      // Root resolve — discover all transcript files
      await discoverTests(controller, '**/*.transcript');
      return;
    }

    // Item resolve — parse goals for a specific file
    if (item.uri) {
      try {
        const document = await vscode.workspace.openTextDocument(item.uri);
        parseGoals(document, item, controller);
      } catch {
        // File may not be readable
      }
    }
  };

  // Run handler
  controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => runTests(controller, request, token),
    true, // isDefault
  );

  // File watcher — discover new transcripts, remove deleted ones, re-parse changed ones
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.transcript');

  watcher.onDidCreate(async (uri) => {
    await addTestFile(controller, uri);
  });

  watcher.onDidDelete((uri) => {
    removeTestFile(controller, uri);
  });

  // Debounced re-parse on change (watch mode)
  let changeTimer: ReturnType<typeof setTimeout> | undefined;
  watcher.onDidChange((uri) => {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(async () => {
      // Re-parse goals for the changed file
      const item = findTestItem(controller, uri);
      if (item) {
        try {
          const document = await vscode.workspace.openTextDocument(uri);
          parseGoals(document, item, controller);
        } catch {
          // Ignore
        }
      }
    }, 500);
  });

  // Initial discovery
  discoverTests(controller, '**/*.transcript');

  context.subscriptions.push(controller, watcher);

  return controller;
}

/** Finds a TestItem by its URI. */
function findTestItem(
  controller: vscode.TestController,
  uri: vscode.Uri,
): vscode.TestItem | undefined {
  let found: vscode.TestItem | undefined;
  controller.items.forEach(item => {
    if (item.uri?.toString() === uri.toString()) {
      found = item;
    }
  });
  return found;
}
