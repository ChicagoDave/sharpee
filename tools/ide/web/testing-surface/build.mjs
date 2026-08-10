/**
 * build.mjs — bundles the testing play surface into the IDE's app resources.
 *
 * Purpose: the surface is TypeScript a WKWebView cannot load directly, so one
 *   esbuild pass produces the two files the app bundles and the Play scheme
 *   handler serves into the testing page (ADR-306 Phase 3):
 *   `Resources/testing-surface/surface.js` and `surface.css`.
 *
 * Usage: `node tools/ide/web/testing-surface/build.mjs [--watch]`
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const outDir = resolve(repoRoot, 'tools/ide/SharpeeIDE/Resources/testing-surface');

// The synthesis module's channel-prose extractor, from SOURCE for the same
// reason web/testing-tab bundles the grammar from source: `dist-esm/` goes
// stale whenever the package is built for one target and not the other, and
// rule 8b / ADR-306 D2 exist to prevent exactly that drift. The module is
// dependency-free beyond its own types, so bundling from source costs nothing.
const autoAssertion = resolve(repoRoot, 'packages/branch-tester/src/auto-assertion.ts');
const runEvents = resolve(repoRoot, 'packages/ide-protocol/src/run-events.ts');
const btSerializer = resolve(repoRoot, 'packages/branch-tester/src/serializer.ts');
const btParser = resolve(repoRoot, 'packages/branch-tester/src/parser.ts');
const btTypes = resolve(repoRoot, 'packages/branch-tester/src/types.ts');
const btTreeDocument = resolve(repoRoot, 'packages/branch-tester/src/tree-document.ts');

/** esbuild options shared by the one-shot and watch paths. */
const options = {
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: resolve(outDir, 'surface.js'),
  // Pinned, and load-bearing: esbuild renders its per-module comment banners
  // RELATIVE to absWorkingDir, which defaults to process.cwd(). Xcode's
  // pre-build phase runs this from tools/ide while a hand run starts at the
  // repo root, so without this the committed bundle would be dirtied by
  // nothing but the caller's cwd. Mirrors web/testing-tab/build.mjs.
  absWorkingDir: repoRoot,
  alias: {
    '@sharpee/branch-tester/auto-assertion': autoAssertion,
    '@sharpee/branch-tester/serializer': btSerializer,
    '@sharpee/branch-tester/parser': btParser,
    '@sharpee/branch-tester/types': btTypes,
    '@sharpee/branch-tester/tree-document': btTreeDocument,
    '@sharpee/ide-protocol/run-events': runEvents,
    // The parser imports node's fs for its file-loading helper only; the
    // surface parses text it already holds, so the browser build shims it.
    'fs': resolve(here, 'src/shims/fs.ts'),
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari16'],
  // No source map, no minification: the output is committed (XcodeGen needs
  // the folder to exist to reference it), so it has to stay diffable.
  sourcemap: false,
  minify: false,
};

await mkdir(outDir, { recursive: true });

async function copyAssets() {
  await cp(resolve(here, 'src/surface.css'), resolve(outDir, 'surface.css'));
}

if (process.argv.includes('--watch')) {
  const context = await esbuild.context(options);
  await copyAssets();
  await context.watch();
  console.log('watching testing-surface…');
} else {
  await esbuild.build(options);
  await copyAssets();
  console.log(`testing-surface bundled → ${outDir}`);
}
