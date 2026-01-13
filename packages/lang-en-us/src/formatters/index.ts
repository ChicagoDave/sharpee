/**
 * Formatter System
 *
 * Formatters transform placeholder values in message templates.
 *
 * Syntax: {formatter:formatter:...:placeholder}
 * Example: {a:item} → "a sword"
 * Example: {items:list} → "a sword, a key, and a coin"
 * Example: {a:items:list} → applies 'a' to each item, then 'list' to join
 *
 * @see ADR-095 Message Templates with Formatters
 */

// Types
export type {
  Formatter,
  FormatterRegistry,
  FormatterContext,
  EntityInfo,
} from './types.js';

// Registry and utilities
export {
  createFormatterRegistry,
  parsePlaceholder,
  applyFormatters,
  formatMessage,
} from './registry.js';

// Individual formatters (for direct use or testing)
export { aFormatter, theFormatter, someFormatter, yourFormatter } from './article.js';
export { listFormatter, orListFormatter, commaListFormatter, countFormatter } from './list.js';
export { capFormatter, upperFormatter, lowerFormatter, titleFormatter } from './text.js';
