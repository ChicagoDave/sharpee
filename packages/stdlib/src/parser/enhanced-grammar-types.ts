/**
 * Enhanced grammar types for Sharpee's pattern-based parser
 * Supports scope hints, compound commands, and advanced patterns
 */

import { GrammarPattern } from './if-parser-types';

/**
 * Scope hints for pattern matching
 */
export interface ScopeHint {
  held?: boolean;         // In player's inventory
  here?: boolean;         // In current location  
  worn?: boolean;         // Being worn
  container?: boolean;    // Is a container
  supporter?: boolean;    // Is a supporter
  person?: boolean;       // Is a person/NPC
  openable?: boolean;     // Can be opened/closed
  lockable?: boolean;     // Can be locked/unlocked
  switchable?: boolean;   // Can be turned on/off
  readable?: boolean;     // Can be read
  wearable?: boolean;     // Can be worn
  takeable?: boolean;     // Can be taken
  enterable?: boolean;    // Can be entered
  pushable?: boolean;     // Can be pushed
  visible?: boolean;      // Is visible (default)
  reachable?: boolean;    // Can be touched (default)
}

/**
 * Enhanced grammar pattern with additional features
 */
export interface EnhancedGrammarPattern extends GrammarPattern {
  // Compound command support
  iterateObjects?: boolean;      // Apply action to each object in noun+
  matchAll?: boolean;            // Matches "all" or "everything"
  scopeFilter?: string;          // Filter for "all" (e.g., 'takeable')
  except?: boolean;              // Pattern includes except clause
  
  // Advanced matching
  reversed?: boolean;            // Arguments are in reversed order
  textCapture?: string;          // Capture free text into this field
  meta?: boolean;                // Meta command (bypasses normal processing)
  
  // Scope preferences (parsed from <noun:hint> syntax)
  nounHints?: ScopeHint;         // Hints for first noun
  secondHints?: ScopeHint;       // Hints for second noun
}

/**
 * Parse result for compound commands
 */
export interface CompoundParseResult {
  objects: string[];             // Individual objects found
  matchAll: boolean;             // "all" or "everything" used
  except?: string[];             // Objects to exclude
  conjunctions: number[];        // Positions of "and" in original
}

/**
 * Clarification request when pattern is incomplete
 */
export interface ClarificationRequest {
  prompt: string;                // "What do you want to unlock it with?"
  partialCommand: any;           // The incomplete command
  missingPart: 'noun' | 'second' | 'direction' | 'topic';
  expectedType?: ScopeHint;      // What kind of object is expected
}

/**
 * Enhanced parse result
 */
export interface EnhancedParseResult {
  success: boolean;
  commands: any[];               // Parsed commands
  error?: string;
  needsDisambiguation?: any;     // Standard disambiguation
  needsClarification?: ClarificationRequest;
  suggestions?: string[];        // Suggested commands for errors
}

/**
 * Pattern syntax parser for extracting scope hints
 */
export function parsePatternSyntax(pattern: string): {
  cleanPattern: string;
  nounHints?: ScopeHint;
  secondHints?: ScopeHint;
} {
  const result: any = { cleanPattern: pattern };
  
  // Extract noun hints: <noun:held> -> <noun> with hint
  const nounMatch = pattern.match(/<noun(?::(\w+))?(?:\+|\*)?>/);
  if (nounMatch && nounMatch[1]) {
    result.nounHints = parseScopeHint(nounMatch[1]);
    result.cleanPattern = result.cleanPattern.replace(nounMatch[0], '<noun>');
  }
  
  // Extract second noun hints
  const secondMatch = pattern.match(/<second(?::(\w+))?>/);
  if (secondMatch && secondMatch[1]) {
    result.secondHints = parseScopeHint(secondMatch[1]);
    result.cleanPattern = result.cleanPattern.replace(secondMatch[0], '<second>');
  }
  
  return result;
}

/**
 * Parse a scope hint string into ScopeHint object
 */
function parseScopeHint(hint: string): ScopeHint {
  const hints: ScopeHint = {};
  
  // Simple mapping of hint strings to properties
  const hintMap: Record<string, keyof ScopeHint> = {
    'held': 'held',
    'here': 'here',
    'worn': 'worn',
    'container': 'container',
    'supporter': 'supporter',
    'person': 'person',
    'openable': 'openable',
    'lockable': 'lockable',
    'switchable': 'switchable',
    'readable': 'readable',
    'wearable': 'wearable',
    'takeable': 'takeable',
    'enterable': 'enterable',
    'pushable': 'pushable'
  };
  
  if (hintMap[hint]) {
    hints[hintMap[hint]] = true;
  }
  
  return hints;
}

/**
 * Check if a pattern supports multiple objects
 */
export function supportsMultipleObjects(pattern: string): boolean {
  return pattern.includes('<noun+>') || pattern.includes('<noun*>');
}

/**
 * Check if a pattern has an except clause
 */
export function hasExceptClause(pattern: string): boolean {
  return pattern.includes('(except|but)');
}

/**
 * Grammar category for organization
 */
export enum GrammarCategory {
  OBJECT_MANIPULATION = 'object_manipulation',
  MOVEMENT = 'movement',
  EXAMINATION = 'examination',
  CONVERSATION = 'conversation',
  MANIPULATION = 'manipulation',
  CLOTHING = 'clothing',
  CONSUMPTION = 'consumption',
  VIOLENCE = 'violence',
  SOCIAL = 'social',
  META = 'meta'
}

/**
 * Complete grammar pattern with category
 */
export interface CategorizedGrammarPattern extends EnhancedGrammarPattern {
  category: GrammarCategory;
  priority?: number;  // Higher priority patterns match first
}