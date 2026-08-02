/**
 * Tests for transaction stamping at the engine's two funnels (ADR-296 D1).
 *
 * Unit level: `processEvent` stamps `data._transactionId` from the
 * enrichment context — creating the data object for data-less events
 * (v2 finding 5 regression guard), never overwriting an existing id
 * (idempotent over executeChains inheritance), and never stamping when
 * the context carries no transaction id (unstamped-and-proud sources).
 *
 * Integration level (direct funnel test, v2 finding 8): a multi-plugin
 * turn produces distinct, correctly-shaped ids per source, and a chained
 * phrase produced during command execution carries BOTH its Phase 1
 * `_narrativeSlot` stamp and its Phase 2 `_transactionId` stamp.
 */

import { processEvent } from '../../src/turn-event-processor';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import type { ISemanticEvent } from '@sharpee/core';
import type { TurnPluginContext } from '@sharpee/plugins';

function makeEvent(
  type: string,
  data: Record<string, unknown> | undefined
): ISemanticEvent {
  return {
    id: `test-${type}-${Math.random().toString(36).slice(2)}`,
    type,
    entities: {},
    data,
    timestamp: Date.now()
  };
}

describe('processEvent transaction stamping (ADR-296 D1)', () => {
  const context = {
    turn: 3,
    playerId: 'player',
    locationId: 'room1',
    transactionId: 'txn:3:action'
  };

  it('stamps _transactionId onto an event whose data lacks one', () => {
    const processed = processEvent(makeEvent('if.event.taken', { itemId: 'lamp' }), context);

    expect((processed.data as Record<string, unknown>)._transactionId).toBe('txn:3:action');
    // Pre-existing data survives alongside the stamp.
    expect((processed.data as Record<string, unknown>).itemId).toBe('lamp');
  });

  it('creates the data object for a data-less event (corrected enrichment guard)', () => {
    const processed = processEvent(makeEvent('if.event.waited', undefined), context);

    expect(processed.data).toBeDefined();
    expect((processed.data as Record<string, unknown>)._transactionId).toBe('txn:3:action');
  });

  it('never overwrites an existing _transactionId (idempotent over chain inheritance)', () => {
    const processed = processEvent(
      makeEvent('game.message', { messageId: 'm', _transactionId: 'txn:2:action' }),
      context
    );

    expect((processed.data as Record<string, unknown>)._transactionId).toBe('txn:2:action');
  });

  it('does not stamp when the context carries no transactionId', () => {
    const processed = processEvent(
      makeEvent('sound.audibility.heard', { soundId: 's1' }),
      { turn: 3, playerId: 'player', locationId: 'room1' }
    );

    expect((processed.data as Record<string, unknown>)._transactionId).toBeUndefined();
  });
});

describe('funnel stamping in a live turn (ADR-296 D1, direct funnel test)', () => {
  it('action events and each plugin batch carry distinct, correctly-shaped transaction ids', async () => {
    const { engine } = setupTestEngine();

    const npcEvent = makeEvent('if.event.npc_acted', { npcId: 'troll' });
    const schedulerEvent = makeEvent('if.event.daemon_ticked', { daemonId: 'lantern' });

    engine.getPluginRegistry().register({
      id: 'test.npc',
      priority: 100,
      onAfterAction: (_ctx: TurnPluginContext) => [npcEvent]
    });
    engine.getPluginRegistry().register({
      id: 'test.scheduler',
      priority: 50,
      onAfterAction: (_ctx: TurnPluginContext) => [schedulerEvent]
    });

    // The enriched (stamped) stream is what the funnels emit through the
    // event source — TurnResult.events carries the executor's
    // pre-enrichment batch, so subscribe and collect.
    const enriched: ISemanticEvent[] = [];
    engine.getEventSource().subscribe(e => enriched.push(e));

    engine.start();
    try {
      const result = await engine.executeTurn('look');
      expect(result.success).toBe(true);

      // Action events: every stamped event in the action batch shares the
      // action transaction id.
      const actionEvents = enriched.filter(
        e => e.type === 'if.event.looked' || e.type === 'if.event.room.description'
      );
      expect(actionEvents.length).toBeGreaterThan(0);
      for (const e of actionEvents) {
        expect((e.data as Record<string, unknown>)._transactionId).toBe(
          `txn:${result.turn}:action`
        );
      }

      // Plugin batches: each carries its own plugin-scoped id, distinct
      // from the action id and from each other.
      const npcProcessed = enriched.find(e => e.type === 'if.event.npc_acted');
      const schedProcessed = enriched.find(e => e.type === 'if.event.daemon_ticked');
      expect(npcProcessed).toBeDefined();
      expect(schedProcessed).toBeDefined();
      expect((npcProcessed!.data as Record<string, unknown>)._transactionId).toBe(
        `txn:${result.turn}:plugin:test.npc`
      );
      expect((schedProcessed!.data as Record<string, unknown>)._transactionId).toBe(
        `txn:${result.turn}:plugin:test.scheduler`
      );
    } finally {
      engine.stop();
    }
  });

  it('a chained phrase produced during command execution carries both stamps (Phases 1+2 together)', async () => {
    const { engine, world } = setupTestEngine();

    // ADR-094's trap shape: a chain off an action event returning a phrase.
    world.chainEvent('if.event.looked', () => ({
      type: 'game.message',
      data: { messageId: 'test.trap.snaps' }
    }), { key: 'test.trap', slot: 'afterRoomDescription' });

    const enriched: ISemanticEvent[] = [];
    engine.getEventSource().subscribe(e => enriched.push(e));

    engine.start();
    try {
      const result = await engine.executeTurn('look');
      expect(result.success).toBe(true);

      const phrase = enriched.find(
        e => (e.data as Record<string, unknown> | undefined)?.messageId === 'test.trap.snaps'
      );
      expect(phrase).toBeDefined();
      const data = phrase!.data as Record<string, unknown>;
      // Phase 1 stamp: declared slot, stamped at chain dispatch.
      expect(data._narrativeSlot).toBe('afterRoomDescription');
      // Phase 2 stamp: the action funnel's transaction id (the chain ran
      // before the funnel, off an unstamped trigger, so the funnel stamp
      // is what lands).
      expect(data._transactionId).toBe(`txn:${result.turn}:action`);
      // Still standalone: the trigger gained no injected messageId (D4).
      const trigger = enriched.find(e => e.type === 'if.event.looked');
      expect(trigger).toBeDefined();
      expect((trigger!.data as Record<string, unknown>).messageId).toBeUndefined();
    } finally {
      engine.stop();
    }
  });
});
