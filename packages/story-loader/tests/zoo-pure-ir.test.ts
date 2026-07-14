/**
 * zoo-pure-ir.test.ts — AC-4 sweep against the REAL zoo.story (Phase B
 * gate, restored in Phase C P5): the pure-IR profile must refuse the
 * shipped Zoo (it declares 2 `define text ... from` hatches) without
 * reading a single hatch export, and a hatch-stripped variant must load
 * and build a world as plain data.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const ZOO_STORY = join(__dirname, '..', '..', '..', 'stories', 'friendly-zoo', 'zoo.story');

function compileSource(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('AC-4 sweep: the shipped zoo.story', () => {
  const source = readFileSync(ZOO_STORY, 'utf8');

  it('pure-IR refuses it without touching any hatch export', () => {
    const ir = compileSource(source);
    expect(ir.hasHatches).toBe(true);

    let touched = false;
    const tripwire = new Proxy(
      {},
      { get: () => { touched = true; return () => []; } },
    ) as Record<string, unknown>;

    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './chord-extras.ts': tripwire } }))
      .toThrow(LoadError);
    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './chord-extras.ts': tripwire } }))
      .toThrow(/pure-IR.*2 TS hatch/);
    expect(touched, 'no hatch export was read or executed').toBe(false);
  });

  it('a hatch-stripped variant loads and builds a world under pure-IR', () => {
    // Strip the two `define text ... from` declarations and the prose
    // markers that reference them — everything else is the real Zoo.
    const stripped = source
      .split('\n')
      .filter((line) => !/^define text \S+ from/.test(line))
      .map((line) => line.replace(/\{(flavor|aside)\}/g, ''))
      .join('\n');
    const ir = compileSource(stripped);
    expect(ir.hasHatches).toBe(false);

    const story = createStory(ir, { profile: 'pure-ir' });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    expect(world.getAllEntities().length).toBeGreaterThan(20);
    expect(world.getMaxScore()).toBe(85);
  });
});
