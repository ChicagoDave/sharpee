/**
 * zoo-pure-ir.test.ts — the shipped zoo.story loads and builds its world as
 * plain data (the AC-4 sweep, restored in Phase C P5). Before ADR-361 the
 * Zoo declared two `define text … from` hatches and only a hatch-stripped
 * copy could load this way; with the hatches rewritten as Chord phrases, the
 * story itself is pure IR.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

const ZOO_STORY = join(__dirname, '..', '..', '..', 'stories', 'friendly-zoo', 'zoo.story');

function compileSource(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('AC-4 sweep: the shipped zoo.story', () => {
  it('loads and builds a world as plain data', () => {
    const ir = compileSource(readFileSync(ZOO_STORY, 'utf8'));
    const story = createStory(ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    expect(world.getAllEntities().length).toBeGreaterThan(20);
    expect(world.getMaxScore()).toBe(85);
  });
});
