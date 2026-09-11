/**
 * Unit tests for `endStory` — the ADR-347 story-ending primitive.
 *
 * Asserts on the actual world Ending and the emitted blessed event, per the
 * Behavior Statement: DOES write the Ending and return the `story.victory` /
 * `story.defeat` event; REJECTS (writes nothing, emits nothing, returns
 * `undefined`) when the world already carries an Ending. The rejection test is
 * ADR-347 AC-4.
 */

import { describe, it, expect } from 'vitest';
import { StoryEndingEvents } from '@sharpee/if-domain';
import { WorldModel } from '@sharpee/world-model';
import { endStory } from '../../src/endings';

describe('endStory (ADR-347 D2c)', () => {
  it('records the Ending on the world and returns the blessed victory event', () => {
    const world = new WorldModel();
    // PRECONDITION: the story has not ended.
    expect(world.getEnding()).toBeUndefined();

    const event = endStory(world, 'victory', { turn: 12, messageId: 'won.phrase' });

    // POSTCONDITION: the world's Ending changed.
    expect(world.getEnding()).toEqual({ kind: 'victory', turn: 12, messageId: 'won.phrase' });

    expect(event).toBeDefined();
    expect(event!.type).toBe(StoryEndingEvents.VICTORY);
    expect(event!.data).toMatchObject({ ending: 'victory', endingMessageId: 'won.phrase' });
    // GH #274: the phrase key never rides as a top-level `messageId`, or the
    // ADR-097 domain-message handler prints the final paragraph a second time.
    expect((event!.data as Record<string, unknown>).messageId).toBeUndefined();
  });

  it('records a defeat with its cause and returns the defeat event', () => {
    const world = new WorldModel();

    const event = endStory(world, 'defeat', { turn: 5, cause: 'grue' });

    expect(world.getEnding()).toEqual({ kind: 'defeat', turn: 5, cause: 'grue' });
    expect(event!.type).toBe(StoryEndingEvents.DEFEAT);
    expect(event!.data).toMatchObject({ ending: 'defeat', cause: 'grue' });
  });

  it('records the turn even when it is zero — the declaring site always supplies one', () => {
    // `turn` is required (ADR-347 D2d): a headless Chord run has no engine
    // turn provider and `turnNow()` answers 0, which is a real answer, not
    // a missing one. Nothing may record an ending without saying when.
    const world = new WorldModel();

    endStory(world, 'victory', { turn: 0 });

    expect(world.getEnding()).toEqual({ kind: 'victory', turn: 0 });
  });

  it('AC-4: the first ending wins — a second call writes nothing, emits nothing, returns undefined', () => {
    const world = new WorldModel();
    const first = endStory(world, 'victory', { turn: 12, messageId: 'won.phrase' });
    expect(first).toBeDefined();

    const second = endStory(world, 'defeat', { turn: 13, cause: 'grue' });

    expect(second).toBeUndefined();
    // The first Ending is intact — kind, turn and message id all unchanged.
    expect(world.getEnding()).toEqual({ kind: 'victory', turn: 12, messageId: 'won.phrase' });
  });
});
