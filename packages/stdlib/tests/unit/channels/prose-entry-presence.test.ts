/**
 * prose-entry-presence.test.ts — the prose channels carry the ADR-328 D3
 * presence tag from block to wire. Every prose channel projects through one
 * `toProseEntry`, so one channel pins the shape for all seven: `presence`
 * and `location` ride when the block has them, and are absent (not
 * `undefined` keys) when it does not — a tagless block's entry stays
 * byte-identical to its pre-D3 shape.
 */
import { describe, it, expect } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import { gameMessageChannel } from '../../../src/channels/standard';

function produce(blocks: unknown[]): unknown[] {
  return gameMessageChannel.produce({ blocks } as unknown as ChannelProduceContext) as unknown[];
}

describe('prose channels carry the presence tag (ADR-328 D3)', () => {
  it('copies presence and location from a tagged block', () => {
    const entries = produce([
      { key: 'game.message', content: ['The owl hoots.'], presence: 'absent', location: 'r_barn' },
    ]);
    expect(entries).toEqual([{ content: ['The owl hoots.'], presence: 'absent', location: 'r_barn' }]);
  });

  it('emits no presence keys at all for an untagged block', () => {
    const entries = produce([{ key: 'game.message', content: ['You wait.'] }]);
    expect(entries).toEqual([{ content: ['You wait.'] }]);
    expect(Object.keys(entries[0] as object)).toEqual(['content']);
  });
});
