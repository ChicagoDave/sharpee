const { BasicParser } = require('../packages/stdlib/dist/parser/basic-parser');
const { LanguageProvider } = require('../packages/stdlib/dist/language/language-provider');

// Simple test to check parser output
class TestLanguageProvider {
  languageCode = 'en-US';
  
  getVerbs() {
    return [
      {
        actionId: 'if.action.taking',
        verbs: ['take', 'get'],
        pattern: 'take [something]'
      },
      {
        actionId: 'if.action.putting',
        verbs: ['put'],
        pattern: 'put [something] [prep] [something]',
        prepositions: ['in', 'on']
      },
      {
        actionId: 'if.action.examining',
        verbs: ['examine', 'look at'],
        pattern: 'examine [something]'
      }
    ];
  }
  
  getDirections() {
    return [];
  }
  
  getSpecialVocabulary() {
    return {
      articles: ['the', 'a', 'an'],
      pronouns: [],
      allWords: [],
      exceptWords: []
    };
  }
  
  getPrepositions() {
    return ['in', 'on', 'at'];
  }
}

const language = new TestLanguageProvider();
const parser = new BasicParser(language);

// Test cases
const tests = [
  'put ball in box',
  'take the ball',
  'put the ball in the box',
  'look at the mirror'
];

tests.forEach(input => {
  console.log(`\nTesting: "${input}"`);
  const result = parser.parse(input);
  if (result.success) {
    console.log('Success!');
    console.log('Action:', result.value.action);
    console.log('Direct Object:', result.value.directObject);
    console.log('Preposition:', result.value.preposition);
    console.log('Indirect Object:', result.value.indirectObject);
  } else {
    console.log('Failed:', result.error);
  }
});
