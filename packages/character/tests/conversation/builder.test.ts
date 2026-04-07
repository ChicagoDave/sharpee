/**
 * Unit tests for ConversationBuilder and ResponseChainBuilder (ADR-142)
 *
 * Verifies the fluent API for defining topics, response constraints,
 * NPC initiative, offscreen scenes, and witnessed scenes.
 */

import { describe, it, expect } from 'vitest';
import {
  ConversationBuilder,
  ResponseChainBuilder,
} from '../../src/conversation/builder';

// ===========================================================================
// Topic registration
// ===========================================================================

describe('ConversationBuilder — topics', () => {
  it('should register topics in conversation data', () => {
    const builder = new ConversationBuilder('margaret');
    builder.topic('murder', {
      keywords: ['murder', 'killing', 'death'],
      related: ['weapon', 'victim'],
    });

    const data = builder.getConversationData();
    expect(data.topics).toHaveLength(1);
    expect(data.topics[0].name).toBe('murder');
    expect(data.topics[0].keywords).toEqual(['murder', 'killing', 'death']);
    expect(data.topics[0].related).toEqual(['weapon', 'victim']);
  });

  it('should register topics with availability gates', () => {
    const builder = new ConversationBuilder('margaret');
    builder.topic('alibi', {
      keywords: ['alibi'],
      availableWhen: ['knows murder'],
    });

    const data = builder.getConversationData();
    expect(data.topics[0].availableWhen).toEqual(['knows murder']);
  });

  it('should support multiple topics', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .topic('murder', { keywords: ['murder'] })
      .topic('weapon', { keywords: ['knife'] })
      .topic('alibi', { keywords: ['alibi'] });

    expect(builder.getConversationData().topics).toHaveLength(3);
  });
});

// ===========================================================================
// Response chain builder
// ===========================================================================

describe('ConversationBuilder — response chains', () => {
  it('should build a response chain with constraints', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about murder')
        .if('trusts player', 'not threatened')
        .tell('murder-truth-full')

        .if('loyal', 'not cornered')
        .lie('murder-blame-gardener')

        .if('threatened', 'cowardly')
        .confess('murder-breaks-down')

        .otherwise()
        .deflect('murder-deflects')
      .done();

    const data = builder.getConversationData();
    const responses = data.responses.get('asked about murder');
    expect(responses).toBeDefined();
    expect(responses).toHaveLength(4);

    expect(responses![0].candidate.action).toBe('tell');
    expect(responses![0].candidate.constraints).toEqual(['trusts player', 'not threatened']);

    expect(responses![1].candidate.action).toBe('lie');
    expect(responses![1].candidate.constraints).toEqual(['loyal', 'not cornered']);

    expect(responses![2].candidate.action).toBe('confess');
    expect(responses![2].candidate.constraints).toEqual(['threatened', 'cowardly']);

    // .otherwise() has empty constraints
    expect(responses![3].candidate.action).toBe('deflect');
    expect(responses![3].candidate.constraints).toEqual([]);
  });

  it('should support all response actions', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about test')
        .tell('msg-tell')
        .lie('msg-lie')
        .deflect('msg-deflect')
        .refuse('msg-refuse')
        .omit('msg-omit')
        .confess('msg-confess')
        .confabulate('msg-confabulate')
        .askBack('msg-askback')
      .done();

    const data = builder.getConversationData();
    const responses = data.responses.get('asked about test')!;
    const actions = responses.map(r => r.candidate.action);

    expect(actions).toEqual([
      'tell', 'lie', 'deflect', 'refuse',
      'omit', 'confess', 'confabulate', 'ask back',
    ]);
  });

  it('should support params on tell', () => {
    const builder = new ConversationBuilder('margaret');
    const murdererFn = () => 'Colonel Mustard';

    builder
      .when('asked about murder')
        .tell('saw-murder', { murderer: murdererFn })
      .done();

    const data = builder.getConversationData();
    const response = data.responses.get('asked about murder')![0];
    expect(response.candidate.params).toBeDefined();
    expect(response.candidate.params!.murderer()).toBe('Colonel Mustard');
  });

  it('should attach context settings to response', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about murder')
        .if('threatened', 'cowardly')
        .setsContext('confessing', { intent: 'eager', strength: 'assertive' })
        .confess('murder-breaks-down')
      .done();

    const data = builder.getConversationData();
    const response = data.responses.get('asked about murder')![0];
    expect(response.contextSettings).toBeDefined();
    expect(response.contextSettings!.label).toBe('confessing');
    expect(response.contextSettings!.intent).toBe('eager');
    expect(response.contextSettings!.strength).toBe('assertive');
  });

  it('should attach state mutations to response', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('told about bloodstain')
        .if('lied about murder')
        .updatesState({ threat: 30, mood: 'panicked' })
        .confess('murder-caught')
      .done();

    const data = builder.getConversationData();
    const response = data.responses.get('told about bloodstain')![0];
    expect(response.stateMutations).toEqual({ threat: 30, mood: 'panicked' });
  });

  it('should attach between-turn overrides and leave-attempt message', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about murder')
        .if('threatened')
        .setsContext('confessing', { intent: 'eager', strength: 'blocking' })
        .betweenTurns(1, 'margaret-wrings-hands')
        .betweenTurns(3, 'margaret-grabs-arm')
        .onLeaveAttempt('margaret-blocks-doorway')
        .confess('murder-breaks-down')
      .done();

    const data = builder.getConversationData();
    const response = data.responses.get('asked about murder')![0];
    expect(response.betweenTurnOverrides).toHaveLength(2);
    expect(response.betweenTurnOverrides![0]).toEqual({ turnNumber: 1, messageId: 'margaret-wrings-hands' });
    expect(response.onLeaveAttemptMessage).toBe('margaret-blocks-doorway');
  });

  it('should chain multiple .when() triggers', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about murder')
        .tell('murder-truth')
      .when('asked about weapon')
        .tell('weapon-info')
      .done();

    const data = builder.getConversationData();
    expect(data.responses.has('asked about murder')).toBe(true);
    expect(data.responses.has('asked about weapon')).toBe(true);
  });

  it('should auto-finalize pending chain on getConversationData', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .when('asked about murder')
        .tell('murder-truth');
    // No .done() call

    const data = builder.getConversationData();
    expect(data.responses.has('asked about murder')).toBe(true);
    expect(data.responses.get('asked about murder')).toHaveLength(1);
  });
});

