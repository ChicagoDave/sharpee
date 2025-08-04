/**
 * @file Pattern Compiler Interface
 * @description Language-agnostic interface for compiling grammar patterns
 */

import { CompiledPattern, PatternToken } from './grammar-builder';

/**
 * Pattern compiler interface
 * Language-specific implementations handle their own syntax
 */
export interface PatternCompiler {
  /**
   * Compile a pattern string into tokens
   * @param pattern The pattern string (e.g., "put :item in|into :container")
   * @returns Compiled pattern with tokens and metadata
   */
  compile(pattern: string): CompiledPattern;
  
  /**
   * Validate a pattern string
   * @param pattern The pattern to validate
   * @returns True if valid, false otherwise
   */
  validate(pattern: string): boolean;
  
  /**
   * Extract slot names from a pattern
   * @param pattern The pattern string
   * @returns Array of slot names
   */
  extractSlots(pattern: string): string[];
}

/**
 * Pattern syntax error
 */
export class PatternSyntaxError extends Error {
  constructor(
    message: string,
    public pattern: string,
    public position?: number
  ) {
    super(message);
    this.name = 'PatternSyntaxError';
  }
}