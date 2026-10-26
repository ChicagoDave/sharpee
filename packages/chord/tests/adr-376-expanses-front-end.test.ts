/**
 * adr-376-expanses-front-end.test.ts — ADR-376's declaration surface on the
 * chord side (Chord 4.0 Phase 13, Slice 1): `use expanses`, the `expanse`
 * kind with `size:` and `landmarks`, `movement: open` with `stride:`,
 * `sight:` and `seen from afar:`, the `in <expanse> at <x>, <y>` placement,
 * `floats`, `visibility:`, `drift:`, the edges, and `sight:` on a landmark
 * room and an instrument — parsed, analyzed and lowered to IR. Every case
 * asserts an IR field or a specific diagnostic code; every diagnostic the
 * record names for these lines has a case here (AC-2).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRVehicle, StoryIR } from '../src/ir';

const HEADER = `story
  title: The Belt
  authors:
    T
  id: the-belt
  story-version: 0.0.1
  use expanses
`;

const HEADER_NO_USE = HEADER.replace('  use expanses\n', '');

const PLAYER = `
create Alex
  a person
  playable
  starts in the Mining Platform

  You.

before the game starts
  change the player to Alex
end before
`;

const BELT = `
create the Belt
  an expanse
  size: 20 by 20
  aka belt, void

  Black, and the slow tumble of rock against it.

  landmarks
    the Mining Platform: 3, 3
    the Derelict: 14, 9
  end landmarks
`;

const SKIFF = `
create the skiff
  a vehicle, openable
  in the Belt at 3, 4
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark
  aka craft

  A skiff.
`;

const LANDMARKS = `
create the Mining Platform
  a room
  seen from afar: a cluster of lights on a lopsided rock

  A platform.

create the Derelict
  a room
  seen from afar: a long dead hull, turning slowly end over end

  A hull.
`;

const story = (...parts: string[]): string => HEADER + PLAYER + parts.join('');
const storyNoUse = (...parts: string[]): string => HEADER_NO_USE + PLAYER + parts.join('');

function errorCodes(source: string): string[] {
  return compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
}

function compiled(source: string): StoryIR {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  expect(errors.map((d) => `${d.code}: ${d.message}`)).toEqual([]);
  return result.ir!;
}

function entityOf(ir: StoryIR, id: string) {
  const entity = ir.entities.find((e) => e.id === id);
  expect(entity, id).toBeDefined();
  return entity!;
}

function vehicleOf(ir: StoryIR, id: string): IRVehicle {
  return entityOf(ir, id).vehicle!;
}

describe('the Belt and the skiff lower to IR (D2, D3, D6)', () => {
  it('an expanse carries its size and landmark rows; a landmark room its distant prose', () => {
    const ir = compiled(story(BELT, SKIFF, LANDMARKS));
    const belt = entityOf(ir, 'belt');
    expect(belt.kinds.map((k) => k.name)).toEqual(['expanse']);
    expect(belt.expanse).toEqual({
      width: 20,
      height: 20,
      landmarks: [
        { room: 'mining-platform', x: 3, y: 3 },
        { room: 'derelict', x: 14, y: 9 },
      ],
    });
    expect(entityOf(ir, 'mining-platform').seenFromAfar).toBe('a cluster of lights on a lopsided rock');
    expect(entityOf(ir, 'derelict').seenFromAfar).toBe('a long dead hull, turning slowly end over end');
  });

  it('an open vehicle carries pace, stride, sight, distant prose and its coordinates', () => {
    const ir = compiled(story(BELT, SKIFF, LANDMARKS));
    expect(vehicleOf(ir, 'skiff')).toEqual({
      movement: 'open',
      carries: 'in',
      drive: 'player',
      commands: ['compass', 'coordinates'],
      pace: 1,
      stride: 1,
      sight: 6,
      seenFromAfar: 'a glint of hull against the dark',
    });
    expect(entityOf(ir, 'skiff').placement).toMatchObject({ relation: 'in', place: 'belt', at: { x: 3, y: 4 } });
  });

  it('`stride: 2 units`, `drive: control` and the compass set alone are the row\'s', () => {
    const ir = compiled(story(BELT, SKIFF.replace('drive: player\n  commands: compass, coordinates\n', 'drive: control\n').replace('stride: 1 unit', 'stride: 2 units'), LANDMARKS));
    expect(vehicleOf(ir, 'skiff')).toMatchObject({ drive: 'control', stride: 2 });
    expect(vehicleOf(ir, 'skiff').commands).toBeUndefined();
  });
});

const OCEAN = `
create the Western Ocean
  an expanse
  size: 1000 by 500
  visibility: 80
  drift: 1 unit every 3 turns
  north is blocked: ice-fields
  west is blocked: storm-wall

  Grey swells to every horizon.

  landmarks
    Port Royal: 40, 250
    the Azores: 610, 300
  end landmarks

create the Marigold
  a vehicle, openable, transparent
  in the Western Ocean at 40, 251
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 10 units
  sight: 30
  seen from afar: three masts and a press of grey canvas

  A barque.

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore
  sight: 20

  A port.

create the Azores
  a room
  seen from afar: a line of blue peaks standing out of the sea

  Islands.

create the brass telescope
  a thing
  in the Marigold
  sight: 75

  A telescope.

create the cask of rum
  a thing, floats
  in the Western Ocean at 300, 260
  aka cask, rum

  A tarred cask, riding low.

define phrase ice-fields
  Ice.
end phrase

define phrase storm-wall
  Storm.
end phrase
`;

const OCEAN_PLAYER = PLAYER.replace('starts in the Mining Platform', 'starts in Port Royal');

describe('the Western Ocean (D6, D8, D10)', () => {
  it('visibility, drift, the edges as blocked exits, an outlook, an instrument and a floating thing all lower', () => {
    const ir = compiled(HEADER + OCEAN_PLAYER + OCEAN);
    const ocean = entityOf(ir, 'western-ocean');
    expect(ocean.expanse).toMatchObject({ width: 1000, height: 500, visibility: 80, drift: 3 });
    expect(ocean.blockedExits.map((b) => [b.direction, b.phraseKey, b.condition])).toEqual([
      ['north', 'ice-fields', null],
      ['west', 'storm-wall', null],
    ]);
    expect(entityOf(ir, 'port-royal').sight).toBe(20);
    expect(entityOf(ir, 'azores').sight).toBeUndefined();
    expect(entityOf(ir, 'brass-telescope').sight).toBe(75);
    const cask = entityOf(ir, 'cask-of-rum');
    expect(cask.traits.map((t) => t.name)).toContain('floats');
    expect(cask.placement).toMatchObject({ place: 'western-ocean', at: { x: 300, y: 260 } });
    expect(vehicleOf(ir, 'marigold')).toMatchObject({ stride: 10, sight: 30 });
  });
});

describe('`use expanses` gates every word (D1)', () => {
  it('`an expanse`, `movement: open`, the lines and the placement tail each name the use line', () => {
    const codes = errorCodes(storyNoUse(BELT, SKIFF, LANDMARKS));
    expect(codes).toContain('analysis.expanses-needs-use');
    expect(codes).not.toContain('analysis.unknown-kind-noun');
  });

  it('a lone `sight:` on a room without the use line is the same error', () => {
    const src = storyNoUse(`
create the Mining Platform
  a room
  sight: 5

  A platform.
`);
    expect(errorCodes(src)).toContain('analysis.expanses-needs-use');
  });

  it('`floats` without the use line is the extension gate', () => {
    const src = storyNoUse(`
create the Mining Platform
  a room

  A platform.

create the cask
  a thing, floats
  in the Mining Platform

  A cask.
`);
    expect(errorCodes(src)).toContain('analysis.extension-not-used');
  });
});

describe('the expanse\'s own diagnostics (D2, D8)', () => {
  it('no `size:` is analysis.expanse-missing-size', () => {
    expect(errorCodes(story(BELT.replace('  size: 20 by 20\n', ''), SKIFF, LANDMARKS))).toContain('analysis.expanse-missing-size');
  });

  it('a landmark that is not a room is analysis.landmark-not-room', () => {
    const src = story(BELT.replace('the Derelict: 14, 9', 'the skiff: 14, 9'), SKIFF, LANDMARKS);
    expect(errorCodes(src)).toContain('analysis.landmark-not-room');
  });

  it('a landmark outside the size is analysis.landmark-outside-expanse', () => {
    expect(errorCodes(story(BELT.replace('the Derelict: 14, 9', 'the Derelict: 20, 9'), SKIFF, LANDMARKS))).toContain('analysis.landmark-outside-expanse');
  });

  it('a room placed twice is analysis.landmark-duplicate', () => {
    expect(errorCodes(story(BELT.replace('the Derelict: 14, 9', 'the Derelict: 14, 9\n    the Derelict: 2, 2'), SKIFF, LANDMARKS))).toContain('analysis.landmark-duplicate');
  });

  it('a row that is not `<room>: <x>, <y>` is parse.landmark-row', () => {
    expect(errorCodes(story(BELT.replace('the Derelict: 14, 9', 'the Derelict: north'), SKIFF, LANDMARKS))).toContain('parse.landmark-row');
  });

  it('`while` on an edge is analysis.edge-while; an exit or a non-side blocked line is analysis.expanse-exit', () => {
    expect(errorCodes(story(BELT.replace('  aka belt, void\n', '  aka belt, void\n  north is blocked while the skiff is under way: no-north\n'), SKIFF, LANDMARKS, '\ndefine phrase no-north\n  No.\nend phrase\n'))).toContain('analysis.edge-while');
    expect(errorCodes(story(BELT.replace('  aka belt, void\n', '  aka belt, void\n  up to the Derelict\n'), SKIFF, LANDMARKS))).toContain('analysis.expanse-exit');
    expect(errorCodes(story(BELT.replace('  aka belt, void\n', '  aka belt, void\n  up is blocked: no-up\n'), SKIFF, LANDMARKS, '\ndefine phrase no-up\n  No.\nend phrase\n'))).toContain('analysis.expanse-exit');
  });

  it('`size:`, `drift:` or a `landmarks` block off an expanse name the owner', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS.replace('  a room\n  seen from afar: a cluster', '  a room\n  size: 3 by 3\n  seen from afar: a cluster')))).toContain('analysis.expanse-line-owner');
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS.replace('  A platform.\n', '  A platform.\n\n  landmarks\n    the Derelict: 1, 1\n  end landmarks\n')))).toContain('analysis.landmarks-owner');
  });

  it('a `drift:` line of another shape is parse.vehicle-line', () => {
    expect(errorCodes(story(BELT.replace('  aka belt, void\n', '  aka belt, void\n  drift: 2 units every 3 turns\n'), SKIFF, LANDMARKS))).toContain('parse.vehicle-line');
  });
});

describe('sight and distant prose off the vehicle (D6)', () => {
  it('a landmark room without `seen from afar:` is analysis.missing-seen-from-afar', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS.replace('  seen from afar: a long dead hull, turning slowly end over end\n', '')))).toContain('analysis.missing-seen-from-afar');
  });

  it('`sight:` on a person is analysis.sight-owner; `seen from afar:` on a thing is analysis.seen-from-afar-owner', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate Bo\n  a person\n  in the Derelict\n  sight: 4\n\n  Bo.\n'))).toContain('analysis.sight-owner');
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate the rock\n  a thing\n  in the Derelict\n  seen from afar: a rock\n\n  A rock.\n'))).toContain('analysis.seen-from-afar-owner');
  });
});

describe('the open vehicle\'s diagnostics (D3)', () => {
  it('missing pace, stride, sight or distant prose each name the line', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('  pace: 1 turn\n', ''), LANDMARKS))).toContain('analysis.vehicle-missing-pace');
    expect(errorCodes(story(BELT, SKIFF.replace('  stride: 1 unit\n', ''), LANDMARKS))).toContain('analysis.open-missing-stride');
    expect(errorCodes(story(BELT, SKIFF.replace('  sight: 6\n', ''), LANDMARKS))).toContain('analysis.open-missing-sight');
    expect(errorCodes(story(BELT, SKIFF.replace('  seen from afar: a glint of hull against the dark\n', ''), LANDMARKS))).toContain('analysis.missing-seen-from-afar');
  });

  it('an open vehicle placed in a room is analysis.open-not-in-expanse', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('in the Belt at 3, 4', 'in the Derelict'), LANDMARKS))).toContain('analysis.open-not-in-expanse');
  });

  it('`destinations` is not a set of an open vehicle; `stops:` is not its line', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('commands: compass, coordinates', 'commands: destinations'), LANDMARKS))).toContain('analysis.commands-not-for-movement');
    expect(errorCodes(story(BELT, SKIFF.replace('  aka craft\n', '  aka craft\n  stops: the Derelict, the Mining Platform\n'), LANDMARKS))).toContain('analysis.vehicle-line-not-for-movement');
  });
});

describe('placements in an expanse (D2, D3, D10)', () => {
  it('a thing that does not float is analysis.expanse-not-open-vehicle, with or without coordinates', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate the rock\n  a thing\n  in the Belt at 5, 5\n\n  A rock.\n'))).toContain('analysis.expanse-not-open-vehicle');
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate the rock\n  a thing\n  in the Belt\n\n  A rock.\n'))).toContain('analysis.expanse-not-open-vehicle');
  });

  it('coordinates outside the size are analysis.coordinates-outside-expanse', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('in the Belt at 3, 4', 'in the Belt at 20, 4'), LANDMARKS))).toContain('analysis.coordinates-outside-expanse');
  });

  it('an open vehicle or a floating thing in an expanse without `at` is analysis.placement-missing-at', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('in the Belt at 3, 4', 'in the Belt'), LANDMARKS))).toContain('analysis.placement-missing-at');
  });

  it('`at` into a room is analysis.at-not-expanse', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate the cask\n  a thing, floats\n  in the Derelict at 1, 1\n\n  A cask.\n'))).toContain('analysis.at-not-expanse');
  });

  it('a floating thing in an expanse that does not drift is analysis.floats-without-drift', () => {
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ncreate the cask\n  a thing, floats\n  in the Belt at 5, 5\n\n  A cask.\n'))).toContain('analysis.floats-without-drift');
    const drifting = compiled(story(BELT.replace('  aka belt, void\n', '  aka belt, void\n  drift: 1 unit every 2 turns\n'), SKIFF, LANDMARKS, '\ncreate the cask\n  a thing, floats\n  in the Belt at 5, 5\n\n  A cask.\n'));
    expect(entityOf(drifting, 'cask').placement).toMatchObject({ place: 'belt', at: { x: 5, y: 5 } });
  });

  it('a malformed `at` tail is parse.placement-at', () => {
    expect(errorCodes(story(BELT, SKIFF.replace('in the Belt at 3, 4', 'in the Belt at 3'), LANDMARKS))).toContain('parse.placement-at');
  });
});

/** Every object in the IR whose `kind` is the one named, in document order. */
function findNodes(ir: StoryIR, kind: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (record['kind'] === kind) out.push(record);
      Object.values(record).forEach(walk);
    }
  };
  walk(ir);
  return out;
}

