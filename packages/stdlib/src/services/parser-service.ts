/**
 * Parser Service
 * 
 * Provides world-aware parsing capabilities for the standard library
 */

import { Entity as IFEntity, World as IFWorld } from '@sharpee/core';
import { VisibilityService } from './visibility-service';
import { IFLanguageProvider } from '../language/if-language-provider';

/**
 * Parsed command structure
 */
export interface ParsedInput {
  verb: string;
  noun?: string;
  preposition?: string;
  indirect?: string;
  remainder?: string;
}

/**
 * Parser context for disambiguation
 */
export interface ParserContext {
  actor: IFEntity;
  scope?: IFEntity[];
  previousCommands?: ParsedInput[];
}

/**
 * Match result for entity resolution
 */
export interface EntityMatch {
  entity: IFEntity;
  confidence: number;
  matchType: 'exact' | 'partial' | 'synonym';
}

/**
 * World-aware parser service
 * 
 * Handles command parsing with awareness of game state,
 * entity visibility, and disambiguation
 */
export class ParserService {
  private visibilityService: VisibilityService;
  
  constructor(
    private world: IFWorld,
    private language: IFLanguageProvider
  ) {
    this.visibilityService = new VisibilityService(world);
  }
  
  /**
   * Parse a command string with world context
   */
  parse(input: string, context: ParserContext): ParsedInput {
    // Normalize input
    const normalized = this.normalizeInput(input);
    
    // Extract command structure
    const parsed = this.extractCommandStructure(normalized);
    
    // Resolve entities if nouns are present
    if (parsed.noun) {
      const scope = context.scope || this.visibilityService.getVisibleEntities(context.actor);
      const match = this.resolveEntity(parsed.noun, scope);
      if (match) {
        parsed.noun = match.entity.id;
      }
    }
    
    if (parsed.indirect) {
      const scope = context.scope || this.visibilityService.getVisibleEntities(context.actor);
      const match = this.resolveEntity(parsed.indirect, scope);
      if (match) {
        parsed.indirect = match.entity.id;
      }
    }
    
    return parsed;
  }
  
  /**
   * Resolve a noun phrase to an entity
   */
  resolveEntity(phrase: string, scope: IFEntity[]): EntityMatch | null {
    const matches: EntityMatch[] = [];
    
    for (const entity of scope) {
      const match = this.matchEntity(entity, phrase);
      if (match) {
        matches.push(match);
      }
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches[0] || null;
  }
  
  /**
   * Check if an entity matches a phrase
   */
  private matchEntity(entity: IFEntity, phrase: string): EntityMatch | null {
    // Get entity names from language provider
    const names = this.language.getEntityNames(entity);
    
    // Check exact match
    for (const name of names) {
      if (name.toLowerCase() === phrase.toLowerCase()) {
        return {
          entity,
          confidence: 1.0,
          matchType: 'exact'
        };
      }
    }
    
    // Check partial match
    for (const name of names) {
      if (name.toLowerCase().includes(phrase.toLowerCase()) ||
          phrase.toLowerCase().includes(name.toLowerCase())) {
        return {
          entity,
          confidence: 0.7,
          matchType: 'partial'
        };
      }
    }
    
    // Check synonyms
    const synonyms = this.language.getSynonyms(phrase);
    for (const synonym of synonyms) {
      for (const name of names) {
        if (name.toLowerCase() === synonym.toLowerCase()) {
          return {
            entity,
            confidence: 0.5,
            matchType: 'synonym'
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * Normalize input text
   */
  private normalizeInput(input: string): string {
    return input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.,!?;:]$/g, '');
  }
  
  /**
   * Extract command structure from normalized input
   */
  private extractCommandStructure(input: string): ParsedInput {
    const words = input.split(' ');
    
    // Simple implementation - first word is verb
    const verb = words[0] || '';
    
    // Look for preposition
    const prepositions = ['in', 'on', 'with', 'to', 'from', 'under', 'behind'];
    let prepIndex = -1;
    let preposition: string | undefined;
    
    for (let i = 1; i < words.length; i++) {
      if (prepositions.includes(words[i])) {
        prepIndex = i;
        preposition = words[i];
        break;
      }
    }
    
    // Extract noun and indirect object
    let noun: string | undefined;
    let indirect: string | undefined;
    
    if (prepIndex > 0) {
      // Words before preposition are the direct object
      noun = words.slice(1, prepIndex).join(' ');
      // Words after preposition are the indirect object
      indirect = words.slice(prepIndex + 1).join(' ');
    } else {
      // All words after verb are the direct object
      noun = words.slice(1).join(' ');
    }
    
    return {
      verb,
      noun: noun || undefined,
      preposition,
      indirect: indirect || undefined
    };
  }
  
  /**
   * Get disambiguation options for ambiguous input
   */
  getDisambiguationOptions(phrase: string, scope: IFEntity[]): EntityMatch[] {
    const matches: EntityMatch[] = [];
    
    for (const entity of scope) {
      const match = this.matchEntity(entity, phrase);
      if (match && match.confidence > 0.3) {
        matches.push(match);
      }
    }
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }
  
  /**
   * Check if a word is a known verb
   */
  isKnownVerb(word: string): boolean {
    return this.language.isKnownVerb(word);
  }
  
  /**
   * Get verb synonyms
   */
  getVerbSynonyms(verb: string): string[] {
    return this.language.getVerbSynonyms(verb);
  }
}
