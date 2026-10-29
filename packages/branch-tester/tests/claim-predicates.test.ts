/**
 * claim-predicates.test.ts — each of the seven predicates, read off a world
 * shaped to satisfy or miss it (ADR-365 D1).
 *
 * The world here is a hand-built reading surface, not an engine: the
 * predicates are pure reads, and the real-engine path for every kind is the
 * Fernhill test (`claims-fernhill.test.ts`), which this suite does not
 * replace. What it pins is the reading itself — which field each kind looks
 * at, and that a missing entity or a mismatched value reads as false rather
 * than throwing.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { clauseOccurrenceKey } from '@sharpee/story-loader';
import { claimHolds, clauseKeysByFiredOf, type ClaimContext } from '../src/claims/claim-predicates.js';
import { normalizeClaimSet, type Claim } from '../src/claims/claim-set.js';
import type { ClaimsEntity, ClaimsWorld } from '../src/claims/claims-game.js';

/** An entity with an IR id, a containing room, and trait records by type. */
function entity(id: string, irId: string, traits: Record<string, Record<string, unknown>> = {}): ClaimsEntity {
  return {
    id,
    name: irId,
    attributes: { chordIrId: irId },
    has: (type) => type in traits,
    get: (type) => traits[type],
  };
}

interface Shape {
  player?: string;
  /** entity id -> containing room entity id */
  rooms?: Record<string, string>;
  /** entity id -> direct location id */
  locations?: Record<string, string>;
  ending?: { kind: string; messageId?: string; cause?: string };
  state?: Record<string, unknown>;
  events?: Array<{ type: string; data?: unknown }>;
}

const ENTITIES: Record<string, ClaimsEntity> = {
  hall: entity('r1', 'hall'),
  landing: entity('r2', 'landing'),
  player: entity('p1', 'nobody'),
  note: entity('t1', 'note', { readable: { hasBeenRead: true } }),
  box: entity('t2', 'box', { openable: { isOpen: false } }),
};
const byId = new Map(Object.values(ENTITIES).map((e) => [e.id, e]));

function context(shape: Shape): ClaimContext {
  const world: ClaimsWorld = {
    getPlayer: () => ENTITIES.player,
    getEntity: (id) => byId.get(id),
    getAllEntities: () => [...byId.values()],
    getLocation: (id) => shape.locations?.[id] ?? shape.rooms?.[id],
    getContents: () => [],
    getContainingRoom: (id) => (shape.rooms?.[id] ? byId.get(shape.rooms[id]) : undefined),
    getVisible: () => [],
    getEnding: () => shape.ending,
    toJSON: () => '{}',
  };
  return {
    world,
    snapshot: { state: shape.state ?? {} },
    events: shape.events ?? [],
    entityIdByIr: new Map(Object.values(ENTITIES).map((e) => [e.name, e.id])),
    // The stopcock's `on the player turning` and its `after the player turning`, by their compiler ids (ADR-388 D2).
    clauseKeysByFired: new Map([['stopcock.turning', [clauseOccurrenceKey('stopcock.on-turning-by-player'), clauseOccurrenceKey('stopcock.after-turning-by-player')]]]),
  };
}

function claim(predicate: Record<string, unknown>): Claim {
  return normalizeClaimSet({ rooms: [], things: [], verbs: [], claims: [{ name: 'c', ...predicate }] }, 'test').claims[0];
}

