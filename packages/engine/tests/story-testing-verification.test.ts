/**
 * Verification test to ensure story-based testing approach works correctly
 */

import { createStandardEngine } from '../src/game-engine';
import { MinimalTestStory } from './stories';
import { loadLanguageProvider } from '../src/story';

describe('Story-Based Testing Verification', () => {
  it('should successfully initialize engine with test story and language provider', async () => {
    // This test verifies that our story-based approach correctly loads
    // the language provider without the "verbDef.verbs is not iterable" error
    
    const story = new MinimalTestStory();
    const engine = createStandardEngine();
    
    // This should load the language provider through the normal flow
    await expect(engine.setStory(story)).resolves.not.toThrow();
    
    // Verify story was initialized
    expect(story.wasInitialized()).toBe(true);
    expect(story.wasWorldInitialized()).toBe(true);
    expect(story.wasPlayerCreated()).toBe(true);
    
    // Start engine and execute a turn to ensure everything works
    engine.start();
    
    const result = await engine.executeTurn('look');
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    expect(result.turn).toBe(1);
    
    engine.stop();
  });

  it('should load language provider directly', async () => {
    // Test that the language provider can be loaded directly
    const provider = await loadLanguageProvider('en-us');
    
    expect(provider).toBeDefined();
    expect(provider.languageCode).toBe('en-US');
    expect(provider.getVerbs).toBeDefined();
    expect(provider.lemmatize).toBeDefined();
    
    // Test that verb definitions are properly loaded
    const verbs = provider.getVerbs();
    expect(verbs).toBeDefined();
    expect(Array.isArray(verbs)).toBe(true);
    
    // Each verb definition should have verbs array
    verbs.forEach(verb => {
      expect(verb.verbs).toBeDefined();
      expect(Array.isArray(verb.verbs)).toBe(true);
      expect(verb.actionId).toBeDefined();
    });
  });
});
