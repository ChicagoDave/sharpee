/**
 * opened-closed-one-writer.test.ts — `isOpen` is written once, by
 * `OpenableBehavior` in the opening and closing actions. Processing an
 * `opened` or `closed` event writes nothing: the event records the change,
 * and a story reaction that runs on it keeps the outcome it set.
 *
 * The events are fed in the order the actions' report phases emit them:
 * opening emits its primary event and then the bare one; closing emits the
 * bare one and then its primary event.
 *
 * Owner context: event-processor test suite.
 *
 * References:
 * - docs/work/archive/event-processor-one-writer/plan.md, Phase 2.
 * - tests/unit/pushed-one-writer.test.ts — the same rule for a press.
 */
import { describe, it, beforeEach, expect } from 'vitest';
import { EventProcessor } from '../../src/processor';
import type { Effect } from '../../src/effects';
import { WorldModel, EntityType, OpenableTrait, TraitType, type IFEntity } from '@sharpee/world-model';
import type { ISemanticEvent } from '@sharpee/core';

const BARE_OPENED = 'opened';
const BARE_CLOSED = 'closed';
const PRIMARY_OPENED = 'if.event.opened';
const PRIMARY_CLOSED = 'if.event.closed';

/** One event naming `target`, shaped as the action context builds it. */
function eventOf(type: string, target: IFEntity, order: number): ISemanticEvent {
  return {
    id: `evt-${type}-${order}`,
    type,
    timestamp: order,
    entities: { target: target.id },
    data: { targetId: target.id, targetName: target.name }
  };
}

describe('an opened or closed event does not write isOpen', () => {
  let world: WorldModel;
  let processor: EventProcessor;

  /** The box's openable trait; every assertion reads the live trait. */
  function openableOf(box: IFEntity): OpenableTrait {
    return box.get(TraitType.OPENABLE) as OpenableTrait;
  }

  function boxThatIs(isOpen: boolean): IFEntity {
    const box = world.createEntity('box', EntityType.ITEM);
    box.add(new OpenableTrait({ isOpen }));
    return box;
  }

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

  it('leaves a closed box closed when a bare opened event is processed', () => {
    const box = boxThatIs(false);

    processor.processEvents([eventOf(BARE_OPENED, box, 1)]);

    expect(openableOf(box).isOpen).toBe(false);
  });

  it('leaves an open box open when a bare closed event is processed', () => {
    const box = boxThatIs(true);

    processor.processEvents([eventOf(BARE_CLOSED, box, 1)]);

    expect(openableOf(box).isOpen).toBe(true);
  });

  it('keeps the box closed when a reaction to its opening closes it again', () => {
    const box = boxThatIs(false);
    // What the opening action's execute did, through the behavior.
    openableOf(box).isOpen = true;
    // A lid that springs shut: the story reacts to the opening.
    world.registerEventHandler(PRIMARY_OPENED, () => {
      openableOf(box).isOpen = false;
    });

    processor.processEvents([eventOf(PRIMARY_OPENED, box, 1), eventOf(BARE_OPENED, box, 2)]);

    expect(openableOf(box).isOpen).toBe(false);
  });

  it('keeps the box open when a reaction to its closing opens it again', () => {
    const box = boxThatIs(true);
    // What the closing action's execute did, through the behavior.
    openableOf(box).isOpen = false;
    // A lid that springs open: the story reacts to the closing.
    world.registerEventHandler(PRIMARY_CLOSED, () => {
      openableOf(box).isOpen = true;
    });

    processor.processEvents([eventOf(BARE_CLOSED, box, 1), eventOf(PRIMARY_CLOSED, box, 2)]);

    expect(openableOf(box).isOpen).toBe(true);
  });
});
