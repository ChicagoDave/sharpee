/**
 * spawn-cli.ts — spawn the real devkit CLI from a test WITHOUT blocking the
 * vitest worker's event loop.
 *
 * `spawnSync` holds the worker for the whole run, and a `sharpee test` of
 * fernhill now takes well over a minute (its manifest selects a claims
 * fragment, ADR-365 D10, and the claims walk is the long part), which is
 * longer than the worker's RPC heartbeat: the run passes and vitest still
 * reports "Timeout calling onTaskUpdate" as an unhandled error. An async
 * spawn keeps the loop turning. The result mirrors the `spawnSync` fields
 * the tests read: `status`, `stdout`, `stderr`, `error`.
 *
 * Owner context: tools/ide — the testing play surface's test suite.
 */
import { spawn } from 'node:child_process';

export interface SpawnedCli {
  status: number | null;
  stdout: string;
  stderr: string;
  error: Error | undefined;
}

/**
 * Run `node <args>` to completion, collecting both streams as UTF-8.
 *
 * @param args the arguments after `node` (the CLI path first)
 * @param cwd the working directory the CLI runs in
 * @returns the exit status and both streams; `error` is set only when the
 *   process could not be spawned
 */
export function spawnCli(args: string[], cwd: string): Promise<SpawnedCli> {
  return new Promise((resolve) => {
    const child = spawn('node', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: string[] = [];
    const err: string[] = [];
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => out.push(chunk));
    child.stderr.on('data', (chunk: string) => err.push(chunk));
    child.on('error', (error) => resolve({ status: null, stdout: '', stderr: '', error }));
    child.on('close', (status) => resolve({ status, stdout: out.join(''), stderr: err.join(''), error: undefined }));
  });
}
