/**
 * Tests for GameEngine language management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameEngine, createStandardEngine } from '../src/game-engine';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';
import { Parser, ParserFactory, LanguageProvider } from '@sharpee/stdlib';

// Mock modules
vi.mock('../src/story', () => ({
  loadLanguageProvider: vi.fn()
}));

// Create a mock parser class
class MockParser implements Parser {
  constructor(private languageProvider: LanguageProvider) {}
  
  parse(input: string): any {
    return {
      success: true,
      command: input,
      language: this.languageProvider.getLanguageCode()
    };
  }
}

// Create a mock language provider
class MockLanguageProvider implements LanguageProvider {
  getLanguageCode(): string {
    return 'test-lang';
  }
  
  getMessage(key: string, ...params: any[]): string {
    return `[${key}]`;
  }
  
  format(template: string, data: any): string {
    return template;
  }
  
  getVocabulary(): any {
    return {};
  }
}

describe('GameEngine Language Management', () => {
  let engine: GameEngine;
  let world: WorldModel;
  let player: IFEntity;
  
  beforeEach(() => {
    // Clear parser registry before each test
    ParserFactory.clearRegistry();
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Create world and player
    world = new WorldModel();
    player = world.createEntity('player', 'You');
    player.add(new IdentityTrait({
      name: 'You',
      aliases: ['self', 'me', 'myself'],
      description: 'As good-looking as ever.',
      properName: true,
      article: ''
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));
    
    engine = new GameEngine(world, player);
  });
  
  describe('setLanguage()', () => {
    it('should load language provider and parser dynamically', async () => {
      // Mock the dynamic imports
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      // Mock dynamic import for parser
      jest.doMock('@sharpee/parser-test-lang', () => ({
        Parser: MockParser
      }), { virtual: true });
      
      await engine.setLanguage('test-lang');
      
      expect(loadLanguageProvider).toHaveBeenCalledWith('test-lang');
      expect(engine.getLanguageProvider()).toBe(mockLanguageProvider);
      expect(engine.getParser()).toBeDefined();
      expect(engine.getParser()).toBeInstanceOf(MockParser);
    });
    
    it('should handle different parser export patterns', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      // Test default export
      jest.doMock('@sharpee/parser-default-lang', () => ({
        default: MockParser
      }), { virtual: true });
      
      await engine.setLanguage('default-lang');
      expect(engine.getParser()).toBeInstanceOf(MockParser);
      
      // Test specific parser name export
      jest.doMock('@sharpee/parser-english-lang', () => ({
        EnglishParser: MockParser
      }), { virtual: true });
      
      await engine.setLanguage('english-lang');
      expect(engine.getParser()).toBeInstanceOf(MockParser);
    });
    
    it('should throw error if language code is not provided', async () => {
      await expect(engine.setLanguage('')).rejects.toThrow('Language code is required');
      await expect(engine.setLanguage(null as any)).rejects.toThrow('Language code is required');
      await expect(engine.setLanguage(undefined as any)).rejects.toThrow('Language code is required');
    });
    
    it('should throw error if parser package is not found', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      // Mock import failure
      jest.doMock('@sharpee/parser-missing-lang', () => {
        throw new Error('Cannot find module');
      }, { virtual: true });
      
      await expect(engine.setLanguage('missing-lang'))
        .rejects.toThrow('Parser package not found for language: missing-lang');
    });
    
    it('should throw error if parser class is not found in package', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      // Mock package with no parser
      jest.doMock('@sharpee/parser-invalid-lang', () => ({
        someOtherExport: 'not a parser'
      }), { virtual: true });
      
      await expect(engine.setLanguage('invalid-lang'))
        .rejects.toThrow('No parser class found in @sharpee/parser-invalid-lang');
    });
    
    it('should register parser with ParserFactory', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      jest.doMock('@sharpee/parser-factory-test', () => ({
        Parser: MockParser
      }), { virtual: true });
      
      expect(ParserFactory.isLanguageRegistered('factory-test')).toBe(false);
      
      await engine.setLanguage('factory-test');
      
      expect(ParserFactory.isLanguageRegistered('factory-test')).toBe(true);
    });
  });
  
  describe('Story integration', () => {
    it('should use language from story config when setting story', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      jest.doMock('@sharpee/parser-en-us', () => ({
        EnglishParser: MockParser
      }), { virtual: true });
      
      const mockStory = {
        config: {
          id: 'test-story',
          title: 'Test Story',
          author: 'Test Author',
          version: '1.0.0',
          language: 'en-us'
        },
        initializeWorld: jest.fn(),
        createPlayer: jest.fn().mockReturnValue(player)
      };
      
      await engine.setStory(mockStory as any);
      
      expect(loadLanguageProvider).toHaveBeenCalledWith('en-us');
      expect(engine.getLanguageProvider()).toBeDefined();
      expect(engine.getParser()).toBeDefined();
    });
  });
  
  describe('Getters', () => {
    it('should return undefined when no language is set', () => {
      expect(engine.getParser()).toBeUndefined();
      expect(engine.getLanguageProvider()).toBeUndefined();
    });
    
    it('should return parser and language provider after setting language', async () => {
      const mockLanguageProvider = new MockLanguageProvider();
      const { loadLanguageProvider } = require('../src/story');
      loadLanguageProvider.mockResolvedValue(mockLanguageProvider);
      
      jest.doMock('@sharpee/parser-getter-test', () => ({
        Parser: MockParser
      }), { virtual: true });
      
      await engine.setLanguage('getter-test');
      
      const parser = engine.getParser();
      const langProvider = engine.getLanguageProvider();
      
      expect(parser).toBeDefined();
      expect(parser).toBeInstanceOf(MockParser);
      expect(langProvider).toBeDefined();
      expect(langProvider).toBe(mockLanguageProvider);
    });
  });
});
