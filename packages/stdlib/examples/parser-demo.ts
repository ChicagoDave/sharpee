/**
 * Parser system demonstration
 * 
 * Shows how the parser, vocabulary, and resolver work together
 */

import { 
  basicParser,
  vocabularyRegistry,
  commandResolver,
  EntityVocabulary,
  ResolverContext
} from '../src/parser';

// Import to register standard vocabulary
import '../src/vocabulary';

// Mock entities for testing
const mockEntities = new Map([
  ['player', { 
    id: 'player', 
    has: () => true,
    get: () => ({ name: 'You' }),
    getLocation: () => 'kitchen'
  }],
  ['kitchen', { 
    id: 'kitchen',
    has: () => true,
    get: () => ({ name: 'Kitchen' }),
    getLocation: () => undefined
  }],
  ['red-ball', {
    id: 'red-ball',
    has: () => true,
    get: () => ({ name: 'red ball', nouns: ['ball'], adjectives: ['red'] }),
    getLocation: () => 'kitchen'
  }],
  ['blue-ball', {
    id: 'blue-ball',
    has: () => true,
    get: () => ({ name: 'blue ball', nouns: ['ball'], adjectives: ['blue'] }),
    getLocation: () => 'kitchen'
  }],
  ['sword', {
    id: 'sword',
    has: () => true,
    get: () => ({ name: 'sword', nouns: ['sword'], adjectives: ['sharp'] }),
    getLocation: () => 'kitchen'
  }]
]);

// Register entity vocabulary
const entityVocab: EntityVocabulary[] = [
  {
    entityId: 'red-ball',
    nouns: ['ball'],
    adjectives: ['red'],
    inScope: true,
    priority: 1
  },
  {
    entityId: 'blue-ball',
    nouns: ['ball'],
    adjectives: ['blue'],
    inScope: true,
    priority: 1
  },
  {
    entityId: 'sword',
    nouns: ['sword'],
    adjectives: ['sharp'],
    inScope: true,
    priority: 1
  }
];

// Register entities
entityVocab.forEach(vocab => vocabularyRegistry.registerEntity(vocab));

// Create resolver context
const context: ResolverContext = {
  player: mockEntities.get('player') as any,
  currentLocation: mockEntities.get('kitchen') as any,
  inScope: Array.from(mockEntities.values()) as any[],
  recentEntities: [],
  getEntity: (id: string) => mockEntities.get(id) as any,
  canSee: () => true
};

console.log('=== Parser Demonstration ===\n');

// Example 1: Simple command
console.log('1. Simple command: "take sword"');
const candidates1 = basicParser.parse('take sword');
console.log('Parsed candidates:', JSON.stringify(candidates1, null, 2));

const resolved1 = commandResolver.resolve(candidates1[0], context);
if (!Array.isArray(resolved1)) {
  console.log('Resolved command:', {
    action: resolved1.command.action,
    noun: resolved1.command.noun?.id,
    confidence: resolved1.confidence
  });
}
console.log();

// Example 2: Ambiguous command
console.log('2. Ambiguous command: "take ball"');
const candidates2 = basicParser.parse('take ball');
console.log('Parsed candidates:', JSON.stringify(candidates2, null, 2));

const resolved2 = commandResolver.resolve(candidates2[0], context);
if (Array.isArray(resolved2)) {
  console.log('Ambiguities found:', resolved2);
} else {
  console.log('Auto-resolved to:', resolved2.command.noun?.id);
}
console.log();

// Example 3: Command with adjective
console.log('3. Specific command: "take red ball"');
const candidates3 = basicParser.parse('take red ball');
console.log('Parsed candidates:', JSON.stringify(candidates3, null, 2));
console.log();

// Example 4: Direction command
console.log('4. Direction command: "go north"');
const candidates4 = basicParser.parse('go north');
console.log('Parsed candidates:', JSON.stringify(candidates4, null, 2));
console.log();

// Example 5: Implicit go command
console.log('5. Implicit go: "north"');
const candidates5 = basicParser.parse('north');
console.log('Parsed candidates:', JSON.stringify(candidates5, null, 2));
console.log();

// Example 6: Complex command
console.log('6. Complex command: "put sword in chest"');
const candidates6 = basicParser.parse('put sword in chest');
console.log('Parsed candidates:', JSON.stringify(candidates6, null, 2));
console.log();

// Example 7: Unknown word
console.log('7. Unknown word: "take xyz"');
const result7 = basicParser.parseWithErrors('take xyz');
console.log('Parse result:', {
  candidates: result7.candidates.length,
  errors: result7.errors,
  partial: result7.partial
});
console.log();

// Example 8: Vocabulary lookup
console.log('8. Vocabulary lookup:');
console.log('Word "take":', vocabularyRegistry.lookup('take'));
console.log('Word "ball":', vocabularyRegistry.lookup('ball'));
console.log('All verbs:', vocabularyRegistry.getByPartOfSpeech('verb' as any).length);
