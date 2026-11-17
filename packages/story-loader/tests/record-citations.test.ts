/**
 * record-citations.test.ts — no text story-loader produces cites an internal
 * record.
 *
 * A load error reaches the author through the CLI or the IDE, and an author
 * cannot follow a decision-record number or a design-record name. The rule is
 * held over every string and template literal in src/, read through the
 * TypeScript parser so a comment (where a citation belongs) is never mistaken
 * for text.
 *
 * The pattern is the one packages/chord/tests/removed-forms.test.ts holds the
 * compiler to. The fixture, fixtures/record-citations/cites-a-record.ts.txt,
 * is source the scan is known to fail on.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'src');

/** A reference an author cannot follow: a decision-record number or a design-record name. */
const CITATION = /ADR-\d+|\bGH #\d+|\bratchet\b|\bgiven \d|ownership package|grammar log|\bDecision \d/;

/** Every string and template literal in a source text, comments and regex literals excluded. */
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

/** Every non-test `.ts` file under a directory. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

describe('text in story-loader src/', () => {
  it('has no string literal that cites a record', () => {
    const citing: string[] = [];
    let total = 0;
    for (const file of sourceFiles(SRC)) {
      const literals = literalsOf(readFileSync(file, 'utf8'));
      total += literals.length;
      for (const literal of literals) {
        if (CITATION.test(literal)) citing.push(`${relative(SRC, file)}: ${literal.replace(/\n/g, '\\n').slice(0, 90)}`);
      }
    }
    // The floor proves the scan read the source: 4,366 literals when written.
    expect(total).toBeGreaterThan(4000);
    expect(citing).toEqual([]);
  });

  // The fixture exercises two alternatives of the pattern; this holds the rest,
  // so a slip in any one alternative is noticed.
  it.each([
    'refused (ADR-12)',
    'see GH #401',
    'the ratchet forbids it',
    'not a state (given 8)',
    'the ownership package',
    'per the grammar log',
    'under Decision 4',
  ])('the pattern reports "%s"', (text) => {
    expect(CITATION.test(text)).toBe(true);
  });

  it('fails on the fixture: a cited record and a citing template, and nothing else', () => {
    const fixture = readFileSync(join(here, 'fixtures', 'record-citations', 'cites-a-record.ts.txt'), 'utf8');
    expect(literalsOf(fixture)).toHaveLength(5);
    expect(literalsOf(fixture).filter((literal) => CITATION.test(literal))).toEqual([
      'The fixture story is refused (ADR-999 D2) — fix its config.',
      '` is not loaded (given 8). Name what ',
    ]);
  });
});
