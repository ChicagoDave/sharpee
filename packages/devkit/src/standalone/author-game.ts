/**
 * author-game.ts — load an author's story project into a runnable game.
 *
 * The one author-side story resolution used by `sharpee test` and
 * `sharpee play` (and, from the chord-author-pipeline Phase 2 work, the
 * build path's source detection): a project is either a Chord project
 * (exactly one `.story` file at the project root — compile → Story IR →
 * @sharpee/story-loader `createStory`) or a module project (built
 * `dist/index.js` story, resolved by @sharpee/bootstrap). Assembly always
 * goes through `bootstrap.assembleGame` — the single loader invariant
 * (ADR-180: exactly one story-loading implementation).
 *
 * Public interface: findStoryFile(), loadAuthorGame(), requireHatchModule().
 * Owner context: @sharpee/devkit (author tool, ADR-187 — project-relative,
 * no workspace mode detection).
 */
import * as path from 'node:path';
import { readdirSync, readFileSync } from 'node:fs';
import type { LoadedGame } from '@sharpee/bootstrap';

/**
 * Hatch resolution lives in `hatch-transpile.ts` (ADR-259 D6, amended): the
 * authored `.ts` beside the `.story` IS the module, transpiled through
 * esbuild. Re-exported here because this module is where callers have always
 * found it.
 */
import { requireHatchModule } from './hatch-transpile.js';
export { requireHatchModule } from './hatch-transpile.js';

/**
 * Build an fs-backed `importResolver` for `compile()` (ADR-251 Phase 2).
 * The compiler appends `.chord` and hands us the full fragment name (e.g.
 * `"regions/harbor.chord"`); we read it relative to the `.story` file's
 * directory. A missing file resolves to `null` (the compiler's
 * unresolved-import contract → `analysis.import-unresolved`); any other fs
 * error propagates. Keeps @sharpee/chord filesystem-free — the host owns
 * the base directory, exactly as `requireHatchModule` does for hatches.
 *
 * @param storyDir directory of the importing `.story` file
 * @returns a resolver mapping `<name>.chord` → source text or null
 */
export function makeFsImportResolver(storyDir: string): (fragmentName: string) => string | null {
  return (fragmentName: string): string | null => {
    const full = path.resolve(storyDir, fragmentName);
    try {
      return readFileSync(full, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  };
}

/**
 * Find the project's Chord source: exactly one root-level `.story` file.
 *
 * @param dir project directory
 * @returns the `.story` file's absolute path, or null when the project has
 *   none (a module project)
 * @throws when more than one `.story` file exists — ambiguity is an error
 *   with the candidates named, never a guess (house never-guess rule)
 */
export function findStoryFile(dir: string): string | null {
  const stories = readdirSync(dir).filter((f) => f.endsWith('.story')).sort();
  if (stories.length === 0) return null;
  if (stories.length > 1) {
    throw new Error(
      `project has ${stories.length} .story files (${stories.join(', ')}) — a project has exactly one; remove or rename the others`,
    );
  }
  return path.join(dir, stories[0]);
}

/**
 * Compile a Chord `.story` file and construct its story via
 * @sharpee/story-loader (hatches bound). Load-time-gate diagnostics abort
 * with `.story` line numbers (ADR-210 AC-3).
 *
 * @param storyFile absolute or cwd-relative path to the `.story` file
 * @returns the constructed story instance (not yet assembled into a game)
 * @throws on gate errors, with every diagnostic in the message
 */
export function loadChordStory(storyFile: string): unknown {
  // Lazy requires (compose.ts pattern): pull the compiler/loader only when needed.
  const chord = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const storyDir = path.dirname(path.resolve(storyFile));
  const result = chord.compile(readFileSync(storyFile, 'utf-8'), {
    importResolver: makeFsImportResolver(storyDir),
  });
  if (!result.ok) {
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    const lines = errors.map(
      (d) => `  ${storyFile}:${d.span.line}:${d.span.column} [${d.code}] ${d.message}`,
    );
    throw new Error(`Chord load-time gate failed (${errors.length} error(s)):\n${lines.join('\n')}`);
  }

  const hatchModules: Record<string, Record<string, unknown>> = {};
  for (const hatch of result.ir.hatches) {
    if (!(hatch.modulePath in hatchModules)) {
      hatchModules[hatch.modulePath] = requireHatchModule(storyDir, hatch.modulePath);
    }
  }

  const { createStory } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  return createStory(result.ir, { hatchModules });
}

/**
 * Load an author project (or an explicit `.story` file) into a runnable game.
 *
 * @param target a project directory, or a path ending in `.story`
 * @param opts.entry optional story sub-entry (module projects only; ignored
 *   for `.story` sources, matching the platform bundle's contract)
 * @returns the assembled game (engine + channel packet plumbing)
 * @throws on gate errors, ambiguous `.story` sets, or unresolvable modules
 */
export async function loadAuthorGame(target: string, opts?: { entry?: string }): Promise<LoadedGame> {
  const bootstrap = require('@sharpee/bootstrap') as typeof import('@sharpee/bootstrap');
  if (target.endsWith('.story')) {
    // ADR-248: freshStory recompiles so an in-process RESTART reboots fresh.
    return bootstrap.assembleGame(loadChordStory(target), {
      freshStory: () => loadChordStory(target),
    });
  }
  const storyFile = findStoryFile(target);
  if (storyFile) {
    return bootstrap.assembleGame(loadChordStory(storyFile), {
      freshStory: () => loadChordStory(storyFile),
    });
  }
  return bootstrap.loadStory(target, { entry: opts?.entry });
}
