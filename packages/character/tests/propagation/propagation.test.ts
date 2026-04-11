/**
 * Unit tests for information propagation (ADR-144)
 *
 * Verifies propagation evaluation (tendency, audience, pace, schedule),
 * fact transfer with provenance, already-told tracking, and
 * player-leverage gating.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluatePropagation,
  PropagationContext,
  RoomOccupant,
} from '../../src/propagation/propagation-evaluator';
import {
  AlreadyToldRecord,
  PropagationProfile,
} from '../../src/propagation/propagation-types';
import { transferFact, applyTransfers } from '../../src/propagation/fact-transfer';
import { CharacterModelTrait, ICharacterModelData } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrait(overrides?: ICharacterModelData): CharacterModelTrait {
  return new CharacterModelTrait(overrides);
}

function makeOccupant(
  id: string,
  profile?: PropagationProfile,
  knowledge?: Record<string, any>,
  dispositions?: Record<string, number>,
): RoomOccupant {
  const trait = makeTrait({ knowledge, dispositions });
  return { id, trait, profile };
}

function makeContext(overrides: Partial<PropagationContext>): PropagationContext {
  return {
    speaker: overrides.speaker!,
    listeners: overrides.listeners ?? [],
    playerPresent: overrides.playerPresent ?? false,
    alreadyTold: overrides.alreadyTold ?? new AlreadyToldRecord(),
    turn: overrides.turn ?? 1,
    turnsColocated: overrides.turnsColocated,
  };
}

// ===========================================================================
// Tendency: mute
// ===========================================================================

describe('Propagation — mute tendency', () => {
  it('should produce no transfers for mute NPC', () => {
    const speaker = makeOccupant('butler', { tendency: 'mute' }, {
      murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
    });
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(0);
  });

  it('should produce no transfers when NPC has no profile', () => {
    const speaker = makeOccupant('butler', undefined, {
      murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
    });
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(0);
  });
});

// ===========================================================================
// Tendency: chatty
// ===========================================================================

describe('Propagation — chatty tendency', () => {
  it('should transfer all known facts to trusted listeners', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'trusted' },
      {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
        weapon: { source: 'witnessed', confidence: 'certain', turnLearned: 1 },
      },
      { cook: 40 }, // likes cook → trusted
    );
    const listener = makeOccupant('cook', undefined, {}, { maid: 30 });

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(2);
    const topics = transfers.map(t => t.topic).sort((a, b) => a.localeCompare(b));
    expect(topics).toEqual(['murder', 'weapon']);
  });

  it('should withhold topics in the withholds list', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone', withholds: ['own-alibi'] },
      {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
        'own-alibi': { source: 'assumed', confidence: 'certain', turnLearned: 0 },
      },
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
    expect(transfers[0].topic).toBe('murder');
  });

  it('should not share with untrusted listeners when audience is trusted', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'trusted' },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
      { cook: -30 }, // dislikes cook → not trusted
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(0);
  });

  it('should share with anyone when audience is anyone', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone' },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
      { cook: -30 }, // dislikes cook — but audience is 'anyone'
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
  });
});

// ===========================================================================
// Tendency: selective
// ===========================================================================

describe('Propagation — selective tendency', () => {
  it('should only transfer explicitly listed topics', () => {
    const speaker = makeOccupant(
      'cook',
      { tendency: 'selective', spreads: ['murder'], audience: 'anyone' },
      {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
        weapon: { source: 'witnessed', confidence: 'certain', turnLearned: 1 },
        alibi: { source: 'assumed', confidence: 'certain', turnLearned: 2 },
      },
    );
    const listener = makeOccupant('colonel');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
    expect(transfers[0].topic).toBe('murder');
  });
});

// ===========================================================================
// Exclusions
// ===========================================================================

describe('Propagation — exclusions', () => {
  it('should exclude specific NPCs from receiving information', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone', excludes: ['colonel'] },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    );
    const cook = makeOccupant('cook');
    const colonel = makeOccupant('colonel');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [cook, colonel],
    }));

    expect(transfers).toHaveLength(1);
    expect(transfers[0].listenerId).toBe('cook');
  });
});

// ===========================================================================
// Pace
// ===========================================================================

describe('Propagation — pace', () => {
  it('should share all facts at once with eager pace', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone', pace: 'eager' },
      {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
        weapon: { source: 'witnessed', confidence: 'certain', turnLearned: 1 },
        alibi: { source: 'witnessed', confidence: 'certain', turnLearned: 2 },
      },
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(3);
  });

  it('should share one fact per turn with gradual pace', () => {
    const speaker = makeOccupant(
      'cook',
      { tendency: 'chatty', audience: 'anyone', pace: 'gradual' },
      {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
        weapon: { source: 'witnessed', confidence: 'certain', turnLearned: 1 },
      },
    );
    const listener = makeOccupant('colonel');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
  });

  it('should wait for multiple colocated turns with reluctant pace', () => {
    const speaker = makeOccupant(
      'gardener',
      { tendency: 'chatty', audience: 'anyone', pace: 'reluctant' },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    );
    const listener = makeOccupant('cook');

    // Not enough turns colocated
    const transfers1 = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
      turnsColocated: 1,
    }));
    expect(transfers1).toHaveLength(0);

    // Enough turns colocated
    const transfers2 = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
      turnsColocated: 3,
    }));
    expect(transfers2).toHaveLength(1);
  });
});

// ===========================================================================
// Schedule conditions
// ===========================================================================

describe('Propagation — schedule', () => {
  it('should skip propagation when schedule conditions are not met', () => {
    const speaker = makeOccupant(
      'maid',
      {
        tendency: 'chatty',
        audience: 'anyone',
        schedule: { when: ['anxious'] },
      },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    );
    // Maid is calm by default → 'anxious' predicate is false
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(0);
  });

  it('should propagate when schedule conditions are met', () => {
    const trait = makeTrait({
      mood: 'anxious',
      knowledge: {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    const speaker: RoomOccupant = {
      id: 'maid',
      trait,
      profile: {
        tendency: 'chatty',
        audience: 'anyone',
        schedule: { when: ['anxious'] },
      },
    };
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
  });
});

// ===========================================================================
// Already-told tracking
// ===========================================================================

describe('Propagation — already-told', () => {
  it('should not re-transfer a fact already told to a listener', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone' },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    );
    const listener = makeOccupant('cook');
    const alreadyTold = new AlreadyToldRecord();
    alreadyTold.record('maid', 'cook', 'murder');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
      alreadyTold,
    }));

    expect(transfers).toHaveLength(0);
  });
});

// ===========================================================================
// Player leverage
// ===========================================================================

describe('Propagation — player leverage', () => {
  it('should not propagate player-told facts when playerCanLeverage is false', () => {
    const speaker = makeOccupant(
      'butler',
      { tendency: 'chatty', audience: 'anyone', playerCanLeverage: false },
      {
        murder: { source: 'told', confidence: 'believes', turnLearned: 5 },
        weather: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    // Only 'weather' should propagate — 'murder' was told by player
    expect(transfers).toHaveLength(1);
    expect(transfers[0].topic).toBe('weather');
  });

  it('should propagate player-told facts when playerCanLeverage is true', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone', playerCanLeverage: true },
      {
        murder: { source: 'told', confidence: 'believes', turnLearned: 5 },
      },
    );
    const listener = makeOccupant('cook');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(1);
  });
});

// ===========================================================================
// Fact transfer with provenance
// ===========================================================================

describe('Fact transfer — provenance', () => {
  it('should create fact in listener knowledge with source provenance', () => {
    const listenerTrait = makeTrait();
    const alreadyTold = new AlreadyToldRecord();

    const result = transferFact(
      {
        speakerId: 'maid',
        listenerId: 'cook',
        topic: 'murder',
        version: 'truth',
        coloring: 'dramatic',
      },
      listenerTrait,
      alreadyTold,
      5,
    );

    // Listener now knows about murder
    expect(listenerTrait.knows('murder')).toBe(true);
    const fact = listenerTrait.getFact('murder')!;
    expect(fact.source).toBe('told');
    expect(fact.confidence).toBe('believes');
    expect(fact.turnLearned).toBe(5);

    // Already-told is recorded
    expect(alreadyTold.hasTold('maid', 'cook', 'murder')).toBe(true);

    // Result reflects what happened
    expect(result.source).toBe('told by maid');
    expect(result.alreadyKnew).toBe(false);
  });

  it('should add as belief when receives is as belief', () => {
    const listenerTrait = makeTrait();
    const alreadyTold = new AlreadyToldRecord();

    transferFact(
      {
        speakerId: 'maid',
        listenerId: 'colonel',
        topic: 'murder',
        version: 'truth',
        coloring: 'neutral',
      },
      listenerTrait,
      alreadyTold,
      5,
      'as belief',
    );

    // Colonel holds it as a belief, not a fact
    expect(listenerTrait.knows('murder')).toBe(false);
    expect(listenerTrait.hasBelief('murder')).toBe(true);
    expect(listenerTrait.getBelief('murder')!.strength).toBe('suspects');
  });

  it('should not overwrite existing knowledge', () => {
    const listenerTrait = makeTrait({
      knowledge: {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    const alreadyTold = new AlreadyToldRecord();

    const result = transferFact(
      {
        speakerId: 'maid',
        listenerId: 'cook',
        topic: 'murder',
        version: 'truth',
        coloring: 'neutral',
      },
      listenerTrait,
      alreadyTold,
      5,
    );

    // Knowledge unchanged
    expect(listenerTrait.getFact('murder')!.source).toBe('witnessed');
    expect(result.alreadyKnew).toBe(true);

    // But still recorded in already-told
    expect(alreadyTold.hasTold('maid', 'cook', 'murder')).toBe(true);
  });
});

// ===========================================================================
// Multi-hop provenance chain
// ===========================================================================

describe('Fact transfer — multi-hop provenance', () => {
  it('should track provenance across multiple hops', () => {
    makeTrait({
      knowledge: {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();
    const alreadyTold = new AlreadyToldRecord();

    // Maid → Cook
    transferFact(
      { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'dramatic' },
      cookTrait,
      alreadyTold,
      1,
    );

    expect(cookTrait.knows('murder')).toBe(true);
    expect(cookTrait.getFact('murder')!.source).toBe('told');

    // Cook → Colonel
    transferFact(
      { speakerId: 'cook', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      colonelTrait,
      alreadyTold,
      2,
    );

    expect(colonelTrait.knows('murder')).toBe(true);
    expect(colonelTrait.getFact('murder')!.source).toBe('told');

    // Both hops recorded
    expect(alreadyTold.hasTold('maid', 'cook', 'murder')).toBe(true);
    expect(alreadyTold.hasTold('cook', 'colonel', 'murder')).toBe(true);
  });
});

// ===========================================================================
// applyTransfers batch
// ===========================================================================

describe('applyTransfers — batch', () => {
  it('should apply multiple transfers and return results', () => {
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();
    const alreadyTold = new AlreadyToldRecord();

    const getListener = (id: string) => {
      if (id === 'cook') return cookTrait;
      if (id === 'colonel') return colonelTrait;
      return undefined;
    };

    const results = applyTransfers(
      [
        { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'dramatic' },
        { speakerId: 'maid', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      ],
      getListener,
      alreadyTold,
      1,
    );

    expect(results).toHaveLength(2);
    expect(cookTrait.knows('murder')).toBe(true);
    expect(colonelTrait.knows('murder')).toBe(true);
  });

  it('should respect per-listener receives setting', () => {
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();
    const alreadyTold = new AlreadyToldRecord();

    const getListener = (id: string) => {
      if (id === 'cook') return cookTrait;
      if (id === 'colonel') return colonelTrait;
      return undefined;
    };

    applyTransfers(
      [
        { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'neutral' },
        { speakerId: 'maid', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      ],
      getListener,
      alreadyTold,
      1,
      (id) => id === 'colonel' ? 'as belief' : 'as fact',
    );

    // Cook gets it as fact
    expect(cookTrait.knows('murder')).toBe(true);

    // Colonel gets it as belief
    expect(colonelTrait.knows('murder')).toBe(false);
    expect(colonelTrait.hasBelief('murder')).toBe(true);
  });
});

// ===========================================================================
// AlreadyToldRecord serialization
// ===========================================================================

describe('AlreadyToldRecord — serialization', () => {
  it('should round-trip through toJSON/fromJSON', () => {
    const record = new AlreadyToldRecord();
    record.record('maid', 'cook', 'murder');
    record.record('maid', 'cook', 'weapon');
    record.record('cook', 'colonel', 'murder');

    const serialized = record.toJSON();
    const restored = AlreadyToldRecord.fromJSON(serialized);

    expect(restored.hasTold('maid', 'cook', 'murder')).toBe(true);
    expect(restored.hasTold('maid', 'cook', 'weapon')).toBe(true);
    expect(restored.hasTold('cook', 'colonel', 'murder')).toBe(true);
    expect(restored.hasTold('maid', 'colonel', 'murder')).toBe(false);
  });
});