const CONTROLLED_SKIFF = SKIFF.replace('  drive: player\n  commands: compass, coordinates\n', '  drive: control\n');

/** A console in the Derelict whose clause body is the statement under test. */
const console = (body: string): string => `
create the console
  a thing, pushable
  in the Derelict

  A console.

  on the player pushing
${body}
  end on
`;

describe('`start … heading` on an open vehicle (D3)', () => {
  it('`start <vehicle> heading <direction>` is admitted under `drive: control` and refused under `drive: player`', () => {
    const ir = compiled(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    start the skiff heading east')));
    expect(findNodes(ir, 'vehicle-start')[0]).toMatchObject({ vehicle: { kind: 'entity', id: 'skiff' }, heading: 'east' });
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, console('    start the skiff heading east')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    start the skiff')))).toContain('analysis.vehicle-statement-not-for-movement');
  });
});

describe('`send` to coordinates or a landmark (D3)', () => {
  it('`send <vehicle> to <x>, <y>` lowers to a course; `to <landmark>` to the room', () => {
    const ir = compiled(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    send the skiff to 14, 9\n    send the skiff to the Derelict')));
    const sends = findNodes(ir, 'vehicle-send');
    expect(sends[0]).toMatchObject({ vehicle: { kind: 'entity', id: 'skiff' }, to: { kind: 'cell', x: 14, y: 9 } });
    expect(sends[1]).toMatchObject({ vehicle: { kind: 'entity', id: 'skiff' }, to: { kind: 'room', room: { kind: 'entity', id: 'derelict' } } });
  });

  it('a room that is not a landmark is analysis.not-a-destination; coordinates outside the size are refused', () => {
    expect(errorCodes(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    send the skiff to the Alley'), '\ncreate the Alley\n  a room\n\n  Too narrow.\n'))).toContain('analysis.not-a-destination');
    expect(errorCodes(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    send the skiff to 20, 9')))).toContain('analysis.coordinates-outside-expanse');
  });

  it('coordinates on a flight vehicle are analysis.vehicle-statement-not-for-movement; a malformed pair is parse.send', () => {
    const SPARROW = `
create the Sparrow
  a vehicle
  in the Mining Platform
  movement: flight
  drive: control
  destinations: the Mining Platform, the Derelict
  pace: 2 turns
  aboard: the Airlock
  boarded through: the Airlock

  A courier.

create the Airlock
  a room
  west to outside

  A closet.
`;
    expect(errorCodes(story(BELT, CONTROLLED_SKIFF, LANDMARKS, SPARROW, console('    send the Sparrow to 1, 1')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(BELT, CONTROLLED_SKIFF, LANDMARKS, console('    send the skiff to 14 9')))).toContain('parse.send');
  });
});

describe('the voyage reads (D7)', () => {
  it('`is in sight`, the three bands and `is within` lower, negated or not', () => {
    const ir = compiled(story(BELT, SKIFF, LANDMARKS, console([
      '    phrase seen when the Derelict is in sight',
      '    phrase near when the Derelict is close by',
      '    phrase far when the Derelict is not in the distance',
      '    phrase edge when the skiff is on the horizon',
      '    phrase close when the skiff is within 5 of the Derelict',
      '    phrase cell when the skiff is not within 2 of 14, 9',
    ].join('\n')), '\ndefine phrase seen\n  Seen.\nend phrase\ndefine phrase near\n  Near.\nend phrase\ndefine phrase far\n  Far.\nend phrase\ndefine phrase edge\n  Edge.\nend phrase\ndefine phrase close\n  Close.\nend phrase\ndefine phrase cell\n  Cell.\nend phrase\n'));
    expect(findNodes(ir, 'in-sight')).toEqual([{ kind: 'in-sight', thing: { kind: 'entity', id: 'derelict' } }]);
    const bands = findNodes(ir, 'sight-band');
    expect(bands).toEqual([
      { kind: 'sight-band', thing: { kind: 'entity', id: 'derelict' }, band: 'close-by' },
      { kind: 'sight-band', thing: { kind: 'entity', id: 'derelict' }, band: 'in-the-distance' },
      { kind: 'sight-band', thing: { kind: 'entity', id: 'skiff' }, band: 'on-the-horizon' },
    ]);
    const nots = findNodes(ir, 'not');
    expect(nots.some((n) => (n['operand'] as { kind: string }).kind === 'sight-band')).toBe(true);
    expect(findNodes(ir, 'vehicle-within')).toEqual([
      { kind: 'vehicle-within', vehicle: { kind: 'entity', id: 'skiff' }, distance: 5, of: { kind: 'entity', id: 'derelict' } },
      { kind: 'vehicle-within', vehicle: { kind: 'entity', id: 'skiff' }, distance: 2, of: { x: 14, y: 9 } },
    ]);
  });

  it('`is within` on a compass vehicle, a non-landmark point and a sight read without the use line are each refused', () => {
    const BOAT = '\ncreate the boat\n  a vehicle\n  in the Derelict\n  movement: compass\n  carries: in\n  drive: control\n  pace: 1 turn\n\n  A boat.\n';
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, BOAT, console('    phrase x when the boat is within 3 of the Derelict'), '\ndefine phrase x\n  X.\nend phrase\n'))).toContain('analysis.vehicle-condition-not-for-movement');
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, console('    phrase x when the skiff is within 3 of the console'), '\ndefine phrase x\n  X.\nend phrase\n'))).toContain('analysis.not-a-destination');
    const noUse = storyNoUse('\ncreate the Mining Platform\n  a room\n\n  A platform.\n\ncreate the rock\n  a thing\n  in the Mining Platform\n\n  A rock.\n', console('    phrase x when the rock is in sight').replace('in the Derelict', 'in the Mining Platform'), '\ndefine phrase x\n  X.\nend phrase\n');
    expect(errorCodes(noUse)).toContain('analysis.expanses-needs-use');
  });

  it('`set the <expanse>\'s visibility to <n>` lowers; a non-number is analysis.visibility-value', () => {
    const ir = compiled(story(BELT, SKIFF, LANDMARKS, console("    set the Belt's visibility to 5")));
    expect(findNodes(ir, 'expanse-visibility')).toEqual([expect.objectContaining({ kind: 'expanse-visibility', expanse: { kind: 'entity', id: 'belt' }, value: 5 })]);
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, console("    set the Belt's visibility to fog")))).toContain('analysis.visibility-value');
  });

  it('`when <thing> comes into sight` anchors a sequence step as the state `in sight`', () => {
    const ir = compiled(story(BELT, SKIFF, LANDMARKS, '\ndefine phrase land-ho\n  Land ho.\nend phrase\n\ndefine sequence landfall\n  when the Derelict comes into sight\n    phrase land-ho\nend sequence\n'));
    expect(ir.sequences[0].steps[0]).toMatchObject({ timing: 'becomes', anchor: { owner: 'derelict', state: 'in sight' } });
    expect(errorCodes(story(BELT, SKIFF, LANDMARKS, '\ndefine phrase land-ho\n  Land ho.\nend phrase\n\ndefine sequence landfall\n  when the Derelict comes into view\n    phrase land-ho\nend sequence\n'))).toContain('parse.sequence-anchor');
  });
});
