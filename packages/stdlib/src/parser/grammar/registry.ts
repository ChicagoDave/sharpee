/**
 * Grammar Registry
 * 
 * Manages grammar patterns for the parser
 */

import { 
  GrammarPattern, 
  PatternCategory, 
  ScopeHint,
  GrammarConfig,
  DEFAULT_GRAMMAR_CONFIG 
} from './types';

/**
 * Registry for managing grammar patterns
 */
export class GrammarRegistry {
  private patterns: Map<string, GrammarPattern[]> = new Map();
  private patternsByAction: Map<string, GrammarPattern[]> = new Map();
  private config: GrammarConfig;

  constructor(config: Partial<GrammarConfig> = {}) {
    this.config = { ...DEFAULT_GRAMMAR_CONFIG, ...config };
  }

  /**
   * Add a pattern to the registry
   */
  addPattern(pattern: GrammarPattern): void {
    // Validate pattern
    if (!pattern.pattern || !pattern.action) {
      throw new Error('Pattern must have pattern string and action');
    }

    // Check if custom patterns are allowed
    if (pattern.category === PatternCategory.CUSTOM && !this.config.allowCustomPatterns) {
      throw new Error('Custom patterns are not allowed');
    }

    // Normalize the pattern
    const normalized = this.normalizePattern(pattern);

    // Extract the base verb(s) from the pattern
    const verbs = this.extractVerbs(normalized.pattern);

    // Add to verb-based index
    for (const verb of verbs) {
      if (!this.patterns.has(verb)) {
        this.patterns.set(verb, []);
      }
      const existing = this.patterns.get(verb)!;
      
      // Insert sorted by priority (higher first)
      const insertIndex = existing.findIndex(p => p.priority < normalized.priority);
      if (insertIndex === -1) {
        existing.push(normalized);
      } else {
        existing.splice(insertIndex, 0, normalized);
      }
    }

    // Add to action-based index
    if (!this.patternsByAction.has(normalized.action)) {
      this.patternsByAction.set(normalized.action, []);
    }
    this.patternsByAction.get(normalized.action)!.push(normalized);

    // Also add aliases
    if (pattern.aliases) {
      for (const alias of pattern.aliases) {
        this.addPattern({
          ...pattern,
          pattern: alias,
          aliases: undefined // Prevent infinite recursion
        });
      }
    }
  }

  /**
   * Find patterns that could match the input
   */
  findPatterns(input: string): GrammarPattern[] {
    const words = input.toLowerCase().trim().split(/\s+/);
    if (words.length === 0) return [];

    const firstWord = words[0];
    const candidates: GrammarPattern[] = [];

    // Check exact verb match
    if (this.patterns.has(firstWord)) {
      candidates.push(...this.patterns.get(firstWord)!);
    }

    // Check patterns that start with the verb
    for (const [verb, patterns] of this.patterns) {
      if (verb.startsWith(firstWord) && verb !== firstWord) {
        candidates.push(...patterns);
      }
    }

    // Filter by enabled status
    return candidates.filter(p => p.enabled !== false);
  }

  /**
   * Get all patterns for a specific action
   */
  getPatternsByAction(action: string): GrammarPattern[] {
    return this.patternsByAction.get(action) || [];
  }

  /**
   * Get all patterns in a category
   */
  getPatternsByCategory(category: PatternCategory): GrammarPattern[] {
    const result: GrammarPattern[] = [];
    for (const patterns of this.patterns.values()) {
      result.push(...patterns.filter(p => p.category === category));
    }
    return result;
  }

  /**
   * Remove all patterns for an action
   */
  removeAction(action: string): void {
    const patterns = this.patternsByAction.get(action) || [];
    
    for (const pattern of patterns) {
      // Only remove if it's not a standard pattern
      if (pattern.category !== PatternCategory.STANDARD) {
        this.removePattern(pattern);
      }
    }
  }

  /**
   * Remove a specific pattern
   */
  removePattern(pattern: GrammarPattern): void {
    if (pattern.category === PatternCategory.STANDARD) {
      throw new Error('Cannot remove standard patterns');
    }

    const verbs = this.extractVerbs(pattern.pattern);
    
    for (const verb of verbs) {
      const patterns = this.patterns.get(verb);
      if (patterns) {
        const index = patterns.findIndex(p => 
          p.pattern === pattern.pattern && 
          p.action === pattern.action
        );
        if (index >= 0) {
          patterns.splice(index, 1);
        }
      }
    }

    // Remove from action index
    const actionPatterns = this.patternsByAction.get(pattern.action);
    if (actionPatterns) {
      const index = actionPatterns.findIndex(p => 
        p.pattern === pattern.pattern
      );
      if (index >= 0) {
        actionPatterns.splice(index, 1);
      }
    }
  }

