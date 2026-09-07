/**
 * examined-snippets.test.ts — GH #364: an `if.event.examined` that carries the
 * entity's `snippets` map splices its `{snippet:name}` markers through the
 * same resolver the room handler uses, keyed on the entity's id; an event
 * without a map binds the resolved text as it is (the existing D1a pin).
 *
 * Owner context: engine prose pipeline tests.
 */

import { describe, it, expect } from 'vitest';
import type { IEntity } from '@sharpee/core';
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { ProsePipeline } from '../../../src/prose-pipeline/pipeline';
import type { WorldModelLike } from '../../../src/prose-pipeline/render-context';
import { makeEvent } from '../test-helpers';

function fixtureWorld(): { world: WorldModelLike; capabilities: Record<string, Record<string, unknown>> } {
  const capabilities: Record<string, Record<string, unknown>> = { textState: {} };
  const world: WorldModelLike = {
    getEntity: () => undefined,
    getContents: () => [],
    getContainingRoom: () => undefined,
    getPlayer: () => ({ id: 'player' } as IEntity),
    getCapability: (name) => capabilities[name],
    updateCapability: (name, updates) => {
      capabilities[name] = { ...(capabilities[name] ?? {}), ...updates };
    },
    hasCapability: (name) => name in capabilities,
    registerCapability: (name, reg) => {
      if (!(name in capabilities)) capabilities[name] = reg?.initialData ?? {};
    },
  };
  return { world, capabilities };
}

const textOf = (n: TextContent): string =>
  typeof n === 'string' ? n : (n.content ?? []).map(textOf).join('');
const blockText = (blocks: ITextBlock[]): string => blocks.map((b) => b.content.map(textOf).join('')).join('\n');

function examinedEvent(extra: Record<string, unknown>) {
  return makeEvent('if.event.examined', {
    messageId: 'if.action.examining.examined',
    params: { descriptionId: 'lanterns.description' },
    targetId: 'lanterns',
    targetName: 'lanterns',
    hasDescription: true,
    ...extra,
  });
}

describe('tryProcessExamined splices entity snippets (GH #364)', () => {
  it('resolves a fixed-text entry and an empty (gated-out) entry at their markers', () => {
    const lp = new EnglishLanguageProvider();
    lp.addMessage('lanterns.description', '{snippet:night}The lampposts stand along the street. {snippet:tail}');
    const { world } = fixtureWorld();
    const pipeline = new ProsePipeline(lp, world);

    const blocks = pipeline.processTurn([
      examinedEvent({ snippets: { night: '', tail: 'One flickers.' } }),
    ]);

    expect(blockText(blocks)).toBe('The lampposts stand along the street. One flickers.');
  });

  it('advances a variant entry per examine, keyed on the entity id', () => {
    const lp = new EnglishLanguageProvider();
    lp.addMessage('lanterns.description', 'The lampposts stand along the street. {snippet:tail}');
    const { world, capabilities } = fixtureWorld();
    const pipeline = new ProsePipeline(lp, world);
    const snippets = { tail: { selector: 'cycling' as const, texts: ['One flickers.', 'All are dark.'] } };

    expect(blockText(pipeline.processTurn([examinedEvent({ snippets })]))).toBe('The lampposts stand along the street. One flickers.');
    expect(blockText(pipeline.processTurn([examinedEvent({ snippets })]))).toBe('The lampposts stand along the street. All are dark.');
    expect((capabilities.textState as Record<string, Record<string, number>>).lanterns.tail).toBe(2);
  });

  it('binds the text unspliced when the event carries no map', () => {
    const lp = new EnglishLanguageProvider();
    lp.addMessage('lanterns.description', 'The lampposts stand along the street. {snippet:tail}');
    const { world } = fixtureWorld();
    const pipeline = new ProsePipeline(lp, world);

    expect(blockText(pipeline.processTurn([examinedEvent({})]))).toBe('The lampposts stand along the street. {snippet:tail}');
  });
});
