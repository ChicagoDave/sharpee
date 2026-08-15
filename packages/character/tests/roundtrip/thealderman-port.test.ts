/**
 * thealderman-port.test.ts — ADR-310 D18: the incremental Chord port's
 * descriptive layer (stories/thealderman/chord/thealderman.story) compiles
 * clean, and every suspect's character block applies through the real seam
 * (applyCompiledCharacter) onto a trait. Phase 3's exit evidence; Phases
 * 4/6 grow the same file.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { applyCompiledCharacter } from '../../src/index.js';

const STORY_PATH = join(__dirname, '../../../../stories/thealderman/chord/thealderman.story');

describe('thealderman Chord port — descriptive layer (ADR-310 D18)', () => {
  const result = compile(readFileSync(STORY_PATH, 'utf8'));

  it('compiles with zero errors', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  const suspects = ['ross-bielack', 'viola-wainright', 'john-barber', 'catherine-shelby', 'jack-margolin', 'chelsea-sumner'];

  it('all six suspects carry character blocks; the stubs do not', () => {
    for (const id of suspects) {
      const entity = result.ir.entities.find((e) => e.id === id);
      expect(entity?.character, id).toBeDefined();
    }
    // D7: Stephanie is a person with no character line — no model attached.
    expect(result.ir.entities.find((e) => e.id === 'stephanie-bordeau')?.character).toBeUndefined();
  });

  it('every suspect applies through applyCompiledCharacter onto a trait', () => {
    const world = new WorldModel();
    for (const id of suspects) {
      const entity = result.ir.entities.find((e) => e.id === id)!;
      const npc = world.createEntity(id, 'actor');
      const applied = applyCompiledCharacter(npc, entity.character!, {
        customMoods: result.ir.customMoods,
        customPersonalities: result.ir.customPersonalities,
      });
      expect(npc.get('characterModel'), id).toBe(applied.trait);
      expect(applied.baselineMood, id).toBeDefined();
    }
  });

  it('spot checks: translation rules held', () => {
    const ross = result.ir.entities.find((e) => e.id === 'ross-bielack')!.character!;
    expect(ross.personality).toMatchObject([
      { trait: 'impulsive', intensity: 'very' },
      { trait: 'defensive' },
      { trait: 'honest', intensity: 'slightly' },
    ]);
    expect(ross.knows.find((k) => k.topic === 'jack-shady')).toMatchObject({ source: 'inferred', confidence: 'suspects' });
    expect(ross.profile).toMatchObject({ lucidity: 'stable', 'self-model': 'intact' });

    const john = result.ir.entities.find((e) => e.id === 'john-barber')!.character!;
    expect(john.spreads).toMatchObject({ kind: 'nothing' });
    expect(john.goals[0]).toMatchObject({ id: 'destroy-evidence', priority: 'high' });

    const viola = result.ir.entities.find((e) => e.id === 'viola-wainright')!.character!;
    // `selective` said by listing (D10).
    expect(viola.spreads).toMatchObject({ kind: 'spreads', topics: ['stephanie-death', 'hotel-gossip'], to: 'trusted' });
    expect(viola.mood).toBe('composed');

    const chelsea = result.ir.entities.find((e) => e.id === 'chelsea-sumner')!.character!;
    expect(chelsea.resists).toMatchObject([{ influence: 'bullying' }]);
    expect(result.ir.customMoods?.map((m) => m.name)).toEqual(['composed', 'concerned', 'agitated', 'fearful']);
  });
});
