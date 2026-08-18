/**
 * vitest.shared.ts — the one alias map every package's vitest config uses to
 * resolve `@sharpee/*` imports to workspace SOURCE rather than build output.
 *
 * Owner context: repo-level test infrastructure. Not published, not part of any
 * package's public API — vitest configs are its only consumers.
 *
 * Public interface: workspaceAliases().
 *
 * ## Why this exists
 *
 * Every package declares an ESM export condition in its package.json:
 *
 *     "exports": { ".": { "import": "./dist-esm/index.js",
 *                         "require": "./dist/index.js" } }
 *
 * vitest resolves through `import`, so without an alias a test reads a COMPILED
 * artifact — one that is only as fresh as the last build, and on a clean
 * checkout may not exist at all. That is the "dist-esm staleness trap": it bit
 * five times in four days locally (stale), and once in CI as the severe variant
 * (absent), which took `main` red for three days — `Failed to resolve entry for
 * package "@sharpee/character"` out of @sharpee/transcript-tester (GH #276/#277).
 *
 * The repository already had the right answer, applied unevenly: 13 of 24 vitest
 * configs aliased to `src`, 11 did not, and the 13 carried hand-written maps of
 * 2-19 entries that could not stay complete. transcript-tester had none, so its
 * barrel import walked `stdlib -> npc-service -> @sharpee/character` straight
 * into an artifact CI had never built.
 *
 * Deriving the map from the filesystem — rather than listing packages here — is
 * deliberate. A hand-maintained list is the same defect one level up: it would
 * be correct the day it was written and silently incomplete the first time
 * somebody added a package.
 *
 * ## Consequences
 *
 * - dist-esm/ is no longer on any test's resolution path. It is built only for
 *   the browser/playground client bundles, which is what it was added for.
 * - Tests reflect edited source immediately, with no rebuild step between.
 * - Trade-off: a package that fails to COMPILE can still pass its tests, since
 *   vitest transforms source directly. The build step in CI is what catches
 *   that, and it runs before the tests.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Directories scanned for workspace packages, relative to the repo root. */
const PACKAGE_ROOTS = ['packages', 'packages/extensions'];

const repoRoot = dirname(fileURLToPath(import.meta.url));

/** Escape a package name for embedding in a RegExp source string. */
function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Discover every `@sharpee/*` workspace package that ships a `src/` directory.
 *
 * @returns `[packageName, absoluteSrcDir]` pairs, in filesystem order.
 */
function discoverPackages(): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  for (const packageRoot of PACKAGE_ROOTS) {
    const rootDir = join(repoRoot, packageRoot);
    if (!existsSync(rootDir)) continue;
    for (const entry of readdirSync(rootDir)) {
      const packageDir = join(rootDir, entry);
      const manifest = join(packageDir, 'package.json');
      const srcDir = join(packageDir, 'src');
      if (!existsSync(manifest) || !existsSync(srcDir)) continue;
      const { name } = JSON.parse(readFileSync(manifest, 'utf8')) as { name?: string };
      if (name?.startsWith('@sharpee/')) found.push([name, srcDir]);
    }
  }
  return found;
}

/**
 * Build the vitest/vite `resolve.alias` entries for every workspace package.
 *
 * Returns the array form (`{find, replacement}`) rather than an object map so
 * the patterns can be anchored: a bare string alias matches by PREFIX, which
 * would make `@sharpee/core` swallow an import of `@sharpee/core-anything`.
 * Two entries per package — the exact specifier, and any subpath beneath it
 * (`@sharpee/platform-browser/styles/x` -> `.../src/styles/x`).
 *
 * @returns alias entries suitable for `resolve.alias` in a vitest config.
 */
export function workspaceAliases(): Array<{ find: RegExp; replacement: string }> {
  const packages = discoverPackages();
  // Invariant: discovery must find something. An empty map is the one failure
  // that hides — every import would fall back to the `import` export condition
  // and tests would still pass wherever dist-esm/ happened to be fresh, which is
  // the exact trap this file removes. Fail at config load instead.
  if (packages.length === 0) {
    throw new Error(
      `vitest.shared: no @sharpee/* workspace packages found under ${PACKAGE_ROOTS.join(', ')} ` +
        `(looked in ${repoRoot}) — tests would silently resolve to build output instead of src`,
    );
  }
  const aliases: Array<{ find: RegExp; replacement: string }> = [];
  for (const [name, srcDir] of packages) {
    const escaped = escapeForRegExp(name);
    aliases.push({ find: new RegExp(`^${escaped}$`), replacement: srcDir });
    aliases.push({ find: new RegExp(`^${escaped}/(.*)$`), replacement: resolve(srcDir) + '/$1' });
  }
  return aliases;
}
