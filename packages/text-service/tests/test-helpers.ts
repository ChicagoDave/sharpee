/**
 * Shared test helpers for text-service tests
 *
 * Provides minimal event, block, and LanguageProvider factories.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { HandlerContext } from '../src/handlers/types.js';

let eventCounter = 0;

/**
 * Create a minimal event for testing
 */
export function makeEvent(type: string, data?: unknown): ISemanticEvent {
  return {
    id: `evt-${type}-${++eventCounter}`,
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
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean') return val.toString();
        return JSON.stringify(val);
      });
    },
  } as LanguageProvider;
}

/**
 * Create a plain text block
 */
export function makeBlock(key: string, text: string): ITextBlock {
  return { key, content: [text] };
}

/**
 * Create a block with decoration objects
 */
export function makeDecoratedBlock(
  key: string,
  parts: Array<string | { type: string; content: string[] }>,
): ITextBlock {
  return { key, content: parts };
}

/**
 * Create a HandlerContext with an optional LanguageProvider
 */
export function makeContext(
  provider?: LanguageProvider,
): HandlerContext {
  return { languageProvider: provider };
}
