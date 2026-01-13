/**
 * Formatter Registry
 *
 * Central registry of all formatters, with support for story extensions.
 *
 * @see ADR-095 Message Templates with Formatters
 */

import type { Formatter, FormatterRegistry, FormatterContext, EntityInfo } from './types.js';
import { aFormatter, theFormatter, someFormatter, yourFormatter } from './article.js';
import { listFormatter, orListFormatter, commaListFormatter, countFormatter } from './list.js';
import { capFormatter, upperFormatter, lowerFormatter, titleFormatter } from './text.js';

/**
 * Create the default formatter registry with all built-in formatters
 */
export function createFormatterRegistry(): FormatterRegistry {
  const registry: FormatterRegistry = new Map();

  // Article formatters
  registry.set('a', aFormatter);
  registry.set('an', aFormatter); // Alias
  registry.set('the', theFormatter);
  registry.set('some', someFormatter);
  registry.set('your', yourFormatter);

  // List formatters
  registry.set('list', listFormatter);
  registry.set('or-list', orListFormatter);
  registry.set('comma-list', commaListFormatter);
  registry.set('count', countFormatter);

  // Text formatters
  registry.set('cap', capFormatter);
  registry.set('upper', upperFormatter);
  registry.set('lower', lowerFormatter);
  registry.set('title', titleFormatter);

  return registry;
}

/**
 * Parse a placeholder with formatters
 *
 * Syntax: {formatter:formatter:...:placeholder}
 *
 * @returns Object with formatters array and final placeholder name
 */
export function parsePlaceholder(placeholder: string): {
  formatters: string[];
  name: string;
} {
  const parts = placeholder.split(':');

  if (parts.length === 1) {
    return { formatters: [], name: parts[0] };
  }

  // Last part is the placeholder name, everything before is formatters
  const name = parts[parts.length - 1];
  const formatters = parts.slice(0, -1);

  return { formatters, name };
}

/**
 * Apply formatters to a value in sequence
 *
 * @param value - The value to format
 * @param formatters - Array of formatter names to apply in order
 * @param registry - The formatter registry
 * @param context - Formatting context
 * @returns Formatted string
 */
export function applyFormatters(
  value: string | string[] | EntityInfo | EntityInfo[],
  formatters: string[],
  registry: FormatterRegistry,
  context: FormatterContext
): string {
  let result: string | string[] | EntityInfo | EntityInfo[] = value;

  for (const formatterName of formatters) {
    const formatter = registry.get(formatterName);
    if (formatter) {
      // Apply formatter - result becomes a string
      const formatted = formatter(result, context);
      result = formatted;
    }
    // If formatter not found, skip it (could log warning)
  }

  // Ensure we return a string
  if (Array.isArray(result)) {
    return result.map((v) => (typeof v === 'string' ? v : v.name)).join(', ');
  }
  if (typeof result === 'string') {
    return result;
  }
  return result.name;
}

/**
 * Format a message template with placeholders
 *
 * Supports both:
 * - Simple placeholders: {item}
 * - Formatted placeholders: {a:item}, {items:list}, {a:items:list}
 *
 * @param template - Message template with {placeholder} syntax
 * @param params - Values for placeholders
 * @param registry - Formatter registry
 * @param context - Formatting context
 * @returns Formatted message
 */
export function formatMessage(
  template: string,
  params: Record<string, string | string[] | EntityInfo | EntityInfo[]>,
  registry: FormatterRegistry,
  context: FormatterContext = {}
): string {
  // Match {anything} placeholders
  return template.replace(/\{([^}]+)\}/g, (match, placeholder) => {
    const { formatters, name } = parsePlaceholder(placeholder);

    // Get the value for this placeholder
    const value = params[name];
    if (value === undefined) {
      // Placeholder not found in params - leave it as is
      // (might be a perspective placeholder like {You})
      return match;
    }

    // Apply formatters
    if (formatters.length > 0) {
      return applyFormatters(value, formatters, registry, context);
    }

    // No formatters - just convert to string
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === 'string' ? v : v.name)).join(', ');
    }
    if (typeof value === 'string') {
      return value;
    }
    return value.name;
  });
}
