/**
 * stdlib-chord-reference.test.ts — ADR-265 D1/D2/D3: the generated
 * reference-only Chord rendering of the standard library.
 *
 * Asserts the load-bearing invariants:
 *  - completeness: one reference per standard action (no action escapes),
 *  - validity + enforcement: every reference compiles, carries the marker, and
 *    the loader REFUSES it (D2 — never on the load path, AC-6),
 *  - drift: regenerating in-memory reproduces the committed tree byte-for-byte
 *    (AC-4 — a stdlib change without regeneration fails the build).
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compile } from '@sharpee/chord';
import { standardActions } from '@sharpee/stdlib';
import { createStory } from '../src';

const require = createRequire(import.meta.url);
const gen = require(join(__dirname, '..', '..', '..', 'scripts', 'generate-stdlib-chord.js'));
const OUT_DIR: string = gen.OUT_DIR;

const storyFiles = () => readdirSync(OUT_DIR).filter((f) => f.endsWith('.story'));

describe('stdlib-chord reference (ADR-265)', () => {
  it('has exactly one reference per standard action (completeness)', () => {
    const actionCount = standardActions.filter((a: { id?: string }) => a?.id?.startsWith('if.action.')).length;
    expect(storyFiles().length).toBe(actionCount);
  });

  it('every reference compiles, carries the marker, and the loader refuses it (D2)', () => {
    for (const f of storyFiles()) {
      const src = readFileSync(join(OUT_DIR, f), 'utf8');
      const r = compile(src);
      expect(r.diagnostics.filter((d) => d.severity === 'error'), f).toEqual([]);
      expect(r.ir.meta.fields['reference-only'], f).toBe('true');
      expect(() => createStory(r.ir), f).toThrow(/reference-only/i);
    }
  });

  it('is not stale — regenerating reproduces the committed tree (drift, AC-4)', () => {
    const fresh: Record<string, string> = gen.renderAll();
    for (const [name, content] of Object.entries(fresh)) {
      expect(readFileSync(join(OUT_DIR, name), 'utf8'), name).toBe(content);
    }
    // No committed file beyond what the generator emits.
    const emitted = new Set(Object.keys(fresh));
    for (const f of readdirSync(OUT_DIR)) expect(emitted.has(f), `stray: ${f}`).toBe(true);
  });

  it('the website reference page is also fresh (drift)', () => {
    expect(readFileSync(gen.OUT_MDX, 'utf8')).toBe(gen.renderWebsiteMdx());
  });
});
