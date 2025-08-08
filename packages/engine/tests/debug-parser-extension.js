// Debug script to test parser extensions
const { EnglishParser } = require('@sharpee/parser-en-us');
const { EnglishLanguageProvider } = require('@sharpee/lang-en-us');

console.log('Testing parser extensions...\n');

// Create instances
const language = new EnglishLanguageProvider();
const parser = new EnglishParser(language);

// Test 1: Try adding a custom verb
console.log('TEST 1: Adding custom verb "foo"');
try {
  parser.addVerb('custom.action.foo', ['foo', 'foobar'], 'VERB_OBJ');
  console.log('✓ Added verb successfully');
  
  // Try to parse with the custom verb
  const result = parser.parse('foo the bar');
  console.log('Parse result:', {
    success: result.success,
    action: result.success ? result.value.action : undefined,
    error: result.error
  });
  
  if (!result.success) {
    console.log('FAILED: Parse did not succeed');
    console.log('Error details:', result.error);
  }
} catch (error) {
  console.log('ERROR:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n---\n');

// Test 2: Try adding a custom preposition
console.log('TEST 2: Adding custom preposition "alongside"');
try {
  parser.addPreposition('alongside');
  console.log('✓ Added preposition successfully');
  
  // Try to parse with the custom preposition
  const result = parser.parse('put lamp alongside table');
  console.log('Parse result:', {
    success: result.success,
    preposition: result.success && result.value.structure.preposition ? 
      result.value.structure.preposition.text : undefined,
    error: result.error
  });
  
  if (!result.success) {
    console.log('FAILED: Parse did not succeed');
    console.log('Error details:', result.error);
  }
} catch (error) {
  console.log('ERROR:', error.message);
  console.log('Stack:', error.stack);
}

console.log('\n---\n');

// Test 3: Check if vocabulary registry is accessible
console.log('TEST 3: Checking vocabulary registry');
try {
  // Try to access the vocabulary registry through parser methods
  const testResult = parser.parse('look');
  console.log('Standard verb parse result:', {
    success: testResult.success,
    action: testResult.success ? testResult.value.action : undefined
  });
} catch (error) {
  console.log('ERROR:', error.message);
}

console.log('\nDone.');