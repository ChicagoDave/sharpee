/**
 * handler-failure.test.ts — a story handler that throws is a failed reaction
 * to a fact the world has already applied. It lands in
 * `ProcessedEvents.failed` with the event and the reason (the contract field
 * for it), never on the console, so a caller can surface it — the executor
 * reports it as `command.failed`. Found 2026-08-29 (ADR-329 Phase 9b): the
 * loader's `runtime.*` diagnostics raised from a chain-fired clause vanished.
 *
 * Assertions are on the returned `ProcessedEvents` — what was applied, what
 * failed, and that a failing handler neither blocks the event nor the other
 * handlers on it.
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { WorldModel } from '@sharpee/world-model';
import { createMockWorld, MockWorldModel } from '../fixtures/mock-world';
import type { Effect } from '../../src/effects';
import type { SemanticEvent } from '@sharpee/core';

const event = (type: string, id: string): SemanticEvent => ({
  id,
  type,
  entities: { actor: 'player', target: 'thing1' },
  data: {},
  timestamp: Date.now(),
});

describe('EventProcessor — a throwing story handler is recorded, not logged', () => {
  let world: MockWorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    world = createMockWorld();
    processor = new EventProcessor(world as unknown as WorldModel);
  });

  it('records the event and the reason in `failed`; the event itself is still applied', () => {
    processor.registerHandler('if.event.actor_moved', () => {
      throw new Error('runtime.example: a handler refused');
    });
    const moved = event('if.event.actor_moved', 'moved-1');

    const result = processor.processEvents([moved]);

    expect(result.applied).toEqual([moved]);
    expect(result.failed).toEqual([{ event: moved, reason: 'runtime.example: a handler refused' }]);
  });

  it('the other handlers on the event still run, and their reactions still flow', () => {
    const reaction = event('game.message', 'reaction-1');
    processor.registerHandler('if.event.actor_moved', () => {
      throw new Error('first handler down');
    });
    processor.registerHandler('if.event.actor_moved', () => [{ type: 'emit', event: reaction } as Effect]);

    const result = processor.processEvents([event('if.event.actor_moved', 'moved-2')]);

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toBe('first handler down');
    expect(result.reactions.some((r) => r.id === 'reaction-1')).toBe(true);
  });

  it('a failure raised while processing a reaction is attributed to that reaction, and drained per event', () => {
    const reaction = event('game.message', 'reaction-2');
    processor.registerHandler('if.event.actor_moved', () => [{ type: 'emit', event: reaction } as Effect]);
    processor.registerHandler('game.message', () => {
      throw new Error('reaction handler down');
    });

    const result = processor.processEvents([event('if.event.actor_moved', 'moved-3')]);

    expect(result.failed).toEqual([{ event: reaction, reason: 'reaction handler down' }]);
    // Nothing lingers: a clean event afterwards reports no failures.
    expect(processor.processEvents([event('if.event.taken', 'taken-1')]).failed).toEqual([]);
  });
});
