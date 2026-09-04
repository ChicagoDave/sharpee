/**
 * Unit tests for information propagation (ADR-144, ADR-310 D10/D14/D17)
 *
 * Verifies propagation evaluation (spreads whitelist / withholds blacklist,
 * audience, pace, schedule), fact transfer with provenance, the trait-based
 * told-record, and hearsay onward-spread (ADR-320 D11).
 */

import { describe, it, expect } from 'vitest';
import {
  evaluatePropagation,
  PropagationContext,
  RoomOccupant,
} from '../../src/propagation/propagation-evaluator';
import { PropagationProfile } from '../../src/propagation/propagation-types';
import { transferFact, applyTransfers } from '../../src/propagation/fact-transfer';
import { CharacterModelDialogue } from '../../src/conversation/dialogue-extension';
import type { ConversationData, AuthoredResponse } from '../../src/conversation/builder';
import type { ResponseCandidate } from '../../src/conversation/response-types';
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
// Spreads whitelist (ADR-310 D10 — the retired `selective`, said by listing)
// ===========================================================================

describe('Propagation — spreads whitelist', () => {
  it('should only transfer explicitly listed topics when spreads is non-empty', () => {
    const speaker = makeOccupant(
      'cook',
      { tendency: 'chatty', spreads: ['murder'], audience: 'anyone' },
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
// Already-told tracking (trait-based, ADR-310 D17)
// ===========================================================================

describe('Propagation — already-told', () => {
  it('should not re-transfer a fact the speaker trait has already told the listener', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone' },
      { murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 } },
    );
    const listener = makeOccupant('cook');
    speaker.trait.recordTold('cook', 'murder');

    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [listener],
    }));

    expect(transfers).toHaveLength(0);
  });
});

// ===========================================================================
// Player leverage
// ===========================================================================

