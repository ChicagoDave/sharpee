/**
 * adr-333-provenance-stamp.test.ts — ADR-333 D1 and D3 on the REAL path: a
 * Chord `phrase` fired by a player action reaches `text:output` as a block
 * whose `source.messageId` is the id the `chord.phrase` event named, and the
 * stdlib prose channels carry that stamp onto the wire entry unchanged.
 * No doubles: the loader's real binding, the real parser, language layer and
 * prose pipeline, `GameEngine.executeTurn`.
 *
 * Owner context: story-loader tests (ADR-333 Phase 1, AC-1 and AC-2's wire half).
 */
import { describe, expect, it } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ChannelProduceContext, ProseEntry } from '@sharpee/if-domain';
import { PROSE_CHANNELS } from '@sharpee/stdlib';
import { bootTurns, messageIdsOf } from './helpers/boot-turns';

const SOURCE = `story
  title: Provenance
  authors:
    T
  id: provenance
  story-version: 0.0.1

create the Alley
  a room

  A quiet alley.

create the apple
  in the Alley
  edible

  A red apple.

  on the player eating
    phrase apple-first-bite
      Crisp and delicious!
  end on

create Jack
  a person, playable
  in the Alley

  You.

before the game starts
  change the player to Jack
end before
`;

const textOf = (b: ITextBlock): string =>
  b.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('');

describe('ADR-333 D1 — the stamp on the real path', () => {
  it('the block a fired phrase renders to names the message the event carried', async () => {
    const booted = await bootTurns(SOURCE);
    const blocks: ITextBlock[] = [];
    booted.engine.on('text:output', (out) => blocks.push(...out));

    const events = await booted.turn('eat apple');

    // Inside an `on the player <verb>` clause the first phrase overrides the
    // action's own message (runtime.ts, postReport): the turn carries the
    // action's event with the phrase key as its messageId, not a separate
    // `chord.phrase` event. Take the id from whichever event names it.
    const eventId = messageIdsOf(events).find((m) => m.endsWith('apple-first-bite'));
    expect(eventId).toBeDefined();

    const bite = blocks.find((b) => textOf(b).includes('Crisp and delicious!'));
    expect(bite).toBeDefined();
    expect(bite!.source).toEqual({ messageId: eventId });

    // AC-2's wire half: the stdlib prose channels project the block to an
    // entry that still carries the stamp — the channel never drops it.
    const ctx: ChannelProduceContext = {
      world: booted.world,
      events,
      blocks,
      turn: 1,
      prevValue: undefined,
    };
    const entries: ProseEntry[] = [];
    for (const channel of PROSE_CHANNELS) {
      const produced = channel.produce(ctx);
      if (Array.isArray(produced)) entries.push(...(produced as ProseEntry[]));
    }
    const entry = entries.find((e) => e.content.join('').includes('Crisp and delicious!'));
    expect(entry).toBeDefined();
    expect(entry!.source).toEqual({ messageId: eventId });
  });
});
