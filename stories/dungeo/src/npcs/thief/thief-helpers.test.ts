/**
 * Tests for the thief combat-decision forced path (ADR-293 D8, Phase C):
 * each forced class produces the exact {shouldAttack, shouldStay} decision
 * pair, through the REAL EngineRandomService force table (zero draws).
 */

import { describe, it, expect } from 'vitest';
import { EngineRandomService } from '@sharpee/engine';
import type { NpcContext } from '@sharpee/stdlib';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import { getThiefCombatDecision } from './thief-helpers';

function decisionContext(service: EngineRandomService): NpcContext {
  return {
    npc: { attributes: {} } as unknown as IFEntity,
    world: {
      getScore: () => 0,
      getPlayer: () => ({ attributes: {} }),
    } as unknown as WorldModel,
    random: service,
  } as unknown as NpcContext;
}

describe('getThiefCombatDecision forced path (D8)', () => {
  it.each([
    ['attacks', { shouldAttack: true, shouldStay: true }],
    ['stays', { shouldAttack: false, shouldStay: true }],
    ['leaves', { shouldAttack: false, shouldStay: false }],
  ] as const)('forced %s produces %j with zero draws', (cls, expected) => {
    const service = new EngineRandomService(424242);
    service.loadForces([{ point: 'dungeo.thief.combat-decision', cls, mode: 'sticky' }]);

    expect(getThiefCombatDecision(decisionContext(service))).toEqual(expected);
    // Zero draws: the decision point's stream never materialized.
    expect(service.serializeStreamStates()).toEqual({});
  });
});
