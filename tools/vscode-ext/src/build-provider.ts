/**
 * Build & Play integration for Sharpee stories.
 *
 * Provides a VS Code task provider for building stories via ./build.sh,
 * commands for playing in terminal and browser, and story ID detection
 * from the workspace.
 *
 * Public interface: SharpeeTaskProvider, detectStoryIds(), resolveStoryId(),
 *   handleBuildStory(), handlePlayStory(), handlePlayInBrowser()
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/** Command IDs for build and play actions. */
export const BUILD_STORY_COMMAND = 'sharpee.buildStory';
export const PLAY_STORY_COMMAND = 'sharpee.playStory';
export const PLAY_IN_BROWSER_COMMAND = 'sharpee.playInBrowser';

/**
 * Detects story IDs by scanning the stories/ directory for subdirectories
 * that contain a package.json with a "sharpee" field.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns Array of story IDs (directory names)
 */
export function detectStoryIds(workspaceRoot: string): string[] {
  const storiesDir = path.join(workspaceRoot, 'stories');
  if (!fs.existsSync(storiesDir)) return [];

  return fs.readdirSync(storiesDir, { withFileTypes: true })
    .filter(entry => {
      if (!entry.isDirectory()) return false;
      const pkgPath = path.join(storiesDir, entry.name, 'package.json');
      if (!fs.existsSync(pkgPath)) return false;
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return !!pkg.sharpee;
      } catch {
        return false;
      }
    })
    .map(entry => entry.name);
}

/**
 * Resolves the story ID to use for build/play commands.
 * Checks config first, then auto-detects, then prompts the user.
 *
 * @returns Story ID string, or undefined if the user cancelled
 */
export async function resolveStoryId(): Promise<string | undefined> {
  const config = vscode.workspace.getConfiguration('sharpee');
  const configured = config.get<string>('storyId');
  if (configured) return configured;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Open a Sharpee workspace first.');
    return undefined;
  }

  const detected = detectStoryIds(workspaceFolder.uri.fsPath);
  if (detected.length === 0) {
    vscode.window.showErrorMessage('No stories found in stories/. Create one with "Sharpee: New Story".');
    return undefined;
  }

  if (detected.length === 1) return detected[0];

  // Multiple stories — let the user pick
  const picked = await vscode.window.showQuickPick(detected, {
    placeHolder: 'Select a story to build',
    title: 'Sharpee: Select Story',
  });
  return picked;
}

/**
 * Resolves the build script path from config.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns Absolute path to the build script
 */
function resolveBuildScript(workspaceRoot: string): string {
  const config = vscode.workspace.getConfiguration('sharpee');
  const relativePath = config.get<string>('buildScript', './build.sh');
  return path.join(workspaceRoot, relativePath);
}

// ---------------------------------------------------------------------------
// Task Provider
// ---------------------------------------------------------------------------

/**
 * Provides Sharpee build tasks to VS Code's task system.
 * Enables Ctrl+Shift+B to build the active story.
 */
export class SharpeeTaskProvider implements vscode.TaskProvider {
  static readonly type = 'sharpee';

  async provideTasks(): Promise<vscode.Task[]> {
    const storyId = await resolveStoryId();
    if (!storyId) return [];

    return [this.createBuildTask(storyId)];
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    const command = task.definition.command as string;
    if (command === 'build') {
      const storyId = task.definition.storyId as string;
      if (storyId) {
        return this.createBuildTask(storyId);
      }
    }
    return undefined;
  }

  private createBuildTask(storyId: string): vscode.Task {
    const workspaceFolder = vscode.workspace.workspaceFolders![0];
    const buildScript = resolveBuildScript(workspaceFolder.uri.fsPath);

    const definition: vscode.TaskDefinition = {
      type: SharpeeTaskProvider.type,
      command: 'build',
      storyId,
    };

    const execution = new vscode.ShellExecution(
      buildScript,
      ['-s', storyId],
      { cwd: workspaceFolder.uri.fsPath },
    );

    const task = new vscode.Task(
      definition,
      workspaceFolder,
      `Build ${storyId}`,
      'sharpee',
      execution,
      '$tsc',  // Use built-in TypeScript problem matcher
    );

    task.group = vscode.TaskGroup.Build;
    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Silent,
      panel: vscode.TaskPanelKind.Shared,
      clear: true,
    };

