/**
 * Shared test helpers for engine prose-pipeline tests.
 *
 * Mirrors the previous `@sharpee/text-service/tests/test-helpers.ts`
 * helpers, adapted to the post-ADR-174 IDecoration shape.
 *
 * @see ADR-174 §Wire shape
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { LanguageProvider } from '@sharpee/if-domain';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { HandlerContext } from '../../src/prose-pipeline/handlers/types';

let eventCounter = 0;

/**
 * Create a minimal `ISemanticEvent` for testing.
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
 * Create a stub `LanguageProvider` that maps known IDs to strings.
 *
 * Unknown IDs are echoed back (the convention handlers check for).
 * Function-valued entries receive the params and may return a custom
 * string.
 */
export function makeProvider(
  map: Record<string, string | ((params?: Record<string, unknown>) => string)>,
): LanguageProvider {
  return {
    languageCode: 'en-us',
    getMessage(id: string, params?: Record<string, unknown>): string {
      const entry = map[id];
      if (!entry) return id;
      if (typeof entry === 'function') return entry(params);
      return entry.replace(/\{(\w+)\}/g, (_, k: string) => {
        const val = params?.[k];
        if (val === undefined || val === null) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean')
          return val.toString();
        return JSON.stringify(val);
      });
    },
  } as LanguageProvider;
}

/**
 * Create a plain text block.
 */
export function makeBlock(key: string, text: string): ITextBlock {
  return { key, content: [text] };
}

/**
 * Create a block with decoration objects (post-ADR-174 shape).
 */
export function makeDecoratedBlock(
  key: string,
  parts: Array<string | { className: string; content: string[] }>,
): ITextBlock {
  return { key, content: parts };
}

/**
 * Create a `HandlerContext` with an optional `LanguageProvider`.
 */
export function makeContext(provider?: LanguageProvider): HandlerContext {
  return { languageProvider: provider };
}