describe('Propagation — hearsay spreads (ADR-320 D11, ruling 2026-08-17)', () => {
  it('told-sourced facts propagate onward — gossip chains and player claims travel', () => {
    const speaker = makeOccupant(
      'butler',
      { tendency: 'chatty', audience: 'anyone' },
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

    expect(transfers.map((t) => t.topic).sort()).toEqual(['murder', 'weather']);
  });

  it('the retired playerCanLeverage flag changes nothing (dead config)', () => {
    const speaker = makeOccupant(
      'maid',
      { tendency: 'chatty', audience: 'anyone', playerCanLeverage: false },
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
    expect(transfers[0].topic).toBe('murder');
  });
});

// ===========================================================================
// Fact transfer with provenance
// ===========================================================================

describe('Fact transfer — provenance', () => {
  it('should create fact in listener knowledge and record on the speaker trait', () => {
    const speakerTrait = makeTrait();
    const listenerTrait = makeTrait();

    const result = transferFact(
      {
        speakerId: 'maid',
        listenerId: 'cook',
        topic: 'murder',
        version: 'truth',
        coloring: 'dramatic',
      },
      speakerTrait,
      listenerTrait,
      5,
    );

    // Listener now knows about murder
    expect(listenerTrait.knows('murder')).toBe(true);
    const fact = listenerTrait.getFact('murder')!;
    expect(fact.source).toBe('told');
    expect(fact.confidence).toBe('believes');
    expect(fact.turnLearned).toBe(5);

    // Told-record rides the speaker's trait
    expect(speakerTrait.hasTold('cook', 'murder')).toBe(true);

    // Result reflects what happened
    expect(result.source).toBe('told by maid');
    expect(result.alreadyKnew).toBe(false);
  });

  it('should hold the fact at lower confidence when receives is as belief', () => {
    const speakerTrait = makeTrait();
    const listenerTrait = makeTrait();

    transferFact(
      {
        speakerId: 'maid',
        listenerId: 'colonel',
        topic: 'murder',
        version: 'truth',
        coloring: 'neutral',
      },
      speakerTrait,
      listenerTrait,
      5,
      'as belief',
    );

    // The skeptical Colonel holds the topic at 'suspects' — the fold of the
    // retired standalone belief map (ADR-310 D14)
    expect(listenerTrait.knows('murder')).toBe(true);
    const fact = listenerTrait.getFact('murder')!;
    expect(fact.confidence).toBe('suspects');
    expect(fact.source).toBe('told');
  });

  it('should not overwrite existing knowledge', () => {
    const speakerTrait = makeTrait();
    const listenerTrait = makeTrait({
      knowledge: {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });

    const result = transferFact(
      {
        speakerId: 'maid',
        listenerId: 'cook',
        topic: 'murder',
        version: 'truth',
        coloring: 'neutral',
      },
      speakerTrait,
      listenerTrait,
      5,
    );

    // Knowledge unchanged
    expect(listenerTrait.getFact('murder')!.source).toBe('witnessed');
    expect(result.alreadyKnew).toBe(true);

    // But still recorded on the speaker's told-record
    expect(speakerTrait.hasTold('cook', 'murder')).toBe(true);
  });
});

// ===========================================================================
// 310-AC5 — propagation moves a claim, not a token
// ===========================================================================

describe('310-AC5 — the claim value travels with the transfer', () => {
  /** A saw it: thinks the killer is the Butler, certain. */
  function makeSpeakerTrait(): CharacterModelTrait {
    const trait = makeTrait({
      knowledge: {
        'the-killer': { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    trait.setFactBelief('the-killer', {
      value: 'the-butler', confidence: 'certain', source: 'witnessed',
      turnLearned: 0, resistance: 'none',
    });
    return trait;
  }

  /** B's topic table: one row per claimed value of `the-killer`. */
  function listenerDialogue(
    listenerTrait: CharacterModelTrait,
    claimedValue: string,
  ): CharacterModelDialogue {
    const candidate: ResponseCandidate = {
      action: 'tell', constraints: [], messageId: `colonel-says-${claimedValue}`,
      claims: { factId: 'the-killer', value: claimedValue },
    };
    const responses = new Map<string, AuthoredResponse[]>();
    responses.set('asked about the killer', [{ candidate } as AuthoredResponse]);
    const dialogue = new CharacterModelDialogue();
    dialogue.registerNpc('colonel', {
      topics: [{ name: 'the killer', keywords: ['killer'] }],
      responses,
      initiatives: [],
    } as unknown as ConversationData, listenerTrait, () => 7);
    return dialogue;
  }

  /** The real pipeline: A's spreads line → evaluator → transfer, as belief. */
  function propagateToListener(
    speakerTrait: CharacterModelTrait,
    listenerTrait: CharacterModelTrait,
  ): void {
    const speaker: RoomOccupant = {
      id: 'maid',
      trait: speakerTrait,
      profile: { tendency: 'chatty', spreads: ['the-killer'], audience: 'anyone' },
    };
    const transfers = evaluatePropagation(makeContext({
      speaker,
      listeners: [{ id: 'colonel', trait: listenerTrait }],
    }));
    expect(transfers).toHaveLength(1);
    applyTransfers(
      transfers,
      id => id === 'maid' ? speakerTrait : listenerTrait,
      6,
      () => 'as belief',
    );
  }

  it('B receives the value with B\'s own confidence and source, not A\'s', () => {
    const speakerTrait = makeSpeakerTrait();
    const listenerTrait = makeTrait();

    propagateToListener(speakerTrait, listenerTrait);

    expect(listenerTrait.getFactBelief('the-killer')).toEqual({
      value: 'the-butler', confidence: 'suspects', source: 'told',
      turnLearned: 6, resistance: 'none',
    });
    // A's own belief is untouched
    expect(speakerTrait.getFactBelief('the-killer')).toMatchObject({
      confidence: 'certain', source: 'witnessed',
    });
  });

  it('B\'s dialogue honestly repeats the received value: no mint', () => {
    const speakerTrait = makeSpeakerTrait();
    const listenerTrait = makeTrait();
    propagateToListener(speakerTrait, listenerTrait);

    const dialogue = listenerDialogue(listenerTrait, 'the-butler');
    const result = dialogue.handleAsk('colonel', 'the killer', 'player');

    expect(result.messageId).toBe('colonel-says-the-butler');
    expect(listenerTrait.ledger).toHaveLength(0);
    expect(listenerTrait.pressure.value).toBe(0);
  });

  it('B claiming against the received value mints a pinned lie — the value is live in B\'s dialogue', () => {
    const speakerTrait = makeSpeakerTrait();
    const listenerTrait = makeTrait();
    propagateToListener(speakerTrait, listenerTrait);

    const dialogue = listenerDialogue(listenerTrait, 'the-gardener');
    const result = dialogue.handleAsk('colonel', 'the killer', 'player');

    expect(result.messageId).toBe('colonel-says-the-gardener');
    expect(listenerTrait.ledger).toHaveLength(1);
    expect(listenerTrait.ledger[0]).toMatchObject({
      kind: 'claim', audience: 'player', factId: 'the-killer',
      claimedValue: 'the-gardener', pinned: true,
    });
  });

  it('a belief the listener already holds is never displaced', () => {
    const speakerTrait = makeSpeakerTrait();
    const listenerTrait = makeTrait();
    listenerTrait.setFactBelief('the-killer', {
      value: 'the-gardener', confidence: 'certain', source: 'witnessed',
      turnLearned: 2, resistance: 'none',
    });

    propagateToListener(speakerTrait, listenerTrait);

    expect(listenerTrait.getFactBelief('the-killer')).toMatchObject({
      value: 'the-gardener', confidence: 'certain', source: 'witnessed',
    });
  });

  it('a speaker with no held belief transfers the token only', () => {
    const speakerTrait = makeTrait({
      knowledge: {
        'the-killer': { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    const listenerTrait = makeTrait();

    transferFact(
      { speakerId: 'maid', listenerId: 'colonel', topic: 'the-killer', version: 'truth', coloring: 'neutral' },
      speakerTrait, listenerTrait, 6,
    );

    expect(listenerTrait.knows('the-killer')).toBe(true);
    expect(listenerTrait.hasFactBelief('the-killer')).toBe(false);
  });
});

// ===========================================================================
// Multi-hop provenance chain
// ===========================================================================

describe('Fact transfer — multi-hop provenance', () => {
  it('should track provenance across multiple hops', () => {
    const maidTrait = makeTrait({
      knowledge: {
        murder: { source: 'witnessed', confidence: 'certain', turnLearned: 0 },
      },
    });
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();

    // Maid → Cook
    transferFact(
      { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'dramatic' },
      maidTrait,
      cookTrait,
      1,
    );

    expect(cookTrait.knows('murder')).toBe(true);
    expect(cookTrait.getFact('murder')!.source).toBe('told');

    // Cook → Colonel
    transferFact(
      { speakerId: 'cook', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      cookTrait,
      colonelTrait,
      2,
    );

    expect(colonelTrait.knows('murder')).toBe(true);
    expect(colonelTrait.getFact('murder')!.source).toBe('told');

    // Each hop recorded on its speaker's trait
    expect(maidTrait.hasTold('cook', 'murder')).toBe(true);
    expect(cookTrait.hasTold('colonel', 'murder')).toBe(true);
    expect(maidTrait.hasTold('colonel', 'murder')).toBe(false);
  });
});

// ===========================================================================
// applyTransfers batch
// ===========================================================================

describe('applyTransfers — batch', () => {
  it('should apply multiple transfers and return results', () => {
    const maidTrait = makeTrait();
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();

    const getTrait = (id: string) => {
      if (id === 'maid') return maidTrait;
      if (id === 'cook') return cookTrait;
      if (id === 'colonel') return colonelTrait;
      return undefined;
    };

    const results = applyTransfers(
      [
        { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'dramatic' },
        { speakerId: 'maid', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      ],
      getTrait,
      1,
    );

    expect(results).toHaveLength(2);
    expect(cookTrait.knows('murder')).toBe(true);
    expect(colonelTrait.knows('murder')).toBe(true);
    expect(maidTrait.hasTold('cook', 'murder')).toBe(true);
    expect(maidTrait.hasTold('colonel', 'murder')).toBe(true);
  });

  it('should respect per-listener receives setting', () => {
    const maidTrait = makeTrait();
    const cookTrait = makeTrait();
    const colonelTrait = makeTrait();

    const getTrait = (id: string) => {
      if (id === 'maid') return maidTrait;
      if (id === 'cook') return cookTrait;
      if (id === 'colonel') return colonelTrait;
      return undefined;
    };

    applyTransfers(
      [
        { speakerId: 'maid', listenerId: 'cook', topic: 'murder', version: 'truth', coloring: 'neutral' },
        { speakerId: 'maid', listenerId: 'colonel', topic: 'murder', version: 'truth', coloring: 'neutral' },
      ],
      getTrait,
      1,
      (id) => id === 'colonel' ? 'as belief' : 'as fact',
    );

    // Cook gets it at full confidence
    expect(cookTrait.getFact('murder')!.confidence).toBe('believes');

    // The skeptical Colonel holds it at 'suspects'
    expect(colonelTrait.getFact('murder')!.confidence).toBe('suspects');
  });
});

// ===========================================================================
// Told-record persistence (ADR-310 D17)
// ===========================================================================

describe('Told-record — persistence', () => {
  it('should ride the speaker trait through a JSON round-trip', () => {
    const speakerTrait = makeTrait();
    speakerTrait.recordTold('cook', 'murder');
    speakerTrait.recordTold('cook', 'weapon');
    speakerTrait.recordTold('colonel', 'murder');

    const restored = new CharacterModelTrait(
      JSON.parse(JSON.stringify(speakerTrait)) as ICharacterModelData,
    );

    expect(restored.hasTold('cook', 'murder')).toBe(true);
    expect(restored.hasTold('cook', 'weapon')).toBe(true);
    expect(restored.hasTold('colonel', 'murder')).toBe(true);
    expect(restored.hasTold('colonel', 'weapon')).toBe(false);
  });
});
