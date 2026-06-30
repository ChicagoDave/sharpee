/**
 * @file structural-mandate.test.ts
 * @description ADR-202 AC-1 / ADR-201 AC-6 — the Structural Realization Mandate
 *   gate. Bans RegExp literals, `new RegExp`, and `String.prototype.replace`
 *   inside `english-assembler.ts` EXCEPT within the named token-local/whitespace
 *   helpers on the allowlist. A new structure-recovery regex added outside that
 *   allowlist fails CI here, so the realizer cannot quietly grow an ad-hoc
 *   parser over assembled prose.
 *
 * The gate scans the REAL production source via the TypeScript AST (so it tracks
 * the true enclosing function, not a line-regex guess), and a self-check proves
 * the scanner actually bites on a planted violation (not vacuously green).
 *
 * AC map: ADR-202 AC-1 (no structure-recovery string ops outside the allowlist),
 * ADR-202 AC-2 (the exempt helpers stay token-local / whitespace-only),
 * ADR-201 AC-6 (≡ ADR-202 AC-1 — one gate, implemented once).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as ts from 'typescript';

/**
 * The exempt allowlist from ADR-202 AC-1 — each entry applies a single
 * token/run-local rule or normalizes whitespace; none recovers grammatical
 * structure from prose. New helpers join only if they meet the same test.
 */
const ALLOWLIST = new Set([
  'regularPluralVerb',
  'capitalizeSentenceStart',
  'indefiniteArticle',
  'collapseWhitespace',
  'splitRunsOnNewlines',
]);

const ASSEMBLER_SRC = resolve(process.cwd(), 'src/assembler/english-assembler.ts');

interface Finding {
  fnName: string;
  line: number;
  text: string;
}

/**
 * Scan TS source for structure-discovery string ops (RegExp literals, `new
 * RegExp`, `.replace(...)`), reporting the nearest enclosing named function for
 * each. A finding whose `fnName` is not on the allowlist is a mandate violation.
 */
function scanStructuralStringOps(source: string, fileName = 'scan.ts'): Finding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const findings: Finding[] = [];

  const isReplaceCall = (n: ts.Node): boolean =>
    ts.isCallExpression(n) &&
    ts.isPropertyAccessExpression(n.expression) &&
    n.expression.name.text === 'replace';

  const isNewRegExp = (n: ts.Node): boolean =>
    ts.isNewExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'RegExp';

  const record = (node: ts.Node, fnName: string): void => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    findings.push({ fnName, line: line + 1, text: node.getText(sf).slice(0, 48) });
  };

  const visit = (node: ts.Node, fnName: string): void => {
    const current = ts.isFunctionDeclaration(node) && node.name ? node.name.text : fnName;
    if (node.kind === ts.SyntaxKind.RegularExpressionLiteral || isReplaceCall(node) || isNewRegExp(node)) {
      record(node, current);
    }
    ts.forEachChild(node, (child) => visit(child, current));
  };

  visit(sf, '<module>');
  return findings;
}

describe('Structural Realization Mandate gate (ADR-202 AC-1 / ADR-201 AC-6)', () => {
  const source = readFileSync(ASSEMBLER_SRC, 'utf8');
  const findings = scanStructuralStringOps(source, 'english-assembler.ts');

  it('the scanner actually finds the realizer’s string ops (gate is not vacuous)', () => {
    // If this is zero, the scan silently matched nothing (parse break / moved
    // file) and every "no violations" assertion below would be a false green.
    expect(findings.length).toBeGreaterThan(0);
  });

  it('AC-1: every regex / replace in english-assembler.ts lives in an allowlisted helper', () => {
    const violations = findings.filter((f) => !ALLOWLIST.has(f.fnName));
    // Surface the offending sites in the failure message for a fast fix.
    expect(
      violations,
      `structure-recovery string ops outside the ADR-202 allowlist:\n${violations
        .map((v) => `  ${v.fnName}() :${v.line}  ${v.text}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  it('AC-2: the only helpers using string ops are token-local / whitespace-only', () => {
    // The realizer is "born compliant": its string ops occur only in helpers
    // that strip a lemma’s -s, normalize whitespace, or split on literal
    // newlines — never structure recovered from prose.
    const usingHelpers = new Set(findings.map((f) => f.fnName));
    for (const fn of usingHelpers) {
      expect(ALLOWLIST.has(fn), `${fn}() uses a string op but is not on the allowlist`).toBe(true);
    }
    // collapseWhitespace reads an adjacent run's trailing space to JOIN runs —
    // whitespace normalization (ADR-183), explicitly permitted by ADR-202 AC-2,
    // not structure recovery.
    expect(usingHelpers.has('collapseWhitespace')).toBe(true);
  });

  it('self-check: a structure-recovery regex planted outside the allowlist IS flagged', () => {
    const planted = `
      function realizeSentence(text) {
        // forbidden: scanning prose for a sentence boundary to capitalize
        return text.replace(/\\. ([a-z])/g, (_, c) => '. ' + c.toUpperCase());
      }
      function collapseWhitespace(text) {
        return text.replace(/\\s+/g, ' '); // allowlisted — must NOT be flagged
      }
    `;
    const planted_findings = scanStructuralStringOps(planted);
    const violations = planted_findings.filter((f) => !ALLOWLIST.has(f.fnName));
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.every((v) => v.fnName === 'realizeSentence')).toBe(true);
    // The allowlisted helper in the same fixture is NOT a violation.
    expect(violations.some((v) => v.fnName === 'collapseWhitespace')).toBe(false);
  });
});
