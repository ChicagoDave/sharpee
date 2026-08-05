/**
 * composeProse / joinProseEntries — the ONE rule for projecting a turn
 * packet's prose to text.
 *
 * The join half exists because two consumers (the headless bootstrap harness
 * and the browser client's IDE recording bridge) each carried their own copy
 * and silently diverged on paragraph boundaries — the bridge joined every
 * entry with '\n' while the harness used '\n\n' for non-tight entries.
 * ADR-282's blessed verbatim assertions are captured through one and replayed
 * through the other, so a two-paragraph response failed on its first headless
 * run.
 *
 * The compose half exists because ADR-300 D8 dissolved `main`: a turn's prose
 * is now spread across seven channels and only `preferred-layout` says what
 * order it reads in.
 *
 * @see ADR-300 — Addressable Channels and the Canonical Transcript, D8/D9
 * @see ADR-282 — Play-to-test, D2 and its 2026-07-28 amendment
 */

import { describe, it, expect } from 'vitest';
import { composeProse, joinProseEntries, packetProseText } from '../src/utils/prose.js';

describe('joinProseEntries', () => {
  it('separates ordinary entries with a blank line', () => {
    const text = joinProseEntries([
      { content: ['The cellar door hangs open.'] },
      { content: ['A lantern rests on the step.'] },
    ]);

    // The blank line is the whole point: normalizeOutput preserves it, so a
    // single '\n' here would fail every multi-paragraph blessed assertion.
    expect(text).toBe('The cellar door hangs open.\n\nA lantern rests on the step.');
  });

  it('continues a tight entry on the next line instead', () => {
    const text = joinProseEntries([
      { content: ['Score: 10'] },
      { content: ['Turns: 4'], tight: true },
    ]);

    expect(text).toBe('Score: 10\nTurns: 4');
  });

  it('mixes tight and loose entries in one packet', () => {
    const text = joinProseEntries([
      { content: ['First.'] },
      { content: ['Still first.'], tight: true },
      { content: ['Second.'] },
    ]);

    expect(text).toBe('First.\nStill first.\n\nSecond.');
  });

  it('accepts the legacy bare TextContent[] entry shape', () => {
    expect(joinProseEntries([['Legacy.'], ['Shape.']])).toBe('Legacy.\n\nShape.');
  });

  it('strips decoration wrappers but keeps their inner text', () => {
    const text = joinProseEntries([
      { content: ['She said ', { name: 'emphasis', content: ['take it'] }, '.'] },
    ]);

    expect(text).toBe('She said take it.');
  });

  it('skips blank entries without leaving a stray separator', () => {
    const text = joinProseEntries([
      { content: ['Real.'] },
      { content: ['   '] },
      { content: ['Also real.'] },
    ]);

    expect(text).toBe('Real.\n\nAlso real.');
  });

  it('returns empty string for nothing renderable', () => {
    expect(joinProseEntries([])).toBe('');
    expect(joinProseEntries([{ content: ['  '] }])).toBe('');
    expect(joinProseEntries(undefined)).toBe('');
    expect(joinProseEntries(null)).toBe('');
    expect(joinProseEntries('not an array')).toBe('');
  });

  it('skips malformed entries rather than throwing', () => {
    const text = joinProseEntries([
      { content: ['Good.'] },
      { notContent: true },
      42,
      { content: 'a string, not an array' },
      { content: ['Also good.'] },
    ]);

    expect(text).toBe('Good.\n\nAlso good.');
  });

  it('preserves content that would otherwise need fencing', () => {
    // ADR-287's fences exist for exactly these shapes; they must survive the
    // projection intact so the encoder sees what the player saw.
    const text = joinProseEntries([
      { content: ['[the lantern gutters]'] },
      { content: ['She said "take it" and would not look at you.'] },
    ]);

    expect(text).toBe('[the lantern gutters]\n\nShe said "take it" and would not look at you.');
  });
});

describe('composeProse', () => {
  const entry = (text: string) => ({ content: [text] });

  it('returns entries in preferred-layout order, not payload-key order', () => {
    // The interleaving a fixed render order gets wrong (ADR-300 D9): the
    // action result is emitted before the room name, and payload key order
    // ('room-name' first) disagrees with the engine's reading order.
    const composed = composeProse({
      'room-name': [entry('Cave')],
      'action-result': [entry('You go north.')],
      'preferred-layout': ['action-result', 'room-name'],
    });

    expect(composed).toEqual([entry('You go north.'), entry('Cave')]);
  });

  it('advances a per-channel cursor so a repeated id takes successive entries', () => {
    const composed = composeProse({
      'game-message': [entry('First.'), entry('Second.')],
      'room-name': [entry('Cave')],
      'preferred-layout': ['game-message', 'room-name', 'game-message'],
    });

    expect(composed).toEqual([entry('First.'), entry('Cave'), entry('Second.')]);
  });

  it('returns [] when the packet carries no layout', () => {
    expect(composeProse({ 'room-name': [entry('Cave')] })).toEqual([]);
  });

  it('returns [] for an empty layout — a turn that produced no prose', () => {
    expect(composeProse({ 'preferred-layout': [] })).toEqual([]);
  });

  it('returns [] for a non-object payload', () => {
    expect(composeProse(undefined)).toEqual([]);
    expect(composeProse(null)).toEqual([]);
    expect(composeProse('not a packet')).toEqual([]);
  });

  it('skips a position naming a channel absent from the payload', () => {
    // A subscription fact (the client was not sent that channel), not a
    // corrupt packet — the rest of the turn still reads.
    const composed = composeProse({
      'room-name': [entry('Cave')],
      'preferred-layout': ['error', 'room-name'],
    });

    expect(composed).toEqual([entry('Cave')]);
  });

  it('skips a position whose channel ran out of entries', () => {
    const composed = composeProse({
      'game-message': [entry('Only one.')],
      'preferred-layout': ['game-message', 'game-message'],
    });

    expect(composed).toEqual([entry('Only one.')]);
  });

  it('still advances the cursor for an absent channel, keeping later indices aligned', () => {
    const composed = composeProse({
      'game-message': [entry('First.'), entry('Second.')],
      'preferred-layout': ['game-message', 'error', 'game-message'],
    });

    expect(composed).toEqual([entry('First.'), entry('Second.')]);
  });
});

describe('packetProseText', () => {
  it('composes then joins — tight continues its predecessor across channels', () => {
    // `tight` refers to the entry before it in the COMPOSED sequence, which
    // after ADR-300 D8 routinely lives on a different channel. Joining one
    // channel's array on its own would read the flag against the wrong
    // predecessor.
    const text = packetProseText({
      'room-name': [{ content: ['Cave'] }],
      'room-description': [{ content: ['It is dark.'], tight: true }],
      'action-result': [{ content: ['You go north.'] }],
      'preferred-layout': ['action-result', 'room-name', 'room-description'],
    });

    expect(text).toBe('You go north.\n\nCave\nIt is dark.');
  });

  it('is empty for a turn that produced no prose', () => {
    expect(packetProseText({ 'preferred-layout': [] })).toBe('');
  });
});
