/**
 * Golden tests for the scoring action (ADR-260 D3/D4).
 *
 * The action is a ledger reader: it holds no rank logic and emits no rank
 * prose. Covers ADR-260 acceptance #2 (a story with no scoring installed says
 * so) and #3 (a story with a ladder reports the AUTHOR's rank name).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { scoringAction } from '../../../src/actions/standard/scoring/scoring';
import { IFActions } from '../../../src/actions/constants';
import { ActionContext } from '../../../src/actions/enhanced-types';
import { WorldModel, type RankDefinition } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand, executeWithValidation, expectEvent } from '../../test-utils';

/**
 * Rank names deliberately absent from every platform source. If one of these
 * reaches the output, stdlib carried the AUTHOR's string rather than inventing
 * its own — which is the whole point of D4.
 */
const AUTHORED_LADDER: RankDefinition[] = [
  { id: 'tourist', name: 'Bewildered Tourist', threshold: 0 },
  { id: 'dabbler', name: 'Dabbler in Curiosities', threshold: 50 },
  { id: 'luminary', name: 'Luminary of the Deep', threshold: 200 },
];

function contextFor(world: WorldModel): ActionContext {
  const command = createCommand(IFActions.SCORING, { verb: 'score' });
  return createRealTestContext(scoringAction, world, command);
}

describe('scoring action', () => {
  let world: WorldModel;
  let context: ActionContext;

  beforeEach(() => {
    world = setupBasicWorld().world;
    context = contextFor(world);
  });

  describe('structure', () => {
    it('should have correct ID', () => {
      expect(scoringAction.id).toBe(IFActions.SCORING);
    });

    it('should be in meta group', () => {
      expect(scoringAction.group).toBe('meta');
    });

    it('requires exactly the five surviving messages (D3)', () => {
      expect(scoringAction.requiredMessages).toEqual([
        'no_scoring',
        'score_display',
        'score_simple',
        'score_with_rank',
        'perfect_score',
      ]);
    });
  });

  describe('scoring not installed (acceptance #2)', () => {
    it('answers no_scoring rather than reporting a score of zero', () => {
      const events = executeWithValidation(scoringAction, context);

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.no_scoring',
        enabled: false,
      });
    });

    it('says nothing about score even when the ledger holds points', () => {
      // Points without a registration: the story never opted in.
      world.awardScore('stray', 100, 'Points nobody asked for');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.no_scoring',
      });
      expect(events[0].data).not.toHaveProperty('score');
    });
  });

  describe('scoring installed, no ladder', () => {
    beforeEach(() => {
      world.setScoringEnabled(true);
    });

    it('uses score_simple when no ceiling is declared', () => {
      world.awardScore('lamp', 10, 'Found the lamp');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.score_simple',
        score: 10,
        maxScore: 0,
      });
    });

    it('uses score_display when a ceiling is declared', () => {
      world.setMaxScore(100);
      world.awardScore('lamp', 25, 'Found the lamp');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.score_display',
        score: 25,
        maxScore: 100,
        percentage: 25,
      });
    });

    it('names no rank at all — the free percentage-band default is gone (D4)', () => {
      world.setMaxScore(100);
      world.awardScore('haul', 95, 'Nearly everything');

      const events = executeWithValidation(scoringAction, contextFor(world));

      // Under the deleted computeRank this was 'Master'.
      expect(events[0].data).not.toHaveProperty('rank');
      expect((events[0].data as any).params).not.toHaveProperty('rank');
    });
  });

  describe('scoring installed with a ladder (acceptance #3)', () => {
    beforeEach(() => {
      world.setScoringEnabled(true);
      world.setRanks(AUTHORED_LADDER);
      world.setMaxScore(300);
    });

    it("reports the AUTHOR's rank name, which no platform source contains", () => {
      world.awardScore('haul', 60, 'A decent haul');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.score_with_rank',
        score: 60,
        maxScore: 300,
      });
      expect((events[0].data as any).params.rank).toBe('Dabbler in Curiosities');
    });

    it('carries the rank ID in the domain data and the NAME in the params', () => {
      world.awardScore('haul', 60, 'A decent haul');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expect((events[0].data as any).rank).toBe('dabbler');
      expect((events[0].data as any).params.rank).toBe('Dabbler in Curiosities');
    });

    it('tracks the ladder as the score moves, with no rank write anywhere', () => {
      world.awardScore('haul', 250, 'The big one');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expect((events[0].data as any).params.rank).toBe('Luminary of the Deep');
    });

    it('prefers perfect_score at the ceiling', () => {
      world.awardScore('everything', 300, 'All of it');

      const events = executeWithValidation(scoringAction, contextFor(world));

      expectEvent(events, 'if.event.score_displayed', {
        messageId: 'if.action.scoring.perfect_score',
        score: 300,
        maxScore: 300,
      });
    });

    it('a maxScore change does not move the reported rank (D2 invariant)', () => {
      world.awardScore('haul', 60, 'A decent haul');
      const before = executeWithValidation(scoringAction, contextFor(world));

      world.setMaxScore(650);
      const after = executeWithValidation(scoringAction, contextFor(world));

      expect((after[0].data as any).params.rank).toBe((before[0].data as any).params.rank);
    });
  });

  describe('the deleted plumbing (D3)', () => {
    beforeEach(() => {
      world.setScoringEnabled(true);
      world.setMaxScore(100);
      world.awardScore('lamp', 40, 'Found the lamp');
    });

    it('emits no moves, achievements, or progress fields', () => {
      const events = executeWithValidation(scoringAction, contextFor(world));
      const data = events[0].data as Record<string, unknown>;

      for (const gone of ['moves', 'achievements', 'progress', 'hasAchievements', 'progressMessage']) {
        expect(data).not.toHaveProperty(gone);
      }
    });

    it('never reads the SCORING capability — registering one changes nothing', () => {
      const withoutCapability = executeWithValidation(scoringAction, contextFor(world));

      world.registerCapability('scoring', { initialData: { moves: 99, deaths: 3, enabled: false } });
      const withCapability = executeWithValidation(scoringAction, contextFor(world));

      expect(withCapability[0].data).toEqual(withoutCapability[0].data);
    });
  });
});
