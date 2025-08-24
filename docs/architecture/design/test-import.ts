// Simple test to verify the import is working
import mockLanguageProvider from '@sharpee/lang-en-us';

const verbs = mockLanguageProvider.getVerbs();
console.log('First verb:', verbs[0]);
console.log('Has verbs property?', 'verbs' in verbs[0]);
console.log('verbs is array?', Array.isArray(verbs[0].verbs));
