/**
 * proc.test.ts — unit and real-path tests for the subprocess seam.
 *
 * Derived from the runTool/resolveTool Behavior Statement. These are deliberately
 * real-path tests (rule 13a): the thing under test IS the subprocess layer, so a
 * mocked `execFileSync` would assert only that we call ourselves. Every spawn below
 * launches a real shim off disk — a `.cmd` on Windows, a `#!/bin/sh` script on POSIX —
 * from a directory whose name contains a space, and asserts on the argv the child
 * actually received.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runTool, resolveTool } from './proc';

const isWindows = process.platform === 'win32';

/** Temp roots created by a test, removed afterwards. */
const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

/** A directory with a space in its name, to keep quoting honest. */
function spacedDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'repokit-proc-'));
  roots.push(root);
  const dir = join(root, 'dir with space');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Write an executable shim that prints its own argv as JSON, in whichever form the
 * host platform actually uses — the shape this module exists to paper over.
 * @returns The path to pass to runTool (extensionless, as a real bin path would be).
 */
function writeArgvShim(dir: string, name = 'echoargs'): string {
  const js = join(dir, `${name}.js`);
  writeFileSync(js, 'console.log(JSON.stringify(process.argv.slice(2)));\n');
  if (isWindows) {
    writeFileSync(join(dir, `${name}.cmd`), `@echo off\r\nnode "%~dp0${name}.js" %*\r\n`);
  } else {
    const sh = join(dir, name);
    writeFileSync(sh, `#!/bin/sh\nexec node "$(dirname "$0")/${name}.js" "$@"\n`);
    chmodSync(sh, 0o755);
  }
  return join(dir, name);
}

/** Write a shim that exits with `code` and nothing else. */
function writeFailingShim(dir: string, code: number, name = 'failing'): string {
  if (isWindows) {
    writeFileSync(join(dir, `${name}.cmd`), `@echo off\r\nexit /b ${code}\r\n`);
  } else {
    const sh = join(dir, name);
    writeFileSync(sh, `#!/bin/sh\nexit ${code}\n`);
    chmodSync(sh, 0o755);
  }
  return join(dir, name);
}

describe('runTool — arguments reach the child verbatim', () => {
  // One DOES line of the Behavior Statement, and the invariant the whole module
  // turns on: nothing is re-split, dropped, or shell-expanded. Every token here is
  // one cmd.exe would mangle if the command line were composed carelessly.
  const HOSTILE = [
    '-r',
    '--if-present',
    '--filter',
    '!@sharpee/repokit',
    'run',
    'clean',
    'a&b',
    'c^d',
    'e f',
    'pipe|d',
    'paren(s)',
    'quote"d',
    'back\\slash',
  ];

  it('round-trips arguments through a real shim in a spaced directory', () => {
    const dir = spacedDir();
    const shim = writeArgvShim(dir);
    const out = runTool(shim, HOSTILE, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(JSON.parse(String(out).trim())).toEqual(HOSTILE);
  });

  it('round-trips an empty argument list', () => {
    const dir = spacedDir();
    const shim = writeArgvShim(dir);
    const out = runTool(shim, [], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(JSON.parse(String(out).trim())).toEqual([]);
  });
});

describe('runTool — rejection', () => {
  // The REJECTS WHEN line: repokit's build steps stop the pipeline on a throw, so a
  // non-zero child exit that returned quietly would be a silent-failure defect.
  it('throws with status set when the child exits non-zero', () => {
    const dir = spacedDir();
    const shim = writeFailingShim(dir, 3);
    let thrown: unknown;
    try {
      runTool(shim, [], { stdio: 'ignore' });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as { status?: number }).status).toBe(3);
  });

  it('surfaces the tool’s own spawn error when it does not exist', () => {
    const dir = spacedDir();
    expect(() => runTool(join(dir, 'no-such-tool'), [], { stdio: 'ignore' })).toThrow();
  });
});

describe('resolveTool', () => {
  it('is identity on POSIX', () => {
    if (isWindows) return;
    expect(resolveTool('pnpm')).toBe('pnpm');
    expect(resolveTool('node_modules/.bin/tsf')).toBe('node_modules/.bin/tsf');
  });

  it('prefers an extensioned sibling over the extensionless POSIX shim', () => {
    if (!isWindows) return;
    // Both spellings exist in a real pnpm bin directory; the bare one is the shell
    // script Windows cannot execute, so it must never win.
    const dir = spacedDir();
    const base = join(dir, 'tsf');
    writeFileSync(base, '#!/bin/sh\n');
    writeFileSync(base + '.CMD', '@echo off\r\n');
    expect(resolveTool(base)).toBe(base + '.CMD');
  });

  it('finds a bare tool name on PATH', () => {
    if (!isWindows) return;
    const dir = spacedDir();
    writeFileSync(join(dir, 'faketool.CMD'), '@echo off\r\n');
    const saved = process.env.PATH;
    process.env.PATH = `${dir};${saved ?? ''}`;
    try {
      expect(resolveTool('faketool')).toBe(join(dir, 'faketool.CMD'));
    } finally {
      process.env.PATH = saved;
    }
  });

  it('passes through a name that already carries an extension', () => {
    expect(resolveTool('node.exe')).toBe('node.exe');
  });

  it('passes through an unresolvable name unchanged', () => {
    expect(resolveTool('definitely-not-a-real-tool-xyz')).toBe('definitely-not-a-real-tool-xyz');
  });

  it('resolves the package managers repokit actually shells out to', () => {
    if (!isWindows) return;
    // Not a fixture: these are the three that fail with ENOENT unresolved, and the
    // reason ./repokit build could not run on Windows at all.
    for (const tool of ['pnpm', 'npm', 'npx']) {
      expect(resolveTool(tool).toLowerCase()).toMatch(/\.(cmd|bat|exe|com)$/);
    }
  });
});
