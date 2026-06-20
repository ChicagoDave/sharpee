/**
 * introspect.ts — `sharpee introspect`: emit the IDE project manifest (ADR-184/185).
 *
 * Loads a *built* story project (its compiled `dist/index.js` plus the platform from
 * `node_modules`), assembles the world via `@sharpee/bootstrap` (reusing `loadStory`
 * → `assembleGame`, exactly as the standalone `build --test` path does), projects it
 * with `buildManifest`, and writes the `@sharpee/ide-protocol` `ProjectManifest` JSON
 * to stdout. Status goes to stderr so stdout carries only the manifest for the IDE.
 *
 * Public interface: runIntrospect(opts).
 * Owner context: @sharpee/devkit — the standalone `sharpee` CLI (ADR-185).
 */
import * as path from 'node:path';
import { existsSync } from 'node:fs';

export interface IntrospectOptions {
  /** Story project directory; defaults to the current working directory. */
  dir?: string;
}

/**
 * Emit the project manifest for a built story to stdout.
 *
 * @param opts.dir story project directory (default: cwd)
 * @throws if the project has no `dist/index.js` (story not built), or the module
 *   exports no story — surfaced by the CLI as a non-zero exit with the message.
 */
export async function runIntrospect(opts: IntrospectOptions = {}): Promise<void> {
  const dir = path.resolve(opts.dir ?? process.cwd());

  // Build-gated: introspection runs against the compiled story, not source.
  if (!existsSync(path.join(dir, 'dist', 'index.js'))) {
    throw new Error(`no dist/index.js in '${dir}' — build the story first (sharpee build)`);
  }

  console.error(`Introspecting story: ${dir}`);
  // Lazy require (after the build-gate) so the platform is loaded only when actually
  // introspecting — and so static tooling (e.g. the vitest transform of this module)
  // never pulls @sharpee/bootstrap's transitive graph just to exercise the gate.
  const { loadStory, buildManifest } = require('@sharpee/bootstrap') as typeof import('@sharpee/bootstrap');
  const game = await loadStory(dir);
  const manifest = buildManifest(game.world, path.basename(dir), 'cli');
  process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
}
