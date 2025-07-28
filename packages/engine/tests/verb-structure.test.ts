/**
 * Test to isolate the vocabulary issue
 */

import mockLanguageProvider from '@sharpee/lang-en-us';

describe('Vocabulary Structure Test', () => {
  it('should check verb structure from language provider', () => {
    const verbs = mockLanguageProvider.getVerbs();
    
    console.log('First verb from language provider:');
    console.log(JSON.stringify(verbs[0], null, 2));
    
    // Check the structure
    expect(verbs[0]).toHaveProperty('actionId');
    expect(verbs[0]).toHaveProperty('verbs');
    expect(Array.isArray(verbs[0].verbs)).toBe(true);
    
    // Try to iterate
    for (const verb of verbs[0].verbs) {
      console.log('Verb:', verb);
    }
  });
});
