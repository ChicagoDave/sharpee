/**
 * assertion-core-ownership.test.ts — the assertion core has one owner
 * (ADR-340 D3).
 *
 * The claim language's evaluator lives in `@sharpee/transcript-tester`; this
 * package calls it and never carries a copy. The names are pinned in
 * `fixtures/assertion-core-names.json`, and the test reads this package's
 * source text rather than its exports: a private redefinition is exactly the
 * drift D3 exists to catch, and a private function is invisible to an
 * import-based check.
 *
 * Two claims per name: no file under `src/` declares it, and every file that
 * uses it binds it from an `@sharpee/transcript-tester` specifier. Both fail
 * by name, so the failure says which copy to delete.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, '../src');
const fixture = JSON.parse(
  readFileSync(join(here, 'fixtures/assertion-core-names.json'), 'utf-8'),
) as { names: string[] };

/** Every `.ts` source file of this package, with its text. */
const sources = readdirSync(srcDir)
  .filter((file) => file.endsWith('.ts'))
  .map((file) => ({ file, text: readFileSync(join(srcDir, file), 'utf-8') }));

/** A top-level declaration of `name` — function, const, let, or class. */
function declares(text: string, name: string): boolean {
  const pattern = new RegExp(
    `^(?:export\\s+)?(?:async\\s+)?(?:function\\s+${name}\\b|(?:const|let|class)\\s+${name}\\b)`,
    'm',
  );
  return pattern.test(text);
}

/** Every `import { … } from` and `export { … } from` statement — the two ways a name is bound from elsewhere. */
const BINDING_STATEMENT = /(?:import|export)\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]/g;

/** The specifiers `name` is bound from, across every binding statement in `text`. */
function importSpecifiersOf(text: string, name: string): string[] {
  const specifiers: string[] = [];
  const imports = text.matchAll(BINDING_STATEMENT);
  for (const match of imports) {
    const bound = match[1]
      .split(',')
      .map((entry) => entry.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim());
    if (bound.includes(name)) specifiers.push(match[2]);
  }
  return specifiers;
}

/** Whether `text` refers to `name` as an identifier outside its own binding statements. */
function references(text: string, name: string): boolean {
  const withoutImports = text.replace(BINDING_STATEMENT, '');
  return new RegExp(`\\b${name}\\b`).test(withoutImports);
}

describe('assertion core ownership (ADR-340 D3)', () => {
  it('pins a non-empty name set', () => {
    expect(fixture.names.length).toBeGreaterThan(0);
  });

  for (const name of fixture.names) {
    it(`${name} is not defined in this package`, () => {
      const copies = sources.filter(({ text }) => declares(text, name)).map(({ file }) => file);
      expect(copies, `${name} is redefined in src/${copies.join(', src/')} — delete the copy and import it from @sharpee/transcript-tester`).toEqual([]);
    });

    it(`${name} is imported from @sharpee/transcript-tester wherever it is used`, () => {
      const offenders = sources
        .filter(({ text }) => references(text, name))
        .filter(({ text }) => !importSpecifiersOf(text, name).some((s) => s.startsWith('@sharpee/transcript-tester')))
        .map(({ file }) => file);
      expect(offenders, `${name} is used in src/${offenders.join(', src/')} without an import from @sharpee/transcript-tester`).toEqual([]);
    });
  }
});
