/**
 * id-translation.test.ts — ADR-310/318 Phase 5: the loader's IR→world
 * entity-id mapping flows through applyCompiledCharacter into every
 * ref-bearing trait field (dispositions, goal-step targets, principle
 * excepts, honor scope, propagation excludes), while the identity
 * default keeps direct seam callers untouched. Real compile, real seam.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { applyCompiledCharacter, type AppliedCharacter } from '../../src/index.js';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n' +
  'create Alex\n  a person\n  playable\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create the Kitchen\n  a room\n\n  A kitchen.\n\n' +
  'create the kitchen knife\n  in the Kitchen\n\n  A knife.\n\n' +
  'create the Duke\n  a person\n\n  Him.\n\n' +
  'create the Maid\n' +
  '  a person\n' +
  '  feels wary of the Duke\n' +
  '  spreads gossip chatty to trusted, except the Duke\n' +
  '  never steals, except the Duke\n' +
  '  honor before the Duke\n' +
  '  goal eliminate, critical\n' +
  '    seek the kitchen knife in the Kitchen\n' +
  '  end goal\n' +
  '\n' +
  '  Her.\n';

/** IR id → pretend world id, the loader's mapping shape. */
const WORLD_IDS: Record<string, string> = {
  duke: 'w-duke',
  maid: 'w-maid',
  'kitchen-knife': 'w-knife',
  kitchen: 'w-kitchen',
};

function compiledIR(): StoryIR {
  const result = compile(SOURCE);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors).toEqual([]);
  return result.ir;
}

function applyMaid(resolve?: (irId: string) => string): AppliedCharacter {
  const ir = compiledIR();
  const world = new WorldModel();
  const npc = world.createEntity('Maid', 'actor');
  const maid = ir.entities.find((e) => e.id === 'maid')!;
  return applyCompiledCharacter(npc, maid.character!, resolve ? { resolveEntityId: resolve } : undefined);
}

describe('Phase 5 — IR→world id translation through the one seam', () => {
  it('maps every ref-bearing field through the loader-supplied resolver', () => {
    const applied = applyMaid((irId) => {
      const worldId = WORLD_IDS[irId];
      if (!worldId) throw new Error(`unresolvable ref: ${irId}`);
      return worldId;
    });

    // feels target → disposition keyed by WORLD id
    expect(Object.keys(applied.trait.dispositions)).toEqual(['w-duke']);
    // principle object carve-out → world id in the canonical string
    expect(applied.trait.principles).toEqual([{ category: 'steal', except: 'w-duke' }]);
    // honor scope → world id
    expect(applied.trait.honor?.scope).toBe('w-duke');
    // propagation excludes → world ids
    expect(applied.propagationProfile?.excludes).toEqual(['w-duke']);
    // goal-step entity and room refs → world ids
    expect(applied.goalDefs?.[0].steps[0]).toMatchObject({ type: 'seek', target: 'w-knife', from: 'w-kitchen' });
  });

  it('identity default: without a resolver, IR ids pass through unchanged', () => {
    const applied = applyMaid();
    expect(Object.keys(applied.trait.dispositions)).toEqual(['duke']);
    expect(applied.trait.honor?.scope).toBe('duke');
    expect(applied.goalDefs?.[0].steps[0]).toMatchObject({ type: 'seek', target: 'kitchen-knife', from: 'kitchen' });
  });

  it('an unresolvable ref surfaces the resolver throw (rogue-IR backstop)', () => {
    expect(() => applyMaid(() => { throw new Error('unresolvable ref'); })).toThrow('unresolvable ref');
  });
});
