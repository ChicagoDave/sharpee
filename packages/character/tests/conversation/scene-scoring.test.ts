/**
 * Floor and interruption scoring tests (ADR-320 D7/D10; Phase 5) — the
 * pure scoring functions: authored rows beat disposition both ways,
 * contests resolve deterministically, world acts break any grip.
 */

import { describe, it, expect } from 'vitest';
import type { Force } from '@sharpee/world-model';
import {
  type FloorBid,
  scoreFloor,
  resolveInterruption,
  sceneGrip,
  strengthFromIntent,
} from '../../src/conversation';
import type { ConversationSceneState } from '@sharpee/world-model';

function bid(participantId: string, intensities: number[], authored?: 'forces' | 'suppresses'): FloorBid {
  return {
    participantId,
    occasion: { kind: 'open-floor', sceneId: 'scene-1' },
    readings: intensities.map((intensity, i) => ({
      force: 'desire' as Force,
      intensity,
      live: intensity > 0,
      feed: `feed-${i}`,
    })),
    ...(authored ? { authored } : {}),
  };
}

function scene(overrides: Partial<ConversationSceneState> = {}): ConversationSceneState {
  return {
    id: 'scene-1',
    participantIds: ['npc-kemp', 'pc'],
    openedBy: { kind: 'address', openerId: 'pc' },
    floorHolderId: 'pc',
    openExchange: null,
    openedTurn: 1,
    lastMoveTurn: 1,
    ...overrides,
  };
}

describe('scoreFloor', () => {
  it('the most motivated live bid wins', () => {
    const decision = scoreFloor([bid('npc-kemp', [0.3]), bid('npc-burbage', [0.4, 0.3])]);
    expect(decision.winnerId).toBe('npc-burbage');
  });

  it('an authored forces row wins over higher disposition motivation', () => {
    const decision = scoreFloor([bid('npc-kemp', [0.9]), bid('npc-burbage', [0.1], 'forces')]);
    expect(decision.winnerId).toBe('npc-burbage');
  });

  it('an authored suppresses row withdraws its bid even when most motivated', () => {
    const decision = scoreFloor([bid('npc-kemp', [0.9], 'suppresses'), bid('npc-burbage', [0.2])]);
    expect(decision.winnerId).toBe('npc-burbage');
  });

  it('nobody seizes when no bid carries live motivation', () => {
    const decision = scoreFloor([bid('npc-kemp', [0]), bid('npc-burbage', [])]);
    expect(decision.winnerId).toBeNull();
  });

  it('ties break to the lexicographically smallest participant id (deterministic)', () => {
    const decision = scoreFloor([bid('npc-kemp', [0.5]), bid('npc-burbage', [0.5])]);
    expect(decision.winnerId).toBe('npc-burbage');
  });

  it('dead readings do not count toward motivation', () => {
    const bids = [bid('npc-kemp', [0.2]), bid('npc-burbage', [0.6])];
    bids[1].readings[0].live = false;
    expect(scoreFloor(bids).winnerId).toBe('npc-kemp');
  });

  it('every bid — losers and suppressed included — is retained for manner tells', () => {
    const bids = [bid('npc-kemp', [0.9], 'suppresses'), bid('npc-burbage', [0.2])];
    expect(scoreFloor(bids).bids).toEqual(bids);
  });
});

describe('resolveInterruption', () => {
  const challenge = (worldAct: boolean) => ({
    sceneId: 'scene-1',
    interrupterId: 'pc',
    bid: bid('pc', [0.5]),
    worldAct,
  });

  it('passive yields, assertive protests, blocking blocks', () => {
    expect(resolveInterruption(challenge(false), 'passive')).toBe('yields');
    expect(resolveInterruption(challenge(false), 'assertive')).toBe('protests');
    expect(resolveInterruption(challenge(false), 'blocking')).toBe('blocks');
  });

  it('a world act breaks even blocking (D8 exemption)', () => {
    expect(resolveInterruption(challenge(true), 'blocking')).toBe('yields');
  });
});

describe('sceneGrip', () => {
  it('the open exchange strength is innermost and wins', () => {
    const s = scene({
      strength: 'passive',
      openExchange: { exchangeId: 'x', speakerId: 'npc-kemp', strength: 'blocking', openedTurn: 1 },
    });
    expect(sceneGrip(s)).toBe('blocking');
  });

  it('falls back to the scene strength, then the intent-derived fallback', () => {
    expect(sceneGrip(scene({ strength: 'assertive' }))).toBe('assertive');
    expect(sceneGrip(scene(), 'assertive')).toBe('assertive');
    expect(sceneGrip(scene())).toBe('passive');
  });
});

describe('strengthFromIntent', () => {
  it('continuing intents protest; the rest let go; blocking is never derived', () => {
    expect(strengthFromIntent('eager')).toBe('assertive');
    expect(strengthFromIntent('confessing')).toBe('assertive');
    expect(strengthFromIntent('reluctant')).toBe('passive');
    expect(strengthFromIntent('hostile')).toBe('passive');
    expect(strengthFromIntent('neutral')).toBe('passive');
  });
});
