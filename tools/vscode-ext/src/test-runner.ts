/**
 * Transcript test runner — executes the CLI and parses results.
 *
 * Runs `node dist/cli/sharpee.js --test <file>` and parses the
 * structured output into per-command pass/fail results with line
 * mappings back to the source transcript.
 *
 * Public interface: runTranscriptTest(), TestResult, CommandResult
 * Owner: tools/vscode-ext
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';

/** Result of a single command in the transcript. */
export interface CommandResult {
  /** The command text (e.g., "look", "take sword"). */
  command: string;
  /** Whether the command's assertions passed. */
  passed: boolean;
  /** Failure message if the command failed. */
  failureMessage?: string;
  /** Line number in the transcript file (0-based). */
  line: number;
}

/** Result of running a full transcript test. */
export interface TestResult {
  /** Path to the transcript file that was tested. */
  filePath: string;
  /** Per-command results. */
  commands: CommandResult[];
  /** Total passing commands. */
  passCount: number;
  /** Total failing commands. */
  failCount: number;
  /** Total execution time in milliseconds. */
  durationMs: number;
  /** Raw CLI output. */
  rawOutput: string;
  /** Whether the CLI process exited successfully. */
  success: boolean;
  /** Error message if the CLI could not be started. */
  error?: string;
}

/**
 * Resolves the CLI bundle path from workspace config.
 *
 * @param workspaceRoot - The workspace root directory
 * @returns Absolute path to the CLI bundle, or null if not found
 */
function resolveCliBundlePath(workspaceRoot: string): string | null {
  const config = vscode.workspace.getConfiguration('sharpee');
  const relativePath = config.get<string>('cliBundlePath', 'dist/cli/sharpee.js');
  const absolutePath = path.join(workspaceRoot, relativePath);
  return absolutePath;
}

/**
 * Builds a line map from the transcript file: maps command text to
 * 0-based line numbers. Handles duplicate commands by tracking
 * occurrence order.
 */
function buildCommandLineMap(document: vscode.TextDocument): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    const match = text.match(/^\s*>\s+(.+)$/);
    if (match) {
      const cmd = match[1].trim();
      const existing = map.get(cmd) ?? [];
      existing.push(i);
      map.set(cmd, existing);
    }
  }
  return map;
}

/**
 * Parses CLI stdout/stderr into CommandResults.
 *
 * Expected output format:
 *   > command                                          PASS
 *   > command                                          FAIL
 *     ✗ Output does not contain "text"
 */
function parseCliOutput(
  output: string,
  commandLineMap: Map<string, number[]>,
): { commands: CommandResult[]; passCount: number; failCount: number; durationMs: number } {
  const lines = output.split('\n');
  const commands: CommandResult[] = [];
  // Track how many times we've seen each command to handle duplicates
  const commandOccurrences = new Map<string, number>();
  let passCount = 0;
  let failCount = 0;
  let durationMs = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match command result lines: "  > command   PASS" or "  > command   FAIL"
    const cmdMatch = line.match(/^\s+>\s+(.+?)\s{2,}(PASS|FAIL)\s*$/);
    if (cmdMatch) {
      const command = cmdMatch[1].trim();
      const passed = cmdMatch[2] === 'PASS';

      // Look up the line number in the source file
      const occurrence = commandOccurrences.get(command) ?? 0;
      commandOccurrences.set(command, occurrence + 1);
      const lineNumbers = commandLineMap.get(command) ?? [];
      const sourceLine = lineNumbers[occurrence] ?? -1;

      // Collect failure message from subsequent lines
      let failureMessage: string | undefined;
      if (!passed) {
        const failLines: string[] = [];
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          // Stop at the next command, summary line, or empty-ish line that's not indented failure detail
          if (nextLine.match(/^\s+>/) || nextLine.match(/^\s+\d+ (passed|failed)/) || nextLine.match(/^$/)) {
            break;
          }
          // Capture failure detail lines (indented with ✗ or ─)
          if (nextLine.match(/^\s{4}/)) {
            failLines.push(nextLine.trim());
          }
        }
        failureMessage = failLines
          .filter(l => l.startsWith('✗'))
          .join('; ') || undefined;
      }

      if (passed) {
        passCount++;
      } else {
        failCount++;
      }

      commands.push({ command, passed, failureMessage, line: sourceLine });
    }

    // Match summary line: "  2 passed, 1 failed (12ms)"
    const summaryMatch = line.match(/\((\d+)ms\)/);
    if (summaryMatch) {
      durationMs = parseInt(summaryMatch[1], 10);
    }
  }

  return { commands, passCount, failCount, durationMs };
}

/**
 * Runs a transcript test and returns parsed results.
 *
 * @param document - The transcript document to test
 * @returns Parsed test results
 */
export function runTranscriptTest(document: vscode.TextDocument): Promise<TestResult> {
  return new Promise((resolve) => {
    const filePath = document.uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);

    if (!workspaceFolder) {
      resolve({
        filePath,
        commands: [],
        passCount: 0,
        failCount: 0,
        durationMs: 0,
        rawOutput: '',
        success: false,
        error: 'No workspace folder found. Open a Sharpee project first.',
      });
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const cliBundlePath = resolveCliBundlePath(workspaceRoot);
    if (!cliBundlePath) {
      resolve({
        filePath,
        commands: [],
        passCount: 0,
        failCount: 0,
        durationMs: 0,
        rawOutput: '',
        success: false,
        error: 'CLI bundle not configured. Set sharpee.cliBundlePath in settings.',
      });
      return;
    }

    const commandLineMap = buildCommandLineMap(document);

    const proc = cp.spawn('node', [cliBundlePath, '--test', filePath], {
      cwd: workspaceRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      const rawOutput = stdout + stderr;
      const { commands, passCount, failCount, durationMs } = parseCliOutput(rawOutput, commandLineMap);

      resolve({
        filePath,
        commands,
        passCount,
        failCount,
        durationMs,
        rawOutput,
        success: code === 0,
      });
    });

    proc.on('error', (err) => {
      resolve({
        filePath,
        commands: [],
        passCount: 0,
        failCount: 0,
        durationMs: 0,
        rawOutput: '',
        success: false,
        error: `Failed to start CLI: ${err.message}. Run ./build.sh -s <story-id> first.`,
      });
    });
  });
}
