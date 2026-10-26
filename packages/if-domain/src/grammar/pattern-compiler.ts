/**
 * @file Pattern Compiler Interface
 * @description Language-agnostic interface for compiling grammar patterns.
 *
 * Public interface: PatternCompiler (parse, compile), PatternSyntaxError.
 * Owner context: if-domain grammar contract. A rule's structure crosses as
 * PatternElement parts (ADR-382 D1); text is parsed once, at the boundary,
 * by `parse`, and nothing downstream reads pattern text again.
 */

import { CompiledPattern, PatternElement } from './grammar-builder.js';

/**
 * Pattern compiler interface
 * Language-specific implementations handle their own syntax
 */
export interface PatternCompiler {
  /**
   * Parse pattern text into structured parts — the `define(text)` front end
   * (ADR-382 D3). The only place pattern text is read.
   * @param pattern The pattern text (e.g., "put :item in|into :container")
   * @returns The pattern's elements, in order
   * @throws PatternSyntaxError, with the offending offset, on malformed text
   */
  parse(pattern: string): PatternElement[];

  /**
   * Compile structured parts into the matcher's tokens and slot records.
   * @param parts The pattern's elements
   * @param source The rule's display text, quoted in error messages only
   * @returns Compiled pattern with tokens and one record per slot
   * @throws PatternSyntaxError on an empty pattern, an invalid or duplicate
   *   slot name, or an empty alternation
   */
  compile(parts: readonly PatternElement[], source?: string): CompiledPattern;
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
