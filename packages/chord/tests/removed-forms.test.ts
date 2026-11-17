/**
 * removed-forms.test.ts — the removed-forms registry and the wording rule it
 * rests on.
 *
 * Three things are held here:
 *  1. every registry entry's example raises that entry's code when compiled,
 *     so an entry cannot outlive its form;
 *  2. a removed-form code is reported only with the registry's text (a
 *     structural scan of src/, in the manner of world-model's
 *     traversal-readers test);
 *  3. no diagnostic message cites a decision record or a design record.
 *
 * Two scans hold the third. The call scan reads diagnostic calls whose code
 * is a string literal (most of them; a few codes are computed) and the
 * literals written inside the call. The literal scan reads every string and
 * template literal in src/, which catches a message held in a constant or
 * reported under a computed code. Their fixture, fixtures/diagnostic-wording/
 * cites-a-record.ts.txt, is source both are known to fail on.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { compile, REMOVED_FORMS, removedFormMessage } from '../src';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'src');
const REGISTRY_FILE = 'removed-forms.ts';

/** A reference an author cannot follow: a decision-record number or a design-record name. */
const CITATION = /ADR-\d+|\bGH #\d+|\bratchet\b|\bgiven \d|ownership package|grammar log|\bDecision \d/;

/** The one registry code a second fact also reports: a header key that never existed. */
const SHARED_CODES: Readonly<Record<string, number>> = { 'parse.header-unknown-field': 1 };

interface CallSite {
  where: string;
  code: string;
  /** The static text of every string and template literal in the call's arguments. */
  literals: string[];
  /** The code handed to removedFormMessage() inside the call, when there is one. */
  registryCode: string | null;
}

/**
 * Reads source text from `start` to the parenthesis that closes the call,
 * collecting literal text and skipping comments. Returns the literals and the
 * index after the call.
 */
function readCall(source: string, start: number): { literals: string[]; end: number } {
  const literals: string[] = [];
  let i = start;
  const readQuoted = (quote: string): void => {
    let text = '';
    i++;
    while (i < source.length && source[i] !== quote) {
      if (source[i] === '\\') { text += source[i + 1]; i += 2; continue; }
      text += source[i++];
    }
    i++;
    literals.push(text);
  };
  const readTemplate = (): void => {
    let text = '';
    i++;
    while (i < source.length && source[i] !== '`') {
      if (source[i] === '\\') { text += source[i + 1]; i += 2; continue; }
      if (source[i] === '$' && source[i + 1] === '{') {
        i += 2;
        text += '…';
        readCode('}');
        continue;
      }
      text += source[i++];
    }
    i++;
    literals.push(text);
  };
  /** Reads code up to the unmatched `closer`, descending into literals and comments. */
  const readCode = (closer: string): void => {
    const opener = closer === ')' ? '(' : '{';
    let nested = 0;
    while (i < source.length) {
      const ch = source[i];
      if (ch === '/' && source[i + 1] === '/') { while (i < source.length && source[i] !== '\n') i++; continue; }
      if (ch === '/' && source[i + 1] === '*') { i = source.indexOf('*/', i) + 2; continue; }
      if (ch === "'" || ch === '"') { readQuoted(ch); continue; }
      if (ch === '`') { readTemplate(); continue; }
      if (ch === opener) nested++;
      if (ch === closer) {
        if (nested === 0) { i++; return; }
        nested--;
      }
      i++;
    }
  };
  readCode(')');
  return { literals, end: i };
}

/**
 * Every string and template literal in a source text, read from the
 * TypeScript parser so comments and regex literals are never mistaken for text.
 */
function literalsOf(source: string): string[] {
  const literals: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) literals.push(node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) literals.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile('scanned.ts', source, ts.ScriptTarget.ES2022, true));
  return literals;
}

/** Every diagnostic call in a source text whose code is a string literal. */
function scanCalls(source: string, where: string): CallSite[] {
  const sites: CallSite[] = [];
  const head = /\.(?:error|warning)\(\s*(['`])([a-z]+\.[a-z0-9-]+)\1\s*,/g;
  let match: RegExpExecArray | null;
  while ((match = head.exec(source))) {
    const { literals, end } = readCall(source, head.lastIndex);
    const text = source.slice(head.lastIndex, end);
    const registry = /removedFormMessage\(\s*'([^']+)'/.exec(text);
    const line = source.slice(0, match.index).split('\n').length;
    sites.push({ where: `${where}:${line}`, code: match[2], literals, registryCode: registry ? registry[1] : null });
  }
  return sites;
}

/** The wording defects in a set of call sites, one line each; empty when clean. */
function wordingDefects(sites: CallSite[], registryCodes: ReadonlySet<string>): string[] {
  const defects: string[] = [];
  const ownText = new Map<string, number>();
  for (const site of sites) {
    for (const literal of site.literals) {
      if (CITATION.test(literal)) defects.push(`${site.where} ${site.code} cites a record: ${literal.slice(0, 80)}`);
    }
    if (!registryCodes.has(site.code)) continue;
    if (site.registryCode === site.code) continue;
    if (site.registryCode !== null) {
      defects.push(`${site.where} ${site.code} takes its text from ${site.registryCode}`);
      continue;
    }
    ownText.set(site.code, (ownText.get(site.code) ?? 0) + 1);
    if ((ownText.get(site.code) ?? 0) > (SHARED_CODES[site.code] ?? 0)) {
      defects.push(`${site.where} ${site.code} is a removed form reported with its own text`);
    }
  }
  return defects;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });
}

