/**
 * command-failed-story-rule.test.ts — GH #345: a `command.failed` event
 * carrying `storyRule: true` (a story rule's own diagnostic) renders the
 * `core.story_rule_failed` lead followed by the reason, never the parser's
 * refusal; an unflagged failure keeps the standing rendering. The real
 * path (a LoadError thrown from a Chord condition through the executor) is
 * pinned in story-loader's `gone-semantics.test.ts`; this pins the
 * handler's branch on its own.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { handleCommandFailed } from '../../src/prose-pipeline/handlers/command-failed';
import type { HandlerContext } from '../../src/prose-pipeline/handlers/types';

const MESSAGES: Record<string, string> = {
  'core.story_rule_failed': "One of the story's rules failed here:",
  'core.command_failed': "I don't understand that.",
};

const context = {
  languageProvider: { getMessage: (id: string) => MESSAGES[id] },
} as unknown as HandlerContext;

const failed = (data: Record<string, unknown>): ISemanticEvent => ({
  id: 'e1',
  type: 'command.failed',
  timestamp: 0,
  entities: {},
  data,
});

const textOf = (blocks: ReturnType<typeof handleCommandFailed>): string =>
  blocks.flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');

describe('command.failed rendering (GH #345)', () => {
  it('renders a story-rule failure as the lead plus the reason', () => {
    const blocks = handleCommandFailed(failed({ reason: 'Expected an entity, got `o0g`.', storyRule: true }), context);
    expect(textOf(blocks)).toBe("One of the story's rules failed here: Expected an entity, got `o0g`.");
  });

  it('keeps the parser refusal for an unflagged failure', () => {
    const blocks = handleCommandFailed(failed({ reason: 'Expected an entity, got `o0g`.' }), context);
    expect(textOf(blocks)).toBe("I don't understand that.");
  });
});
