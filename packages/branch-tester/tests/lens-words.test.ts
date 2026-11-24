/**
 * lens-words.test.ts — the examinable lens's one vocabulary (ADR-408
 * Consequences): the console form prints each class's title, each source's
 * words and the soundness footer from `lens-words.ts`, and that module stays
 * browser-safe, importing types only, so the Testing tab can alias it from
 * source as it does `claim-report` (ADR-355).
 *
 * Owner context: branch-tester test suite.
 */
import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ExaminableLensReport } from '@sharpee/ide-protocol';
import {
  EXAMINABLE_CLASS_TITLES,
  examinableClassTitle,
  formatExaminableReport,
  lensSourceWords,
  LENS_SOUNDNESS_FOOTER,
} from '../src/index.js';

const scullery = { key: 'scullery.description', kind: 'description' as const, ownerId: 'scullery', ownerName: 'Scullery' };
const corksState = { key: null, kind: 'state' as const, ownerId: 'jars', ownerName: 'jars' };
const room = { roomId: 'scullery', room: 'Scullery' };

const report: ExaminableLensReport = {
  seed: 42,
  reach: { roomsReached: 1, roomsDeclared: 1, unreached: [], commandsTyped: 0, ms: 50, maxSeconds: 30, stoppedBy: 'every-route' },
  phrasesExecuted: 3,
  counts: { 'resolved-default': 1, 'not-in-scope': 1, 'number-form': 1 },
  findings: [],
  rooms: [{
    roomId: 'scullery',
    room: 'Scullery',
    path: [],
    prose: [],
    rows: [
      { phrase: 'whetstone', kind: 'resolved-default', detail: 'if.action.examining.default_description', target: 'whetstone', targetId: 'whetstone', sources: [scullery], thing: true },
      { phrase: 'corks', kind: 'not-in-scope', detail: 'entity_not_found', sources: [corksState], thing: true },
      { phrase: 'crock', kind: 'number-form', detail: 'entity_not_found', resolvedForm: 'crocks', sources: [scullery], thing: true },
    ],
  }],
};

describe('the console form reads lens-words', () => {
  const lines = formatExaminableReport('scullery.story', report, { locate: (source) => (source.key ? { file: 'scullery.story', line: 18 } : undefined) });
  const text = lines.join('\n');

  it('prints each row\'s class title in the class column, never its id', () => {
    expect(lines).toContain(`   ${'No text'.padEnd(19)} "whetstone"  -> whetstone`);
    expect(lines).toContain(`   ${'Not answered'.padEnd(19)} "corks"`);
    expect(lines).toContain(`   ${'Number form'.padEnd(19)} "crock"  ("crocks" resolves)`);
    expect(text).not.toMatch(/^ {3}(resolved-default|not-in-scope|number-form) /m);
  });

  it('prints the counts by title', () => {
    expect(lines).toContain('by class          No text 1, Not answered 1, Number form 1');
  });

  it('prints each source as its owner and kind, with its place when the caller has one', () => {
    expect(text).toContain('from: Scullery description at scullery.story:18');
    expect(text).toContain('from: jars state text   [entity_not_found]');
  });

  it('ends with the soundness footer, exactly as the module declares it', () => {
    expect(lines.slice(-(LENS_SOUNDNESS_FOOTER.length + 1), -1)).toEqual([...LENS_SOUNDNESS_FOOTER]);
    expect(LENS_SOUNDNESS_FOOTER.join(' ')).toContain('Absence is not proof');
  });
});

describe('lens-words', () => {
  it('titles all six classes, and shows a class it does not know by its id rather than dropping it', () => {
    expect(Object.keys(EXAMINABLE_CLASS_TITLES).sort()).toEqual(['ambiguous', 'not-in-scope', 'number-form', 'resolved-default', 'resolved-described', 'unclassified']);
    expect(examinableClassTitle('resolved-default')).toBe('No text');
    expect(examinableClassTitle('unclassified')).toBe('Unclassified');
    expect(examinableClassTitle('some-later-class')).toBe('some-later-class');
  });

  it('names a source by owner and kind', () => {
    expect(lensSourceWords(scullery)).toBe('Scullery description');
    expect(lensSourceWords({ ...scullery, kind: 'first-visit' })).toBe('Scullery first-visit text');
    expect(lensSourceWords(corksState)).toBe('jars state text');
  });

  it('is browser-safe: every import is type-only, so it never pulls world-index, fs or the engine into the Testing tab', () => {
    const source = readFileSync(path.resolve(__dirname, '..', 'src', 'lens', 'lens-words.ts'), 'utf8');
    const imports = source.split('\n').filter((line) => /^\s*import\b/.test(line));
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) expect(line).toMatch(/^import type /);
    expect(source).not.toMatch(/\brequire\(/);
  });
});
