/**
 * Integration tests for CharacterModelDialogue (ADR-142)
 *
 * Tests the full ask→resolve→evaluate→record→intent path using
 * real CharacterModelTrait instances (no mocks).
 */

import { describe, it, expect } from 'vitest';
import { CharacterModelDialogue } from '../../src/conversation/dialogue-extension';
import { ConversationBuilder } from '../../src/conversation/builder';
import { CharacterModelTrait } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMargaret(): {
  builder: ConversationBuilder;
  trait: CharacterModelTrait;
} {
  const builder = new ConversationBuilder('margaret');
  builder
    .personality('very honest', 'cowardly')
    .mood('nervous')
    .knows('murder', { witnessed: true })
    .loyalTo('lady-grey')

    .topic('murder', {
      keywords: ['murder', 'killing', 'death', 'stabbing'],
      related: ['weapon', 'victim'],
    })
    .topic('weapon', {
      keywords: ['weapon', 'knife', 'blade', 'dagger'],
    })
    .topic('lady-grey', {
      keywords: ['lady grey', 'lady', 'mistress'],
    })
    .topic('alibi', {
      keywords: ['alibi', 'where were you'],
      availableWhen: ['knows murder'],
    })

    .when('asked about murder')
      .if('trusts player', 'not threatened')
      .tell('murder-truth-full')

      .if('threatened', 'cowardly')
      .setsContext('confessing', { intent: 'eager', strength: 'assertive' })
      .confess('murder-breaks-down')

      .otherwise()
      .deflect('murder-deflects')

    .when('asked about weapon')
      .tell('weapon-description')

    .when('asked about lady-grey')
      .if('not cornered')
      .omit('lady-grey-innocent-act')

      .if('cornered')
      .confess('lady-grey-truth')

    .when('told about bloodstain')
      .if('not threatened')
      .tell('bloodstain-shocked')

      .if('threatened')
      .updatesState({ threat: 30 })
      .confess('murder-caught-by-evidence')
    .done();

  const compiled = builder.compile();
  const trait = new CharacterModelTrait(compiled.traitData);

  // Register custom predicates
  trait.registerPredicate('knows murder', (t) => t.knows('murder'));
  // 'loyal' from ADR-141 platform predicates (if registered)
  // 'trusts player', 'threatened', 'cowardly', 'cornered' are platform predicates

  return { builder, trait };
}

function createDialogue(
  builder: ConversationBuilder,
  trait: CharacterModelTrait,
  npcId: string = 'margaret',
): CharacterModelDialogue {
  const dialogue = new CharacterModelDialogue();
  let turn = 1;
  dialogue.registerNpc(npcId, builder.getConversationData(), trait, () => turn++);
  return dialogue;
}

// ===========================================================================
// handleAsk — basic flow
// ===========================================================================

describe('CharacterModelDialogue — handleAsk', () => {
  it('should resolve topic and return response', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleAsk('margaret', 'the murder');

    expect(result.handled).toBe(true);
    expect(result.responseIntent).toBeDefined();
    expect(result.responseIntent!.topic).toBe('murder');
    // Margaret is nervous, not threatened, not trusted → deflect (otherwise)
    expect(result.responseIntent!.action).toBe('deflect');
  });

  it('should select response based on character state', () => {
    const { builder, trait } = buildMargaret();

    // Make Margaret threatened and cowardly → should confess
    trait.setThreat('threatened');

    const dialogue = createDialogue(builder, trait);
    const result = dialogue.handleAsk('margaret', 'murder');

    expect(result.responseIntent!.action).toBe('confess');
    expect(result.responseIntent!.messageId).toContain('murder-breaks-down');
  });

  it('should set conversation context when response specifies it', () => {
    const { builder, trait } = buildMargaret();
    trait.setThreat('threatened');

    const dialogue = createDialogue(builder, trait);
    dialogue.handleAsk('margaret', 'murder');

    const lifecycle = dialogue.getLifecycle();
    expect(lifecycle.isActive()).toBe(true);

    const ctx = lifecycle.getContext()!;
    expect(ctx.contextLabel).toBe('confessing');
    expect(ctx.intent).toBe('eager');
    expect(ctx.strength).toBe('assertive');
  });

  it('should return unknown-topic for unrecognized input', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleAsk('margaret', 'quantum physics');
    expect(result.handled).toBe(true);
    expect(result.messageId).toBe('character.conversation.unknown-topic');
  });

  it('should return handled=false for unregistered NPC', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleAsk('nobody', 'murder');
    expect(result.handled).toBe(false);
  });

  it('should attach mood to response intent', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleAsk('margaret', 'weapon');
    expect(result.responseIntent!.mood).toBe('nervous');
    // Message ID should have mood suffix
    expect(result.responseIntent!.messageId).toBe('weapon-description.nervous');
  });

  it('should record the response in conversation history', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    dialogue.handleAsk('margaret', 'murder');

    const evaluator = dialogue.getEvaluator();
    expect(evaluator.hasDiscussed('margaret', 'murder')).toBe(true);
    expect(evaluator.getLastResponse('margaret', 'murder')!.action).toBe('deflect');
  });
});

