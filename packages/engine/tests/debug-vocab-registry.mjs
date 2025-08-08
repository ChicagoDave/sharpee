// Debug vocabulary registry using ES modules
import { vocabularyRegistry } from '@sharpee/if-domain';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

console.log('Testing vocabulary registry with ES modules...\n');

// Create parser instance
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

// Check if addVerb exists
console.log('parser.addVerb exists?', typeof parser.addVerb);
console.log('parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));

// Test 1: Add custom verb and check registry
console.log('\nTEST 1: Add custom verb and check registry');
if (typeof parser.addVerb === 'function') {
  parser.addVerb('custom.action.foo', ['foo', 'foobar'], 'VERB_OBJ');
  
  const fooEntries = vocabularyRegistry.lookup('foo');
  console.log('Found entries for "foo":', fooEntries.length);
  if (fooEntries.length > 0) {
    console.log('First entry:', fooEntries[0]);
  } else {
    console.log('ERROR: No entries found for "foo" after addVerb()');
  }
} else {
  console.log('ERROR: addVerb method not found on parser');
}

console.log('\nDone.');