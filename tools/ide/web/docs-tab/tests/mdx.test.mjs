/**
 * mdx.test.mjs — reducing sharpee.net's MDX to markdown.
 *
 * The two components the corpus uses, the module plumbing that must not reach
 * the page, and — most important — the report of anything left over. A
 * component the website adds later must fail the bundle loudly; if `unsupported`
 * ever goes quiet, pages lose content in the IDE with no signal at all.
 * Owner context: tools/ide — Tests.
 */

import { describe, it, expect } from 'vitest';
import { reduceMdx, parseGrammarBlocks } from '../src/mdx.mjs';

const grammarBlocks = {
  'if.action.looking': 'define action looking\n  grammar\n    look\n    l',
};

const reduce = (source) => reduceMdx(source, { grammarBlocks });

describe('parseGrammarBlocks', () => {
  it('reads the generated data module', () => {
    const source = `
/** header */
export const grammarBlocks: Record<string, string> = {
  "if.action.looking": "define action looking\\n  grammar\\n    look",
  "if.action.taking": "define action taking",
};
`;
    const parsed = parseGrammarBlocks(source);
    expect(parsed['if.action.looking']).toBe('define action looking\n  grammar\n    look');
    expect(parsed['if.action.taking']).toBe('define action taking');
  });

  it('REJECTS a module whose shape changed rather than returning nothing', () => {
    // Returning {} here would empty 55 grammar blocks out of the stdlib
    // reference with no error anywhere.
    expect(() => parseGrammarBlocks('export const somethingElse = 1;')).toThrow();
  });
});

describe('reduceMdx', () => {
  it('expands GrammarBlock into a verbatim chord fence', () => {
    const { markdown } = reduce('<GrammarBlock action="if.action.looking" />');
    expect(markdown).toBe(
      '```chord\ndefine action looking\n  grammar\n    look\n    l\n```',
    );
  });

  it('REJECTS an unknown action id', () => {
    // Mirrors the website component, which throws at build time rather than
    // rendering an empty block.
    expect(() => reduce('<GrammarBlock action="if.action.nope" />')).toThrow(/no such action/);
  });

  it('renders a titled Callout as a blockquote led by the title', () => {
    const { markdown } = reduce(
      '<Callout title="Where the platform comes from">\n  A story project declares\n  its own dependency.\n</Callout>',
    );
    expect(markdown).toBe(
      '> **Where the platform comes from**\n>\n> A story project declares\n> its own dependency.',
    );
  });

  it('renders an untitled Callout — both attributes are optional', () => {
    // `<Callout kind="note">` with no title appears in the corpus and was
    // missed by the first pass; the build gate is what caught it.
    const { markdown, unsupported } = reduce('<Callout kind="note">\n  Just a note.\n</Callout>');
    expect(markdown).toBe('> Just a note.');
    expect(unsupported).toEqual([]);
  });

  it('drops import and export lines', () => {
    const { markdown } = reduce('import X from "y";\nexport const a = 1;\nReal prose.\n');
    expect(markdown).toBe('Real prose.\n');
  });

  it('REPORTS a component it does not know instead of dropping it', () => {
    const { unsupported } = reduce('<SomethingNew foo="bar" />\n');
    expect(unsupported).toEqual(['SomethingNew']);
  });

  it('does not mistake prose or code for a component', () => {
    const { unsupported } = reduce('Use `a < b` and see <https://x.test>.\n');
    expect(unsupported).toEqual([]);
  });
});
