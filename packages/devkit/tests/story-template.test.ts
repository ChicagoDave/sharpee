/**
 * story-template.test.ts — the New Story template opens clean (GH #660).
 *
 * The Chord story template is the first story every author sees, in `sharpee init`
 * and in Chord Writer's New Story (which mirrors this file byte for byte). The
 * World tab's first lesson is whether its findings can be trusted, so the template
 * must compile gate-clean AND give the World Index nothing to report: no Incomplete
 * finding of any class and no unnamed tool. Pinned here because the two findings
 * #660 recorded sat unseen for four months with nothing to fail.
 *
 * Owner context: @sharpee/devkit test suite. Renders the real template file with
 * the same placeholder substitution `init` performs, compiles it with the real
 * compiler and reads the real World Index — no fixture copy of the template.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { buildDocument } from '@sharpee/world-index';

const TEMPLATE = join(__dirname, '..', 'templates', 'story-chord', 'story.story.template');

/** The template as `init` would write it for a story called Template Case. */
function renderedTemplate(): string {
  return readFileSync(TEMPLATE, 'utf-8')
    .replace(/\{\{STORY_ID\}\}/g, 'template-case')
    .replace(/\{\{STORY_TITLE\}\}/g, 'Template Case')
    .replace(/\{\{AUTHOR\}\}/g, 'Test')
    .replace(/\{\{DESCRIPTION\}\}/g, 'A story scaffolded from the template.')
    .replace(/\{\{IFID\}\}/g, '0B4E7A3C-9D2F-4C61-8E5A-1F2B3C4D5E6F');
}

function compiledTemplate(): StoryIR {
  const result = compile(renderedTemplate());
  if (!result.ok) {
    throw new Error(`template did not compile:\n${result.diagnostics.map((d) => d.message).join('\n')}`);
  }
  return result.ir;
}

describe('the New Story template', () => {
  it('leaves no placeholder behind once rendered', () => {
    expect(renderedTemplate()).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it('compiles with no diagnostics at all', () => {
    const result = compile(renderedTemplate());
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('gives the World Index nothing to report', () => {
    const document = buildDocument(compiledTemplate(), '0.0.0');
    expect(document.incomplete.counts).toEqual({
      missingWord: 0,
      ambiguous: 0,
      noObject: 0,
      undescribed: 0,
    });
    expect(document.incomplete.missingWord).toEqual([]);
    expect(document.incomplete.noObject).toEqual([]);
    expect(document.unnamedTools).toEqual([]);
  });

  it('lets the player call the lantern by the word its prose uses', () => {
    const lantern = compiledTemplate().entities.find((entity) => entity.id === 'brass-lantern');
    expect(lantern?.aka).toContain('old lantern');
  });
});
