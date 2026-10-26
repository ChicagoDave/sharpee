/**
 * command-failed-named.test.ts — a list item that names nothing fails the
 * command naming that item (ADR-385 D5): a `command.failed` event carrying
 * the item's `phrase` renders `core.entity_not_found_named` with it, while a
 * failure without a phrase keeps the standing `core.entity_not_found`
 * rendering. The real path (the validator's ENTITY_NOT_FOUND for a list item
 * through the executor) is pinned in story-loader's `lists-and-pronouns.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { handleCommandFailed } from '../../src/prose-pipeline/handlers/command-failed';
import type { HandlerContext } from '../../src/prose-pipeline/handlers/types';

const MESSAGES: Record<string, string> = {
  'core.entity_not_found': "You can't see any such thing.",
  'core.entity_not_found_named': "You can't see any {phrase} here.",
  'parser.error.scopeViolation.carried': "You aren't holding {entity}.",
};

const context = {
  languageProvider: {
    getMessage: (id: string, params?: Record<string, string>) =>
      MESSAGES[id]?.replace(/\{(\w+)\}/g, (_, key) => params?.[key] ?? `{${key}}`),
  },
} as unknown as HandlerContext;

const failed = (data: Record<string, unknown>): ISemanticEvent => ({ id: 'e1', type: 'command.failed', timestamp: 0, entities: {}, data });

const textOf = (blocks: ReturnType<typeof handleCommandFailed>): string =>
  blocks.flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');

describe('command.failed names a list item that names nothing (ADR-385 D5)', () => {
  it('renders the named refusal when the failure carries the item phrase', () => {
    const blocks = handleCommandFailed(failed({ reason: 'Validation failed: ENTITY_NOT_FOUND', phrase: 'widget' }), context);
    expect(textOf(blocks)).toBe("You can't see any widget here.");
  });

  it('renders a scope violation by its message id and params (ADR-385 D8)', () => {
    const blocks = handleCommandFailed(
      failed({ reason: 'Parse failed: SCOPE_VIOLATION', messageId: 'parser.error.scopeViolation.carried', params: { entity: 'the brass lantern' } }),
      context
    );
    expect(textOf(blocks)).toBe("You aren't holding the brass lantern.");
  });

  it('keeps the standing refusal when no phrase is carried', () => {
    const blocks = handleCommandFailed(failed({ reason: 'Validation failed: ENTITY_NOT_FOUND' }), context);
    expect(textOf(blocks)).toBe("You can't see any such thing.");
  });
});
