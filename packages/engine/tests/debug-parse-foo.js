// Debug parsing of 'foo the bar'
import { vocabularyRegistry } from '@sharpee/if-domain';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

console.log('Debug parsing with custom verb...\n');

const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

// Add debug callback
parser.setDebugCallback((event) => {
  console.log('Debug event:', event.type, event.data);
});

// Add the custom verb
console.log('Adding custom verb "foo"...');
parser.addVerb('custom.action.foo', ['foo', 'foobar'], 'VERB_OBJ');

// Check if it's in the registry
const fooEntries = vocabularyRegistry.lookup('foo');
console.log('\nRegistry lookup for "foo":', fooEntries);

// Try parsing
console.log('\nParsing "foo the bar"...');
const result = parser.parse('foo the bar');

console.log('\nResult:', {
  success: result.success,
  error: result.error,
  value: result.success ? result.value : undefined
});

// Also try with a standard verb
console.log('\n---\nParsing "take the bar" for comparison...');
const takeResult = parser.parse('take the bar');
console.log('Result:', {
  success: takeResult.success,
  action: takeResult.success ? takeResult.value.action : undefined
});