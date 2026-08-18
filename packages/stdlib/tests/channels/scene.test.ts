/**
 * Tests for the `scene` and `exchange-affordances` channels (ADR-320 D12).
 *
 * The closures are invoked with hand-built ChannelProduceContexts and the
 * values asserted directly — same idiom as character-author.test.ts. The
 * affordances closure reads the scene store, so its contexts carry a
 * minimal world stub exposing `getCapability` (the asWorld narrowing
 * probe) and `getStateValue`.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import type { SceneStoreState } from '@sharpee/world-model';
import { sceneChannel, exchangeAffordancesChannel, STANDARD_CHANNELS } from '../../src/channels';

function makeCtx(events: ISemanticEvent[], turn = 3, world: unknown = undefined): ChannelProduceContext {
  return { world, events, blocks: [], turn, prevValue: undefined };
}

function ev(type: string, data: Record<string, unknown>): ISemanticEvent {
  return { id: `t_${type}`, type, timestamp: 0, entities: {}, data };
}

function worldWithStore(store: SceneStoreState | undefined): unknown {
  return {
    getCapability: () => undefined,
    getStateValue: (key: string) => (key === 'character.scenes' ? store : undefined),
  };
}

function storeWith(scenes: SceneStoreState['scenes']): SceneStoreState {
  return { nextSceneSeq: 2, scenes, mannerRotation: {} };
}

describe('sceneChannel (ADR-320 D12)', () => {
  it('is gated behind the authorChannels capability (AC11 isolation)', () => {
    // The isolation criterion lives HERE: a profile without the flag never
    // produces the channel, so a published story's stream cannot carry
    // scene internals beyond rendered prose.
    expect(sceneChannel.gatedBy).toBe('authorChannels');
  });

  it('is registered in the standard set under id "scene"', () => {
    expect(STANDARD_CHANNELS.some(c => c.id === 'scene')).toBe(true);
    expect(sceneChannel.mode).toBe('append');
    expect(sceneChannel.emit).toBe('sparse');
    expect(sceneChannel.contentType).toBe('json');
  });

  it('projects character.scene.* wire events and character.exchange.* lifecycle into rows', () => {
    const rows = sceneChannel.produce(makeCtx([
      ev('character.scene.utterance', {
        kind: 'utterance', sceneId: 's1', speakerId: 'nell', addresseeId: 'player',
        messageId: 'nell.greeting', beats: ['nell.wry'],
      }),
      ev('character.exchange.opened', { exchangeId: 'nell.the-offer', word: 'asks' }),
      ev('character.scene.intrusion_blocked', { sceneId: 's1', intruderId: 'player' }),
      ev('character.author.ledger_mint', { factId: 'x' }),  // interior rows ride `character`, not here
      ev('if.event.asked', { topic: 'the offer' }),          // not projected
    ], 7));

    expect(rows).toEqual([
      {
        turn: 7, kind: 'character.scene.utterance',
        data: {
          kind: 'utterance', sceneId: 's1', speakerId: 'nell', addresseeId: 'player',
          messageId: 'nell.greeting', beats: ['nell.wry'],
        },
      },
      { turn: 7, kind: 'character.exchange.opened', data: { exchangeId: 'nell.the-offer', word: 'asks' } },
      { turn: 7, kind: 'character.scene.intrusion_blocked', data: { sceneId: 's1', intruderId: 'player' } },
    ]);
  });

  it('emits nothing on turns without scene activity (sparse)', () => {
    expect(sceneChannel.produce(makeCtx([ev('if.event.taken', { item: 'lamp' })]))).toBeUndefined();
    expect(sceneChannel.produce(makeCtx([]))).toBeUndefined();
  });
});

describe('exchangeAffordancesChannel (ADR-320 D12)', () => {
  it('is gated behind the authorChannels capability (AC11 isolation)', () => {
    expect(exchangeAffordancesChannel.gatedBy).toBe('authorChannels');
  });

  it('is registered in the standard set under id "exchange-affordances"', () => {
    expect(STANDARD_CHANNELS.some(c => c.id === 'exchange-affordances')).toBe(true);
    expect(exchangeAffordancesChannel.mode).toBe('replace');
    expect(exchangeAffordancesChannel.emit).toBe('always');
  });

  it('projects every open exchange`s advertised responses from the scene store', () => {
    const world = worldWithStore(storeWith({
      s1: {
        id: 's1', participantIds: ['player', 'nell'], openedBy: { kind: 'address', openerId: 'player' },
        floorHolderId: 'nell', openedTurn: 2, lastMoveTurn: 6,
        openExchange: {
          exchangeId: 'nell.the-offer', speakerId: 'nell', openedTurn: 6,
          responses: [
            { kind: 'verbal', rowId: 'nell.the-offer#0', topic: { kind: 'text', primary: 'yes', aliases: ['fine'] } },
            { kind: 'act', rowId: 'nell.the-offer#1', actionId: 'gives' },
            { kind: 'silence' },
          ],
        },
      },
      s2: {
        id: 's2', participantIds: ['cook', 'maid'], openedBy: { kind: 'initiative', openerId: 'cook' },
        floorHolderId: null, openedTurn: 4, lastMoveTurn: 6,
        openExchange: null,   // no open exchange — advertises nothing
      },
    }));

    expect(exchangeAffordancesChannel.produce(makeCtx([], 7, world))).toEqual([
      {
        sceneId: 's1',
        exchangeId: 'nell.the-offer',
        responses: [
          { kind: 'verbal', rowId: 'nell.the-offer#0', topic: { kind: 'text', primary: 'yes', aliases: ['fine'] } },
          { kind: 'act', rowId: 'nell.the-offer#1', actionId: 'gives' },
          { kind: 'silence' },
        ],
      },
    ]);
  });

  it('emits the empty array when no exchange is open, so choices never go stale', () => {
    // Store never written (undefined) and store with exchange-less scenes
    // both advertise the empty set — replace-mode clears prior choices.
    expect(exchangeAffordancesChannel.produce(makeCtx([], 7, worldWithStore(undefined)))).toEqual([]);
    expect(exchangeAffordancesChannel.produce(makeCtx([], 7, worldWithStore(storeWith({}))))).toEqual([]);
  });

  it('emits nothing (not the empty array) when the world stub lacks state access', () => {
    expect(exchangeAffordancesChannel.produce(makeCtx([], 7, undefined))).toBeUndefined();
    expect(exchangeAffordancesChannel.produce(makeCtx([], 7, { getCapability: () => undefined }))).toBeUndefined();
  });
});
