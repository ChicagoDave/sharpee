/**
 * build.mjs — bundles the Chord lexer service with the repo's esbuild, resolving
 * the lexer from packages/chord/src (from SOURCE, as the testing surface does).
 *
 * Owner context: tools/ide — the Avalonia editor's syntax-highlighting bridge.
 * Public interface: `node build.mjs` → dist/lexer-server.js
 *
 * Paths are resolved from this file's own location: the repository root is two
 * levels up (tools/ide/editor-bridge → tools/ide → tools → root is one more),
 * so the script runs on any clone rather than one developer's.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const esbuild = await import(resolve(repo, 'node_modules/esbuild/lib/main.js'));
const out = resolve(here, 'dist');
await mkdir(out, { recursive: true });

const result = await esbuild.build({
  entryPoints: [resolve(here, 'src/lexer-server.ts')],
  outfile: resolve(out, 'lexer-server.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node22'],
  alias: { '@chord': resolve(repo, 'packages/chord/src') },
  logLevel: 'info',
  metafile: true,
});
const inputs = Object.keys(result.metafile.inputs);
console.log(`bundled ${inputs.length} modules; chord sources: ${inputs.filter(i => i.includes('packages/chord/src')).join(', ')}`);
