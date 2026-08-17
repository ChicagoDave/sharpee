/**
 * Tests for the `character` author channel (ADR-318 D11; ADR-310 D12).
 *
 * The closure is invoked with a hand-built ChannelProduceContext and the
 * rows asserted directly — same idiom as standard.test.ts.
 */

import { describe, expect, it } from 'vitest';
import type { ChannelProduceContext } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
import { characterAuthorChannel, STANDARD_CHANNELS } from '../../src/channels';

function makeCtx(events: ISemanticEvent[], turn = 3): ChannelProduceContext {
  return { world: undefined, events, blocks: [], turn, prevValue: undefined };
}

function ev(type: string, actor: string, data: Record<string, unknown>): ISemanticEvent {
  return { id: `t_${type}`, type, timestamp: 0, entities: { actor }, data };
}

describe('characterAuthorChannel (ADR-318 D11)', () => {
  it('is gated behind the authorChannels capability (ADR-310 D12 / Acceptance 8)', () => {
    // The isolation criterion lives HERE: a profile without the flag never
    // produces the channel, so a published story's stream cannot carry it.
    expect(characterAuthorChannel.gatedBy).toBe('authorChannels');
  });

  it('is registered in the standard set under id "character"', () => {
    expect(STANDARD_CHANNELS.some(c => c.id === 'character')).toBe(true);
    expect(characterAuthorChannel.mode).toBe('append');
    expect(characterAuthorChannel.emit).toBe('sparse');
    expect(characterAuthorChannel.contentType).toBe('json');
  });

  it('projects character.author.* bookkeeping and npc.character.* transitions into rows', () => {
    const rows = characterAuthorChannel.produce(makeCtx([
      ev('character.author.ledger_mint', 'steward', {
        audience: 'player', factId: 'the-killer', claimedValue: 'nobody', heldValue: 'the-master',
      }),
      ev('character.author.pressure_deposit', 'steward', {
        feed: 'pin:the-killer', value: 15, band: 'clear',
      }),
      ev('npc.character.mood_changed', 'vicar', { from: 'calm', to: 'nervous' }),
      ev('if.event.asked', 'player', { topic: 'the crime' }),   // not projected
      ev('character.propagation.witnessed', 'maid', {}),        // player-witnessed prose, not author rows
    ], 7));

    expect(rows).toEqual([
      {
        turn: 7, kind: 'character.author.ledger_mint', npcId: 'steward',
        data: { audience: 'player', factId: 'the-killer', claimedValue: 'nobody', heldValue: 'the-master' },
      },
      {
        turn: 7, kind: 'character.author.pressure_deposit', npcId: 'steward',
        data: { feed: 'pin:the-killer', value: 15, band: 'clear' },
      },
      {
        turn: 7, kind: 'npc.character.mood_changed', npcId: 'vicar',
        data: { from: 'calm', to: 'nervous' },
      },
    ]);
  });

  it('emits nothing on turns without character-model activity (sparse)', () => {
    expect(characterAuthorChannel.produce(makeCtx([
      ev('if.event.taken', 'player', { item: 'lamp' }),
    ]))).toBeUndefined();
    expect(characterAuthorChannel.produce(makeCtx([]))).toBeUndefined();
  });
});