// ===========================================================================
// handleTell — confrontation
// ===========================================================================

describe('CharacterModelDialogue — handleTell', () => {
  it('should handle confrontation and record evidence', () => {
    const { builder, trait } = buildMargaret();
    // Register 'bloodstain' topic for resolution
    // It's not in the topics, so let's add it
    builder.topic('bloodstain', { keywords: ['bloodstain', 'blood'] });
    // Need to re-register with updated data
    const dialogue2 = createDialogue(builder, trait);

    const result = dialogue2.handleTell('margaret', 'the bloodstain');
    expect(result.handled).toBe(true);
    expect(result.responseIntent).toBeDefined();
    // Margaret not threatened → 'tell' with 'bloodstain-shocked'
    expect(result.responseIntent!.action).toBe('tell');

    // Evidence should be recorded
    const evaluator = dialogue2.getEvaluator();
    expect(evaluator.hasPresented('margaret', 'bloodstain')).toBe(true);
  });

  it('should apply state mutations from confrontation response', () => {
    const { builder, trait } = buildMargaret();

    // Add bloodstain topic
    builder.topic('bloodstain', { keywords: ['bloodstain', 'blood'] });

    // Make Margaret threatened first so the second response matches
    trait.setThreat('threatened');

    const dialogue = createDialogue(builder, trait);
    const initialThreat = trait.threatValue;

    dialogue.handleTell('margaret', 'bloodstain');

    // Threat should have increased by 30
    expect(trait.threatValue).toBe(initialThreat + 30);
  });
});

// ===========================================================================
// handleTalkTo — conversation initiation
// ===========================================================================

describe('CharacterModelDialogue — handleTalkTo', () => {
  it('should begin conversation and return greeting', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleTalkTo('margaret');
    expect(result.handled).toBe(true);

    // Conversation should be active
    expect(dialogue.getLifecycle().isActive()).toBe(true);
    expect(dialogue.getLifecycle().getActiveNpcId()).toBe('margaret');
  });

  it('should fire initiative trigger when conditions are met', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .personality('honest')
      .knows('murder', { witnessed: true })
      .initiates(['knows murder'], 'margaret-approaches-player')
      .topic('murder', { keywords: ['murder'] })
      .when('asked about murder')
        .tell('murder-truth')
      .done();

    const compiled = builder.compile();
    const trait = new CharacterModelTrait(compiled.traitData);
    trait.registerPredicate('knows murder', (t) => t.knows('murder'));

    const dialogue = createDialogue(builder, trait);
    const result = dialogue.handleTalkTo('margaret');

    expect(result.messageId).toBe('margaret-approaches-player');
  });

  it('should return default greeting when no initiative trigger matches', () => {
    const builder = new ConversationBuilder('butler');
    builder
      .topic('weather', { keywords: ['weather'] })
      .when('asked about weather')
        .tell('weather-info')
      .done();

    const compiled = builder.compile();
    const trait = new CharacterModelTrait(compiled.traitData);

    const dialogue = createDialogue(builder, trait, 'butler');
    const result = dialogue.handleTalkTo('butler');

    expect(result.messageId).toBe('character.conversation.greeting');
  });
});

// ===========================================================================
// handleSay
// ===========================================================================

describe('CharacterModelDialogue — handleSay', () => {
  it('should route targeted speech through handleAsk', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleSay('margaret', 'the murder');
    expect(result.handled).toBe(true);
    expect(result.responseIntent!.topic).toBe('murder');
  });

  it('should return handled=false for untargeted speech', () => {
    const { builder, trait } = buildMargaret();
    const dialogue = createDialogue(builder, trait);

    const result = dialogue.handleSay(undefined, 'hello');
    expect(result.handled).toBe(false);
  });
});

// ===========================================================================
// Contradiction detection through dialogue
// ===========================================================================

describe('CharacterModelDialogue — contradiction detection', () => {
  it('should detect contradiction when NPC changes story', () => {
    const builder = new ConversationBuilder('margaret');
    builder
      .personality('cowardly')
      .knows('murder', { witnessed: true })

      .topic('murder', { keywords: ['murder'] })

      .when('asked about murder')
        .if('not threatened')
        .lie('murder-lie')

        .if('threatened')
        .confess('murder-truth')
      .done();

    const compiled = builder.compile();
    const trait = new CharacterModelTrait(compiled.traitData);

    const dialogue = createDialogue(builder, trait);

    // First ask: not threatened → lie
    const result1 = dialogue.handleAsk('margaret', 'murder');
    expect(result1.responseIntent!.action).toBe('lie');

    // Now threaten Margaret
    trait.setThreat('threatened');

    // Second ask: threatened → confess (contradicts lie)
    dialogue.handleAsk('margaret', 'murder');

    // Check evaluator recorded the contradiction
    const evaluator = dialogue.getEvaluator();
    const record = evaluator.getRecord('margaret');
    const history = record!.history.get('murder');
    expect(history).toHaveLength(2);
    expect(history![0].action).toBe('lie');
    expect(history![1].action).toBe('confess');
  });
});
