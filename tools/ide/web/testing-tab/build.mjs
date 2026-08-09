/**
 * build.mjs — bundles the Testing tab into the IDE's app resources.
 *
 * Purpose: the tab is TypeScript that imports the wire contract directly
 *   (DEVARCH 8b), and a WKWebView cannot load TypeScript or resolve bare module
 *   specifiers, so one esbuild pass produces the three files the app bundles:
 *   `index.html`, `tab.css`, `tab.js`.
 *
 *   `@sharpee/ide-protocol/run-events` resolves to the package's **source** file,
 *   not its build output. That is deliberate: `dist-esm/` goes stale whenever the
 *   package is built for one target and not the other, and a tab silently
 *   compiled against last week's schema version is exactly the drift rule 8b
 *   exists to prevent. The module is dependency-free, so bundling from source
 *   costs nothing.
 *
 * Usage: `node tools/ide/web/testing-tab/build.mjs [--watch]`
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../../..');
const outDir = resolve(repoRoot, 'tools/ide/SharpeeIDE/Resources/testing-tab');
const wireSource = resolve(repoRoot, 'packages/ide-protocol/src/run-events.ts');
// The transcript grammar, from source for the same reason as the wire. This is
// `branch-tester` and not `transcript-tester` because `sharpee test --tree` — the
// only run model the IDE offers — loads branch-tester (test-tree.ts). The two
// parsers do NOT implement the same grammar: transcript-tester rejects
// `[CHANNEL: id, is absent]` as an unknown assertion and returns null, so a tab
// built on it would drop assertions on save.
const grammarParser = resolve(repoRoot, 'packages/branch-tester/src/parser.ts');
const grammarSerializer = resolve(repoRoot, 'packages/branch-tester/src/serializer.ts');
const noFilesystem = resolve(here, 'src/no-filesystem.ts');

/** esbuild options shared by the one-shot and watch paths. */
const options = {
  entryPoints: [resolve(here, 'src/main.ts')],
  outfile: resolve(outDir, 'tab.js'),
  // Pinned, and load-bearing: esbuild renders its per-module comment banners
  // RELATIVE to absWorkingDir, which defaults to process.cwd(). Xcode's pre-build
  // phase runs this from tools/ide while a hand run starts at the repo root, so
  // without this the committed bundle was dirtied by nothing but the caller's
  // cwd. Mirrors the same pin in web/docs-tab/build.mjs.
  absWorkingDir: repoRoot,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  // WKWebView on the deployment target (macOS 26) is far newer than this;
  // Safari 16 keeps the output readable in the inspector without transpiling
  // anything the engine already supports.
  target: ['safari16'],
  // No source map, and no minification. The output is committed (see project.yml
  // — XcodeGen needs the folder to exist to reference it), so it has to stay
  // diffable; unminified esbuild output reads fine in the web inspector and the
  // TypeScript it came from is two directories away.
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  alias: {
    '@sharpee/ide-protocol/run-events': wireSource,
    '@sharpee/branch-tester/parser': grammarParser,
    '@sharpee/branch-tester/serializer': grammarSerializer,
    // The parser reaches for `fs`/`path` in `parseTranscriptFile` alone. The page
    // has no filesystem, so they resolve to stubs that say so by name rather than
    // to `{}`, which would surface as "readFileSync is not a function".
    fs: noFilesystem,
    path: noFilesystem,
  },
};

async function copyStatic() {
  await cp(resolve(here, 'src/index.html'), resolve(outDir, 'index.html'));
  await cp(resolve(here, 'src/tab.css'), resolve(outDir, 'tab.css'));
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

if (process.argv.includes('--watch')) {
  const context = await esbuild.context({
    ...options,
    plugins: [
      {
        name: 'copy-static',
        setup(build) {
          build.onEnd(() => copyStatic());
        },
      },
    ],
  });
  await context.watch();
  console.log(`watching — output in ${outDir}`);
} else {
  await esbuild.build(options);
  await copyStatic();
  console.log(`testing tab bundled into ${outDir}`);
}
