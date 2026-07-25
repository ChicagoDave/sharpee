/**
 * docs-examples-load.test.ts — ADR-271 D5 / acceptance 4: every ```chord
 * fence on the published `define verb` and `define action` pages loads.
 * Reads the MDX at test time (an edit that breaks an example fails CI, not
 * a reader), wraps each fence in the minimal story harness a fence
 * legitimately omits (header, room, player, a pettable-ish target), and
 * exercises the load surface: compile → createStory → initializeWorld →
 * createPlayer → getCustomVocabulary → extendParser.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { captureGrammarRules } from './helpers/grammar-harness';

const VOCAB_DIR = join(__dirname, '..', '..', '..', 'website', 'src', 'app', 'chord', 'guide', 'vocabulary');

// `use scoring` is part of the presupposed story configuration, like the
// room and player: the petting example's `score` lines gate on it (ADR-261 D4).
const HEADER = 'story "Docs" by "T"\n  id: docs\n  version: 0.0.1\n  use scoring\n\n';

// The scaffolding a fence legitimately omits: a room, the player, and a
// generic creature for animal-referencing examples (the snake makes the
// petting example's `refuse when the animal is a snake` resolvable).
const WORLD = `create the Yard\n  a room\n\n  A yard.\n\ncreate the snake\n  in the Yard\n\n  A snake.\n\ncreate the peg\n  in the Yard\n\n  A peg.\n\ncreate the jacket\n  in the Yard\n\n  A jacket.\n\ncreate the player\n  starts in the Yard\n\n  You.\n`;

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
  story.getCustomVocabulary(); // `define verb` fences die here if unregisterable
  captureGrammarRules(story); // `define action` grammar reaches a real builder
}

describe('published Chord examples load (ADR-271 acceptance 4)', () => {
  const pages = ['define-verb', 'define-action'] as const;

  for (const page of pages) {
    const fences = chordFences(page);

    it(`${page}: page has at least one \`\`\`chord fence`, () => {
      expect(fences.length).toBeGreaterThan(0);
    });

    fences.forEach((fence, index) => {
      it(`${page}: fence ${index + 1} loads`, () => {
        expect(() => loadFence(fence)).not.toThrow();
      });
    });
  }
});
