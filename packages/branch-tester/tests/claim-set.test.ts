/**
 * claim-set.test.ts — the claims model's load-time gate and grouping
 * (ADR-365 D1, D2; AC-4a).
 *
 * A malformed declaration is refused with a message that names the claim
 * and the key at fault, and nothing else is consulted — no story is given
 * here, so a gate that reached for one could not pass. Claims sharing an
 * effective set share one walk; a claim's own `needs` replaces the keys it
 * names and inherits the rest.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { groupClaimsBySet, normalizeClaimSet } from '../src/claims/claim-set.js';

const SET = { rooms: ['hall'], things: ['note'], verbs: ['read'] };
const declare = (claims: unknown) => ({ ...SET, claims });

describe('AC-4a — a malformed claim is refused by name before any walk', () => {
  it('a nameless claim', () => {
    expect(() => normalizeClaimSet(declare([{ room: 'hall' }]), 'fixture')).toThrow(/claim 0 needs a "name"/);
  });

  it('a claim with no predicate', () => {
    expect(() => normalizeClaimSet(declare([{ name: 'says nothing' }]), 'fixture'))
      .toThrow(/claim "says nothing" needs exactly one of ending, room, placement, state, flag, fired, event/);
  });

  it('a claim with two predicates', () => {
    expect(() => normalizeClaimSet(declare([{ name: 'says two things', room: 'hall', fired: 'reading' }]), 'fixture'))
      .toThrow(/claim "says two things" needs exactly one of/);
  });

  it('a need that is not a list', () => {
    expect(() => normalizeClaimSet(declare([{ name: 'loose needs', room: 'hall', needs: { rooms: 'hall' } }]), 'fixture'))
      .toThrow(/claim "loose needs" needs\.rooms must be an array/);
  });

  it('a predicate with the wrong inner shape names the claim and the key', () => {
    expect(() => normalizeClaimSet(declare([{ name: 'where', placement: { thing: 'note' } }]), 'fixture'))
      .toThrow(/claim "where" placement needs exactly one of "in", "notIn"/);
    expect(() => normalizeClaimSet(declare([{ name: 'which', state: { entity: 'note' } }]), 'fixture'))
      .toThrow(/claim "which" state needs a string "value"/);
    expect(() => normalizeClaimSet(declare([{ name: 'what', flag: { thing: 'note', trait: 'readable' } }]), 'fixture'))
      .toThrow(/claim "what" flag needs a string "field"/);
    expect(() => normalizeClaimSet(declare([{ name: 'when', event: {} }]), 'fixture'))
      .toThrow(/claim "when" event needs a string "type"/);
  });

  it('the declared set itself must be three lists', () => {
    expect(() => normalizeClaimSet({ rooms: 'hall', things: [], verbs: [] }, 'fixture')).toThrow(/"rooms" must be an array/);
    expect(() => normalizeClaimSet({ rooms: [], things: [], verbs: [1] }, 'fixture')).toThrow(/"verbs"\[0\] must be a string/);
  });

  it('the message names the source, never a story', () => {
    expect(() => normalizeClaimSet(declare([{ name: 'x' }]), 'tests/claims.chord')).toThrow(/^claims \(tests\/claims\.chord\): /);
  });
});

describe('D2 — claims and their sets', () => {
  it('a claim without needs inherits the declared set; one with needs replaces only the keys it names', () => {
    const claimSet = normalizeClaimSet(declare([
      { name: 'inherits', room: 'hall' },
      { name: 'narrows', room: 'hall', needs: { things: [] } },
    ]), 'fixture');
    expect(claimSet.claims[0].set).toEqual(SET);
    expect(claimSet.claims[0].ownSet).toBe(false);
    expect(claimSet.claims[1].set).toEqual({ rooms: ['hall'], things: [], verbs: ['read'] });
    expect(claimSet.claims[1].ownSet).toBe(true);
  });

  it('the predicate is kept by kind, never defaulting', () => {
    const claimSet = normalizeClaimSet(declare([
      { name: 'ends', ending: { kind: 'victory' }, never: true },
      { name: 'fired', fired: 'stopcock.turning' },
    ]), 'fixture');
    expect(claimSet.claims[0].predicate).toEqual({ kind: 'ending', ending: { kind: 'victory', messageId: undefined, cause: undefined } });
    expect(claimSet.claims[0].never).toBe(true);
    expect(claimSet.claims[1].predicate).toEqual({ kind: 'fired', fired: 'stopcock.turning' });
    expect(claimSet.claims[1].never).toBe(false);
  });

  it('claims with the same effective set share one group, in first-declared order', () => {
    const claimSet = normalizeClaimSet(declare([
      { name: 'a', room: 'hall' },
      { name: 'b', room: 'hall', needs: { things: [] } },
      { name: 'c', room: 'hall' },
      { name: 'd', room: 'hall', needs: { things: [] } },
    ]), 'fixture');
    const groups = groupClaimsBySet(claimSet);
    expect(groups.map((group) => [group.label, group.claims.map((claim) => claim.name)])).toEqual([
      ['the declared set', ['a', 'c']],
      ['the set of "b"', ['b', 'd']],
    ]);
  });

  it('a set with no claims is one group with nothing to settle', () => {
    const groups = groupClaimsBySet(normalizeClaimSet(SET, 'fixture'));
    expect(groups).toEqual([{ label: 'the declared set', set: SET, claims: [] }]);
  });
});
