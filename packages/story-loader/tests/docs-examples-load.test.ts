/**
 * docs-examples-load.test.ts — ADR-271 D5 / acceptance 4, widened by ADR-272
 * D6: every ```chord fence on the published vocabulary pages loads. Pages are
 * enumerated from the website source, not hardcoded (an added page joins the
 * net automatically). Reads the MDX at test time (an edit that breaks an
 * example fails CI, not a reader), wraps each fence in the minimal story
 * harness a fence legitimately omits (header, room, player, a pettable-ish
 * target), and exercises the load surface: compile → createStory →
 * initializeWorld → createPlayer → extendParser.
 *
 * ADR-272 D6 harness correction: the grammar engine is seeded with the REAL
 * standard grammar (parser-en-us's generated defineGrammar, imported by
 * source path like the MDX reads above) — `remove from action` fences match
 * real rule shapes and would otherwise be load errors by design (ADR-270 D1).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { captureGrammarEngine } from './helpers/grammar-harness';
import { defineGrammar } from '../../parser-en-us/src/grammar';

const VOCAB_DIR = join(__dirname, '..', '..', '..', 'website', 'src', 'app', 'chord', 'guide', 'vocabulary');

/** Pages whose fences are the published grammar surface — must never go fence-less. */
const REQUIRED_PAGES = ['define-action', 'extend-action', 'remove-from-action'];

/**
 * Pages whose fences are deliberate PARTIAL snippets (own story headers,
 * entities outside the shared harness, hatch-module imports) — enumerated for
 * visibility, not load-tested. Pre-existing state surfaced when ADR-272 D6
 * widened the enumeration; making these stand-alone is not an ADR-272 surface.
 * A new page is load-tested by default — add it here only with a reason.
 */
const KNOWN_PARTIAL_PAGES = new Set([
  'comments',
  'define-action-hatches',
  'define-condition',
  'define-phrase',
  'define-phrasebook',
  'define-phrases',
  'define-pronouns',
  'define-text',
  'define-trait',
  'use',
]);

// `use scoring` is part of the presupposed story configuration, like the
// room and player: the petting example's `score` lines gate on it (ADR-261 D4).
const HEADER = 'story "Docs" by "T"\n  id: docs\n  version: 0.0.1\n  use scoring\n\n';

// The scaffolding a fence legitimately omits: a room, the player, and a
// generic creature for animal-referencing examples (the snake makes the
// petting example's `refuse when the animal is a snake` resolvable).
const WORLD = `create the Yard\n  a room\n\n  A yard.\n\ncreate the snake\n  in the Yard\n\n  A snake.\n\ncreate the peg\n  in the Yard\n\n  A peg.\n\ncreate the jacket\n  in the Yard\n\n  A jacket.\n\ncreate the player\n  starts in the Yard\n\n  You.\n`;

/** Every vocabulary page directory that carries a content.mdx. */
function vocabularyPages(): string[] {
  return readdirSync(VOCAB_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(VOCAB_DIR, e.name, 'content.mdx')))
    .map((e) => e.name)
    .sort();
}

/** Extract every ```chord fence from an MDX file. */
function chordFences(page: string): string[] {
  const source = readFileSync(join(VOCAB_DIR, page, 'content.mdx'), 'utf-8');
  const fences: string[] = [];
  const re = /```chord\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    fences.push(m[1]);
  }
  return fences;
}

/** Full load surface for one fence wrapped in the harness. */
function loadFence(fence: string): void {
  const source = `${HEADER}${fence.trimEnd()}\n\n${WORLD}`;
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  // Grammar (define action + alterations) reaches a real builder over the
  // real seeded standard grammar (ADR-272 D6).
  captureGrammarEngine(story, defineGrammar);
}

describe('published Chord examples load (ADR-271 acceptance 4 / ADR-272 D6)', () => {
  const pages = vocabularyPages();

  it('enumeration finds the grammar pages', () => {
    for (const required of REQUIRED_PAGES) {
      expect(pages).toContain(required);
    }
  });

  it('every page is either load-tested or a named known-partial', () => {
    for (const page of pages) {
      if (!KNOWN_PARTIAL_PAGES.has(page)) continue;
      expect(REQUIRED_PAGES).not.toContain(page);
    }
  });

  for (const page of pages) {
    if (KNOWN_PARTIAL_PAGES.has(page)) continue;
    const fences = chordFences(page);

    if (REQUIRED_PAGES.includes(page)) {
      it(`${page}: page has at least one \`\`\`chord fence`, () => {
        expect(fences.length).toBeGreaterThan(0);
      });
    }

    fences.forEach((fence, index) => {
      it(`${page}: fence ${index + 1} loads`, () => {
        expect(() => loadFence(fence)).not.toThrow();
      });
    });
  }
});
