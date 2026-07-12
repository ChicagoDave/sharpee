/**
 * zoo-pure-ir.test.ts — AC-4 sweep (Phase B gate): the pure-IR profile
 * must refuse a hatch-bearing story without reading a single hatch export,
 * and a hatch-stripped variant must load and build a world as plain data.
 *
 * TEMPORARY STAND-IN: the shipped stories/friendly-zoo/zoo.story still
 * uses the pre-ownership grammar and no longer compiles; until Phase C P5
 * migrates it, the sweep runs against the rewritten
 * packages/chord/tests/fixtures/traits-basic.story (2 TS hatches:
 * juggling + crowd-control).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const TRAITS_BASIC = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'traits-basic.story');

function compileSource(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('AC-4 sweep: traits-basic.story (temporary stand-in for the migrated zoo.story)', () => {
  const source = readFileSync(TRAITS_BASIC, 'utf8');

  // TODO(phase-c-p5): repoint at the real, migrated zoo.story once Phase 5 lands
  it('pure-IR refuses it without touching any hatch export', () => {
    const ir = compileSource(source);
    expect(ir.hasHatches).toBe(true);

    let touched = false;
    const tripwire = new Proxy(
      {},
      { get: () => { touched = true; return () => []; } },
    ) as Record<string, unknown>;

    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './stunts.ts': tripwire } }))
      .toThrow(LoadError);
    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './stunts.ts': tripwire } }))
      .toThrow(/pure-IR.*2 TS hatch/);
    expect(touched, 'no hatch export was read or executed').toBe(false);
  });

  // TODO(phase-c-p5): repoint at the real, migrated zoo.story once Phase 5 lands
  it('a hatch-stripped variant loads and builds a world under pure-IR', () => {
    // Strip the two `define action|behavior … from` declarations, plus the
    // carrying-limit trait: its role-bound clause (`on taking anything as
    // the taker`) is deliberately unwired in the runtime (post-Zoo scope)
    // and bind() refuses to load it silently.
    const stripped = source
      .replace(/define trait carrying-limit[\s\S]*?end trait\n/, '')
      .split('\n')
      .filter((line) => !/^define (action|behavior) \S+ from/.test(line))
      .join('\n');
    const ir = compileSource(stripped);
    expect(ir.hasHatches).toBe(false);

    const story = createStory(ir, { profile: 'pure-ir' });
    const world = new WorldModel();
    story.initializeWorld(world);

    expect(world.getAllEntities().length).toBeGreaterThan(1);
    expect(world.getMaxScore()).toBe(1); // the snoozing action's napped score
  });
});
