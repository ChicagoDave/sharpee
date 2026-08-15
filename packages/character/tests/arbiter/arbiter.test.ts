/**
 * Arbiter tests (ADR-318 D1–D3, D6; contracts.md §3)
 *
 * Derived from the ADR's acceptance scenarios: B1 (principle + temperament
 * refusal, and its two deletion counterfactuals), B2's audience
 * discriminator, and D6 paralysis. The arbiter is pure — these assert on
 * verdicts; pressure.test.ts asserts the bookkeeping mutations.
 */

import { describe, it, expect } from 'vitest';
import { CharacterModelTrait, type TemperamentDef } from '@sharpee/world-model';
import { arbitrate, type ActCandidate, type ArbiterContext } from '../../src/arbiter';

const STEADFAST: TemperamentDef = {
  name: 'steadfast',
  pairs: [['duty', 'fear'], ['duty', 'desire']],
};

const demand: ActCandidate = {
  kind: 'dialogue',
  act: 'comply',
  topicId: 'the-secret',
  audiencePresent: [],
};

function witnessTrait(opts: {
  principle?: boolean;
  temperament?: boolean;
  threat: 'safe' | 'threatened' | 'cornered';
}): CharacterModelTrait {
  return new CharacterModelTrait({
    threat: opts.threat,
    principles: opts.principle ? [{ category: 'betray a confidence' }] : [],
    temperaments: opts.temperament ? [{ name: 'steadfast' }] : [],
  });
}

const witnessCtx: ArbiterContext = {
  temperamentDefs: { steadfast: STEADFAST },
  commits: ['betray a confidence'],
};

describe('arbitrate — B1: the threatened Witness', () => {
  it('principle + temperament: refuses even cornered (duty over fear)', () => {
    const trait = witnessTrait({ principle: true, temperament: true, threat: 'cornered' });
    const verdict = arbitrate(trait, demand, witnessCtx);

    expect(verdict.act).toBe('refuse');
    expect(verdict.winner).toBe('duty');
    expect(verdict.temperamentApplied).toEqual({ name: 'steadfast', pair: ['duty', 'fear'] });
    expect(verdict.defeats).toEqual([]);
  });

  it('delete the principle line: complies (nothing feeds duty)', () => {
    const trait = witnessTrait({ principle: false, temperament: true, threat: 'cornered' });
    const verdict = arbitrate(trait, demand, witnessCtx);

    expect(verdict.act).toBe('comply');
    expect(verdict.winner).toBe('fear');
  });

  it('delete only the temperament: complies under high fear (intensity default)', () => {
    const trait = witnessTrait({ principle: true, temperament: false, threat: 'cornered' });
    const verdict = arbitrate(trait, demand, witnessCtx);

    // cornered = 0.8 outburns the 0.7 principle baseline (D2)
    expect(verdict.act).toBe('comply');
    expect(verdict.winner).toBe('fear');
    expect(verdict.temperamentApplied).toBeUndefined();
    // The losing live principle is a defeat — D8's deposit source
    expect(verdict.defeats).toEqual([
      { force: 'duty', feed: 'principle:never-betray-a-confidence' },
    ]);
  });

  it('delete only the temperament: refuses under no fear', () => {
    const trait = witnessTrait({ principle: true, temperament: false, threat: 'safe' });
    const verdict = arbitrate(trait, demand, witnessCtx);

    expect(verdict.act).toBe('refuse');
    expect(verdict.winner).toBe('duty');
  });

  it('an except predicate that holds disarms the principle', () => {
    const trait = new CharacterModelTrait({
      threat: 'cornered',
      principles: [{ category: 'betray a confidence', except: 'protecting-the-children' }],
    });
    trait.registerPredicate('protecting-the-children', () => true);
    const verdict = arbitrate(trait, demand, witnessCtx);

    expect(verdict.act).toBe('comply');
    expect(verdict.readings.filter(r => r.force === 'duty')).toEqual([]);
  });
});

describe('arbitrate — B2: honor sees the room (D7)', () => {
  function colonelTrait(): CharacterModelTrait {
    return new CharacterModelTrait({
      threat: 'threatened',
      honor: { scope: 'the regiment', faceActs: ['backs down', 'shows fear', 'admits fault', 'pleads', 'accepts insult', 'caught lying'] },
    });
  }
  const backDownCtx: ArbiterContext = { complyFaceActs: ['backs down'] };

  it('empty room: no honor reading, fear wins, the Colonel backs down', () => {
    const verdict = arbitrate(colonelTrait(), { ...demand, audiencePresent: [] }, backDownCtx);

    expect(verdict.act).toBe('comply');
    expect(verdict.readings.some(r => r.force === 'honor')).toBe(false);
  });

  it('regiment present: honor outburns threatened fear, he refuses', () => {
    const verdict = arbitrate(
      colonelTrait(),
      { ...demand, audiencePresent: ['sergeant', 'corporal'] },
      backDownCtx,
    );

    // honor 0.7 vs threatened 0.6 (D2 intensity default)
    expect(verdict.act).toBe('refuse');
    expect(verdict.winner).toBe('honor');
    expect(verdict.readings.find(r => r.force === 'honor')?.feed).toBe('face:backs-down');
  });
});

describe('arbitrate — D6: paralysis', () => {
  it('two unexcepted duty feeds in live collision produce evasion naming both', () => {
    const trait = new CharacterModelTrait({
      principles: [{ category: 'betray a confidence' }],
      obligations: [{ kind: 'answers honestly' }],
    });
    const verdict = arbitrate(trait, demand, {
      commits: ['betray a confidence'],
      satisfies: ['answers honestly'],
    });

    expect(verdict.act).toBe('evade');
    expect(verdict.paralysis).toEqual({
      principles: ['principle:never-betray-a-confidence', 'obligation:answers-honestly'],
    });
    expect(verdict.defeats).toEqual([]);
  });
});

describe('arbitrate — D2 texture', () => {
  it('no live collision at all: the candidate act stands', () => {
    const trait = new CharacterModelTrait({ threat: 'safe' });
    const verdict = arbitrate(trait, demand, {});

    expect(verdict.act).toBe('comply');
  });

  it('love: hostile disposition toward the asker argues against', () => {
    const trait = new CharacterModelTrait({
      threat: 'safe',
      dispositions: { inspector: -60 },
    });
    const verdict = arbitrate(trait, demand, { audienceId: 'inspector' });

    expect(verdict.act).toBe('refuse');
    expect(verdict.winner).toBe('love');
    expect(verdict.readings.find(r => r.force === 'love')?.feed).toBe('disposition:dislikes');
  });

  it('exact tie holds the line (deterministic refusal on equal heat)', () => {
    const trait = new CharacterModelTrait({
      threat: 'safe',
      principles: [{ category: 'lie' }],
      dispositions: { friend: 70 },   // 'trusts' → love 0.7 for complying
    });
    const verdict = arbitrate(trait, {
      kind: 'dialogue', act: 'comply', audiencePresent: [],
    }, {
      commits: ['lie'],
      audienceId: 'friend',
    });
    // love 0.7 for vs principle 0.7 against, no temperament: the tie goes
    // to the against side — the character does not move on equal heat
    expect(verdict.act).toBe('refuse');
    expect(verdict.winner).toBe('duty');
    expect(verdict.defeats).toEqual([]);
  });
});
