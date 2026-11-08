// tests/unit/traits/sensory-traits.test.ts
//
// ADR-392 D5: ScentTrait and SoundingTrait are plain data traits with one
// default each, registered so they restore, and SoundingTrait's tier is
// ADR-172's VolumeTier.

import { describe, it, expect } from 'vitest';
import type { VolumeTier } from '@sharpee/if-domain';
import { ScentTrait } from '../../../src/traits/scent/scentTrait';
import { SoundingTrait } from '../../../src/traits/sounding/soundingTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { TRAIT_IMPLEMENTATIONS } from '../../../src/traits/implementations';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';

describe('ScentTrait (ADR-392 D5)', () => {
  it('defaults to a moderate scent with no description', () => {
    const trait = new ScentTrait();
    expect(trait.type).toBe(TraitType.SCENT);
    expect(trait.strength).toBe('moderate');
    expect(trait.descriptionId).toBeUndefined();
  });

  it('takes the strength and description it is given', () => {
    const trait = new ScentTrait({ strength: 'strong', descriptionId: 'cheese.smell' });
    expect(trait.strength).toBe('strong');
    expect(trait.descriptionId).toBe('cheese.smell');
  });

  it('is registered for restore', () => {
    expect(TRAIT_IMPLEMENTATIONS[TraitType.SCENT]).toBe(ScentTrait);
  });
});

describe('SoundingTrait (ADR-392 D5)', () => {
  it('defaults to a normal tier with no description', () => {
    const trait = new SoundingTrait();
    expect(trait.type).toBe(TraitType.SOUNDING);
    expect(trait.tier).toBe('normal');
    expect(trait.descriptionId).toBeUndefined();
  });

  it("takes any of ADR-172's tiers", () => {
    const tiers: VolumeTier[] = ['whisper', 'subdued', 'normal', 'raised', 'shouting'];
    for (const tier of tiers) {
      expect(new SoundingTrait({ tier }).tier).toBe(tier);
    }
  });

  it('is registered for restore', () => {
    expect(TRAIT_IMPLEMENTATIONS[TraitType.SOUNDING]).toBe(SoundingTrait);
  });
});

describe('both traits survive a save and restore of the entity', () => {
  it('rehydrates to live instances with their data', () => {
    const world = new WorldModel();
    const cheese = world.createEntity('ripe cheese', 'item');
    cheese.add(new ScentTrait({ strength: 'strong' }));
    cheese.add(new SoundingTrait({ tier: 'whisper' }));

    const restored = IFEntity.fromJSON(cheese.toJSON());

    const scent = restored.get(TraitType.SCENT) as ScentTrait;
    const sounding = restored.get(TraitType.SOUNDING) as SoundingTrait;
    expect(scent).toBeInstanceOf(ScentTrait);
    expect(scent.strength).toBe('strong');
    expect(sounding).toBeInstanceOf(SoundingTrait);
    expect(sounding.tier).toBe('whisper');
  });
});
