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

  it('normative layer (ADR-318, Phase 4): translation rules held and the traits carry it', () => {
    const world = new WorldModel();
    const applied = (id: string) => {
      const entity = result.ir.entities.find((e) => e.id === id)!;
      const npc = world.createEntity(id, 'actor');
      return applyCompiledCharacter(npc, entity.character!, {
        customMoods: result.ir.customMoods,
        customPersonalities: result.ir.customPersonalities,
      }).trait;
    };

    // John — confided arrangement, the enforcer's discretion, professional discipline.
    const john = applied('john-barber');
    expect(john.knowledge['business-arrangement']).toMatchObject({ source: 'witnessed', confided: true });
    expect(john.principles).toEqual([{ category: 'betray a confidence' }]);
    expect(john.temperaments).toEqual([{ name: 'professional' }]);

    // Catherine — the entrusted secret, maternal protection, duty over fear.
    const catherine = applied('catherine-shelby');
    // Renamed `viola-half-sister` → `viola-secret` in the Phase 6 port so
    // the confided topic matches its topic-table row (the reveal gate
    // matches row candidates against knowledge topics).
    expect(catherine.knowledge['viola-secret']).toMatchObject({ confided: true });
    expect(catherine.principles).toEqual([{ category: 'betray a confidence' }]);
    expect(catherine.obligations).toEqual([{ kind: 'protects', scope: 'chelsea-sumner' }]);
    expect(catherine.temperaments).toEqual([{ name: 'catherine-shelby@temperament-1' }]);

    // Viola — the secret eats at her; charm holds the mask under fear.
    const viola = applied('viola-wainright');
    expect(viola.burdenedBy).toEqual(['half-sister']);
    expect(viola.pressure.band).toBe('clear');
    expect(viola.temperaments).toEqual([{ name: 'viola-wainright@temperament-1' }]);

    // Jack — the brazen-it-out shape: full face-act bundle before anyone.
    const jack = applied('jack-margolin');
    expect(jack.honor).toMatchObject({ scope: 'anyone', faceActs: expect.arrayContaining(['backs down', 'shows fear']) });
    expect(jack.temperaments).toEqual([{ name: 'jack-margolin@temperament-1' }]);

    // Chelsea — never lies, but no answers-honestly: omission stays open to her.
    const chelsea = applied('chelsea-sumner');
    expect(chelsea.principles).toEqual([{ category: 'lie' }]);
    expect(chelsea.obligations).toEqual([]);

    // Ross — the D2 default IS his characterization: zero normative fields.
    const ross = applied('ross-bielack');
    expect(ross.principles).toEqual([]);
    expect(ross.temperaments).toEqual([]);
    expect(ross.honor).toBeUndefined();

    // The story's temperament defs (named + synthesized) all reach the wire.
    const defNames = result.ir.temperaments!.map((t) => t.name);
    expect(defNames).toContain('professional');
    expect(defNames).toContain('catherine-shelby@temperament-1');
    expect(result.ir.temperaments!.find((t) => t.name === 'professional')!.pairs).toEqual([
      ['duty', 'fear'],
      ['duty', 'desire'],
    ]);
  });
});
