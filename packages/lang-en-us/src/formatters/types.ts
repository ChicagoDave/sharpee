/**
 * Formatter Types
 *
 * Formatters transform placeholder values in message templates.
 *
 * Syntax: {formatter:formatter:...:placeholder} (the placeholder is the last segment)
 * Example: {a:item} → "a sword"
 * Example: {list:items} → "a sword, a key, and a coin"
 *
 * @see ADR-095 Message Templates with Formatters
 */

/**
 * Context passed to formatters
 */
export interface FormatterContext {
  /** Get entity by ID for nounType/article lookup */
  getEntity?: (id: string) => EntityInfo | undefined;
  /** Render-time settings the language layer reads (ADR-190). */
  settings?: {
    /** Serial (Oxford) comma in lists. Default true when absent. */
    serialComma?: boolean;
  };
}

/**
 * Minimal entity info for formatting
 */
export interface EntityInfo {
  name: string;
  nounType?: 'common' | 'proper' | 'mass' | 'unique' | 'plural';
  properName?: boolean;
  article?: string;
  grammaticalNumber?: 'singular' | 'plural';
  /**
   * Author-supplied plural form for irregular nouns (ADR-190). Populated from
   * `IdentityTrait.plural` by `entityInfoFrom`. The `list`/`count` formatters use
   * it when present, else fall back to the `pluralize()` heuristic.
   */
  plural?: string;
}

/**
 * Formatter function signature
 *
 * @param value - The value to format (string, array, or EntityInfo)
 * @param context - Formatting context with entity lookup
 * @returns Formatted string
 */
export type Formatter = (
  value: string | string[] | EntityInfo | EntityInfo[],
  context: FormatterContext
) => string;

/**
 * Formatter registry - maps formatter names to functions
 */
export type FormatterRegistry = Map<string, Formatter>;
