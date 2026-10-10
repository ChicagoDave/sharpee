/**
 * ebnf.test.ts — the chord build's grammar gate.
 *
 * Each defect the gate refuses is pinned on a small grammar written to show
 * it, then the real `chord.ebnf` is pinned clean, and `runEbnfStep` is driven
 * against a temp root so the build-stopping throw is real.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import { EBNF_PATH, analyzeEbnf, ebnfDefects, runEbnfStep } from './ebnf';

/** A minimal well-formed grammar in the file's dialect, with the prose-only MARKER. */
const OK = [
  '(* header *)',
  'story-file = { declaration } ;',
  'grammar-file = "grammar" ;',
  'declaration = create | define ;',
  'create = "create" WORD NL >>> { line } ;',
  'line = composition { "," composition } NL ;',
  'composition = ( ARTICLE KIND | WORD ) ;',
  'KIND = "thing" | "room" ;',
  'define = "define" WORD ;',
  'MARKER = "{" WORD "}" ;',
  '',
].join('\n');

const defects = (text: string) => ebnfDefects(analyzeEbnf(text));

describe('ebnfDefects', () => {
  it('accepts a well-formed grammar', () => {
    expect(defects(OK)).toEqual([]);
  });

  it('refuses a comment opened mid-rule that swallows the terminator', () => {
    const swallowed = OK.replace('KIND = "thing" | "room" ;', 'KIND = "thing" (* note\n  | "room" ; *)');
    expect(defects(swallowed)).toContain('line 8: rule KIND missing ;');
  });

  it('refuses a rule nothing reaches', () => {
    const orphan = OK.replace('declaration = create | define ;', 'declaration = create ;');
    expect(defects(orphan)).toEqual(['rule `define` is unreachable from story-file / grammar-file / claims-file']);
  });

  it('refuses alternatives swallowed by a comment (their rule becomes unreachable)', () => {
    const swallowed = OK.replace('declaration = create | define ;', 'declaration = create (* note\n  | define *) ;');
    expect(defects(swallowed)).toEqual(['rule `define` is unreachable from story-file / grammar-file / claims-file']);
  });

  it('refuses a rule defined twice', () => {
    expect(defects(`${OK}define = "define" ;\n`)).toEqual(['rule `define` is defined twice']);
  });

  it('refuses a comment opened inside a comment, at the inner line', () => {
    expect(defects(`(* outer\n  (* inner *) *)\n${OK}`)).toEqual(['line 2: a comment opens inside a comment']);
  });

  it('refuses a character the reader does not know', () => {
    expect(defects(OK.replace('define = "define" WORD ;', 'define = "define" WORD ! ;'))).toEqual([
      'unknown character `!` outside a comment or literal',
    ]);
  });

  it('refuses a stale prose-only list when MARKER becomes referenced', () => {
    const referenced = OK.replace('define = "define" WORD ;', 'define = "define" MARKER ;');
    expect(defects(referenced)).toEqual([
      'rule `MARKER` is listed as prose-only but is now referenced (or gone) — update EXPECTED_UNREACHABLE',
    ]);
  });
});

describe('the real chord.ebnf', () => {
  const root = findRepoRoot();
  const analysis = analyzeEbnf(readFileSync(join(root, EBNF_PATH), 'utf8'));

  it('has no defects', () => {
    expect(ebnfDefects(analysis)).toEqual([]);
  });

  it('measures as a grammar: rules, keywords, and the kind nouns as terminals', () => {
    expect(analysis.size.VAR).toBeGreaterThan(150);
    expect(analysis.keywords).toEqual(expect.arrayContaining(['thing', 'room', 'door', 'person', 'container', 'supporter', 'region']));
    expect(analysis.unreachable).toEqual(['MARKER']);
  });
});

describe('runEbnfStep', () => {
  let tmp: string | null = null;
  afterEach(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  });

  const rootWith = (text: string) => {
    tmp = mkdtempSync(join(tmpdir(), 'repokit-ebnf-'));
    const file = join(tmp, EBNF_PATH);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, text);
    return tmp;
  };

  it('returns for a well-formed grammar', () => {
    expect(() => runEbnfStep(rootWith(OK), true)).not.toThrow();
  });

  it('throws, naming every defect, so the build stops before chord compiles', () => {
    const broken = `(* a (* b *) *)\n${OK.replace('declaration = create | define ;', 'declaration = create ;')}`;
    expect(() => runEbnfStep(rootWith(broken), true)).toThrow(
      /not well-formed —\n {2}line 1: a comment opens inside a comment\n {2}rule `define` is unreachable/,
    );
  });
});
