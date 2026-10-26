/**
 * pushed-one-writer.test.ts — a press is written once, by
 * `SwitchableBehavior` in the pushing action (alignment-fixes D10). The
 * standard handlers no longer mirror a `pushed` event's predicted `newState`
 * onto the switch, so an outcome changed after execute is not overwritten
 * by the event.
 *
 * Owner context: event-processor test suite.
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { EventProcessor } from '../../src/processor';
import { registerStandardHandlers } from '../../src/handlers';
import { WorldModel, EntityType, SwitchableTrait, TraitType } from '@sharpee/world-model';
import { IFEvents } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

describe('a pushed event does not write the switch (D10)', () => {
  let world: WorldModel;
  let processor: EventProcessor;

  beforeEach(() => {
    world = new WorldModel();
    processor = new EventProcessor(world);
    world.connectEventProcessor({
      registerHandler: (eventType, handler) => {
        processor.registerHandler(eventType, (event) => handler(event) as any);
      }
    });
    registerStandardHandlers(world);
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
