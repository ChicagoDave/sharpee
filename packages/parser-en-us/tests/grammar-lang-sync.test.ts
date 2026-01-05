/**
 * @file Grammar/Language Sync Verification Tests
 * @description ADR-087 Phase 9 - Verify grammar verbs match lang-en-us definitions
 *
 * This test suite detects drift between:
 * - Grammar patterns in parser-en-us/src/grammar.ts
 * - Language definitions in lang-en-us/src/actions/*.ts
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { defineGrammar } from '../src/grammar';
import { standardActionLanguage } from '@sharpee/lang-en-us';

interface VerbMap {
  [actionId: string]: Set<string>;
}

interface SyncResult {
  actionId: string;
  grammarVerbs: string[];
  langVerbs: string[];
  onlyInGrammar: string[];
  onlyInLang: string[];
}

/**
 * Extract the first word (verb) from a grammar pattern
 * Examples:
 *   "take :item" -> "take"
 *   "pick up :item" -> "pick up"
 *   "look at :target" -> "look at"
 *   "north" -> "north"
 */
function extractVerbFromPattern(pattern: string): string {
  // Remove slot markers to find the verb phrase
  const words = pattern.split(' ');
  const verbWords: string[] = [];

  for (const word of words) {
    // Stop when we hit a slot or preposition-before-slot
    if (word.startsWith(':')) break;
    // Skip optional markers
    if (word.startsWith('[') || word.endsWith(']')) continue;
    // Handle alternations (e.g., "in|into") - take first option
    const mainWord = word.split('|')[0];
    verbWords.push(mainWord);
  }

  return verbWords.join(' ').toLowerCase();
}

/**
 * Extract verbs from lang-en-us patterns
 * Format: "take [something]" -> "take"
 */
function extractVerbFromLangPattern(pattern: string): string {
  // Remove placeholder markers like [something]
  const words = pattern.split(' ');
  const verbWords: string[] = [];

  for (const word of words) {
    if (word.startsWith('[')) break;
    verbWords.push(word);
  }

  return verbWords.join(' ').toLowerCase();
}

