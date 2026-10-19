/**
 * adr-375-sailing-front-end.test.ts — ADR-375's declaration surface on the
 * chord side (Chord 4.0 Phase 13, Slice 5): `use sailing` on `use expanses`,
 * bearings in degrees, the `naval` set, `wind:`, the `sailing` block with and
 * without sails, `sails:` and `sails start:`, the wind and sails writes, and
 * the `in irons` and sails reads — parsed, analyzed and lowered to IR. Every
 * case asserts an IR field or a specific diagnostic code; every diagnostic
 * the record names has a case here (AC-2).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRVehicle, StoryIR } from '../src/ir';

const HEADER = `story
  title: The Sargasso
  authors:
    T
  id: the-sargasso
  story-version: 0.0.1
  use expanses
  use sailing
`;

const PLAYER = `
create Alex
  a person
  playable
  starts in Port Royal

  You.

before the game starts
  change the player to Alex
end before
`;

const SEA = `
create the Sargasso
  an expanse
  size: 40 by 40
  wind: from northeast
  aka sea, weed

  Weed-choked water under a sky the colour of pewter.

  landmarks
    Port Royal: 3, 4
    the Reef: 12, 30
  end landmarks

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore

  The port.

create the Reef
  a room
  seen from afar: a line of white where the swell breaks

  The reef.
`;

const SHIP = `
create the Marigold
  a vehicle, openable, transparent
  in the Sargasso at 3, 5
  movement: open
  carries: in
  drive: player
  commands: naval
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  aka ship, barque

  A barque.

  sailing
    0 to 44 degrees: stopped
    45 to 74 degrees: 4 turns
    75 to 119 degrees: 2 turns
    120 to 180 degrees: 1 turn
    calm: stopped
  end sailing
`;

const SHIP_WITH_SAILS = SHIP.replace('  aka ship, barque\n', '  aka ship, barque\n  sails: furled, reefed, full\n  sails start: furled\n').replace(
  `    0 to 44 degrees: stopped
    45 to 74 degrees: 4 turns
    75 to 119 degrees: 2 turns
    120 to 180 degrees: 1 turn`,
  `    0 to 44 degrees: furled stopped, reefed stopped, full stopped
    45 to 74 degrees: furled stopped, reefed 6 turns, full 4 turns
    75 to 119 degrees: furled stopped, reefed 3 turns, full 2 turns
    120 to 180 degrees: furled 6 turns, reefed 2 turns, full 1 turn`,
);

const CONTROLLED_SHIP = SHIP.replace('  drive: player\n  commands: naval\n', '  drive: control\n');

/** A weather glass in the ship whose clause body is the statement under test. */
const glass = (body: string): string => `
create the weather glass
  a thing, pushable
  in the Marigold

  A glass.

  on the player pushing
${body}
  end on
`;

const story = (...parts: string[]): string => HEADER + PLAYER + parts.join('');
const storyWithout = (line: string, ...parts: string[]): string => HEADER.replace(line, '') + PLAYER + parts.join('');

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

/** Every object in the IR whose `kind` is the one named, in document order. */
function findNodes(ir: StoryIR, kind: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (record['kind'] === kind) out.push(record);
      Object.values(record).forEach(walk);
    }
  };
  walk(ir);
  return out;
}

describe('the Sargasso and the Marigold lower to IR (D3, D4, D5)', () => {
  it('the wind is a bearing; the sailing block is the bands and the calm row, in place of pace; the naval set rides commands', () => {
    const ir = compiled(story(SEA, SHIP));
    expect(entityOf(ir, 'sargasso').expanse?.wind).toEqual({ bearing: 45 });
    const ship = vehicleOf(ir, 'marigold');
    expect(ship.commands).toEqual(['naval']);
    expect(ship.pace).toBeUndefined();
    expect(ship.sails).toBeUndefined();
    expect(ship.sailing).toEqual({
      bands: [
        { from: 0, to: 44, paces: [{ setting: null, pace: 'stopped' }] },
        { from: 45, to: 74, paces: [{ setting: null, pace: 4 }] },
        { from: 75, to: 119, paces: [{ setting: null, pace: 2 }] },
        { from: 120, to: 180, paces: [{ setting: null, pace: 1 }] },
      ],
      calm: 'stopped',
    });
  });

  it('a wind in degrees and a calm lower as written; the naval set may join the base sets', () => {
    const ir = compiled(story(SEA.replace('wind: from northeast', 'wind: from 300 degrees'), SHIP.replace('commands: naval', 'commands: naval, compass')));
    expect(entityOf(ir, 'sargasso').expanse?.wind).toEqual({ bearing: 300 });
    expect(vehicleOf(ir, 'marigold').commands).toEqual(['naval', 'compass']);
    const calm = compiled(story(SEA.replace('wind: from northeast', 'wind: calm'), SHIP));
    expect(entityOf(calm, 'sargasso').expanse?.wind).toBe('calm');
  });
});

