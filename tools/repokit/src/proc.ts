/**
 * proc.ts — the one subprocess seam for repokit's Node-ecosystem tool calls.
 *
 * Purpose: launch a Node-ecosystem CLI (`pnpm`, `npm`, `npx`, `tsf`, `node`) identically
 * on POSIX and Windows, where those CLIs are `.CMD` shims rather than executables.
 *
 * Public interface: `runTool(cmd, args, opts)` — spawn synchronously, return stdout,
 * throw on non-zero exit; `resolveTool(cmd)` — the Windows resolution alone, exported
 * so its table of cases can be tested without spawning anything.
 *
 * Owner context: repokit infrastructure. Command modules call this instead of importing
 * `node:child_process` directly, so the one platform difference lives in one file.
 *
 * Why this module exists, measured on Windows 11 / Node v24.19.0 (2026-09-12):
 *
 *   execFileSync('pnpm', ['--version'])                         -> ENOENT
 *   execFileSync('<abs>/node_modules/.bin/tsf', ['--version'])  -> ENOENT (POSIX shim)
 *   execFileSync('<abs>/node_modules/.bin/tsf.CMD', [...])      -> EINVAL
 *   execFileSync('<abs>/node_modules/.bin/tsf.ps1', [...])      -> EFTYPE
 *
 * The EINVAL is deliberate on Node's part (the CVE-2024-27980 hardening): a `.cmd` or
 * `.bat` can only be launched through a shell. So `shell: true` is unavoidable for those
 * — but passing an args array *alongside* `shell: true` is deprecated in Node 24
 * (DEP0190) and emits a warning per call onto stderr, which repokit inherits and the
 * AC-13 CLI real-path test treats as failure noise. It also leaves every argument
 * unescaped. Both are avoided by composing one pre-quoted command line and passing no
 * args array at all; that shape was verified to round-trip `!@sharpee/repokit`, `a&b`,
 * `c^d`, `e f` and a directory whose name contains a space, and to still throw with
 * `status` set on a non-zero child exit.
 *
 * Invariants:
 *  - On POSIX, behaviour is byte-identical to the direct `execFileSync` call this
 *    replaced: same file, same args array, same options, no shell.
 *  - A non-zero child exit always throws. repokit's build steps stop the pipeline on it.
 *  - Arguments reach the child verbatim. No argument is re-split, dropped, or expanded.
 *  - An unresolvable tool is passed through unchanged, so the failure is the tool's own
 *    ENOENT and not a resolver error that hides which tool was missing.
 */
import {
  execFileSync,
  type ExecFileSyncOptions,
  type ExecFileSyncOptionsWithStringEncoding,
} from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, extname, join } from 'node:path';

const isWindows = (): boolean => process.platform === 'win32';

/** Executable extensions Windows will launch, in PATHEXT order. */
function pathExts(): string[] {
  const raw = process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD';
  return raw
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolve a tool name or extensionless bin path to a file Windows can execute.
 *
 * @param cmd A bare tool name (`pnpm`), a path to a bin shim (`node_modules/.bin/tsf`),
 *            or anything already carrying an extension.
 * @returns The resolved absolute or relative path, or `cmd` unchanged on POSIX, when it
 *          already has an extension, or when no candidate exists.
 */
export function resolveTool(cmd: string): string {
  if (!isWindows()) return cmd;
  // Already explicit (`node.exe`, `tsf.CMD`) — nothing to decide.
  if (extname(cmd)) return cmd;

  const exts = pathExts();

  // A path: probe siblings beside it. The extensionless file also exists in a pnpm
  // bin directory and is the POSIX shell script, which is exactly what Windows
  // cannot run — so an extension is always preferred over the bare path.
  if (cmd.includes('/') || cmd.includes('\\')) {
    for (const ext of exts) if (existsSync(cmd + ext)) return cmd + ext;
    return cmd;
  }

  // A bare name: the PATH search Windows would do for us if the shim were an .exe.
  for (const dir of (process.env.PATH ?? '').split(delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const candidate = join(dir, cmd + ext);
      if (existsSync(candidate)) return candidate;
    }
  }
  return cmd;
}

/**
 * Quote one token for `cmd.exe`.
 *
 * Inside double quotes cmd treats `& | ^ < > ( )` and `!` literally — delayed expansion
 * is off for the `cmd /d /s /c` that Node uses — so the only hazards are an embedded
 * quote and a trailing backslash run, which would otherwise escape the closing quote.
 */
function quoteForCmd(token: string): string {
  const escaped = token.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1');
  return `"${escaped}"`;
}

/**
 * Run a Node-ecosystem CLI synchronously.
 *
 * Mirrors `execFileSync`'s return typing: a string `encoding` narrows the result to
 * `string`, everything else yields a `Buffer` (which callers running with
 * `stdio: 'inherit'` simply ignore).
 *
 * @param cmd  Tool name or path — `pnpm`, `npm`, `npx`, `node`, or a bin path.
 * @param args Arguments, passed through verbatim.
 * @param opts `execFileSync` options (`cwd`, `stdio`, `encoding`, ...).
 * @returns The child's stdout.
 * @throws Whatever `execFileSync` throws: a non-zero exit (with `status`), or a spawn
 *         error such as ENOENT when the tool genuinely is not installed.
 */
export function runTool(
  cmd: string,
  args: readonly string[],
  opts: ExecFileSyncOptionsWithStringEncoding,
): string;
export function runTool(
  cmd: string,
  args?: readonly string[],
  opts?: ExecFileSyncOptions,
): Buffer;
export function runTool(
  cmd: string,
  args: readonly string[] = [],
  opts: ExecFileSyncOptions = {},
): string | Buffer {
  const resolved = resolveTool(cmd);
  const ext = extname(resolved).toLowerCase();

  // Anything directly spawnable keeps the no-shell path, which needs no quoting:
  // every POSIX call, and `node.EXE` and friends on Windows.
  if (!isWindows() || (ext !== '.cmd' && ext !== '.bat')) {
    return execFileSync(resolved, args as string[], opts);
  }

  // A batch shim. One pre-quoted line, no args array — see the header note on
  // EINVAL and DEP0190.
  const line = [resolved, ...args].map(quoteForCmd).join(' ');
  return execFileSync(line, { ...opts, shell: true });
}
