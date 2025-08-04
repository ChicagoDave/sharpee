/**
 * @file English Pattern Compiler
 * @description English-specific implementation of pattern compilation
 */

import { 
  PatternCompiler, 
  CompiledPattern, 
  PatternToken,
  PatternSyntaxError 
} from '@sharpee/if-domain';

/**
 * English-specific pattern compiler
 * Handles patterns like: "put :item in|into|inside :container"
 */
export class EnglishPatternCompiler implements PatternCompiler {
  /**
   * Compile a pattern string into tokens
   */
  compile(pattern: string): CompiledPattern {
    if (!pattern || pattern.trim().length === 0) {
      throw new PatternSyntaxError('Pattern cannot be empty', pattern);
    }
    
    if (!this.validate(pattern)) {
      throw new PatternSyntaxError('Invalid pattern syntax', pattern);
    }
    
    const tokens: PatternToken[] = [];
    const slots = new Map<string, number>();
    
    // First, handle optional elements by parsing square brackets
    const expandedPattern = this.expandOptionalElements(pattern);
    const words = expandedPattern.trim().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Check if this is an optional marker
      if (word === '[optional]') {
        // Mark the next token as optional
        i++; // Move to the next word
        if (i >= words.length) {
          throw new PatternSyntaxError('Expected word after [optional] marker', pattern);
        }
        const optionalWord = words[i];
        
        if (optionalWord.startsWith(':')) {
          // Optional slot
          const slotName = optionalWord.substring(1);
          if (!slotName || !/^[a-zA-Z_]\w*$/.test(slotName)) {
            throw new PatternSyntaxError(
              `Invalid slot name: ${optionalWord}`,
              pattern,
              pattern.indexOf(optionalWord)
            );
          }
          if (slots.has(slotName)) {
            throw new PatternSyntaxError(
              `Duplicate slot name: ${slotName}`,
              pattern,
              pattern.indexOf(optionalWord)
            );
          }
          slots.set(slotName, tokens.length);
          tokens.push({
            type: 'slot',
            value: slotName,
            optional: true
          });
        } else if (optionalWord.includes('|')) {
          // Optional alternates
          const alternates = optionalWord.split('|');
          tokens.push({
            type: 'alternates',
            value: alternates[0],
            alternates,
            optional: true
          });
        } else {
          // Optional literal
          tokens.push({
            type: 'literal',
            value: optionalWord,
            optional: true
          });
        }
      } else if (word.startsWith(':')) {
        // Slot token
        const slotName = word.substring(1);
        if (!slotName || !/^[a-zA-Z_]\w*$/.test(slotName)) {
          throw new PatternSyntaxError(
            `Invalid slot name: ${word}`,
            pattern,
            pattern.indexOf(word)
          );
        }
        if (slots.has(slotName)) {
          throw new PatternSyntaxError(
            `Duplicate slot name: ${slotName}`,
            pattern,
            pattern.indexOf(word)
          );
        }
        slots.set(slotName, tokens.length);
        tokens.push({
          type: 'slot',
          value: slotName
        });
      } else if (word.includes('|')) {
        // Alternates token
        const alternates = word.split('|');
        tokens.push({
          type: 'alternates',
          value: alternates[0], // First as primary
          alternates
        });
      } else {
        // Literal token
        tokens.push({
          type: 'literal',
          value: word
        });
      }
    }
    
    // Calculate min/max tokens
    // Min: count required tokens only
    const minTokens = tokens.filter(t => 
      !t.optional && (t.type === 'slot' || t.type === 'literal' || t.type === 'alternates')
    ).length;
    
    // Max: count all tokens including optional ones
    const maxTokens = tokens.filter(t => 
      t.type === 'slot' || t.type === 'literal' || t.type === 'alternates'
    ).length;
    
    return {
      tokens,
      slots,
      minTokens,
      maxTokens
    };
  }
  
  /**
   * Expand optional elements in square brackets to markers
   * E.g., "look [carefully] at :target" -> "look [optional] carefully at :target"
   */
  private expandOptionalElements(pattern: string): string {
    let result = pattern;
    
    // Find all square bracket pairs
    const optionalRegex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = optionalRegex.exec(pattern)) !== null) {
      const fullMatch = match[0]; // e.g., "[carefully]"
      const content = match[1];   // e.g., "carefully"
      
      // Replace [content] with [optional] content
      result = result.replace(fullMatch, `[optional] ${content}`);
    }
    
    return result;
  }
  
  /**
   * Validate a pattern string
   */
  validate(pattern: string): boolean {
    if (!pattern || pattern.trim().length === 0) {
      return false;
    }
    
    const words = pattern.trim().split(/\s+/);
    
    for (const word of words) {
      // Check for valid slot names
      if (word.startsWith(':')) {
        const slotName = word.substring(1);
        // Slot name must not be empty and must start with letter or underscore
        if (!slotName || !/^[a-zA-Z_]\w*$/.test(slotName)) {
          return false;
        }
      }
      
      // Check for empty alternates
      if (word.includes('|')) {
        // Check for trailing pipe
        if (word.endsWith('|')) {
          return false;
        }
        // Check for empty alternates (||)
        if (word.includes('||')) {
          return false;
        }
        // Check all parts are non-empty
        const parts = word.split('|');
        if (parts.some(p => p.length === 0)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Extract slot names from a pattern
   */
  extractSlots(pattern: string): string[] {
    const slots: string[] = [];
    const matches = pattern.match(/:\w+/g) || [];
    
    for (const match of matches) {
      const slotName = match.substring(1);
      if (!slots.includes(slotName)) {
        slots.push(slotName);
      }
    }
    
    return slots;
  }
}