// ===========================================================================
// NPC initiative
// ===========================================================================

describe('ConversationBuilder — initiative', () => {
  it('should register initiative triggers', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .initiates(['trusts player', 'knows murder'], 'margaret-approaches')
      .initiates(['nervous'], 'margaret-fidgets');

    const data = builder.getConversationData();
    expect(data.initiatives).toHaveLength(2);
    expect(data.initiatives[0].conditions).toEqual(['trusts player', 'knows murder']);
    expect(data.initiatives[0].messageId).toBe('margaret-approaches');
  });
});

// ===========================================================================
// NPC-to-NPC scenes
// ===========================================================================

describe('ConversationBuilder — NPC-to-NPC scenes', () => {
  it('should register offscreen scenes', () => {
    const builder = new ConversationBuilder('margaret');
    builder.offscreen({
      npcA: 'margaret',
      npcB: 'butler',
      conditions: ['player absent', 'margaret knows murder'],
      mutations: {
        margaret: { threat: 30, mood: 'panicked' },
        butler: { disposition: { margaret: 'wary of' } },
      },
      topicUnlocks: {
        margaret: ['butler-confrontation'],
        butler: ['margaret-secret'],
      },
      onReturnMessage: 'margaret-and-butler-fall-silent',
    });

    const data = builder.getConversationData();
    expect(data.offscreenScenes).toHaveLength(1);
    expect(data.offscreenScenes[0].npcA).toBe('margaret');
    expect(data.offscreenScenes[0].onReturnMessage).toBe('margaret-and-butler-fall-silent');
  });

  it('should register witnessed/eavesdropping scenes', () => {
    const builder = new ConversationBuilder('margaret');
    builder.witnessed({
      npcA: 'margaret',
      npcB: 'butler',
      conditions: ['player concealed', 'margaret knows murder'],
      dialogue: [
        { speaker: 'butler', says: 'butler-confronts' },
        { speaker: 'margaret', says: 'margaret-denies' },
      ],
      mutations: {
        margaret: { mood: 'panicked' },
      },
      playerLearns: { topic: 'murder', source: 'overheard' },
      discoveredBy: { condition: 'player makes noise', messageId: 'margaret-catches-player' },
    });

    const data = builder.getConversationData();
    expect(data.witnessedScenes).toHaveLength(1);
    expect(data.witnessedScenes[0].dialogue).toHaveLength(2);
    expect(data.witnessedScenes[0].playerLearns!.source).toBe('overheard');
  });
});

// ===========================================================================
// Inherits CharacterBuilder
// ===========================================================================

describe('ConversationBuilder — inherits CharacterBuilder', () => {
  it('should support personality, mood, and knowledge from CharacterBuilder', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .personality('very honest', 'cowardly')
      .mood('nervous')
      .knows('murder', { witnessed: true })
      .topic('murder', { keywords: ['murder'] })
      .when('asked about murder')
        .tell('murder-truth')
      .done();

    // Compile as CharacterBuilder
    const compiled = builder.compile();
    expect(compiled.traitData.mood).toBe('nervous');
    expect(compiled.traitData.knowledge!['murder']).toBeDefined();

    // Also has conversation data
    const data = builder.getConversationData();
    expect(data.topics).toHaveLength(1);
    expect(data.responses.has('asked about murder')).toBe(true);
  });
});
