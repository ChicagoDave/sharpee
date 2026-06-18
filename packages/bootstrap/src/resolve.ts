/**
 * Story module resolution (ADR-180) — pure, dependency-free.
 *
 * Kept separate from index.ts (which imports the whole platform) so the
 * resolver is unit-testable in isolation. Only depends on node path/fs.
 */
import * as path from 'path';
import * as fs from 'fs';

/**
 * Resolve the story module file to `require`, entry-aware.
 *
 * With no `entry`, returns `<location>/dist/index.js` (then `src/index.ts`).
 * With `entry`, tries `dist/<entry>.js`, `dist/<entry>/index.js`, then the
 * `src` equivalents. `entry` must be a bare name — path separators, `..`, and
 * absolute paths are rejected (a transcript header cannot escape the dir).
 *
 * @throws if `entry` is unsafe, or no candidate module exists.
 */
export function resolveStoryModulePath(location: string, entry?: string): string {
  const base = path.isAbsolute(location) ? location : path.resolve(process.cwd(), location);

  if (entry !== undefined && entry !== '') {
    if (path.isAbsolute(entry) || /[\\/]/.test(entry) || entry.split(path.sep).includes('..') || entry.includes('..')) {
      throw new Error(
        `Invalid story entry "${entry}": must be a bare name with no path separators or "..".`
      );
    }
    const candidates = [
      path.join(base, 'dist', `${entry}.js`),
      path.join(base, 'dist', entry, 'index.js'),
      path.join(base, 'src', `${entry}.ts`),
      path.join(base, 'src', entry, 'index.ts'),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(
        `Could not resolve story entry "${entry}" under ${base}. Tried:\n  ${candidates.join('\n  ')}`
      );
    }
    return found;
  }

  const distIndex = path.join(base, 'dist', 'index.js');
  if (fs.existsSync(distIndex)) return distIndex;
  const srcIndex = path.join(base, 'src', 'index.ts');
  if (fs.existsSync(srcIndex)) return srcIndex;
  throw new Error(`Could not load story from ${location}: no dist/index.js or src/index.ts`);
}
