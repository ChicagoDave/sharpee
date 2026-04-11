/**
 * Shared test helpers for handler tests
 *
 * Provides minimal event and LanguageProvider factories.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { HandlerContext } from '../../src/handlers/types.js';

/**
 * Create a minimal event for handler testing
 */
export function makeEvent(type: string, data?: unknown): ISemanticEvent {
  return {
    id: `evt-${type}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}

/**
 * Create a stub LanguageProvider that maps known IDs to strings.
 * Unknown IDs are echoed back (the convention handlers check for).
 */
export function makeProvider(
  map: Record<string, string | ((params?: Record<string, unknown>) => string)>,
): LanguageProvider {
  return {
    languageCode: 'en-us',
    getMessage(id: string, params?: Record<string, unknown>): string {
      const entry = map[id];
      if (!entry) return id; // echo key = "not found"
      if (typeof entry === 'function') return entry(params);
      // Naive param substitution: {key} → value
      return entry.replace(/\{(\w+)\}/g, (_, k: string) => {
        const val = params?.[k];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      });
    },
  } as LanguageProvider;
}

/**
 * Create a HandlerContext with an optional LanguageProvider
 */
export function makeContext(
  provider?: LanguageProvider,
): HandlerContext {
  return { languageProvider: provider };
}
