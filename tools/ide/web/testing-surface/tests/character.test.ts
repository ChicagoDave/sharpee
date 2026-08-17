/**
 * character.test.ts — the explain panel's projection (ADR-318 D11).
 *
 * Derived from the module's behavior: row extraction tolerates non-row
 * values; per-kind describers render the load-bearing fields; grouping is
 * per NPC in emission order with digest-name resolution; paralysis carries
 * the warn tone; unknown kinds fall back to an honest raw line.
 */

import { describe, expect, it } from 'vitest';
import { characterRowsOf, explainGroups, type CharacterRow } from '../src/character';

const row = (kind: string, data: Record<string, unknown>, npcId?: string): CharacterRow =>
  ({ turn: 3, kind, ...(npcId !== undefined ? { npcId } : {}), data });

describe('characterRowsOf', () => {
  it('extracts rows from the character capture, skipping non-row values', () => {
    const rows = characterRowsOf({
      character: [
        [{ turn: 2, kind: 'character.author.pin_held', npcId: 'a1', data: { factId: 'f' } }],
        'noise',
        [null, { kind: 42 }, { kind: 'npc.character.mood_changed', data: { from: 'calm', to: 'angry' } }],
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'character.author.pin_held', npcId: 'a1' });
    expect(rows[1]).toMatchObject({ kind: 'npc.character.mood_changed', turn: 0, data: { to: 'angry' } });
  });

  it('yields nothing when the channel is absent', () => {
    expect(characterRowsOf(undefined)).toEqual([]);
    expect(characterRowsOf({ 'room-name': ['Bar'] })).toEqual([]);
  });
});

describe('explainGroups', () => {
  const noName = () => undefined;

  it('groups rows per NPC in emission order and resolves names', () => {
    const groups = explainGroups([
      row('npc.character.mood_changed', { from: 'calm', to: 'fearful' }, 'a1'),
      row('character.author.pin_held', { audience: 'player', factId: 'the-killer', claimedValue: 'nobody' }, 'a2'),
      row('npc.character.threat_changed', { from: 'none', to: 'wary' }, 'a1'),
    ], (id) => (id === 'a1' ? 'Viola Wainright' : undefined));
    expect(groups.map((g) => g.npcLabel)).toEqual(['Viola Wainright', 'a2']);
    expect(groups[0].lines.map((l) => l.text)).toEqual([
      'mood calm → fearful',
      'threat none → wary',
    ]);
    expect(groups[1].lines[0].text)
      .toBe('pin held — maintains the-killer is nobody to the player');
  });

  it('renders the ledger and pressure describers from their real payloads', () => {
    const [group] = explainGroups([
      row('character.author.ledger_mint',
        { audience: 'player', factId: 'the-killer', claimedValue: 'nobody', heldValue: 'viola' }, 'a1'),
      row('character.author.pressure_deposit',
        { feed: 'pin:the-killer', value: 40, band: 'burdened', transition: { from: 'clear', to: 'burdened' } }, 'a1'),
      row('character.author.pressure_drain', { npcId: 'a1', goalId: 'confess', value: 0, band: 'clear' }, 'a1'),
      row('character.author.pin_released',
        { audience: 'player', factId: 'the-killer', claimedValue: 'nobody', heldValue: 'viola' }, 'a1'),
    ], noName);
    expect(group.lines.map((l) => l.text)).toEqual([
      'lie minted — claims the-killer is nobody (holds viola) to the player',
      'conscience deposit (pin:the-killer) — 40 (clear → burdened)',
      'conscience discharge (goal confess) — 0 (clear)',
      'pin released — the player got the truth about the-killer (was claiming nobody)',
    ]);
  });

  it('renders arbitration with winner, act, forces, and defeats', () => {
    const [group] = explainGroups([
      row('character.author.arbitration', {
        site: 'reveal', topic: 'the crime', winner: 'fear', act: 'refuse',
        readings: [{ force: 'fear', intensity: 0.7 }, { force: 'duty', intensity: 0.4 }],
        defeats: [{ force: 'duty', feed: 'never betrays a confidence' }],
        temperamentApplied: 'duty over fear',
      }, 'a1'),
    ], noName);
    expect(group.lines[0].text).toBe(
      'arbitration (reveal · the crime) — fear wins, refuse'
      + ' · forces: fear 0.7, duty 0.4'
      + ' · defeated: never betrays a confidence'
      + ' · temperament: duty over fear',
    );
  });

  it('marks paralysis warnings with the warn tone, naming both principles', () => {
    const [group] = explainGroups([
      row('character.author.paralysis_warning',
        { topic: 'the letter', principles: ['never lies', 'never betrays a confidence'] }, 'a1'),
    ], noName);
    expect(group.lines[0].tone).toBe('warn');
    expect(group.lines[0].text)
      .toBe('PARALYSIS on the letter — colliding principles: "never lies" vs "never betrays a confidence"');
  });

  it('renders witnessed acts from both payload shapes', () => {
    const [group] = explainGroups([
      row('character.author.act_witnessed', {
        acts: [{ act: 'harm', actorId: 'player', topic: 'the player harmed' }],
        learned: true,
      }, 'a1'),
      row('character.author.act_witnessed',
        { act: 'betray a confidence', topic: 'viola betrayed', learned: true }, 'a1'),
    ], noName);
    expect(group.lines.map((l) => l.text)).toEqual([
      'witnessed — the player harm (the player harmed)',
      'witnessed — betray a confidence (viola betrayed)',
    ]);
  });

  it('carries click-to-assert fragments — substrings of the row JSON pinning kind, NPC, and identity fields, never volatile ones', () => {
    const [group] = explainGroups([
      row('character.author.ledger_mint',
        { audience: 'a02', factId: 'killer', claimedValue: 'nobody', heldValue: 'viola-wainright' }, 'a05'),
      row('character.author.pressure_deposit',
        { feed: 'pin:killer', value: 15, band: 'clear' }, 'a05'),
    ], noName);
    expect(group.lines[0].fragments).toEqual([
      '"kind":"character.author.ledger_mint"',
      '"npcId":"a05"',
      '"factId":"killer"',
      '"claimedValue":"nobody"',
    ]);
    // Volatile fields stay out: no audience, no curve value, no turn.
    expect(group.lines[1].fragments).toEqual([
      '"kind":"character.author.pressure_deposit"',
      '"npcId":"a05"',
      '"feed":"pin:killer"',
    ]);
    // Every fragment is a literal substring of the row's JSON.stringify
    // rendering — the exact text the runner's channel `contains` checks.
    const rendered = JSON.stringify({
      turn: 3, kind: 'character.author.ledger_mint', npcId: 'a05',
      data: { audience: 'a02', factId: 'killer', claimedValue: 'nobody', heldValue: 'viola-wainright' },
    });
    for (const fragment of group.lines[0].fragments) {
      expect(rendered).toContain(fragment);
    }
  });

  it('labels unattributed rows "story" and falls back honestly on unknown kinds', () => {
    const groups = explainGroups([
      row('character.author.something_future', { x: 1 }),
    ], noName);
    expect(groups[0].npcLabel).toBe('story');
    expect(groups[0].lines[0].text).toBe('something_future {"x":1}');
    expect(groups[0].lines[0].raw).toBe('{"x":1}');
  });
});
