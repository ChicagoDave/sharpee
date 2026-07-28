/**
 * esbuild-bin.ts — resolve the esbuild executable devkit ships with, instead of
 * asking a package manager to find one.
 *
 * Owner context: @sharpee/devkit — standalone (author build paths).
 *
 * Why this exists: esbuild is a declared DEPENDENCY of `@sharpee/devkit`, so a
 * copy is always installed beside the CLI — whether the CLI arrived via
 * `npm i -g @sharpee/devkit` or was deployed into Chord Writer's bundled
 * toolchain (ADR-279 D4). Shelling out to `npx esbuild` ignored that copy: npm 7+
 * does not run a PATH binary, so npx DOWNLOADED a different esbuild from the
 * registry — an unpinned version, a network round trip, and an outright failure
 * on a machine with no npm at all (the Chord Writer case, where "no npm" is the
 * whole point). Resolving devkit's own dependency serves both consumers with one
 * code path and no mode switch.
 *
 * Public interface: resolveEsbuild().
 *
 * Note: this spawns esbuild as a SUBPROCESS. It is unrelated to ADR-274 D1,
 * which bans inlining esbuild's JS API into the CLI bundle (its buildSync worker
 * handshake deadlocks there) — hatch-transpile.ts owns that path.
 */
import { existsSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** How to spawn esbuild: `execFileSync(command, [...prefixArgs, ...esbuildArgs])`. */
export interface EsbuildCommand {
  /** The executable to spawn. */
  command: string;
  /** Arguments that must precede esbuild's own flags. */
  prefixArgs: string[];
  /**
   * True when this resolved to devkit's own installed esbuild — which never
   * touches the network. False means the `npx` fallback, which may.
   */
  bundled: boolean;
}

/** The fallback used when devkit's own esbuild cannot be found. */
const NPX_FALLBACK: EsbuildCommand = { command: 'npx', prefixArgs: ['esbuild'], bundled: false };

/**
 * Locate the esbuild executable installed alongside this CLI.
 *
 * Resolution:
 * 1. `esbuild/package.json` through Node's resolver — finds the copy installed
 *    as devkit's dependency, in a global install or a sealed toolchain alike.
 * 2. Its `bin/esbuild`. Depending on platform and install shape this is either
 *    the native binary (spawned directly) or a JS shim with a `#!` line (spawned
 *    through THIS process's Node, so it never depends on `node` being on PATH —
 *    the sealed toolchain has no PATH to rely on).
 * 3. Failing both, `npx esbuild` — preserved so an unusual install still builds,
 *    rather than turning a working setup into a hard error.
 *
 * @returns the command/args to spawn, and whether it is the bundled copy.
 */
export function resolveEsbuild(): EsbuildCommand {
  let packageJsonPath: string;
  try {
    packageJsonPath = require.resolve('esbuild/package.json');
  } catch {
    return NPX_FALLBACK;
  }

  const bin = join(dirname(packageJsonPath), 'bin', 'esbuild');
  if (!existsSync(bin)) return NPX_FALLBACK;

  return hasShebang(bin)
    ? { command: process.execPath, prefixArgs: [bin], bundled: true }
    : { command: bin, prefixArgs: [], bundled: true };
}

/**
 * True when `file` begins with `#!` — i.e. it is a script needing an
 * interpreter, not a directly executable binary. Read rather than inferred from
 * the platform: esbuild ships the native binary at this path on some installs
 * and a JS shim on others, and guessing wrong turns a build into an exec error.
 */
function hasShebang(file: string): boolean {
  let fd: number | undefined;
  try {
    fd = openSync(file, 'r');
    const head = Buffer.alloc(2);
    const read = readSync(fd, head, 0, 2, 0);
    return read === 2 && head[0] === 0x23 && head[1] === 0x21;
  } catch {
    return false;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
