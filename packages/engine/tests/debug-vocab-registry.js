// Debug vocabulary registry
const { vocabularyRegistry } = require('@sharpee/if-domain');
const { EnglishParser } = require('@sharpee/parser-en-us');
const { EnglishLanguageProvider } = require('@sharpee/lang-en-us');

console.log('Testing vocabulary registry...\n');

// Create parser instance
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

// Test 1: Check if standard verbs are in registry
console.log('TEST 1: Lookup standard verb "look"');
const lookEntries = vocabularyRegistry.lookup('look');
console.log('Found entries:', lookEntries.length);
if (lookEntries.length > 0) {
  console.log('First entry:', lookEntries[0]);
}

console.log('\n---\n');

// Test 2: Add custom verb and check registry
console.log('TEST 2: Add custom verb and check registry');
parser.addVerb('custom.action.foo', ['foo', 'foobar'], 'VERB_OBJ');

const fooEntries = vocabularyRegistry.lookup('foo');
console.log('Found entries for "foo":', fooEntries.length);
if (fooEntries.length > 0) {
  console.log('First entry:', fooEntries[0]);
} else {
  console.log('ERROR: No entries found for "foo" after addVerb()');
}

console.log('\n---\n');

// Test 3: Check registerDynamicVerbs directly
console.log('TEST 3: Call registerDynamicVerbs directly');
vocabularyRegistry.registerDynamicVerbs([
  {
    actionId: 'test.action.bar',
    verbs: ['bar', 'baz'],
    pattern: 'VERB_OBJ'
  }
], 'test');

const barEntries = vocabularyRegistry.lookup('bar');
console.log('Found entries for "bar":', barEntries.length);
if (barEntries.length > 0) {
  console.log('First entry:', barEntries[0]);
}

console.log('\nDone.');