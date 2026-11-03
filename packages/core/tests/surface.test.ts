/**
 * surface.test.ts — the public surface of @sharpee/core is a list someone wrote.
 *
 * Holds the shape ADR-391 D1 gives the root barrel: `src/index.ts` names every
 * public symbol and contains no `export *`, and every name it lists resolves to
 * a declaration in the module it names, so a deleted module cannot leave a
 * dangling line. Value exports are additionally checked at runtime, so a name
 * exported plain that is really a type (and therefore erased) fails here.
 *
 * No count assertion and no line budget (ADR-334 D2): the invariant is that
 * the surface is a written list, not that the list has a size.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as core from '../src/index';

const BARREL = path.resolve(__dirname, '../src/index.ts');
const SRC = path.resolve(__dirname, '../src');

interface ExportLine {
  typeOnly: boolean;
  names: { local: string; exported: string }[];
  from: string;
}

/** Parse every `export { … } from '…'` and `export type { … } from '…'` statement in the barrel. */
function parseBarrel(source: string): ExportLine[] {
  const re = /export\s+(type\s+)?\{([^}]*)\}\s*from\s*'([^']+)'/g;
  const lines: ExportLine[] = [];
  for (const m of source.matchAll(re)) {
    const names = m[2]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [local, exported] = s.split(/\s+as\s+/).map((t) => t.trim());
        return { local, exported: exported ?? local };
      });
    lines.push({ typeOnly: Boolean(m[1]), names, from: m[3] });
  }
  return lines;
}

/** True when `moduleSource` declares `name` at top level with any export kind. */
function declares(moduleSource: string, name: string): boolean {
  const re = new RegExp(
    `^export\\s+(?:abstract\\s+class|class|function|async\\s+function|const|let|interface|type|enum)\\s+${name}\\b`,
    'm'
  );
  return re.test(moduleSource);
}

describe('@sharpee/core public surface (ADR-391 D1)', () => {
  const source = fs.readFileSync(BARREL, 'utf8');
  const lines = parseBarrel(source);

  it('names every public symbol: the root barrel has no `export *` line', () => {
    const stars = source.split('\n').filter((l) => /^\s*export\s+\*/.test(l));
    expect(stars, `export * lines in src/index.ts: ${stars.join(' | ')}`).toEqual([]);
    expect(lines.length).toBeGreaterThan(0);
  });

  it('every listed name resolves to a declaration in the module it names', () => {
    const missing: string[] = [];
    for (const line of lines) {
      const file = path.resolve(SRC, line.from.replace(/\.js$/, '.ts'));
      if (!fs.existsSync(file)) {
        missing.push(`${line.from} (module file missing)`);
        continue;
      }
      const moduleSource = fs.readFileSync(file, 'utf8');
      for (const { local } of line.names) {
        if (!declares(moduleSource, local)) missing.push(`${local} not declared in ${line.from}`);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('every plain (value) export is present at runtime', () => {
    const erased: string[] = [];
    for (const line of lines) {
      if (line.typeOnly) continue;
      for (const { exported } of line.names) {
        if (!(exported in core)) erased.push(exported);
      }
    }
    expect(erased, `exported plain but absent at runtime (type-only?): ${erased.join(', ')}`).toEqual([]);
  });
});
