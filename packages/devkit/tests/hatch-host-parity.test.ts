/**
 * hatch-host-parity.test.ts — ADR-259 Phase F, host parity (D6 as amended).
 *
 * The amendment retired the two-host divergence: the CLI used to load a
 * per-story `tsc` output while the browser bundled the authored `.ts`. Both
 * hosts now resolve the SAME authored source through the SAME esbuild
 * mechanism, so parity is by construction rather than by coincidence — and
 * this test pins that, by asserting the two hosts reach the same module and
 * that the producer's own text reaches the shipped bundle.
 *
 * REAL-PATH: the real friendly-zoo `.story`, the real chord compiler, the
 * real buildBrowser, the real transpile. No stubs.
 *
 * **Coverage boundary, stated plainly.** This does NOT execute `game.js` in a
 * browser — no headless browser is available in this environment. What it
 * proves is that the module the browser bundles and the module the CLI loads
 * are the same file, that binding it succeeds, that the producer's output is
 * present in the shipped bundle, and that the CLI renders that same output.
 * A DOM-level assertion of the running page remains uncovered.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { buildBrowser, type BrowserBuildEnv } from '../src/standalone/browser-core.js';
import { requireHatchModule } from '../src/standalone/hatch-transpile.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const ZOO_DIR = path.join(REPO_ROOT, 'stories', 'friendly-zoo');
const ZOO_STORY = path.join(ZOO_DIR, 'zoo.story');

function env(esbuildCwd: string): BrowserBuildEnv {
  return {
    stylesDir: path.join(REPO_ROOT, 'packages', 'platform-browser', 'styles'),
    templatesDir: path.join(REPO_ROOT, 'packages', 'devkit', 'templates', 'browser'),
    esbuildCwd,
    engineVersion: '0.0.0-test',
  };
}

describe('host parity for hatched stories (ADR-259 D6, amended)', () => {
  it('both hosts resolve the SAME authored source — the divergence is retired', () => {
    // The CLI's resolution, run for real.
    const cliModule = requireHatchModule(ZOO_DIR, './chord-extras.ts');
    expect(Object.keys(cliModule).sort()).toEqual(['aside', 'flavor']);

    // The browser's resolution: the generated hatch-modules.ts names the same
    // file, reached by a different specifier from a different directory.
    // The repo root is the esbuild cwd: @sharpee/* must resolve from the
    // monorepo's node_modules, exactly as the in-repo build does.
    buildBrowser(ZOO_STORY, env(REPO_ROOT), { quiet: true, minify: false, sourcemap: false });

    {
      const generated = readFileSync(
        path.join(REPO_ROOT, 'dist', '.browser-entry', 'friendly-zoo', 'hatch-modules.ts'),
        'utf-8',
      );
      const specifier = generated.match(/import \* as __hatch0 from "([^"]+)"/)?.[1];
      expect(specifier, 'the entry imports the hatch').toBeTruthy();

      const browserTarget = path.resolve(
        path.join(REPO_ROOT, 'dist', '.browser-entry', 'friendly-zoo'),
        specifier!,
      );
      // The two hosts land on one file on disk. That IS the parity claim.
      expect(browserTarget).toBe(path.join(ZOO_DIR, 'chord-extras.ts'));

      // ...and the map key is the author's path, not the specifier (D2).
      expect(generated).toContain('"./chord-extras.ts": __hatch0');
      expect(specifier).not.toBe('./chord-extras.ts');
    }
  });

  it("the producer's own output reaches the shipped bundle, not just its import", () => {
    {
      const outDir = buildBrowser(ZOO_STORY, env(REPO_ROOT), {
        quiet: true,
        minify: false,
        sourcemap: false,
      });
      const bundle = readFileSync(path.join(outDir, 'game.js'), 'utf-8');

      // Every literal the hatch can produce — pulled from the source, so this
      // cannot drift into asserting a string the hatch no longer has.
      const source = readFileSync(path.join(ZOO_DIR, 'chord-extras.ts'), 'utf-8');
      const literals = [...source.matchAll(/lit\('([^']{20,})'\)/g)].map((m) => m[1]);
      expect(literals.length, 'the fixture hatch produces literals').toBeGreaterThan(0);

      for (const literal of literals) {
        expect(bundle, `bundle carries: ${literal.slice(0, 40)}…`).toContain(literal);
      }
    }
  });

  it('the CLI-loaded producer returns those same literals when called', () => {
    // The bound producer, executed — the CLI half of the parity pair.
    const mod = requireHatchModule(ZOO_DIR, './chord-extras.ts') as {
      flavor: (ctx: unknown) => unknown;
    };
    const source = readFileSync(path.join(ZOO_DIR, 'chord-extras.ts'), 'utf-8');
    const literals = [...source.matchAll(/lit\('([^']{20,})'\)/g)].map((m) => m[1]);

    const produced = JSON.stringify(mod.flavor({ world: {}, entity: {} }));

    // At least one of the module's literals comes back out of the real call.
    expect(literals.some((l) => produced.includes(l))).toBe(true);
  });
});