describe('ADR-087 Phase 9: Grammar/Language Sync Verification', () => {
  let grammarVerbs: VerbMap;
  let langVerbs: VerbMap;
  let syncResults: SyncResult[];

  beforeAll(() => {
    // Extract verbs from grammar definitions
    grammarVerbs = {};
    const engine = new EnglishGrammarEngine();
    const builder = engine.createBuilder();
    defineGrammar(builder);
    const rules = builder.getRules();

    for (const rule of rules) {
      const actionId = rule.action;
      // Skip author/debug commands and meta commands
      if (actionId.startsWith('author.')) continue;

      const verb = extractVerbFromPattern(rule.pattern);
      if (!verb) continue;

      if (!grammarVerbs[actionId]) {
        grammarVerbs[actionId] = new Set();
      }
      grammarVerbs[actionId].add(verb);
    }

    // Extract verbs from lang-en-us definitions
    langVerbs = {};
    for (const actionLang of standardActionLanguage) {
      const actionId = actionLang.actionId;
      langVerbs[actionId] = new Set();

      if (actionLang.patterns) {
        for (const pattern of actionLang.patterns) {
          const verb = extractVerbFromLangPattern(pattern);
          if (verb) {
            langVerbs[actionId].add(verb);
          }
        }
      }
    }

    // Build sync results
    syncResults = [];
    const allActionIds = new Set([
      ...Object.keys(grammarVerbs),
      ...Object.keys(langVerbs)
    ]);

    for (const actionId of allActionIds) {
      const gVerbs = grammarVerbs[actionId] || new Set();
      const lVerbs = langVerbs[actionId] || new Set();

      const onlyInGrammar = [...gVerbs].filter(v => !lVerbs.has(v));
      const onlyInLang = [...lVerbs].filter(v => !gVerbs.has(v));

      if (onlyInGrammar.length > 0 || onlyInLang.length > 0) {
        syncResults.push({
          actionId,
          grammarVerbs: [...gVerbs].sort(),
          langVerbs: [...lVerbs].sort(),
          onlyInGrammar: onlyInGrammar.sort(),
          onlyInLang: onlyInLang.sort()
        });
      }
    }
  });

  describe('Verb Coverage', () => {
    it('should have grammar patterns for all core actions', () => {
      const coreActions = [
        'if.action.taking',
        'if.action.dropping',
        'if.action.looking',
        'if.action.examining',
        'if.action.going',
        'if.action.opening',
        'if.action.closing',
        'if.action.inventory'
      ];

      for (const actionId of coreActions) {
        expect(grammarVerbs[actionId], `Missing grammar for ${actionId}`).toBeDefined();
        expect(grammarVerbs[actionId].size, `No verbs for ${actionId}`).toBeGreaterThan(0);
      }
    });

    it('should have lang-en-us definitions for all core actions', () => {
      const coreActions = [
        'if.action.taking',
        'if.action.dropping',
        'if.action.looking',
        'if.action.examining',
        'if.action.going',
        'if.action.opening',
        'if.action.closing',
        'if.action.inventory'
      ];

      for (const actionId of coreActions) {
        expect(langVerbs[actionId], `Missing lang-en-us for ${actionId}`).toBeDefined();
        expect(langVerbs[actionId].size, `No patterns for ${actionId}`).toBeGreaterThan(0);
      }
    });
  });

  describe('Sync Detection', () => {
    it('should report sync status (informational)', () => {
      // This test always passes but logs sync issues for visibility
      if (syncResults.length === 0) {
        console.log('✓ Grammar and lang-en-us are perfectly synchronized');
      } else {
        console.log('\n=== Grammar/Lang-en-us Sync Report ===\n');

        for (const result of syncResults) {
          console.log(`Action: ${result.actionId}`);
          console.log(`  Grammar verbs: ${result.grammarVerbs.join(', ')}`);
          console.log(`  Lang verbs:    ${result.langVerbs.join(', ')}`);

          if (result.onlyInGrammar.length > 0) {
            console.log(`  ⚠ Only in grammar: ${result.onlyInGrammar.join(', ')}`);
          }
          if (result.onlyInLang.length > 0) {
            console.log(`  ⚠ Only in lang-en-us: ${result.onlyInLang.join(', ')}`);
          }
          console.log();
        }

        console.log(`Total actions with drift: ${syncResults.length}`);
      }

      // Always pass - this is informational
      expect(true).toBe(true);
    });

    // Specific sync checks for important actions
    it('should have matching verbs for taking action', () => {
      const gVerbs = grammarVerbs['if.action.taking'] || new Set();
      const lVerbs = langVerbs['if.action.taking'] || new Set();

      // These must be in both
      const requiredVerbs = ['take', 'get'];
      for (const verb of requiredVerbs) {
        expect(gVerbs.has(verb), `Grammar missing "${verb}" for taking`).toBe(true);
        expect(lVerbs.has(verb), `Lang missing "${verb}" for taking`).toBe(true);
      }
    });

    it('should have matching verbs for examining action', () => {
      const gVerbs = grammarVerbs['if.action.examining'] || new Set();
      const lVerbs = langVerbs['if.action.examining'] || new Set();

      // These must be in both
      const requiredVerbs = ['examine', 'x'];
      for (const verb of requiredVerbs) {
        expect(gVerbs.has(verb), `Grammar missing "${verb}" for examining`).toBe(true);
        expect(lVerbs.has(verb), `Lang missing "${verb}" for examining`).toBe(true);
      }
    });

    it('should have matching verbs for going action (directions)', () => {
      const gVerbs = grammarVerbs['if.action.going'] || new Set();

      // Grammar should have direction words
      const requiredDirections = ['north', 'south', 'east', 'west', 'n', 's', 'e', 'w'];
      for (const dir of requiredDirections) {
        expect(gVerbs.has(dir), `Grammar missing direction "${dir}"`).toBe(true);
      }
    });
  });

  describe('Coverage Statistics', () => {
    it('should report overall coverage statistics', () => {
      const grammarActionCount = Object.keys(grammarVerbs).length;
      const langActionCount = Object.keys(langVerbs).length;

      let totalGrammarVerbs = 0;
      let totalLangVerbs = 0;

      for (const verbs of Object.values(grammarVerbs)) {
        totalGrammarVerbs += verbs.size;
      }
      for (const verbs of Object.values(langVerbs)) {
        totalLangVerbs += verbs.size;
      }

      console.log('\n=== Coverage Statistics ===');
      console.log(`Grammar: ${grammarActionCount} actions, ${totalGrammarVerbs} verb patterns`);
      console.log(`Lang:    ${langActionCount} actions, ${totalLangVerbs} verb patterns`);
      console.log(`Drift:   ${syncResults.length} actions with mismatched verbs`);

      // Informational - always passes
      expect(true).toBe(true);
    });
  });
});
