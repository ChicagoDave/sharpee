/**
 * multi-arm-gates.test.ts — GH #315 at the Index layer: a direction carrying
 * several `is blocked` arms is analyzed against ALL of them, not the last one.
 *
 * The old gate index (`Map.set` per gate) kept only the final arm — a
 * holding-at-start first arm was invisible, so a gated edge read as unguarded
 * and its progression entities went unreported. Both directions proved: the
 * multi-arm edge is walked with its requires kept, and a condition-less arm
 * anywhere in the group still pins the edge permanently blocked.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import { deriveReach } from '../src/reach.js';

function compileSource(source: string) {
  const result = compile(source);
  const real = result.diagnostics.filter(
    (d) => d.code !== 'analysis.missing-ifid' && d.severity === 'error',
  );
  expect(real).toEqual([]);
  return result.ir;
}

const MULTI_ARM = `story
  title: Market Gates
  authors:
    T
  id: market-gates
  story-version: 0.0.1

create the Junction
  a room
  north to the Road
  north is blocked while the gate warden is watchful: north-deflected
  north is blocked while the gate warden is asleep: gates-locked

  The junction.

create the Road
  a room
  south to the Junction

  The road.

create the gate warden
  a person
  in the Junction
  states: watchful, bored, asleep

  The warden.

create the bell
  scenery
  in the Junction

  A bell.

  on pushing it
    change the gate warden to bored
  end on

create the player
  starts in the Junction

  You.

define phrase north-deflected
  Turned back.
end phrase

define phrase gates-locked
  Locked.
end phrase
`;

const FALLBACK_ARM = `story
  title: Shut Yard
  authors:
    T
  id: shut-yard
  story-version: 0.0.1
  states: calm, hunted

create the Junction
  a room
  east to the Yard
  east is blocked while calm: yard-roped
  east is blocked: yard-shut

  The junction.

create the Yard
  a room
  west to the Junction

  The yard.

create the player
  starts in the Junction

  You.

define phrase yard-roped
  Roped off.
end phrase

define phrase yard-shut
  Shut.
end phrase
`;

describe('GH #315 — the gate index holds every arm per edge', () => {
  it('walks a multi-arm edge through its holding first arm and keeps the gate on the progression chain', () => {
    const reach = deriveReach(compileSource(MULTI_ARM));

    // The watchful arm holds at start and is liftable (the bell bores the
    // warden), so the Road is reached THROUGH the gate — under last-wins the
    // asleep arm alone survived, did not hold at start, and the edge read as
    // unguarded: reachable, but with an empty lifted list and no progression.
    expect(reach.rooms.unreached).toEqual([]);
    expect(reach.blocked).toEqual([]);
    expect(reach.progression).toContain('gate-warden');
    const northLift = reach.lifted.find((o) => o.from === 'junction' && o.direction === 'north');
    expect(northLift?.requires).toContain('gate-warden');
  });

  it('a condition-less fallback arm pins the edge permanently blocked whatever precedes it', () => {
    const reach = deriveReach(compileSource(FALLBACK_ARM));

    expect(reach.rooms.unreached).toEqual(['yard']);
    expect(reach.blocked).toHaveLength(1);
    expect(reach.blocked[0]).toMatchObject({
      direction: 'east',
      obstacle: 'gate',
      reason: 'the exit is blocked with no condition that lifts it',
    });
  });
});
