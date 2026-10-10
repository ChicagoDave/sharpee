/**
 * docs-adr-362-folds-load.test.ts — ADR-362 AC-9: the guide's fences that
 * teach the folds load. The `world` guide pages are not in the vocabulary
 * sweep (`docs-examples-load.test.ts`), and their older fences are partial
 * by design, so this test picks out every fence on `creating-things` and
 * `exits-and-blocked-exits` that uses a fold and loads it whole: compile →
 * createStory → initializeWorld → createPlayer. A fold fence is written
 * self-contained (it creates every room it names), so the harness adds only
 * the header and a player placed in the fence's first room. Read from the
 * website source at test time, so an edit that breaks an example fails here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const WORLD_DIR = join(__dirname, '..', '..', '..', 'website', 'src', 'app', 'chord', 'guide', 'world');
const PAGES = ['creating-things', 'exits-and-blocked-exits'];

const HEADER = 'story\n  title: Docs\n  authors:\n    T\n  id: docs\n  story-version: 0.0.1\n\n';

const usesFold = (fence: string) => /^create .+, an? \w+/m.test(fence) || /^ {2}exits(, one-way)?: /m.test(fence);

function foldFences(page: string): string[] {
  const source = readFileSync(join(WORLD_DIR, page, 'content.mdx'), 'utf-8');
  const fences: string[] = [];
  const re = /```chord\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (usesFold(m[1])) fences.push(m[1]);
  }
  return fences;
}

/** The fence plus a player placed in its first room. */
function loadFence(fence: string): void {
  const firstRoom = /^create (.+?), a room/m.exec(fence)?.[1];
  if (!firstRoom) throw new Error('a fold fence creates a room on its head');
  const player = `create Alex, a person\n  playable\n  starts in ${firstRoom}\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n`;
  const result = compile(`${HEADER}${fence.trimEnd()}\n\n${player}`);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player2 = story.createPlayer(world);
  world.setPlayer(player2.id);
}

describe('the guide teaches the folds with fences that load (ADR-362 AC-9)', () => {
  for (const page of PAGES) {
    const fences = foldFences(page);
    it(`${page}: teaches at least one fold`, () => {
      expect(fences.length).toBeGreaterThan(0);
    });
    fences.forEach((fence, index) => {
      it(`${page}: fold fence ${index + 1} loads`, () => {
        expect(() => loadFence(fence)).not.toThrow();
      });
    });
  }
});
