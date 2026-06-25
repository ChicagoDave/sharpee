/**
 * Formatter System
 *
 * Formatters transform placeholder values in message templates.
 *
 * Syntax: {formatter:formatter:...:placeholder} (the placeholder is the last segment)
 * Example: {a:item} → "a sword"
 * Example: {list:items} → "a sword, a key, and a coin" (articles + grouping, ADR-190)
 * Example: {the-list:items} → "the sword, the key, and the coin"
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
export { isFormatter, wasFormatter, hasFormatter } from './verb.js';
