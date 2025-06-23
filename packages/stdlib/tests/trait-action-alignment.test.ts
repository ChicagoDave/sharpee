/**
 * Test to verify trait-action alignment
 */

import { describe, it, expect } from 'vitest';
import { NPCTrait } from '../src/world-model/traits/advanced/npc';
import { DialogueTrait } from '../src/world-model/traits/advanced/dialogue';
import { ScriptableTrait } from '../src/world-model/traits/advanced/scriptable';

describe('Trait-Action Alignment', () => {
  it('NPCTrait should have all required properties for actions', () => {
    const npc = new NPCTrait();
    
    // Properties needed by actions
    expect(npc).toHaveProperty('isConscious');
    expect(npc).toHaveProperty('willTalk');
    expect(npc).toHaveProperty('isDead');
    expect(npc).toHaveProperty('acceptsGifts');
    expect(npc).toHaveProperty('relationship');
    expect(npc).toHaveProperty('willListen');
    expect(npc).toHaveProperty('conversationCount');
    expect(npc).toHaveProperty('relationshipChangeOnTalk');
    
    // Check default values
    expect(npc.isConscious).toBe(true);
    expect(npc.willTalk).toBe(true);
    expect(npc.isDead).toBe(false);
    expect(npc.acceptsGifts).toBe(true);
    expect(npc.relationship).toBe(0);
  });
  
  it('DialogueTrait should have all required properties for actions', () => {
    const dialogue = new DialogueTrait();
    
    // Properties needed by actions
    expect(dialogue).toHaveProperty('topics');
    expect(dialogue).toHaveProperty('defaultResponse');
    expect(dialogue).toHaveProperty('availableTopics');
    expect(dialogue).toHaveProperty('askedTopics');
    expect(dialogue).toHaveProperty('hasMet');
    expect(dialogue).toHaveProperty('knowledge');
    expect(dialogue).toHaveProperty('toldTopics');
    
    // Check default values
    expect(dialogue.topics).toEqual({});
    expect(dialogue.availableTopics).toEqual([]);
    expect(dialogue.hasMet).toBe(false);
  });
  
  it('ScriptableTrait should have all required properties for actions', () => {
    const scriptable = new ScriptableTrait();
    
    // Properties needed by actions
    expect(scriptable).toHaveProperty('onAskAbout');
    expect(scriptable).toHaveProperty('onTellAbout');
    expect(scriptable).toHaveProperty('onTalk');
    expect(scriptable).toHaveProperty('onReceiveItem');
  });
  
  it('NPCTrait with dialogue capabilities should work properly', () => {
    const npc = new NPCTrait({
      willTalk: true,
      relationship: 50,
      acceptsGifts: true,
      questItems: ['golden_key'],
      giftReactions: {
        'golden_key': 'gratitude',
        'flower': 'appreciation'
      }
    });
    
    const dialogue = new DialogueTrait({
      topics: {
        'weather': 'Nice day, isn\'t it?',
        'quest': 'I need the golden key to unlock the door.',
        'golden_key': 'Thank you! This is exactly what I needed!'
      },
      defaultResponse: 'I don\'t know about that.',
      availableTopics: ['weather', 'quest'],
      greetings: {
        default: 'Hello there!',
        firstMeeting: 'Oh, a visitor! Welcome!',
        friendly: 'My friend! Good to see you!',
        hostile: 'What do you want now?'
      }
    });
    
    // Validate the traits
    expect(() => npc.validate()).not.toThrow();
    expect(() => dialogue.validate()).not.toThrow();
    
    // Check quest item handling
    expect(npc.questItems).toContain('golden_key');
    expect(npc.giftReactions?.['golden_key']).toBe('gratitude');
    
    // Check dialogue topics
    expect(dialogue.topics['quest']).toBe('I need the golden key to unlock the door.');
    expect(dialogue.greetings?.friendly).toBe('My friend! Good to see you!');
  });
});
