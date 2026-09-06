/**
 * facts.test.ts — ADR-333 D1 as amended 2026-09-06: a block rendered from a
 * domain event carries, beside its message id, the primitive facts the event
 * carried (`targetId`, `targetName`, `topic`, …) — never the rendering
 * params, the inline text, or a nested object. An event with no facts stamps
 * the id alone.
 *
 * Owner context: engine prose pipeline tests.
 */

import { describe, it, expect } from 'vitest';
import type { IEntity } from '@sharpee/core';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { ProsePipeline } from '../../../src/prose-pipeline/pipeline';
import { primitiveFacts } from '../../../src/prose-pipeline/phrase-render';
import type { WorldModelLike } from '../../../src/prose-pipeline/render-context';
import { makeEvent } from '../test-helpers';

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

describe('primitiveFacts', () => {
  it('keeps top-level primitives and drops the id, params, inline text, and nested values', () => {
    expect(
      primitiveFacts({
        messageId: 'if.action.asking.unknown_topic',
        params: { target: { name: 'gems stallkeeper' }, topic: 'gems' },
        message: 'inline',
        text: 'inline',
        targetId: 'a_12',
        targetName: 'gems stallkeeper',
        topic: 'gems',
        topicEntityId: undefined,
        snapshot: { id: 'a_12' },
        count: 2,
        first: true,
        _transactionId: 'txn:3:action',
        turn: 3,
        actionId: 'if.action.asking',
      }),
    ).toEqual({ targetId: 'a_12', targetName: 'gems stallkeeper', topic: 'gems', count: 2, first: true, actionId: 'if.action.asking' });
  });

  it('is undefined for nothing, a non-object, or an object with no primitives', () => {
    expect(primitiveFacts(undefined)).toBeUndefined();
    expect(primitiveFacts('x')).toBeUndefined();
    expect(primitiveFacts({ messageId: 'x', params: {} })).toBeUndefined();
  });
});

describe('the facts stamp on the domain-message path (ADR-333 D1 as amended)', () => {
  it('an asked reply carries who was asked and about what, beside the message id', () => {
    const lp = new EnglishLanguageProvider();
    const pipeline = new ProsePipeline(lp, fixtureWorld());
    const blocks = pipeline.processTurn([
      makeEvent('if.event.asked', {
        messageId: 'if.action.asking.unknown_topic',
        params: { target: 'the gems stallkeeper', topic: 'gems' },
        targetId: 'a_12',
        targetName: 'gems stallkeeper',
        topic: 'gems',
      }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toEqual({
      messageId: 'if.action.asking.unknown_topic',
      facts: { targetId: 'a_12', targetName: 'gems stallkeeper', topic: 'gems' },
    });
  });

  it('an event with nothing but its id and params stamps the id alone', () => {
    const lp = new EnglishLanguageProvider();
    lp.addMessage('apple-first-bite', 'Crisp and delicious.');
    const pipeline = new ProsePipeline(lp, fixtureWorld());
    const blocks = pipeline.processTurn([makeEvent('chord.phrase', { messageId: 'apple-first-bite', params: {} })]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toEqual({ messageId: 'apple-first-bite' });
  });
});
