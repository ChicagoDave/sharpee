/**
 * Test to isolate the vocabulary issue
 */

import mockLanguageProvider from '@sharpee/lang-en-us';

describe('Vocabulary Structure Test', () => {
  it('should check verb structure from language provider', () => {
    const verbs = mockLanguageProvider.getVerbs();
    
    // Check the structure
    expect(verbs[0]).toHaveProperty('actionId');
    expect(verbs[0]).toHaveProperty('verbs');
    expect(Array.isArray(verbs[0].verbs)).toBe(true);
  });
});
