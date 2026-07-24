/**
 * hatch-transpile.ts — resolve a hatch module to a loadable CJS module by
 * transpiling the AUTHORED TypeScript (ADR-259 D6, amended 2026-07-23).
 *
 * The policy this replaces looked for `dist/<base>.js` (a per-story `tsc`
 * output) and then `<base>.js`. That required every hatched story to carry a
 * `package.json` and a `tsconfig.json` purely to emit one file — which
 * contradicted ADR-259 D8's split of `friendly-zoo` into a clean Chord story,
 * and ADR-252 D2's promise that a story needs neither. The owner ruled the CLI
 * should get the same esbuild transpile the browser build uses, retiring the
 * two-host divergence: **both hosts now resolve the authored `.ts` to source.**
 *
 * Typechecking is deliberately absent, here and in the browser path (D5).
 * Types erase, so type errors usually still transpile; the errors that break a
 * hatched story are contract errors, which the loader already rejects
 * atomically with a better message than `tsc` would give.
 *
 * Public interface: requireHatchModule.
 * Owner context: @sharpee/devkit (the host owns module resolution; the loader
 * is filesystem-free — ADR-210 §5.6).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Resolved-path → exports, so one process transpiles a given hatch once. */
const loaded = new Map<string, Record<string, unknown>>();

/**
 * Transpile one authored TypeScript file to a Node-loadable CJS module and
 * return its path.
 *
 * Bundled with `packages: 'external'`, so a hatch may import sibling files
 * (they are inlined) while `@sharpee/*` and other dependencies resolve at
 * runtime the way they always have. Unminified, because the loader's
 * `chord.*` namespace lint inspects function source and is documented
 * unreliable against minified code.
 *
 * Output is cached under the temp dir keyed by a hash of the source, so a
 * repeat load of an unchanged hatch costs one `existsSync`.
 */
function transpileToCjs(sourcePath: string): string {
  // Required lazily: only a hatched story pays for esbuild.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const esbuild = require('esbuild') as typeof import('esbuild');

  const source = readFileSync(sourcePath, 'utf-8');
  const hash = createHash('sha256')
    .update(sourcePath)
    .update('\0')
    .update(source)
    .digest('hex')
    .slice(0, 16);
  const cacheDir = path.join(tmpdir(), 'sharpee-hatch');
  const outPath = path.join(cacheDir, `${hash}.cjs`);
  if (existsSync(outPath)) return outPath;

  const result = esbuild.buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    packages: 'external',
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    minify: false,
    sourcemap: 'inline',
    write: false,
  });
  const output = result.outputFiles?.[0];
  if (!output) {
    throw new Error(`hatch module "${sourcePath}" produced no output from esbuild.`);
  }

  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(outPath, output.text, 'utf-8');
  return outPath;
}

/**
 * Resolve one hatch module path (e.g. `"./extras.ts"`) to its exports,
 * relative to the `.story` file's directory.
 *
 * The authored `.ts` beside the `.story` is the module — exactly where the
 * author's `from "./extras.ts"` says it is. A `.js` hatch loads directly, no
 * transpile needed.
 *
 * @param storyDir directory of the `.story` file
 * @param modulePath the hatch's declared module path
 * @returns the module's exports
 * @throws if no candidate exists
 */
export function requireHatchModule(storyDir: string, modulePath: string): Record<string, unknown> {
  const base = modulePath.replace(/\.(ts|js)$/, '');
  const tsPath = path.resolve(storyDir, `${base}.ts`);
  const jsPath = path.resolve(storyDir, `${base}.js`);

  const cached = loaded.get(tsPath) ?? loaded.get(jsPath);
  if (cached) return cached;

  let target: string;
  if (existsSync(tsPath)) {
    target = transpileToCjs(tsPath);
  } else if (existsSync(jsPath)) {
    target = jsPath;
  } else {
    throw new Error(
      `hatch module "${modulePath}" not found. Tried:\n  ${tsPath}\n  ${jsPath}`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const exports = require(target) as Record<string, unknown>;
  loaded.set(existsSync(tsPath) ? tsPath : jsPath, exports);
  return exports;
}