describe('sails (D7)', () => {
  it('the settings and the start lower; each band names a pace per setting', () => {
    const ir = compiled(story(SEA, SHIP_WITH_SAILS));
    const ship = vehicleOf(ir, 'marigold');
    expect(ship.sails).toEqual({ settings: ['furled', 'reefed', 'full'], start: 'furled' });
    expect(ship.sailing?.bands[1]).toEqual({ from: 45, to: 74, paces: [{ setting: 'furled', pace: 'stopped' }, { setting: 'reefed', pace: 6 }, { setting: 'full', pace: 4 }] });
    expect(ship.sailing?.calm).toBe('stopped');
  });

  it('`sails start:` is required and names a declared setting; `sails:` needs a sailing block', () => {
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS.replace('  sails start: furled\n', '')))).toContain('analysis.sails-missing-start');
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS.replace('sails start: furled', 'sails start: bare')))).toContain('analysis.sails-unknown-setting');
    const noBlock = SHIP.replace(/  sailing\n[\s\S]*?  end sailing\n/, '  pace: 2 turns\n  sails: furled, full\n  sails start: furled\n');
    expect(errorCodes(story(SEA, noBlock))).toContain('analysis.sails-without-sailing');
  });

  it('a band that misses a setting, names an unknown one, or writes one pace with sails declared is analysis.sailing-row-missing-setting', () => {
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS.replace('furled stopped, reefed 6 turns, full 4 turns', 'furled stopped, full 4 turns')))).toContain('analysis.sailing-row-missing-setting');
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS.replace('furled stopped, reefed 6 turns, full 4 turns', 'furled stopped, reefed 6 turns, full 4 turns, bare 1 turn')))).toContain('analysis.sailing-row-missing-setting');
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS.replace('furled stopped, reefed 6 turns, full 4 turns', '4 turns')))).toContain('analysis.sailing-row-missing-setting');
    expect(errorCodes(story(SEA, SHIP.replace('45 to 74 degrees: 4 turns', '45 to 74 degrees: full 4 turns')))).toContain('analysis.sailing-row-missing-setting');
  });

  it('`set the <vehicle>\'s sails to <setting>` and `<vehicle>\'s sails are <setting>` lower; an unknown setting is refused', () => {
    const ir = compiled(story(SEA, SHIP_WITH_SAILS, glass("    set the Marigold's sails to full\n    phrase canvas when the Marigold's sails are not reefed"), '\ndefine phrase canvas\n  Canvas.\nend phrase\n'));
    expect(findNodes(ir, 'vehicle-sails').filter((n) => 'setting' in n && 'span' in n)[0]).toMatchObject({ vehicle: { kind: 'entity', id: 'marigold' }, setting: 'full' });
    const nots = findNodes(ir, 'not');
    expect(nots.some((n) => (n['operand'] as { kind: string; setting?: string }).kind === 'vehicle-sails' && (n['operand'] as { setting?: string }).setting === 'reefed')).toBe(true);
    expect(errorCodes(story(SEA, SHIP_WITH_SAILS, glass("    set the Marigold's sails to bare")))).toContain('analysis.sails-unknown-setting');
    expect(errorCodes(story(SEA, SHIP, glass("    set the Marigold's sails to full")))).toContain('analysis.sails-without-sailing');
  });
});

describe('the block\'s shape (D4, D5)', () => {
  it('both `pace:` and a block is analysis.sailing-and-pace; neither is analysis.vehicle-missing-pace', () => {
    expect(errorCodes(story(SEA, SHIP.replace('  stride: 1 unit\n', '  stride: 1 unit\n  pace: 2 turns\n')))).toContain('analysis.sailing-and-pace');
    expect(errorCodes(story(SEA, SHIP.replace(/  sailing\n[\s\S]*?  end sailing\n/, '')))).toContain('analysis.vehicle-missing-pace');
  });

  it('a gap, an overlap, and a missing calm row are each named', () => {
    expect(errorCodes(story(SEA, SHIP.replace('75 to 119 degrees: 2 turns\n', '')))).toContain('analysis.sailing-gap');
    expect(errorCodes(story(SEA, SHIP.replace('120 to 180 degrees: 1 turn', '120 to 170 degrees: 1 turn')))).toContain('analysis.sailing-gap');
    expect(errorCodes(story(SEA, SHIP.replace('75 to 119 degrees: 2 turns', '70 to 119 degrees: 2 turns')))).toContain('analysis.sailing-overlap');
    expect(errorCodes(story(SEA, SHIP.replace('    calm: stopped\n', '')))).toContain('analysis.sailing-no-calm');
  });

  it('a row of another shape is parse.sailing-row; a second block is parse.sailing-duplicate', () => {
    expect(errorCodes(story(SEA, SHIP.replace('45 to 74 degrees: 4 turns', '45 through 74: four turns')))).toContain('parse.sailing-row');
    expect(errorCodes(story(SEA, SHIP.replace('  end sailing\n', '  end sailing\n\n  sailing\n    calm: stopped\n  end sailing\n')))).toContain('parse.sailing-duplicate');
  });

  it('a sailing vehicle in an expanse without a wind is analysis.sailing-without-wind; a `wind:` line of another shape is parse.vehicle-line', () => {
    expect(errorCodes(story(SEA.replace('  wind: from northeast\n', ''), SHIP))).toContain('analysis.sailing-without-wind');
    expect(errorCodes(story(SEA.replace('wind: from northeast', 'wind: northeast'), SHIP))).toContain('parse.vehicle-line');
    expect(errorCodes(story(SEA.replace('wind: from northeast', 'wind: from 400 degrees'), SHIP))).toContain('parse.vehicle-line');
  });

  it('`set the <expanse>\'s wind to …` lowers each form; a malformed value is parse.set-wind', () => {
    const ir = compiled(story(SEA, SHIP, glass("    set the Sargasso's wind to southwest\n    set the Sargasso's wind to 10 degrees\n    set the Sargasso's wind to calm")));
    expect(findNodes(ir, 'expanse-wind').map((n) => n['wind'])).toEqual([{ bearing: 225 }, { bearing: 10 }, 'calm']);
    expect(errorCodes(story(SEA, SHIP, glass("    set the Sargasso's wind to gusty")))).toContain('parse.set-wind');
    expect(errorCodes(story(SEA, SHIP, glass("    set the Reef's wind to calm")))).toContain('analysis.sailing-not-open');
  });
});

