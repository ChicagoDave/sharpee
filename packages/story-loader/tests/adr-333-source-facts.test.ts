/**
 * adr-333-source-facts.test.ts — ADR-333 D1 as amended 2026-09-06, on the
 * REAL path: the reply to `ask <person> about <topic>` reaches `text:output`
 * as a block whose `source` carries, beside the platform message id, the
 * facts the asked event carried — who was asked (world id and name) and
 * about what — and the stdlib prose channels carry those facts onto the
 * wire entry unchanged. No doubles: the loader, the real parser, language
 * layer, prose pipeline and `GameEngine.executeTurn`.
 *
 * Owner context: story-loader tests (the platform half of the topic-row
 * play-to-write round; the IDE half reads these facts off the paragraph).
 */
import { describe, expect, it } from 'vitest';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { ChannelProduceContext, ProseEntry } from '@sharpee/if-domain';
import { PROSE_CHANNELS } from '@sharpee/stdlib';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Facts
  authors:
    T
  id: facts
  story-version: 0.0.1

create the Market
  a room

  A market.

create the gems stallkeeper
  a person
  in the Market

  A stallkeeper behind a tray of glass.

create Jack
  a person, playable
  in the Market

  You.

before the game starts
  change the player to Jack
end before
`;

const textOf = (b: ITextBlock): string =>
  b.content.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('');

describe('ADR-333 D1 as amended — the facts beside the stamp, real path', () => {
  it('an unknown-topic reply names who was asked and about what, on the block and on the wire', async () => {
    const booted = await bootTurns(SOURCE);
    const blocks: ITextBlock[] = [];
    booted.engine.on('text:output', (out) => blocks.push(...out));

    const events = await booted.turn('ask stallkeeper about gems');

    const reply = blocks.find((b) => textOf(b).includes("I don't know anything about that"));
    expect(reply, 'the platform default replied').toBeDefined();
    expect(reply!.source).toMatchObject({
      messageId: 'if.action.asking.unknown_topic',
      facts: {
        targetId: booted.story.entityId('gems-stallkeeper'),
        targetName: 'gems stallkeeper',
        topic: 'gems',
      },
    });
    // No bookkeeping rides along.
    expect(Object.keys(reply!.source!.facts!).some((k) => k.startsWith('_') || k === 'turn')).toBe(false);

    const ctx: ChannelProduceContext = { world: booted.world, events, blocks, turn: 1, prevValue: undefined };
    const entries = PROSE_CHANNELS.flatMap((ch) => (ch.produce(ctx) ?? []) as ProseEntry[]);
    const entry = entries.find((e) => e.source?.messageId === 'if.action.asking.unknown_topic');
    expect(entry?.source?.facts).toMatchObject({ targetName: 'gems stallkeeper', topic: 'gems' });
  });
});
