/**
 * examined.test.ts — ADR-333 D1a: an `if.event.examined` whose params carry a
 * `descriptionId` renders the entity's registered text through the action's
 * own template and stamps the block with the entity's id; an event bound the
 * literal way keeps the template's stamp (ADR-333 D1).
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

/** Minimal world: enough surface for the phrase path; no entities. */
function fixtureWorld(): WorldModelLike {
  const capabilities: Record<string, Record<string, unknown>> = { textState: {} };
  return {
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
}

const textOf = (n: TextContent): string =>
  typeof n === 'string' ? n : (n.content ?? []).map(textOf).join('');
const blockText = (blocks: ITextBlock[]): string => blocks.map((b) => b.content.map(textOf).join('')).join('\n');

function examinedEvent(params: Record<string, unknown>) {
  return makeEvent('if.event.examined', {
    messageId: 'if.action.examining.examined',
    params,
    targetId: 'dress',
    targetName: 'silk dress',
    hasDescription: true,
  });
}

describe('tryProcessExamined (ADR-333 D1a)', () => {
  it('resolves the description id to its raw text and stamps the block with the entity\'s id', () => {
    const lp = new EnglishLanguageProvider();
    lp.addMessage('dress.description', 'A silk dress the colour of {midnight}.');
    const pipeline = new ProsePipeline(lp, fixtureWorld());

    const blocks = pipeline.processTurn([examinedEvent({ descriptionId: 'dress.description' })]);

    expect(blocks).toHaveLength(1);
    expect(blockText(blocks)).toBe('A silk dress the colour of {midnight}.');
    expect(blocks[0].source).toEqual({
      messageId: 'dress.description',
      facts: { targetId: 'dress', targetName: 'silk dress', hasDescription: true },
    });
  });

  it('a literal description keeps the action template\'s stamp (D1)', () => {
    const pipeline = new ProsePipeline(new EnglishLanguageProvider(), fixtureWorld());

    const blocks = pipeline.processTurn([examinedEvent({ description: 'A plain dress.' })]);

    expect(blockText(blocks)).toBe('A plain dress.');
    // The action template's id, and the event's facts beside it (D1 as amended 2026-09-06).
    expect(blocks[0].source).toEqual({
      messageId: 'if.action.examining.examined',
      facts: { targetId: 'dress', targetName: 'silk dress', hasDescription: true },
    });
  });

  it('an unregistered id falls through to the literal the params also carry', () => {
    const pipeline = new ProsePipeline(new EnglishLanguageProvider(), fixtureWorld());

    const blocks = pipeline.processTurn([
      examinedEvent({ descriptionId: 'nope.description', description: 'A plain dress.' }),
    ]);

    expect(blockText(blocks)).toBe('A plain dress.');
    // The action template's id, and the event's facts beside it (D1 as amended 2026-09-06).
    expect(blocks[0].source).toEqual({
      messageId: 'if.action.examining.examined',
      facts: { targetId: 'dress', targetName: 'silk dress', hasDescription: true },
    });
  });
});
