/**
 * @file Parser Performance Benchmarks
 * @description Performance benchmarks for the grammar engine
 */

import { describe, bench } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

describe('Parser Performance', () => {
  // Setup parser once for all benchmarks
  vocabularyRegistry.clear();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language);
  
  // Add some custom grammar rules to make it more realistic
  for (let i = 0; i < 50; i++) {
    parser.registerGrammar(`custom${i} :item`, `custom.action.${i}`);
  }
  
  describe('Simple Commands', () => {
    bench('parse "look"', () => {
      parser.parse('look');
    });
    
    bench('parse "inventory"', () => {
      parser.parse('inventory');
    });
    
    bench('parse direction "north"', () => {
      parser.parse('north');
    });
  });
  
  describe('Single Object Commands', () => {
    bench('parse "take sword"', () => {
      parser.parse('take sword');
    });
    
    bench('parse "examine painting"', () => {
      parser.parse('examine painting');
    });
    
    bench('parse "drop key"', () => {
      parser.parse('drop key');
    });
  });
  
  describe('Complex Commands', () => {
    bench('parse "put ball in box"', () => {
      parser.parse('put ball in box');
    });
    
    bench('parse "hang cloak on hook"', () => {
      parser.parse('hang cloak on hook');
    });
    
    bench('parse "unlock door with key"', () => {
      parser.parse('unlock door with key');
    });
  });
  
  describe('Long Noun Phrases', () => {
    bench('parse "take the shiny golden ancient magical sword"', () => {
      parser.parse('take the shiny golden ancient magical sword');
    });
    
    bench('parse "put the small red rubber ball in the large wooden box"', () => {
      parser.parse('put the small red rubber ball in the large wooden box');
    });
  });
  
  describe('Failed Matches', () => {
    bench('parse unmatched pattern', () => {
      parser.parse('flibbertigibbet the whatsit with a thingamajig');
    });
    
    bench('parse partial match', () => {
      parser.parse('put ball'); // Missing preposition and container
    });
  });
  
  describe('Tokenization Performance', () => {
    const longInput = 'take the incredibly shiny and remarkably well-preserved ancient golden sword of legendary power';
    
    bench('tokenize long input', () => {
      (parser as any).tokenizeRich(longInput);
    });
    
    bench('tokenize with many prepositions', () => {
      (parser as any).tokenizeRich('look at the box on the table under the window behind the curtain');
    });
  });
  
  describe('Grammar Engine Scaling', () => {
    // Test how performance scales with number of rules
    const parsers: EnglishParser[] = [];
    
    // Create parsers with different numbers of rules
    for (const ruleCount of [10, 50, 100, 200]) {
      const p = new EnglishParser(language);
      for (let i = 0; i < ruleCount; i++) {
        p.registerGrammar(`test${i} :obj${i}`, `test.action.${i}`);
      }
      parsers.push(p);
    }
    
    bench('parse with 10 extra rules', () => {
      parsers[0].parse('take sword');
    });
    
    bench('parse with 50 extra rules', () => {
      parsers[1].parse('take sword');
    });
    
    bench('parse with 100 extra rules', () => {
      parsers[2].parse('take sword');
    });
    
    bench('parse with 200 extra rules', () => {
      parsers[3].parse('take sword');
    });
  });
  
  describe('Vocabulary Lookup Performance', () => {
    bench('lookup common word', () => {
      vocabularyRegistry.lookup('take');
    });
    
    bench('lookup with part of speech filter', () => {
      vocabularyRegistry.lookup('on', 'preposition' as any);
    });
    
    bench('check word existence', () => {
      vocabularyRegistry.hasWord('examine');
    });
  });
});