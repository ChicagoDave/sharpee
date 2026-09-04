/**
 * manifest.test.ts — GH #358: the manifest step's dist gate.
 *
 * `runManifestStep` runs before the packages it reads from have compiled, so
 * it must cope with three dist states: missing (cold host), present and
 * current, and present but STALE — built before the exports the generators
 * read existed. The third one killed the platform build on plover for three
 * weeks: the old existence check accepted the stale dist, the generator read
 * `.length` off an undefined export, and the build died before the compile
 * that would have refreshed the dist. These tests drive the gate against
 * fabricated dists in a temp root, then the real repo's dist.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import { DIST_MODULES, probeDistModules, runManifestStep } from './manifest';

const STDLIB_MODULE = 'packages/chord/src/stdlib-manifest.ts';
const CHARACTER_MODULE = 'packages/chord/src/character-manifest.ts';

/** Write a CommonJS module under `root` exporting each name as an empty array. */
function writeModule(root: string, rel: string, names: readonly string[]): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, names.map((n) => `exports.${n} = [];`).join('\n') + '\n');
}

/** A fabricated root whose every dist module carries every export the generators read. */
function completeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'repokit-manifest-'));
  for (const [rel, names] of DIST_MODULES) writeModule(root, rel, names);
  return root;
}

function writeCommitted(root: string): void {
  writeModule(root, STDLIB_MODULE, []);
  writeModule(root, CHARACTER_MODULE, []);
  writeFileSync(join(root, STDLIB_MODULE), '// committed stdlib manifest\n');
  writeFileSync(join(root, CHARACTER_MODULE), '// committed character manifest\n');
}

const roots: string[] = [];
afterEach(() => {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
});

describe('probeDistModules — the dist gate', () => {
  it('accepts a dist that carries every export the generators read', () => {
    const root = completeRoot();
    roots.push(root);
    expect(probeDistModules(root)).toBeNull();
  });

  it('names a module that is not built at all', () => {
    const root = completeRoot();
    roots.push(root);
    rmSync(join(root, 'packages/character/dist/cognitive-presets.js'));
    expect(probeDistModules(root)).toBe('packages/character/dist/cognitive-presets.js not built yet');
  });

  it('names a STALE module and lists the exports it lacks (the plover state)', () => {
    const root = completeRoot();
    roots.push(root);
    // The 2026-08-14 world-model dist: everything before ADR-318, nothing after.
    const vocab = 'packages/world-model/dist/traits/character-model/character-vocabulary.js';
    writeModule(root, vocab, [
      'PERSONALITY_TRAITS', 'INTENSITY_WORDS', 'MOODS', 'MOOD_MODIFIERS', 'DISPOSITION_WORDS',
      'THREAT_LEVELS', 'CONFIDENCE_WORDS', 'FACT_SOURCES', 'RESISTANCE_MODES', 'COGNITIVE_DIMENSIONS',
    ]);
    const reason = probeDistModules(root);
    expect(reason).toContain(`${vocab} is stale`);
    for (const missing of ['FORCES', 'ACT_CATEGORIES', 'OBLIGATION_WORDS', 'FACE_ACTS', 'PRESSURE_BANDS']) {
      expect(reason).toContain(missing);
    }
  });

  it('names a module that exists but cannot be loaded', () => {
    const root = completeRoot();
    roots.push(root);
    writeFileSync(join(root, 'packages/chord/dist/index.js'), 'throw new Error("boom from a half-written dist");\n');
    expect(probeDistModules(root)).toMatch(/^packages\/chord\/dist\/index\.js failed to load: boom/);
  });

  it('DIST_MODULES covers every dist path the generators require()', () => {
    // The gate is only as good as this list. Read the generator source and
    // check each `require(join(root, '<dist path>'))` is a probed module.
    const source = readFileSync(join(__dirname, 'manifest.ts'), 'utf8');
    const required = [...source.matchAll(/require\(join\(root, '([^']+)'\)\)/g)].map((m) => m[1]);
    expect(required.length).toBeGreaterThan(0);
    const probed = new Set(DIST_MODULES.map(([rel]) => rel));
    for (const rel of required) expect(probed.has(rel), `${rel} is required but not probed`).toBe(true);
  });
});

describe('runManifestStep — falls back instead of dying', () => {
  it('a stale dist with committed modules present: returns, writes nothing, leaves the committed bytes alone', () => {
    const root = completeRoot();
    roots.push(root);
    writeCommitted(root);
    const before = {
      stdlib: readFileSync(join(root, STDLIB_MODULE), 'utf8'),
      character: readFileSync(join(root, CHARACTER_MODULE), 'utf8'),
    };
    writeModule(root, 'packages/world-model/dist/traits/character-model/character-vocabulary.js', ['PERSONALITY_TRAITS']);

    expect(() => runManifestStep(root, true)).not.toThrow();

    expect(readFileSync(join(root, STDLIB_MODULE), 'utf8')).toBe(before.stdlib);
    expect(readFileSync(join(root, CHARACTER_MODULE), 'utf8')).toBe(before.character);
  });

  it('a stale dist with NO committed modules: throws, and the error says why the dist was rejected', () => {
    const root = completeRoot();
    roots.push(root);
    writeModule(root, 'packages/character/dist/goals/goal-types.js', []);
    expect(existsSync(join(root, STDLIB_MODULE))).toBe(false);
    expect(() => runManifestStep(root, true)).toThrow(/goal-types\.js is stale — missing export\(s\) GOAL_PRIORITIES/);
  });
});

describe('the real repository', () => {
  it('the built dist, when present, passes the gate (otherwise the platform build would silently regress to the committed modules)', () => {
    const root = findRepoRoot();
    const firstMissing = DIST_MODULES.find(([rel]) => !existsSync(join(root, rel)));
    if (firstMissing) {
      // A cold checkout: the fallback path is the right answer and is covered above.
      expect(probeDistModules(root)).toBe(`${firstMissing[0]} not built yet`);
      return;
    }
    expect(probeDistModules(root)).toBeNull();
  });
});
