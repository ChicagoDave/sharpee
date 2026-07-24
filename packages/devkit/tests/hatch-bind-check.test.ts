/**
 * hatch-bind-check.test.ts — ADR-259 D5 REAL-PATH test.
 *
 * A hatch that does not bind must fail the BUILD, not the player's browser.
 * Every case drives the real `buildBrowser` over a real `.story` and a real
 * hatch module on disk — the same path `sharpee build --browser` takes.
 *
 * Covers ADR-259 Phase D's acceptance: missing module, missing export, and
 * export-of-wrong-kind each fail separately; a `chord.*` namespace violation
 * fails; and no `tsc`/`tsconfig`/`typescript` appears in the hatched path.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildBrowser, type BrowserBuildEnv } from '../src/standalone/browser-core.js';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FIXTURE = path.resolve(__dirname, 'fixtures', 'hatch-bind');

let workDir: string;

/** A scratch copy of the fixture, so each case can rewrite the hatch. */
function stage(): string {
  cpSync(FIXTURE, workDir, { recursive: true });
  return path.join(workDir, 'tiny.story');
}

function env(): BrowserBuildEnv {
  return {
    stylesDir: path.join(REPO_ROOT, 'packages', 'platform-browser', 'styles'),
    templatesDir: path.join(REPO_ROOT, 'packages', 'devkit', 'templates', 'browser'),
    esbuildCwd: REPO_ROOT,
    engineVersion: '0.0.0-test',
  };
}

/** Build, returning the thrown message or null when the build succeeded. */
function buildAndCatch(storyFile: string): string | null {
  try {
    buildBrowser(storyFile, env(), { quiet: true, minify: false, sourcemap: false });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

beforeEach(() => {
  workDir = mkdtempSync(path.join(tmpdir(), 'sharpee-hatch-bind-'));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe('the hatch bind check (ADR-259 D5)', () => {
  it('a well-formed hatch builds', () => {
    expect(buildAndCatch(stage())).toBeNull();
  });

  it('a MISSING MODULE fails the build', () => {
    const story = stage();
    rmSync(path.join(workDir, 'extras.ts'));

    const message = buildAndCatch(story);

    expect(message).toContain('hatch binding failed');
    expect(message).toContain('not found');
  });

  it('a MISSING EXPORT fails the build, naming the hatch and its span', () => {
    const story = stage();
    writeFileSync(
      path.join(workDir, 'extras.ts'),
      `export const flavour = () => ({ kind: 'literal', text: 'misspelled' });\n`,
    );

    const message = buildAndCatch(story);

    expect(message).toContain('hatch binding failed');
    expect(message).toContain('flavor');
    // The loader's own message and the .story span, not a wrapper's guess.
    expect(message).toMatch(/tiny\.story:\d+:\d+/);
  });

  it('an EXPORT OF THE WRONG KIND fails the build', () => {
    const story = stage();
    writeFileSync(path.join(workDir, 'extras.ts'), 'export const flavor = 42;\n');

    const message = buildAndCatch(story);

    expect(message).toContain('hatch binding failed');
    expect(message).toContain('not a function');
  });

  it('a `chord.*` namespace violation fails the build', () => {
    const story = stage();
    writeFileSync(
      path.join(workDir, 'extras.ts'),
      'export const flavor = (ctx: any) => ({\n' +
        "  kind: 'literal',\n" +
        "  text: String(ctx.world.getStateValue('chord.story.state')),\n" +
        '});\n',
    );

    const message = buildAndCatch(story);

    expect(message).toContain('hatch binding failed');
    expect(message).toContain('chord.*');
  });

  it('the three failures are distinct — each names its own cause', () => {
    const causes = new Set<string>();
    for (const [source, marker] of [
      [null, 'not found'],
      [`export const flavour = () => ({ kind: 'literal', text: 'x' });\n`, 'flavor'],
      ['export const flavor = 42;\n', 'not a function'],
    ] as const) {
      rmSync(workDir, { recursive: true, force: true });
      const story = stage();
      if (source === null) rmSync(path.join(workDir, 'extras.ts'));
      else writeFileSync(path.join(workDir, 'extras.ts'), source);
      const message = buildAndCatch(story)!;
      expect(message).toContain(marker);
      causes.add(marker);
    }
    expect(causes.size).toBe(3);
  });
});

describe('no typechecker in the hatched build path (ADR-259 D5)', () => {
  it('neither the transpiler nor the browser build reaches for tsc', () => {
    // Types erase, so type errors usually still transpile; the errors that
    // break a hatched story are contract errors, which the loader rejects
    // with a better message than tsc would give.
    for (const file of ['hatch-transpile.ts', 'browser-core.ts']) {
      const source = readFileSync(path.resolve(__dirname, '..', 'src', 'standalone', file), 'utf-8');
      // Strip block comments — the ADR rationale names tsc on purpose.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/\btsc\b/);
      expect(code).not.toMatch(/tsconfig/);
      expect(code).not.toMatch(/['"]typescript['"]/);
    }
  });
});