  /**
   * Enable or disable a pattern
   */
  setPatternEnabled(pattern: GrammarPattern, enabled: boolean): void {
    // Find and update the pattern
    const verbs = this.extractVerbs(pattern.pattern);
    
    for (const verb of verbs) {
      const patterns = this.patterns.get(verb);
      if (patterns) {
        const found = patterns.find(p => 
          p.pattern === pattern.pattern && 
          p.action === pattern.action
        );
        if (found) {
          found.enabled = enabled;
        }
      }
    }
  }

  /**
   * Clear all non-standard patterns
   */
  clearCustomPatterns(): void {
    for (const [verb, patterns] of this.patterns) {
      const filtered = patterns.filter(p => p.category !== PatternCategory.CUSTOM);
      if (filtered.length > 0) {
        this.patterns.set(verb, filtered);
      } else {
        this.patterns.delete(verb);
      }
    }

    // Also clear from action index
    for (const [action, patterns] of this.patternsByAction) {
      const filtered = patterns.filter(p => p.category !== PatternCategory.CUSTOM);
      if (filtered.length > 0) {
        this.patternsByAction.set(action, filtered);
      } else {
        this.patternsByAction.delete(action);
      }
    }
  }

  /**
   * Get statistics about registered patterns
   */
  getStats(): {
    totalPatterns: number;
    byCategory: Record<PatternCategory, number>;
    byAction: Record<string, number>;
    verbs: string[];
  } {
    const stats = {
      totalPatterns: 0,
      byCategory: {} as Record<PatternCategory, number>,
      byAction: {} as Record<string, number>,
      verbs: Array.from(this.patterns.keys()).sort()
    };

    // Initialize category counts
    for (const category of Object.values(PatternCategory)) {
      stats.byCategory[category] = 0;
    }

    // Count patterns
    for (const patterns of this.patterns.values()) {
      for (const pattern of patterns) {
        stats.totalPatterns++;
        stats.byCategory[pattern.category]++;
        stats.byAction[pattern.action] = (stats.byAction[pattern.action] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Normalize a pattern for consistency
   */
  private normalizePattern(pattern: GrammarPattern): GrammarPattern {
    return {
      ...pattern,
      pattern: pattern.pattern.toLowerCase().trim(),
      priority: pattern.priority ?? this.config.defaultPriority,
      enabled: pattern.enabled ?? true,
      scopeHints: pattern.scopeHints || []
    };
  }

  /**
   * Extract verb(s) from a pattern string
   */
  private extractVerbs(pattern: string): string[] {
    // Handle patterns like "take|get|grab <noun>"
    const verbPart = pattern.split(/\s+/)[0];
    return verbPart.split('|').map(v => v.trim()).filter(v => v.length > 0);
  }

  /**
   * Parse scope hints from a pattern string
   * e.g., "<noun:held>" -> { position: 0, hint: 'held', required: false }
   */
  static parseScopeHints(pattern: string): ScopeHint[] {
    const hints: ScopeHint[] = [];
    const regex = /<(\w+)(?::(\w+))?>/g;
    let match;
    let position = 0;

    while ((match = regex.exec(pattern)) !== null) {
      if (match[1] === 'noun' || match[1] === 'second') {
        if (match[2]) {
          hints.push({
            position,
            hint: match[2] as any, // Will be validated elsewhere
            required: false // Default to optional
          });
        }
        position++;
      }
    }

    return hints;
  }

  /**
   * Build a pattern string from components
   */
  static buildPattern(
    verbs: string | string[], 
    parts: string[], 
    hints?: Record<number, string>
  ): string {
    const verbPart = Array.isArray(verbs) ? verbs.join('|') : verbs;
    let result = verbPart;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('<') && part.endsWith('>')) {
        // It's a placeholder
        const hint = hints?.[i];
        if (hint) {
          result += ` ${part.slice(0, -1)}:${hint}>`;
        } else {
          result += ` ${part}`;
        }
      } else {
        result += ` ${part}`;
      }
    }

    return result;
  }
}

/**
 * Create a grammar pattern helper
 */
export function createPattern(
  pattern: string,
  action: string,
  options: Partial<GrammarPattern> = {}
): GrammarPattern {
  return {
    pattern,
    action,
    priority: options.priority ?? 50,
    category: options.category ?? PatternCategory.CUSTOM,
    scopeHints: options.scopeHints || GrammarRegistry.parseScopeHints(pattern),
    aliases: options.aliases,
    enabled: options.enabled ?? true,
    metadata: options.metadata
  };
}