    return task;
  }
}

// ---------------------------------------------------------------------------
// Command handlers
// ---------------------------------------------------------------------------

/** Callback invoked after a build completes. Set by extension.ts. */
let onBuildComplete: ((success: boolean, storyId: string) => void) | undefined;

/**
 * Registers a callback for build completion events.
 *
 * @param callback - Called with (success, storyId) after a build finishes
 */
export function onBuildDone(callback: (success: boolean, storyId: string) => void): void {
  onBuildComplete = callback;
}

/**
 * Handles the "Build Story" command. Runs ./build.sh -s <story-id>
 * as a VS Code task.
 */
export async function handleBuildStory(): Promise<void> {
  const storyId = await resolveStoryId();
  if (!storyId) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const buildScript = resolveBuildScript(workspaceFolder.uri.fsPath);

  const definition: vscode.TaskDefinition = {
    type: SharpeeTaskProvider.type,
    command: 'build',
    storyId,
  };

  const execution = new vscode.ShellExecution(
    buildScript,
    ['-s', storyId],
    { cwd: workspaceFolder.uri.fsPath },
  );

  const task = new vscode.Task(
    definition,
    workspaceFolder,
    `Build ${storyId}`,
    'sharpee',
    execution,
    '$tsc',
  );

  task.group = vscode.TaskGroup.Build;
  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };

  const taskExecution = await vscode.tasks.executeTask(task);

  // Listen for task completion
  const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
    if (e.execution === taskExecution) {
      disposable.dispose();
      const success = e.exitCode === 0;
      onBuildComplete?.(success, storyId);
    }
  });
}

/**
 * Handles the "Play Story" command. Opens an integrated terminal
 * and runs the CLI in --play mode.
 */
export async function handlePlayStory(): Promise<void> {
  const storyId = await resolveStoryId();
  if (!storyId) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const config = vscode.workspace.getConfiguration('sharpee');
  const cliBundlePath = config.get<string>('cliBundlePath', 'dist/cli/sharpee.js');

  const terminal = vscode.window.createTerminal({
    name: `Sharpee: ${storyId}`,
    cwd: workspaceFolder.uri.fsPath,
  });

  terminal.show();
  terminal.sendText(`node ${cliBundlePath} --play`);
}

/**
 * Handles the "Play in Browser" command. Builds the browser client,
 * then opens the dist/web/<story-id>/index.html in the default browser.
 */
export async function handlePlayInBrowser(): Promise<void> {
  const storyId = await resolveStoryId();
  if (!storyId) return;

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) return;

  const buildScript = resolveBuildScript(workspaceFolder.uri.fsPath);

  // Build with browser client
  const definition: vscode.TaskDefinition = {
    type: SharpeeTaskProvider.type,
    command: 'build-browser',
    storyId,
  };

  const execution = new vscode.ShellExecution(
    buildScript,
    ['-s', storyId, '-c', 'browser'],
    { cwd: workspaceFolder.uri.fsPath },
  );

  const task = new vscode.Task(
    definition,
    workspaceFolder,
    `Build ${storyId} (browser)`,
    'sharpee',
    execution,
    '$tsc',
  );

  task.presentationOptions = {
    reveal: vscode.TaskRevealKind.Always,
    panel: vscode.TaskPanelKind.Shared,
    clear: true,
  };

  const taskExecution = await vscode.tasks.executeTask(task);

  // Open browser after successful build
  const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
    if (e.execution === taskExecution) {
      disposable.dispose();
      if (e.exitCode === 0) {
        const indexPath = path.join(workspaceFolder.uri.fsPath, 'dist', 'web', storyId, 'index.html');
        if (fs.existsSync(indexPath)) {
          vscode.env.openExternal(vscode.Uri.file(indexPath));
        } else {
          vscode.window.showWarningMessage(`Browser build completed but dist/web/${storyId}/index.html not found.`);
        }
      }
      onBuildComplete?.(e.exitCode === 0, storyId);
    }
  });
}
