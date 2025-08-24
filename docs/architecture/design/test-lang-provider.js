// Quick test to check language provider output
const langProvider = require('@sharpee/lang-en-us').default;

console.log('Language Provider:', langProvider);
console.log('\nLanguage Code:', langProvider.languageCode);

const verbs = langProvider.getVerbs();
console.log('\nFirst verb:', JSON.stringify(verbs[0], null, 2));
console.log('\nTotal verbs:', verbs.length);

// Check if verbs property exists
if (verbs[0]) {
  console.log('\nverbs[0].verbs exists?', 'verbs' in verbs[0]);
  console.log('verbs[0].verbs is array?', Array.isArray(verbs[0].verbs));
}