describe('bearings and the reads (D2, D5)', () => {
  it('`start … heading 135 degrees` and `is heading 135 degrees` carry a bearing; a compass word keeps its direction', () => {
    const ir = compiled(story(SEA, CONTROLLED_SHIP, glass('    start the Marigold heading 135 degrees\n    phrase bound when the Marigold is heading 135 degrees\n    phrase north when the Marigold is heading north'), '\ndefine phrase bound\n  Bound.\nend phrase\ndefine phrase north\n  North.\nend phrase\n'));
    expect(findNodes(ir, 'vehicle-start')[0]).toMatchObject({ bearing: 135 });
    expect(findNodes(ir, 'vehicle-start')[0]).not.toHaveProperty('heading');
    const headings = findNodes(ir, 'vehicle-heading');
    expect(headings[0]).toMatchObject({ bearing: 135 });
    expect(headings[1]).toMatchObject({ direction: 'north' });
    expect(errorCodes(story(SEA, CONTROLLED_SHIP, glass('    start the Marigold heading 360 degrees')))).toContain('parse.heading-direction');
  });

  it('`is in irons` lowers on a sailing vehicle', () => {
    const ir = compiled(story(SEA, SHIP, glass('    phrase stuck when the Marigold is in irons'), '\ndefine phrase stuck\n  Stuck.\nend phrase\n'));
    expect(findNodes(ir, 'in-irons')).toEqual([{ kind: 'in-irons', vehicle: { kind: 'entity', id: 'marigold' } }]);
  });
});

describe('the gates (D1)', () => {
  it('`use sailing` without `use expanses` is analysis.sailing-needs-expanses', () => {
    expect(errorCodes(storyWithout('  use expanses\n', SEA, SHIP))).toContain('analysis.sailing-needs-expanses');
  });

  it('each sailing word without `use sailing` is analysis.sailing-needs-use', () => {
    const without = (...parts: string[]) => errorCodes(storyWithout('  use sailing\n', ...parts));
    expect(without(SEA, SHIP)).toContain('analysis.sailing-needs-use');
    expect(without(SEA.replace('  wind: from northeast\n', ''), SHIP.replace(/  sailing\n[\s\S]*?  end sailing\n/, '  pace: 1 turn\n'))).toContain('analysis.sailing-needs-use');
    expect(without(SEA.replace('  wind: from northeast\n', ''), SHIP.replace(/  sailing\n[\s\S]*?  end sailing\n/, '  pace: 1 turn\n').replace('commands: naval', 'commands: compass'), glass('    phrase stuck when the Marigold is in irons'), '\ndefine phrase stuck\n  Stuck.\nend phrase\n')).toContain('analysis.sailing-needs-use');
    expect(without(SEA.replace('  wind: from northeast\n', ''), CONTROLLED_SHIP.replace(/  sailing\n[\s\S]*?  end sailing\n/, '  pace: 1 turn\n'), glass('    start the Marigold heading 90 degrees'))).toContain('analysis.sailing-needs-use');
  });

  it('`commands: naval` on a compass vehicle, `wind:` on a room, and a sailing block on a flight vehicle are analysis.sailing-not-open', () => {
    const compassShip = `
create the dinghy
  a vehicle
  in Port Royal
  movement: compass
  carries: in
  drive: player
  commands: naval
  pace: 1 turn

  A dinghy.
`;
    expect(errorCodes(story(SEA, SHIP, compassShip))).toContain('analysis.sailing-not-open');
    expect(errorCodes(story(SEA.replace('  The port.\n', '  wind: from north\n\n  The port.\n'), SHIP))).toContain('analysis.sailing-not-open');
    const flier = `
create the Sparrow
  a vehicle
  in Port Royal
  movement: flight
  carries: in
  drive: control
  destinations: Port Royal, the Reef
  passage: 2 turns

  A flier.

  sailing
    0 to 180 degrees: 1 turn
    calm: stopped
  end sailing
`;
    expect(errorCodes(story(SEA, SHIP, flier))).toContain('analysis.sailing-not-open');
  });
});