describe('claimHolds — the seven predicates', () => {
  it('ending: the story has ended, narrowed by kind, message and cause when given', () => {
    const won = context({ ending: { kind: 'victory', messageId: 'the-deed', cause: undefined } });
    expect(claimHolds(claim({ ending: {} }), won)).toBe(true);
    expect(claimHolds(claim({ ending: { kind: 'victory' } }), won)).toBe(true);
    expect(claimHolds(claim({ ending: { kind: 'defeat' } }), won)).toBe(false);
    expect(claimHolds(claim({ ending: { messageId: 'the-deed' } }), won)).toBe(true);
    expect(claimHolds(claim({ ending: { messageId: 'other' } }), won)).toBe(false);
    expect(claimHolds(claim({ ending: { cause: 'fuse' } }), won)).toBe(false);
    expect(claimHolds(claim({ ending: {} }), context({}))).toBe(false);
  });

  it('room: the player is in the named room', () => {
    expect(claimHolds(claim({ room: 'landing' }), context({ rooms: { p1: 'r2' } }))).toBe(true);
    expect(claimHolds(claim({ room: 'hall' }), context({ rooms: { p1: 'r2' } }))).toBe(false);
    expect(claimHolds(claim({ room: 'hall' }), context({}))).toBe(false);
  });

  it('placement: `in` the player, `in` an entity directly or by room, `notIn` a room', () => {
    expect(claimHolds(claim({ placement: { thing: 'note', in: 'player' } }), context({ locations: { t1: 'p1' } }))).toBe(true);
    expect(claimHolds(claim({ placement: { thing: 'note', in: 'player' } }), context({ locations: { t1: 'r1' } }))).toBe(false);
    expect(claimHolds(claim({ placement: { thing: 'note', in: 'box' } }), context({ locations: { t1: 't2' } }))).toBe(true);
    expect(claimHolds(claim({ placement: { thing: 'note', in: 'hall' } }), context({ locations: { t1: 't2' }, rooms: { t1: 'r1' } }))).toBe(true);
    expect(claimHolds(claim({ placement: { thing: 'note', notIn: 'hall' } }), context({ rooms: { t1: 'r2' } }))).toBe(true);
    expect(claimHolds(claim({ placement: { thing: 'note', notIn: 'hall' } }), context({ rooms: { t1: 'r1' } }))).toBe(false);
    expect(claimHolds(claim({ placement: { thing: 'note', notIn: 'hall' } }), context({}))).toBe(false);
    expect(claimHolds(claim({ placement: { thing: 'ghost', in: 'player' } }), context({ locations: { t1: 'p1' } }))).toBe(false);
  });

  it('state: a Chord entity state, or the story state for `story`', () => {
    expect(claimHolds(claim({ state: { entity: 'box', value: 'locked' } }), context({ state: { 'chord.state.box': 'locked' } }))).toBe(true);
    expect(claimHolds(claim({ state: { entity: 'box', value: 'open' } }), context({ state: { 'chord.state.box': 'locked' } }))).toBe(false);
    expect(claimHolds(claim({ state: { entity: 'story', value: 'midnight' } }), context({ state: { 'chord.story.state': 'midnight' } }))).toBe(true);
    expect(claimHolds(claim({ state: { entity: 'story', value: 'midnight' } }), context({}))).toBe(false);
  });

  it('flag: a trait field, true by default, any value when given', () => {
    expect(claimHolds(claim({ flag: { thing: 'note', trait: 'readable', field: 'hasBeenRead' } }), context({}))).toBe(true);
    expect(claimHolds(claim({ flag: { thing: 'box', trait: 'openable', field: 'isOpen' } }), context({}))).toBe(false);
    expect(claimHolds(claim({ flag: { thing: 'box', trait: 'openable', field: 'isOpen', value: false } }), context({}))).toBe(true);
    expect(claimHolds(claim({ flag: { thing: 'box', trait: 'lockable', field: 'isLocked' } }), context({}))).toBe(false);
  });

  it('fired: one of the thing\'s own clauses for the action has a counter above zero, read by clause identity and never by substring', () => {
    expect(claimHolds(claim({ fired: 'stopcock.turning' }), context({ state: { [clauseOccurrenceKey('stopcock.on-turning-by-player')]: 1 } }))).toBe(true);
    expect(claimHolds(claim({ fired: 'stopcock.turning' }), context({ state: { [clauseOccurrenceKey('stopcock.after-turning-by-player')]: 2 } }))).toBe(true);
    expect(claimHolds(claim({ fired: 'stopcock.turning' }), context({ state: { [clauseOccurrenceKey('stopcock.on-turning-by-player')]: 0 } }))).toBe(false);
    // Another clause of the same thing, and a key that merely contains the text, are not this claim.
    expect(claimHolds(claim({ fired: 'stopcock.turning' }), context({ state: { [clauseOccurrenceKey('stopcock.on-pushing-by-player')]: 1 } }))).toBe(false);
    expect(claimHolds(claim({ fired: 'stopcock.turning' }), context({ state: { 'chord.state.stopcock.turning': 3 } }))).toBe(false);
    expect(claimHolds(claim({ fired: 'primer.pushing' }), context({ state: { [clauseOccurrenceKey('primer.on-pushing-by-player')]: 1 } }))).toBe(false);
  });

  it('event: the turn emitted the type, with the target entity and a topic substring when given', () => {
    const asked = context({ events: [{ type: 'if.event.asked', data: { targetId: 'p1', topic: 'The Folly' } }] });
    expect(claimHolds(claim({ event: { type: 'if.event.asked' } }), asked)).toBe(true);
    expect(claimHolds(claim({ event: { type: 'if.event.asked', target: 'nobody', topic: 'folly' } }), asked)).toBe(true);
    expect(claimHolds(claim({ event: { type: 'if.event.asked', target: 'note' } }), asked)).toBe(false);
    expect(claimHolds(claim({ event: { type: 'if.event.asked', topic: 'boiler' } }), asked)).toBe(false);
    expect(claimHolds(claim({ event: { type: 'if.event.told' } }), asked)).toBe(false);
    expect(claimHolds(claim({ event: { type: 'if.event.asked', target: 'ghost' } }), asked)).toBe(false);
  });
});

describe('clauseKeysByFiredOf — keys by the compiler id the loader writes at fire time (ADR-388 D2)', () => {
  it('two clauses on one action yield two distinct keys, and an identical head carries its #n', () => {
    const { ir, diagnostics } = compile(`story
  title: Keys
  authors:
    T
  id: keys
  story-version: 0.0.1

define phrases en-US
  a:
    A.

create the Hall
  a room

  A hall.

create the stopcock
  a thing
  in the Hall

  A stopcock.

  on the player turning
    phrase a
  end on

  after the player turning, once
    phrase a
  end after

  on every turn while the stopcock is here
    phrase a
  end on

  on every turn, once
    phrase a
  end on

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`);
    expect(diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const byFired = clauseKeysByFiredOf(ir);
    expect(byFired.get('stopcock.turning')).toEqual([
      clauseOccurrenceKey('stopcock.on-turning-by-player'),
      clauseOccurrenceKey('stopcock.after-turning-by-player'),
    ]);
    // Identical heads (legal only for every-turn and event verbs) carry their #n.
    expect(byFired.get('stopcock.every-turn')).toEqual([
      clauseOccurrenceKey('stopcock.on-every-turn#1'),
      clauseOccurrenceKey('stopcock.on-every-turn#2'),
    ]);
    // The same function the loader's firing sites call, over the same ids the IR carries.
    expect([...byFired.values()].flat()).toEqual(ir.entities.find((e) => e.id === 'stopcock')!.onClauses.map((c) => clauseOccurrenceKey(c.id)));
  });
});
