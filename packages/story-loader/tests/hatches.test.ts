/**
 * hatches.test.ts — Phase B plan phase 6: the full hatch contract
 * (`define action/behavior X from` binding + shape validation) and AC-4's
 * two halves — the pure-IR profile refuses hatch-bearing stories WITHOUT
 * executing any author code, and runs hatch-free stories as plain data.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const jugglingAction = {
  id: 'chord.hatch.juggling',
  validate: () => ({ valid: true }),
  execute: () => {},
  report: () => [],
  blocked: () => [],
};

const crowdControlBehavior = {
  validate: () => ({ valid: true }),
  execute: () => {},
  report: () => [],
  blocked: () => [],
};

const STUNTS = { './stunts.ts': { juggling: jugglingAction, 'crowd-control': crowdControlBehavior } };

describe('define action/behavior hatch binding (traits-basic.story)', () => {
  const ir = compileFixture('traits-basic.story');

  it('binds action and behavior exports and surfaces the action for registration', () => {
    const story = createStory(ir, { hatchModules: STUNTS });
    expect(story.boundActions.get('juggling')).toBe(jugglingAction);
    expect(story.boundBehaviors.get('crowd-control')).toBe(crowdControlBehavior);
    expect(story.getCustomActions()).toContain(jugglingAction);
  });

  it('rejects a missing export at load', () => {
    expect(() => createStory(ir, { hatchModules: { './stunts.ts': { juggling: jugglingAction } } }))
      .toThrow(/`crowd-control`.*missing/);
  });

  it('rejects a mis-typed action export at load', () => {
    const bad = { './stunts.ts': { juggling: 42, 'crowd-control': crowdControlBehavior } };
    expect(() => createStory(ir, { hatchModules: bad })).toThrow(/not an Action/);
  });

  it('rejects a mis-typed behavior export at load', () => {
    const bad = { './stunts.ts': { juggling: jugglingAction, 'crowd-control': () => {} } };
    expect(() => createStory(ir, { hatchModules: bad })).toThrow(/not a CapabilityBehavior/);
  });
});

describe('AC-4: pure-IR profile', () => {
  it('refuses a hatch-bearing story without touching any author code', () => {
    const ir = compileFixture('traits-basic.story');
    // Tripwire module: ANY property access flips the flag. The refusal must
    // happen before binding, so the flag must stay false.
    let touched = false;
    const tripwire = new Proxy(
      {},
      { get: () => { touched = true; return jugglingAction; } },
    ) as Record<string, unknown>;

    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './stunts.ts': tripwire } }))
      .toThrow(LoadError);
    expect(() => createStory(ir, { profile: 'pure-ir', hatchModules: { './stunts.ts': tripwire } }))
      .toThrow(/pure-IR.*2 TS hatch/);
    expect(touched, 'no hatch export was read or executed').toBe(false);
  });

  it('runs a hatch-free story identically under both profiles', () => {
    const ir = compileFixture('zoo-actions.story');
    expect(ir.hasHatches).toBe(false);

    const project = (profile: 'devkit' | 'pure-ir') => {
      const story = createStory(ir, { profile });
      const world = new WorldModel();
      story.initializeWorld(world);
      const player = story.createPlayer(world);
      world.setPlayer(player.id);
      return {
        entities: world
          .getAllEntities()
          .map((e) => ({ irId: story.irIdOf(e.id), traits: [...e.getTraitTypes()].sort() }))
          .sort((a, b) => String(a.irId).localeCompare(String(b.irId))),
        maxScore: world.getMaxScore(),
        actions: (story.getCustomActions() as Array<{ id: string }>).map((a) => a.id).sort(),
      };
    };

    expect(project('pure-ir')).toEqual(project('devkit'));
  });
});
