/**
 * compile-gate-sweep.test.ts — platform-issue-sweep Phase 8: the compile-gate
 * family. Four of the five gaps close in this package (the fifth — bare-verb
 * dispatch grammar, #13 — is loader-owned; see story-loader's tests):
 *
 *  - #6  `analysis.door-plain-mirror`: a plain exit mirroring a door-wired
 *        reverse side is a compile error (it would silently unwire the door
 *        at load).
 *  - #14 inline `phrase` prose is legal in EVERY body context — including
 *        the story-header `on every turn` clause bodies and `define machine`
 *        state bodies, the two contexts that silently rejected it.
 *  - #15c `parse.refuse-order`: `refuse <key> when <condition>` (misordered)
 *        is an error with a fix-it, never a silent unconditional refuse.
 *  - #15d `analysis.deadly-while-unsupported`: `is deadly while <condition>`
 *        fails at COMPILE (expect-fail-manifest pinnable), not load.
 *
 * Follows doors.test.ts's house pattern: real parse → analyze pipeline,
 * assertions on specific diagnostic codes, never just "compile failed".
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

describe('plain mirror of a door exit (#6, analysis.door-plain-mirror)', () => {
  const base = `story "Doors" by "T"
  id: doors
  version: 0.0.1

create the Kitchen
  a room
  north to the Hall through the oak door

  A kitchen.

create the oak door
  a door

  An oak door.

create the player
  starts in the Kitchen

  You.
`;

  it('rejects a plain exit whose reverse side is door-wired', () => {
    const source = `${base}
create the Hall
  a room
  south to the Kitchen

  A hall.
`;
    expect(errorCodes(source)).toContain('analysis.door-plain-mirror');
  });

  it('accepts the named-door mirror and the one-sided form', () => {
    const mirrored = `${base}
create the Hall
  a room
  south to the Kitchen through the oak door

  A hall.
`;
    expect(errorCodes(mirrored)).toEqual([]);

    const oneSided = `${base}
create the Hall
  a room

  A hall.
`;
    expect(errorCodes(oneSided)).toEqual([]);
  });

  it('does not flag a plain exit in a non-mirroring direction', () => {
    const source = `${base}
create the Hall
  a room
  east to the Kitchen

  A hall.
`;
    // east from the Hall is not the reverse of the Kitchen's door-wired
    // north — no clobber, no diagnostic from this gate.
    expect(errorCodes(source)).not.toContain('analysis.door-plain-mirror');
  });
});

describe('inline phrase prose in every body context (#14)', () => {
  it('accepts inline prose in a story-header `on every turn` clause body', () => {
    const source = `story "Wind" by "T"
  id: wind
  version: 0.0.1
  on every turn
    phrase wind-howls
      The wind howls through the gate.
  end on

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  You.
`;
    expect(errorCodes(source)).toEqual([]);
  });

  it('accepts inline prose in `define machine` state bodies', () => {
    const source = `story "Bridge" by "T"
  id: bridge
  version: 0.0.1
  states: calm, stormy
  use state-machines

create the Gatehouse
  a room

  A gatehouse.

create the rusty winch
  in the Gatehouse

  A winch.

create the player
  starts in the Gatehouse

  You.

define machine drawbridge
  role winch is the rusty winch
  starts raised

  state raised
    when turning the winch: lowering

  state lowering
    on enter
      phrase chains-groan
        The chains groan and pay out.
    end on
    when stormy: lowered

  state lowered, terminal
    on exit
      phrase bridge-thuds
        The bridge thuds home.
    end on
end machine
`;
    expect(errorCodes(source)).toEqual([]);
  });
});

describe('misordered refuse (#15c, parse.refuse-order)', () => {
  const withAction = (refusalLine: string) => `story "Pets" by "T"
  id: pets
  version: 0.0.1
  states: calm, raining

create the Hall
  a room

  A hall.

create the goat
  in the Hall

  A goat.

create the player
  starts in the Hall

  You.

define action pet
  grammar
    pet :animal
  ${refusalLine}
  phrase petted

define phrase petted
  You pet it.
end phrase

define phrase no-petting
  No petting now.
end phrase
`;

  it('rejects `refuse <key> when <condition>` with the fix-it error', () => {
    const result = compile(withAction('refuse no-petting when raining'));
    const codes = result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes).toContain('parse.refuse-order');
    const message = result.diagnostics.find((d) => d.code === 'parse.refuse-order')!.message;
    expect(message).toContain('refuse when <condition>: no-petting');
  });

  it('accepts the correct order `refuse when <condition>: <key>`', () => {
    expect(errorCodes(withAction('refuse when raining: no-petting'))).toEqual([]);
  });
});

describe('conditional deadly exit (#15d, analysis.deadly-while-unsupported)', () => {
  const withDeadly = (line: string) => `story "Cliff" by "T"
  id: cliff
  version: 0.0.1
  states: calm, stormy

create the Ledge
  a room
  ${line}

  A ledge.

create the player
  starts in the Ledge

  You.

define phrase fall-death
  You fall.
end phrase
`;

  it('rejects `is deadly while <condition>` at COMPILE time', () => {
    expect(errorCodes(withDeadly('north is deadly while stormy: fall-death')))
      .toContain('analysis.deadly-while-unsupported');
  });

  it('accepts the unconditional `is deadly:` form', () => {
    expect(errorCodes(withDeadly('north is deadly: fall-death'))).toEqual([]);
  });
});
