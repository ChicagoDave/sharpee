/**
 * generate-chord-appendices.test.ts — the Chord manual's appendix generator on
 * the real path: the real `scripts/generate-chord-appendices.cjs`, the built
 * `@sharpee/chord`, the built `sharpee` CLI, and the shipped grammar files,
 * writing into a scratch directory.
 *
 * Needs `packages/chord/dist` and `packages/devkit/dist` built.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

interface GrammarBlock {
  name: string;
  lines: string[];
}
interface CountRow {
  letter: string;
  count: number;
  sourceCount: number | null;
}
interface ChordBuild {
  KIND_NOUNS: Set<string>;
  TRAIT_ADJECTIVES: Set<string>;
  STATE_ADJECTIVES: Set<string>;
  CHARACTER_MANIFEST: Record<string, string[] | Record<string, string[] | Record<string, string>>>;
  REMOVED_FORMS: { code: string }[];
}
interface GeneratorOptions {
  chord: string;
  cli: string;
  out: string;
}
interface Generator {
  stripComments(ebnf: string): string;
  splitTopLevel(body: string): string[];
  parseRules(stripped: string): Map<string, string>;
  alternativesOf(rules: Map<string, string>, name: string): string[];
  sectionTitle(raw: string): string;
  parseStandardGrammar(source: string): GrammarBlock[];
  escapeCell(text: string): string;
  templateCell(template: string): string;
  generate(options: GeneratorOptions): { version: string; report: CountRow[] };
  FILES: Record<string, string>;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const generator: Generator = createRequire(import.meta.url)('../generate-chord-appendices.cjs');
const chordDist = join(root, 'packages/chord/dist');
const cli = join(root, 'packages/devkit/dist/cli.js');

let out: string;
let scratch: string;

beforeEach(() => {
  out = mkdtempSync(join(tmpdir(), 'chord-appendices-out-'));
  scratch = mkdtempSync(join(tmpdir(), 'chord-appendices-src-'));
});
afterEach(() => {
  rmSync(out, { recursive: true, force: true });
  rmSync(scratch, { recursive: true, force: true });
});

const written = (letter: string): string => readFileSync(join(out, generator.FILES[letter]), 'utf8');

describe('generate, on the shipped sources', () => {
  it('writes Appendices A to G, each with as many entries as its source', () => {
    generator.generate({ chord: chordDist, cli, out });

    expect(readdirSync(out).sort()).toEqual(Object.values(generator.FILES).sort());

    const ebnf = readFileSync(join(root, 'packages/chord/chord.ebnf'), 'utf8');
    const ruleHeads = generator.parseRules(generator.stripComments(ebnf));
    const rulesWritten = written('A').split('\n').filter((l) => /^[A-Za-z][A-Za-z0-9-]*\s*(=|$)/.test(l));
    expect(rulesWritten.length).toBe(ruleHeads.size);

    const grammar = readFileSync(join(root, 'packages/parser-en-us/grammar/standard-en-us.story'), 'utf8');
    const defined = grammar.split('\n').filter((l) => l.startsWith('define action ')).map((l) => l.split(' ')[2]);
    const actionHeadings = [...written('C').matchAll(/^## `([a-z_]+)` \{\.unnumbered \.unlisted\}$/gm)].map((m) => m[1]);
    expect(actionHeadings).toEqual([...defined].sort());
    expect(written('C')).toContain('    take the item off');

    const catalog: { messages: { alias: string }[] } = JSON.parse(
      execFileSync('node', [cli, 'messages'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }),
    );
    const aliasRows = [...written('F').matchAll(/^\| `([a-z0-9-]+)` \| /gm)].map((m) => m[1]);
    expect(aliasRows.sort()).toEqual(catalog.messages.map((m) => m.alias).sort());

    const registry: ChordBuild = createRequire(import.meta.url)(join(chordDist, 'index.js'));

    // B: every catalog kind, trait word and state word has its row.
    const wordRows = new Set([...written('B').matchAll(/^\| `([a-z-]+)` \|/gm)].map((m) => m[1]));
    for (const word of [...registry.KIND_NOUNS, ...registry.TRAIT_ADJECTIVES, ...registry.STATE_ADJECTIVES]) {
      expect(wordRows.has(word), `Appendix B has no row for ${word}`).toBe(true);
    }

    // D: known forms, one to a line, with a bare rule reference expanded.
    const lines = written('D').split('\n');
    expect(lines).toContain('"win" [ WORD ] [ stmt-when ] NL');
    expect(lines).toContain('"hide" "image" [ stmt-when ] NL');
    expect(lines).toContain('"is" [ "not" ] "here"');
    expect(lines).toContain('"can" ( "see" | "reach" ) name');
    expect(lines).not.toContain('media-statement');

    // E: every word of every character list is printed.
    for (const [list, words] of Object.entries(registry.CHARACTER_MANIFEST)) {
      if (!Array.isArray(words)) continue;
      for (const word of words) expect(written('E'), `${list}: ${word}`).toContain(`\`${word}\``);
    }

    const formHeadings = [...written('G').matchAll(/^## `([a-z.-]+)` \{\.unnumbered \.unlisted\}$/gm)].map((m) => m[1]);
    expect(formHeadings).toEqual(registry.REMOVED_FORMS.map((form) => form.code).sort());
    expect(written('G')).toContain('`define verb` was removed — add the verb onto the action directly');
  });

  it('writes no ADR reference and keeps every group heading out of the table of contents', () => {
    generator.generate({ chord: chordDist, cli, out });
    for (const letter of Object.keys(generator.FILES)) {
      const text = written(letter);
      expect(text).not.toMatch(/ADR-/);
      const headings = text.split('\n').filter((l) => l.startsWith('#'));
      expect(headings[0]).toMatch(new RegExp(`^# Appendix ${letter}\\. .+ \\{\\.unnumbered\\}$`));
      for (const heading of headings.slice(1)) expect(heading).toMatch(/^## .+ \{\.unnumbered \.unlisted\}$/);
      expect(text).not.toMatch(/^```(chord|shell)$/m);
    }
  });

  it('writes the same bytes on a second run', () => {
    generator.generate({ chord: chordDist, cli, out });
    const first = Object.keys(generator.FILES).map(written);
    generator.generate({ chord: chordDist, cli, out });
    expect(Object.keys(generator.FILES).map(written)).toEqual(first);
  });

  it('refuses, and writes nothing, when an appendix count differs from its source', () => {
    // A chord build whose alias set has lost one entry the CLI still emits.
    writeFileSync(
      join(scratch, 'index.js'),
      `const real = require(${JSON.stringify(join(chordDist, 'index.js'))});\n` +
        `const aliases = new Set(real.MESSAGE_OVERRIDE_ALIASES);\n` +
        `aliases.delete([...aliases][0]);\n` +
        `module.exports = { ...real, MESSAGE_OVERRIDE_ALIASES: aliases };\n`,
    );
    let refusal = '';
    try {
      generator.generate({ chord: scratch, cli, out });
    } catch (error) {
      refusal = (error as Error).message;
    }
    const counts = /Appendix F has (\d+) aliases, its source has (\d+)/.exec(refusal);
    expect(counts, refusal).not.toBeNull();
    expect(Number(counts![1]) - Number(counts![2])).toBe(1);
    expect(readdirSync(out)).toEqual([]);
  });

  it('refuses, and writes nothing, when a source would put an ADR reference in an appendix', () => {
    // A chord build whose first removed form cites a decision record.
    writeFileSync(
      join(scratch, 'index.js'),
      `const real = require(${JSON.stringify(join(chordDist, 'index.js'))});\n` +
        `const forms = real.REMOVED_FORMS.map((form, i) => (i === 0 ? { ...form, replacement: 'see ADR-123' } : form));\n` +
        `module.exports = { ...real, REMOVED_FORMS: forms };\n`,
    );
    expect(() => generator.generate({ chord: scratch, cli, out })).toThrow(/Appendix G carries an ADR reference/);
    expect(readdirSync(out)).toEqual([]);
  });
});

describe('the grammar readers', () => {
  it('drops comments and refuses one that never closes', () => {
    expect(generator.stripComments('a = "x" ; (* ADR-1 *)\nb = a ;')).toBe('a = "x" ; \nb = a ;');
    expect(() => generator.stripComments('a = "x" ; (* never closed')).toThrow(/did not close/);
  });

  it('splits only at a top-level bar, never inside a group or a literal', () => {
    expect(generator.splitTopLevel('"a" ( "b" | "c" ) | "|" x | [ y | z ]')).toEqual([
      '"a" ( "b" | "c" )',
      '"|" x',
      '[ y | z ]',
    ]);
    expect(() => generator.splitTopLevel('"a" ( "b"')).toThrow(/unbalanced/);
  });

  it('replaces a bare rule reference by that rule\'s alternatives', () => {
    const rules = generator.parseRules('statement = "win" NL | media ;\nmedia = "clear" NL | "hide" "image" NL ;');
    expect(generator.alternativesOf(rules, 'statement')).toEqual(['"win" NL', '"clear" NL', '"hide" "image" NL']);
    expect(() => generator.alternativesOf(rules, 'missing')).toThrow(/no rule named missing/);
  });

  it('strips citations from a section title', () => {
    expect(generator.sectionTitle('ADR-119 state-machine depth (spelling A per ADR-215)')).toBe('State-machine depth');
    expect(generator.sectionTitle('chapters (ADR-330) — a `use chapters` extension')).toBe('Chapters, a `use chapters` extension');
  });

  it('reads action blocks without their comments and refuses a stray top-level line', () => {
    const blocks = generator.parseStandardGrammar(
      'grammar "g"\n\n## a note\ndefine action taking\n  grammar\n    take the item\n      means gesture grab\n',
    );
    expect(blocks).toEqual([{ name: 'taking', lines: ['  grammar', '    take the item', '      means gesture grab'] }]);
    expect(() => generator.parseStandardGrammar('define action taking\n  grammar\nstray line\n')).toThrow(
      /unexpected line in taking/,
    );
  });

  it('escapes a template so Pandoc prints it as written', () => {
    expect(generator.escapeCell("you're | {here}")).toBe("you\\'re \\| \\{here\\}");
    expect(generator.templateCell('one\ntwo')).toBe('one `\\n` two');
    expect(generator.templateCell('')).toBe('(empty)');
  });
});