const registryCodes = new Set<string>(REMOVED_FORMS.map((form) => form.code));
const srcSites = sourceFiles(SRC)
  .filter((file) => relative(SRC, file) !== REGISTRY_FILE)
  .flatMap((file) => scanCalls(readFileSync(file, 'utf8'), relative(SRC, file)));

describe('the removed-forms registry', () => {
  it('lists each form once, with a form, a replacement and an example', () => {
    expect(registryCodes.size).toBe(REMOVED_FORMS.length);
    for (const form of REMOVED_FORMS) {
      expect(form.form, form.code).not.toBe('');
      expect(form.replacement, form.code).not.toBe('');
      expect(form.example, form.code).toMatch(/\n$/);
    }
  });

  it.each(REMOVED_FORMS.map((form) => [form.code, form] as const))(
    '%s: its example raises it, with a message that cites no record',
    (code, form) => {
      const raised = compile(form.example).diagnostics.filter((d) => d.code === code);
      expect(raised.length, `nothing raised ${code} for:\n${form.example}`).toBeGreaterThan(0);
      for (const diagnostic of raised) {
        expect(diagnostic.severity).toBe('error');
        expect(diagnostic.message).not.toMatch(CITATION);
      }
    },
  );

  it('prints the words a site hands it', () => {
    expect(removedFormMessage('parse.removed-slot-spelling', ':animal', 'animal')).toBe(
      'The `:animal` slot spelling was removed — write `the animal`.',
    );
    expect(removedFormMessage('parse.removed-capacity-setting', 'max weight', '3')).toBe(
      '`with max weight` was removed — write the capacity as its own line: `holds 3`. Weight is not a Chord concept; `holds` counts things.',
    );
    expect(removedFormMessage('parse.removed-capacity-setting', 'capacity', '<n>')).toBe(
      '`with capacity` was removed — write the capacity as its own line: `holds <n>`.',
    );
  });

  it('is where every reported removed form gets its text', () => {
    const reported = new Set(srcSites.filter((site) => site.registryCode === site.code).map((site) => site.code));
    expect([...registryCodes].filter((code) => !reported.has(code))).toEqual([]);
  });
});

describe('diagnostic wording in src/', () => {
  it('finds the diagnostic calls it is meant to read', () => {
    expect(srcSites.length).toBeGreaterThan(1000);
  });

  it('cites no record, and reports no removed form with text of its own', () => {
    expect(wordingDefects(srcSites, registryCodes)).toEqual([]);
  });

  // The call scan cannot see a message held in a constant or reported under a
  // computed code, so the rule is also held over every string and template
  // literal in src/, the registry file included: comments may cite, text may not.
  it('has no string literal anywhere in src/ that cites a record', () => {
    const citing: string[] = [];
    let total = 0;
    for (const file of sourceFiles(SRC)) {
      const literals = literalsOf(readFileSync(file, 'utf8'));
      total += literals.length;
      for (const literal of literals) {
        if (CITATION.test(literal)) citing.push(`${relative(SRC, file)}: ${literal.slice(0, 90)}`);
      }
    }
    expect(total).toBeGreaterThan(5000);
    expect(citing).toEqual([]);
  });

  it('fails on the fixture: a cited record, a removed form with its own text, a citing template', () => {
    const fixture = readFileSync(join(here, 'fixtures', 'diagnostic-wording', 'cites-a-record.ts.txt'), 'utf8');
    const sites = scanCalls(fixture, 'fixture');
    expect(sites.map((site) => site.code)).toEqual([
      'parse.fixture-cites',
      'parse.removed-if',
      'analysis.fixture-template',
      'parse.fixture-clean',
    ]);
    expect(literalsOf(fixture).filter((literal) => CITATION.test(literal))).toEqual([
      'The fixture form is not legal here (ADR-999 D2) — write it on its owner.',
      '` is not a state (given 8). Name what ',
    ]);
    const defects = wordingDefects(sites, registryCodes);
    expect(defects).toHaveLength(3);
    expect(defects[0]).toMatch(/^fixture:8 parse\.fixture-cites cites a record: .*ADR-999/);
    expect(defects[1]).toMatch(/^fixture:13 parse\.removed-if is a removed form reported with its own text$/);
    expect(defects[2]).toMatch(/^fixture:14 analysis\.fixture-template cites a record: .*given 8/);
  });
});
