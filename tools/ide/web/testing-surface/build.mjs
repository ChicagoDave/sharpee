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

import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { findNonSourceInputs } from './bundle-inputs.mjs';

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
const btTypes = resolve(repoRoot, 'packages/branch-tester/src/types.ts');
const btTreeDocument = resolve(repoRoot, 'packages/branch-tester/src/tree-document.ts');
const btClaimReport = resolve(repoRoot, 'packages/branch-tester/src/claims/claim-report.ts');
const claimOutput = resolve(repoRoot, 'packages/ide-protocol/src/claim-output.ts');
// The assertion core the synthesis module re-exports from (ADR-340 D1) —
// browser-safe by construction, and from source for the same reason.
const assertionCore = resolve(repoRoot, 'packages/transcript-tester/src/assertion-core.ts');
// The pin grammar's one parser (ADR-356 D2), which the assertion core reads
// claims with — pure, dependency-free, and from source for the same reason.
const pinGrammar = resolve(repoRoot, 'packages/story-loader/src/pin-grammar.ts');
// The clause key's one composer (ADR-388 D2), which the assertion core names
// a clause with — pure, and from source for the same reason. The
// `@sharpee/chord` barrel would bring the whole compiler with it (GH #659).
const clauseIds = resolve(repoRoot, 'packages/chord/src/clause-ids.ts');
// The host bridge (GH #464), from source for the same reason. It is the one
// module that decides how this page addresses whichever host embedded it, and
// the play client resolves the SAME file — a second copy would let the two
// disagree about where the host lives.
const hostBridge = resolve(repoRoot, 'packages/platform-browser/src/host-bridge.ts');

/**
 * Writes the bundle only when every file it read is a source file
 * (bundle-inputs.mjs). The build runs with `write: false` so a refused bundle
 * never reaches the committed `surface.js`: an import that slipped past the
 * alias list fails here, naming the file, instead of landing as a diff.
 */
const sourceOnlyInputs = {
  name: 'source-only-inputs',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return undefined;
      const offending = findNonSourceInputs(result.metafile);
      if (offending.length > 0) {
        return {
          errors: offending.map((path) => ({
            text:
              `${path} is not a source file — the bundle takes workspace code from src/ only. ` +
              'Import a pure subpath and alias it to its source file in build.mjs, tsconfig.json and vitest.config.ts.',
          })),
        };
      }
      for (const file of result.outputFiles) await writeFile(file.path, file.contents);
      return undefined;
    });
  },
};

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
    '@sharpee/branch-tester/types': btTypes,
    '@sharpee/branch-tester/tree-document': btTreeDocument,
    '@sharpee/branch-tester/claim-report': btClaimReport,
    '@sharpee/ide-protocol/claim-output': claimOutput,
    '@sharpee/transcript-tester/assertion-core': assertionCore,
    '@sharpee/story-loader/pin-grammar': pinGrammar,
    '@sharpee/chord/clause-ids': clauseIds,
    '@sharpee/ide-protocol/run-events': runEvents,
    '@sharpee/platform-browser/host-bridge': hostBridge,
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['safari16'],
  // No source map, no minification: the output is committed (XcodeGen needs
  // the folder to exist to reference it), so it has to stay diffable.
  sourcemap: false,
  minify: false,
  // The plugin below does the writing, after it has checked the inputs.
  write: false,
  metafile: true,
  plugins: [sourceOnlyInputs],
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
