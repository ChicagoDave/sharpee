/**
 * timer-clause-gate.test.ts — GH #517 at the Reach layer: a gate whose only
 * exit is a `change` inside a `when <timer> expires` clause lifts when the
 * clause's owner is reachable, and stays blocked when it is not.
 *
 * Before the fix, `collectStateWriters` never walked entity `timerClauses`,
 * so this exact shape reported a permanently sealed gate — a false finding
 * ADR-321 D4's gate check exists to prevent. Proved in both directions, the
 * way `multi-arm-gates.test.ts` proves GH #315: the clean case lifts, and a
 * control with the same writer attributed to an unreachable owner still
 * blocks — so the assertion is on the walk finding the writer, not on the
 * gate check happening to pass regardless of it.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see GH #517, ADR-321 D4
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

const TIMER = `define timer bell for Tom
end timer
`;

const LIFTS = `story
  title: Timer Gate Lift
  authors:
    T
  id: timer-gate-lift
  story-version: 0.0.1

${TIMER}
create the Junction
  a room
  north to the Locked Room
  north is blocked while Tom is calm: locked-shut

  The junction.

create the Locked Room
  a room
  south to the Junction

  The locked room.

create Tom
  a person
  in the Junction
  states, reversible: calm, alert

  when bell expires
    change Tom to alert
  end when

  Tom.

create Alex
  a person
  playable
  starts in the Junction

  You.

before the game starts
  change the player to Alex
end before

define phrase locked-shut
  Shut.
end phrase
`;

const STAYS_BLOCKED = `story
  title: Timer Gate Stays Blocked
  authors:
    T
  id: timer-gate-stays-blocked
  story-version: 0.0.1

${TIMER}
create the Junction
  a room
  north to the Locked Room
  north is blocked while Tom is calm: locked-shut
  east to the Vault
  east is blocked: vault-shut

  The junction.

create the Locked Room
  a room
  south to the Junction

  The locked room.

create the Vault
  a room
  west to the Junction

  The vault.

create Tom
  a person
  in the Vault
  states, reversible: calm, alert

  when bell expires
    change Tom to alert
  end when

  Tom.

create Alex
  a person
  playable
  starts in the Junction

  You.

before the game starts
  change the player to Alex
end before

define phrase locked-shut
  Shut.
end phrase

define phrase vault-shut
  Shut.
end phrase
`;

describe('GH #517 — a timer-clause writer opens a gate on its reachable owner', () => {
  it('lifts the gate: the timer clause writes Tom out of `calm`, and Tom is reachable', () => {
    const reach = deriveReach(compileSource(LIFTS));
    expect(reach.rooms.unreached).toEqual([]);
    expect(reach.blocked).toEqual([]);
  });

  it('control: the same writer, on an owner the player can never reach, leaves the gate blocked', () => {
    const reach = deriveReach(compileSource(STAYS_BLOCKED));
    expect(reach.rooms.unreached).toContain('locked-room');
    expect(reach.rooms.unreached).toContain('vault');
    const northBlock = reach.blocked.find((block) => block.direction === 'north');
    expect(northBlock).toMatchObject({ direction: 'north', obstacle: 'gate' });
  });
});
