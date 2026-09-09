/**
 * One enrichment funnel (ADR-334 D4): `enrichTurnEvents` stamps a batch
 * from its source and applies perception when configured.
 *
 * The action funnel and the plugin funnel were two copies; this pins the
 * one function's contract — the transaction id each source produces, the
 * defaults filled in, an existing stamp left alone, and perception
 * filtering applied only when a service is supplied. `processEvent`'s
 * own stamping rules stay pinned by `adr-296-transaction-stamping.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import type { IPerceptionService } from '@sharpee/stdlib';
import { enrichTurnEvents, transactionIdFor } from '../../src/turn/turn-event-processor';

function makeEvent(type: string, data?: Record<string, unknown>, entities: ISemanticEvent['entities'] = {}): ISemanticEvent {
  return { id: `e-${type}`, type, timestamp: 1, entities, data };
}

const base = { turn: 4, playerId: 'player', locationId: 'hall' };

describe('transactionIdFor', () => {
  it('names the action transaction and each plugin batch by its id', () => {
    expect(transactionIdFor(4, { kind: 'action' })).toBe('txn:4:action');
    expect(transactionIdFor(4, { kind: 'plugin', pluginId: 'npc' })).toBe('txn:4:plugin:npc');
  });
});

describe('enrichTurnEvents', () => {
  it('stamps every event of an action batch with the action transaction, creating data when absent', () => {
    const out = enrichTurnEvents([makeEvent('if.event.taken', { itemId: 'lamp' }), makeEvent('game.message')], { kind: 'action' }, base);
    expect(out.map((e) => (e.data as Record<string, unknown>)._transactionId)).toEqual(['txn:4:action', 'txn:4:action']);
    expect((out[0].data as Record<string, unknown>).turn).toBe(4);
  });

  it('stamps a plugin batch with that plugin’s transaction', () => {
    const out = enrichTurnEvents([makeEvent('npc.moved', {})], { kind: 'plugin', pluginId: 'npc' }, base);
    expect((out[0].data as Record<string, unknown>)._transactionId).toBe('txn:4:plugin:npc');
  });

  it('leaves an inherited transaction stamp alone', () => {
    const out = enrichTurnEvents([makeEvent('if.event.chained', { _transactionId: 'txn:3:action' })], { kind: 'action' }, base);
    expect((out[0].data as Record<string, unknown>)._transactionId).toBe('txn:3:action');
  });

  it('fills the player and their location as defaults and never mutates the input', () => {
    const input = makeEvent('if.event.taken', {});
    const [out] = enrichTurnEvents([input], { kind: 'action' }, base);
    expect(out.entities).toEqual({ actor: 'player', location: 'hall' });
    expect(input.entities).toEqual({});
    expect(input.data).toEqual({});
  });

  it('applies perception filtering only when a service is supplied', () => {
    const events = [makeEvent('if.event.room.description', {}), makeEvent('action.failure', {})];
    const unfiltered = enrichTurnEvents(events, { kind: 'action' }, base);
    expect(unfiltered.map((e) => e.type)).toEqual(['if.event.room.description', 'action.failure']);

    const service = {
      filterEvents: (batch: ISemanticEvent[]) => batch.filter((e) => e.type !== 'if.event.room.description')
    } as unknown as IPerceptionService;
    const filtered = enrichTurnEvents(events, { kind: 'action' }, {
      ...base,
      perception: { service, player: {} as IFEntity, world: {} as WorldModel }
    });
    expect(filtered.map((e) => e.type)).toEqual(['action.failure']);
    expect((filtered[0].data as Record<string, unknown>)._transactionId).toBe('txn:4:action');
  });
});
