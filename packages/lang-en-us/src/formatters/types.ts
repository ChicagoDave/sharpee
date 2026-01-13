/**
 * Formatter Types
 *
 * Formatters transform placeholder values in message templates.
 *
 * Syntax: {formatter:formatter:...:placeholder}
 * Example: {a:item} → "a sword"
 * Example: {items:list} → "a sword, a key, and a coin"
 *
 * @see ADR-095 Message Templates with Formatters
 */

/**
 * Context passed to formatters
 */
export interface FormatterContext {
  /** Get entity by ID for nounType/article lookup */
  getEntity?: (id: string) => EntityInfo | undefined;
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
