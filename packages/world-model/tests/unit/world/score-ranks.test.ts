/**
 * Rank ladder on the ScoreLedger (ADR-260 D2).
 *
 * The invariants under test:
 *  1. the current rank is DERIVED from the score on every call, never stored,
 *  2. thresholds are absolute points, so a maxScore change cannot move a rank,
 *  3. the ladder is configuration — clear() keeps it and toJSON() omits it,
 *  4. setRanks sorts on receipt and rejects duplicate thresholds.
 *
 * Covers ADR-260 acceptance #4, #5, #5a, #5b, #5c.
 */

import { describe, it, expect } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import type { RankDefinition } from '../../../src/world/ScoreLedger';

/** Dungeo's ADR-085 ladder — absolute points, ported verbatim. */
const DUNGEO_LADDER: RankDefinition[] = [
  { id: 'beginner', name: 'Beginner', threshold: 0 },
  { id: 'amateur-adventurer', name: 'Amateur Adventurer', threshold: 50 },
  { id: 'junior-adventurer', name: 'Junior Adventurer', threshold: 200 },
  { id: 'adventurer', name: 'Adventurer', threshold: 400 },
  { id: 'master-adventurer', name: 'Master Adventurer', threshold: 616 },
];

describe('ScoreLedger rank ladder (ADR-260 D2)', () => {
  describe('enablement', () => {
    it('is off by default — no registration has run', () => {
      expect(new WorldModel().isScoringEnabled()).toBe(false);
    });

    it('an EMPTY ladder still enables scoring — enablement is the registration', () => {
      const world = new WorldModel();
      world.setScoringEnabled(true);
      world.setRanks([]);

      expect(world.isScoringEnabled()).toBe(true);
      expect(world.getRanks()).toEqual([]);
      expect(world.getRank()).toBeUndefined();
    });

    it('installing a ladder does not by itself enable scoring', () => {
      const world = new WorldModel();
      world.setRanks(DUNGEO_LADDER);

      expect(world.isScoringEnabled()).toBe(false);
    });
  });

  describe('setRanks (acceptance #5c)', () => {
    it('sorts descending input ascending on receipt', () => {
      const world = new WorldModel();
      world.setRanks([...DUNGEO_LADDER].reverse());

      expect(world.getRanks().map(r => r.threshold)).toEqual([0, 50, 200, 400, 616]);
    });

    it('throws on duplicate thresholds — order must not decide the rank', () => {
      const world = new WorldModel();

      expect(() => world.setRanks([
        { id: 'a', name: 'A', threshold: 100 },
        { id: 'b', name: 'B', threshold: 100 },
      ])).toThrow(/[Dd]uplicate rank threshold 100/);
    });

    it('returns a defensive copy — mutating it does not disturb the ladder', () => {
      const world = new WorldModel();
      world.setRanks(DUNGEO_LADDER);

      world.getRanks().push({ id: 'forged', name: 'Forged', threshold: 9999 });

      expect(world.getRanks()).toHaveLength(5);
    });
  });

  describe('getRank is derived (acceptance #4)', () => {
    it('rises on award and falls on revoke, with no rank write between', () => {
      const world = new WorldModel();
      world.setScoringEnabled(true);
      world.setRanks(DUNGEO_LADDER);

      expect(world.getRank()?.id).toBe('beginner');

      world.awardScore('lamp', 60, 'Found the lamp');
      expect(world.getRank()?.id).toBe('amateur-adventurer');

      world.revokeScore('lamp');
      expect(world.getRank()?.id).toBe('beginner');
    });

    it('resolves the HIGHEST rung not exceeding the score', () => {
      const world = new WorldModel();
      world.setRanks(DUNGEO_LADDER);
      world.awardScore('haul', 399, 'Nearly there');

      expect(world.getRank()?.id).toBe('junior-adventurer');

      world.awardScore('last-point', 1, 'The 400th point');
      expect(world.getRank()?.id).toBe('adventurer');
    });

    it('is undefined when the score is below every rung', () => {
      const world = new WorldModel();
      world.setRanks([{ id: 'started', name: 'Started', threshold: 10 }]);

      expect(world.getRank()).toBeUndefined();
    });

    it('is undefined when no ladder is installed', () => {
      const world = new WorldModel();
      world.awardScore('something', 500, 'Points without a ladder');

      expect(world.getRank()).toBeUndefined();
    });
  });

  describe('absolute thresholds (acceptance #5a)', () => {
    it('a maxScore change leaves the rank identical — dungeo 616 -> 650', () => {
      const world = new WorldModel();
      world.setRanks(DUNGEO_LADDER);
      world.setMaxScore(616);
      world.awardScore('haul', 480, 'A fixed 480 points');

      const before = world.getRank();

      // The thief dies; ADR-078's hidden points raise the ceiling mid-game.
      world.setMaxScore(650);

      // Under PERCENTAGE thresholds this call would demote the player from
      // 78% to 74% having earned nothing and lost nothing.
      expect(world.getRank()).toEqual(before);
      expect(world.getRank()?.id).toBe('adventurer');
    });
  });

  describe('the ladder is configuration, not state', () => {
    it('clear() empties entries and maxScore but keeps the ladder (acceptance #5b)', () => {
      const world = new WorldModel();
      world.setScoringEnabled(true);
      world.setRanks(DUNGEO_LADDER);
      world.setMaxScore(616);
      world.awardScore('lamp', 60, 'Found the lamp');

      world.clear();

      expect(world.getScore()).toBe(0);
      expect(world.getMaxScore()).toBe(0);
      expect(world.getRanks()).toHaveLength(5);
      expect(world.isScoringEnabled()).toBe(true);
    });

    it('ranks come from registration, not from the save (acceptance #5)', () => {
      const source = new WorldModel();
      source.setScoringEnabled(true);
      source.setRanks(DUNGEO_LADDER);
      source.setMaxScore(616);
      source.awardScore('haul', 250, 'A quarter of the way');
      const saved = source.toJSON();

      // A fresh world whose ladder was installed by registration ALONE.
      const restored = new WorldModel();
      restored.setScoringEnabled(true);
      restored.setRanks(DUNGEO_LADDER);
      restored.loadJSON(saved);

      expect(restored.getScore()).toBe(250);
      expect(restored.getRank()?.id).toBe('junior-adventurer');
    });

    it('ScoreLedgerData is unchanged — a pre-ADR-260 save loads intact', () => {
      const world = new WorldModel();
      world.setRanks(DUNGEO_LADDER);

      // Written before this ADR existed: two fields, no ranks, no enabled flag.
      const legacy = JSON.parse(new WorldModel().toJSON());
      legacy.scoreLedger = [{ id: 'lamp', points: 60, description: 'Found the lamp' }];
      legacy.scoreMaxScore = 616;

      world.loadJSON(JSON.stringify(legacy));

      expect(world.getScore()).toBe(60);
      expect(world.getMaxScore()).toBe(616);
      expect(world.getRank()?.id).toBe('amateur-adventurer');
    });

    it('a serialized world carries no rank fields', () => {
      const world = new WorldModel();
      world.setScoringEnabled(true);
      world.setRanks(DUNGEO_LADDER);

      expect(world.toJSON()).not.toContain('master-adventurer');
    });
  });

  describe('AuthorModel delegation parity', () => {
    it('mirrors every ledger rank method onto the same world', async () => {
      const { AuthorModel } = await import('../../../src/world/AuthorModel');
      const world = new WorldModel();
      const author = new AuthorModel(world.getDataStore(), world);

      author.setScoringEnabled(true);
      author.setRanks(DUNGEO_LADDER);
      author.awardScore('lamp', 60, 'Found the lamp');

      expect(author.isScoringEnabled()).toBe(true);
      expect(author.getRanks()).toHaveLength(5);
      expect(author.getRank()?.id).toBe('amateur-adventurer');
      // Same ledger underneath — not a parallel copy.
      expect(world.getRank()?.id).toBe('amateur-adventurer');
    });
  });
});
