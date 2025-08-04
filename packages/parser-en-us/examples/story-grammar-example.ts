/**
 * @file Story Grammar Example
 * @description Example of how story authors use the grammar API
 */

import { EnglishParser } from '../src/english-parser';
import { ParserLanguageProvider, StoryGrammar, ScopeBuilder } from '@sharpee/if-domain';

// Example: A fantasy adventure game with custom commands

// Initialize parser with language provider
const parser = new EnglishParser(languageProvider);
const storyGrammar = parser.getStoryGrammar();

// 1. Add new magic-specific commands
storyGrammar
  .define('cast :spell [on|at :target]')
  .where('spell', (scope: ScopeBuilder) => scope.carried().kind('spell'))
  .where('target', (scope: ScopeBuilder) => scope.visible())
  .mapsTo('story.action.casting')
  .describe('Cast a spell from your spellbook')
  .withPriority(100)
  .build();

// 2. Override the standard 'take' command for special items
storyGrammar
  .override('if.action.taking', 'claim :artifact')
  .where('artifact', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ type: 'artifact', claimed: false })
  )
  .describe('Claim an unclaimed magical artifact')
  .build();

// 3. Extend examining to add special behavior for runes
storyGrammar
  .extend('if.action.examining')
  .where('object', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ hasRunes: true })
  )
  .withHigherPriority(20)
  .build();

// 4. Combat commands with multiple slots
storyGrammar
  .define('attack :enemy with :weapon [using :technique]')
  .where('enemy', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ hostile: true, alive: true })
  )
  .where('weapon', (scope: ScopeBuilder) => scope
    .carried()
    .matching({ type: 'weapon' })
  )
  .where('technique', (scope: ScopeBuilder) => scope
    .matching({ type: 'combat_technique', learned: true })
  )
  .mapsTo('story.action.combat')
  .withPriority(120)
  .build();

// 5. Experimental alchemy system
storyGrammar
  .define('brew :potion from :ingredient1 and :ingredient2')
  .where('ingredient1', (scope: ScopeBuilder) => scope.carried().kind('ingredient'))
  .where('ingredient2', (scope: ScopeBuilder) => scope.carried().kind('ingredient'))
  .experimental() // Lower confidence for experimental features
  .mapsTo('story.action.brewing')
  .withErrorMessage('You need two ingredients in your inventory to brew potions.')
  .build();

// 6. Dialogue system
storyGrammar
  .define('ask :character about :topic')
  .where('character', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ animate: true, canTalk: true })
  )
  .mapsTo('story.action.conversing')
  .build();

storyGrammar
  .define('tell :character about :topic')
  .where('character', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ animate: true, canTalk: true })
  )
  .mapsTo('story.action.conversing')
  .build();

// 7. Environmental interactions
storyGrammar
  .define('climb :object')
  .where('object', (scope: ScopeBuilder) => scope
    .touchable()
    .matching({ climbable: true })
  )
  .mapsTo('story.action.climbing')
  .build();

storyGrammar
  .define('swim [across|through|in] :water')
  .where('water', (scope: ScopeBuilder) => scope
    .visible()
    .matching({ type: 'water_body' })
  )
  .mapsTo('story.action.swimming')
  .build();

// Enable debug mode during development
storyGrammar.setDebugMode(true);

// Example usage in game:
const testCommands = [
  'cast fireball on dragon',
  'claim Excalibur',
  'examine ancient rune',
  'attack goblin with sword using whirlwind',
  'brew healing potion from herbs and mushroom',
  'ask wizard about prophecy',
  'climb tower',
  'swim across river'
];

// Get grammar statistics
const stats = (storyGrammar as any).getStats();
console.log(`Story Grammar Statistics:
- Total rules: ${stats.totalRules}
- Story rules: ${stats.storyRules}
- Core rules: ${stats.coreRules}
- Overridden rules: ${stats.overriddenRules}
`);

// Clean up story rules when done (useful for testing)
// storyGrammar.clear();