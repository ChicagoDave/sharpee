/**
 * Regression test for ISSUE #155 — region boundary (and all
 * world.registerEventHandler) handlers fire twice per event.
 *
 * Root cause: EventProcessor.processSingleEvent invokes a registered
 * handler through BOTH paths:
 *   1. world.applyEvent()  -> WorldEventSystem invokes eventHandlers Map directly
 *   2. invokeEntityHandlers -> the SAME handler, wired into storyHandlers by
 *      connectEventProcessor (ADR-086)
 *
 * Per ADR-086 the EventProcessor is the single source of truth; applyEvent
 * must NOT also dispatch. This test wires WorldModel <-> EventProcessor exactly
 * as GameEngine does and asserts a handler fires once per processed event.
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { WorldModel } from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';

describe('registered handler dispatch (ISSUE #155)', () => {
  let world: WorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    world = new WorldModel();
    processor = new EventProcessor(world);

    // Mirror GameEngine constructor wiring (ADR-086).
    world.connectEventProcessor({
      registerHandler: (eventType, handler) => {
        processor.registerHandler(eventType, (event) => handler(event) as any);
      }
    });
  });

  it('invokes a registerEventHandler handler exactly once per event', () => {
    let calls = 0;
    world.registerEventHandler('if.event.region_entered', () => {
      calls++;
    });

    const event: ISemanticEvent = {
      id: 'evt-region-1',
      type: 'if.event.region_entered',
      timestamp: 1,
      entities: {},
      data: { regionId: 'reg-staff' }
    };

    processor.processEvents([event]);

    expect(calls).toBe(1);
  });
});
