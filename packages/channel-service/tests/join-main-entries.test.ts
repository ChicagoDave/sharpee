/**
 * joinMainEntries — the ONE rule for projecting a `main` packet to text.
 *
 * This exists because two consumers (the headless bootstrap harness and the
 * browser client's IDE recording bridge) each carried their own copy and
 * silently diverged on paragraph boundaries — the bridge joined every entry
 * with '\n' while the harness used '\n\n' for non-tight entries. ADR-282's
 * blessed verbatim assertions are captured through one and replayed through
 * the other, so a two-paragraph response failed on its first headless run.
 *
 * @see ADR-282 — Play-to-test, D2 and its 2026-07-28 amendment
 */

import { describe, it, expect } from 'vitest';
import { joinMainEntries } from '../src/utils/join-main-entries.js';

describe('joinMainEntries', () => {
  it('separates ordinary entries with a blank line', () => {
    const text = joinMainEntries([
      { content: ['The cellar door hangs open.'] },
      { content: ['A lantern rests on the step.'] },
    ]);

    // The blank line is the whole point: normalizeOutput preserves it, so a
    // single '\n' here would fail every multi-paragraph blessed assertion.
    expect(text).toBe('The cellar door hangs open.\n\nA lantern rests on the step.');
  });

  it('continues a tight entry on the next line instead', () => {
    const text = joinMainEntries([
      { content: ['Score: 10'] },
      { content: ['Turns: 4'], tight: true },
    ]);

    expect(text).toBe('Score: 10\nTurns: 4');
  });

  it('mixes tight and loose entries in one packet', () => {
    const text = joinMainEntries([
      { content: ['First.'] },
      { content: ['Still first.'], tight: true },
      { content: ['Second.'] },
    ]);

    expect(text).toBe('First.\nStill first.\n\nSecond.');
  });

  it('accepts the legacy bare TextContent[] entry shape', () => {
    expect(joinMainEntries([['Legacy.'], ['Shape.']])).toBe('Legacy.\n\nShape.');
  });

  it('strips decoration wrappers but keeps their inner text', () => {
    const text = joinMainEntries([
      { content: ['She said ', { name: 'emphasis', content: ['take it'] }, '.'] },
    ]);

    expect(text).toBe('She said take it.');
  });

  it('skips blank entries without leaving a stray separator', () => {
    const text = joinMainEntries([
      { content: ['Real.'] },
      { content: ['   '] },
      { content: ['Also real.'] },
    ]);

    expect(text).toBe('Real.\n\nAlso real.');
  });

  it('returns empty string for nothing renderable', () => {
    expect(joinMainEntries([])).toBe('');
    expect(joinMainEntries([{ content: ['  '] }])).toBe('');
    expect(joinMainEntries(undefined)).toBe('');
    expect(joinMainEntries(null)).toBe('');
    expect(joinMainEntries('not an array')).toBe('');
  });

  it('skips malformed entries rather than throwing', () => {
    const text = joinMainEntries([
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
    const text = joinMainEntries([
      { content: ['[the lantern gutters]'] },
      { content: ['She said "take it" and would not look at you.'] },
    ]);

    expect(text).toBe('[the lantern gutters]\n\nShe said "take it" and would not look at you.');
  });
});
