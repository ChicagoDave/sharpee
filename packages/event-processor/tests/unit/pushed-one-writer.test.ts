/**
 * pushed-one-writer.test.ts — a press is written once, by
 * `SwitchableBehavior` in the pushing action. Processing a `pushed` event
 * does not mirror its predicted `newState` onto the switch, so an outcome
 * changed after execute is not overwritten by the event.
 *
 * Owner context: event-processor test suite.
 *
 * References:
 * - alignment-fixes D10 — the press has one writer.
 * - tests/unit/opened-closed-one-writer.test.ts — the same rule for isOpen.
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { EventProcessor } from '../../src/processor';
import type { Effect } from '../../src/effects';
import { WorldModel, EntityType, SwitchableTrait, TraitType } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

describe('a pushed event does not write the switch (D10)', () => {
  let world: WorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    world = new WorldModel();
    processor = new EventProcessor(world);
    // The wiring the engine performs: world-level handlers reach the processor.
    world.connectEventProcessor({
      registerHandler: (eventType, handler) => {
        processor.registerHandler(eventType, (event) => handler(event) as Effect[]);
      }
    });
  });

  it('leaves isOn as the behavior left it, whatever the event predicted', () => {
    const button = world.createEntity('button', EntityType.ITEM);
    button.add(new SwitchableTrait({ isOn: false }));

    const event: ISemanticEvent = {
      id: 'evt-push-1',
      type: IFEvents.PUSHED,
      timestamp: 1,
      entities: { target: button.id },
      data: { willToggle: true, newState: true }
    };
    processor.processEvents([event]);

    expect((button.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(false);
  });
});
