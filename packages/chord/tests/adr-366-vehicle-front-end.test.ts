/**
 * adr-366-vehicle-front-end.test.ts — ADR-366's declaration surface on the
 * chord side (Chord 4.0 Phase 11, Slice 1): the `vehicle` kind, its colon
 * lines and `position` block, `admits:`, `to outside`, the driving
 * statements, the vehicle reads and the `under way` anchor — parsed,
 * analyzed and lowered to IR. Every case asserts an IR field or a specific
 * diagnostic code, never "parsed without throwing"; every diagnostic the
 * record names has a case here (AC-2, AC-5, AC-10), as do the four codes
 * the grammar log of 2026-10-18 added.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRVehicle, StoryIR } from '../src/ir';

const HEADER = `story
  title: Conveyances
  authors:
    T
  id: conveyances
  story-version: 0.0.1
  states: calm, stormy
`;

const PLAYER = `
create Alex
  a person
  playable
  starts in the Well Bottom

  You.

before the game starts
  change the player to Alex
end before
`;

const ROOMS = `
create the Well Bottom
  a room
  up to the Top of the Well

  The bottom of the well.

create the Top of the Well
  a room

  The top of the well.

create the Alley
  a room

  Too narrow.

create the water
  a thing
  in the Well Bottom

  Water.
`;

const BUCKET = `
create the bucket
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: state
  stops: the Well Bottom, the Top of the Well
  direction: both

  A bucket.

  position
    when the bucket holds the water: the Top of the Well
    otherwise: the Well Bottom
  end position
`;

const TRAM = `
create the tram car
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: control
  stops: the Well Bottom, the Top of the Well
  direction: both
  pace: 2 turns

  A tram.
`;

const BICYCLE = `
create the bicycle
  a vehicle
  in the Well Bottom
  movement: streets
  carries: on
  drive: player
  commands: compass

  A bicycle.
`;

const MARIGOLD = `
create the Marigold
  a vehicle
  in the Well Bottom
  movement: compass
  carries: in
  drive: player
  commands: compass
  pace: 1 turn

  A barque.
`;

const SPARROW = `
create the Sparrow
  a vehicle
  in the Well Bottom
  movement: flight
  drive: control
  destinations: the Well Bottom, the Top of the Well
  passage: 5 turns
  aboard: the Airlock, the Hold
  boarded through: the Airlock

  A courier.

create the Airlock
  a room
  east to the Hold
  west to outside

  A closet.

create the Hold
  a room

  A hold.
`;

const story = (...blocks: string[]) => `${HEADER}${ROOMS}${PLAYER}${blocks.join('\n')}`;

const compiled = (source: string): StoryIR => {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
  expect(errors, errors.map((d) => `${d.code}: ${d.message}`).join('\n')).toEqual([]);
  return result.ir;
};

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const vehicleOf = (ir: StoryIR, id: string): IRVehicle => {
  const entity = ir.entities.find((e) => e.id === id);
  expect(entity?.vehicle, `${id} carries a vehicle declaration`).toBeDefined();
  return entity!.vehicle!;
};

describe('the vehicle kind (ADR-366 D1)', () => {
  it('`a vehicle` is a kind noun and lowers with its movement model', () => {
    const ir = compiled(story(BUCKET));
    const bucket = ir.entities.find((e) => e.id === 'bucket')!;
    expect(bucket.kinds.map((k) => k.name)).toEqual(['vehicle']);
    expect(bucket.vehicle).toEqual({
      movement: 'line',
      carries: 'in',
      drive: 'state',
      stops: ['well-bottom', 'top-of-the-well'],
      direction: 'both',
      position: {
        rows: [
          {
            condition: { kind: 'predicate', pred: 'holds', negated: false, subject: { kind: 'entity', id: 'bucket' }, object: { kind: 'entity', id: 'water' } },
            stop: 'top-of-the-well',
          },
        ],
        otherwise: 'well-bottom',
      },
    });
  });

  it('`enterable` beside `a vehicle` is analysis.vehicle-already-enterable', () => {
    expect(errorCodes(story(BUCKET.replace('a vehicle', 'a vehicle, enterable')))).toContain('analysis.vehicle-already-enterable');
  });

  it('a vehicle line off a vehicle is refused, `carries:` by its own code', () => {
    const codes = errorCodes(story(`
create the crate
  a container
  in the Well Bottom
  carries: in
  movement: none

  A crate.
`));
    expect(codes).toContain('analysis.carries-not-vehicle');
    expect(codes).toContain('analysis.vehicle-line-owner');
  });

  it('a second line of one key is analysis.vehicle-line-duplicate', () => {
    expect(errorCodes(story(BUCKET.replace('direction: both', 'direction: both\n  direction: one-way')))).toContain('analysis.vehicle-line-duplicate');
  });
});

describe('the required lines (ADR-366 D2, D5)', () => {
  it('no `movement:` is analysis.vehicle-missing-movement', () => {
    expect(errorCodes(story(BUCKET.replace('  movement: line\n', '')))).toContain('analysis.vehicle-missing-movement');
  });

  it('no `carries:` without rooms aboard is analysis.vehicle-missing-carries', () => {
    expect(errorCodes(story(BUCKET.replace('  carries: in\n', '')))).toContain('analysis.vehicle-missing-carries');
  });

  it('no `drive:` on a moving type is analysis.vehicle-missing-drive', () => {
    expect(errorCodes(story(TRAM.replace('  drive: control\n', '')))).toContain('analysis.vehicle-missing-drive');
  });

  it('`drive:` on `movement: none` is analysis.vehicle-drive-not-moving', () => {
    const codes = errorCodes(story(`
create the bathtub
  a vehicle
  in the Well Bottom
  movement: none
  carries: in
  drive: control

  A tub.
`));
    expect(codes).toContain('analysis.vehicle-drive-not-moving');
  });

  it('`holds <n>` bounds what a vehicle carries, as it bounds any container', () => {
    const ir = compiled(story(BUCKET.replace('  carries: in\n', '  carries: in\n  holds 3\n')));
    expect(ir.entities.find((e) => e.id === 'bucket')!.holds).toBe(3);
  });

  it('`movement: none` with `carries:` compiles to the bare model', () => {
    const ir = compiled(story(`
create the bathtub
  a vehicle
  in the Well Bottom
  movement: none
  carries: in

  A tub.
`));
    expect(vehicleOf(ir, 'bathtub')).toEqual({ movement: 'none', carries: 'in' });
  });

  it('a line the type does not take is analysis.vehicle-line-not-for-movement', () => {
    expect(errorCodes(story(BICYCLE.replace('  carries: on\n', '  carries: on\n  stops: the Well Bottom, the Alley\n')))).toContain('analysis.vehicle-line-not-for-movement');
    expect(errorCodes(story(BICYCLE.replace('  carries: on\n', '  carries: on\n  pace: 2 turns\n')))).toContain('analysis.vehicle-line-not-for-movement');
  });

  it('a drive the type does not take is analysis.vehicle-drive-not-for-movement', () => {
    expect(errorCodes(story(BICYCLE.replace('drive: player', 'drive: control')))).toContain('analysis.vehicle-drive-not-for-movement');
    expect(errorCodes(story(TRAM.replace('drive: control', 'drive: player')))).toContain('analysis.vehicle-drive-not-for-movement');
  });

  it('a `position` block off a line is analysis.vehicle-line-not-for-movement', () => {
    const src = story(BICYCLE.replace('  A bicycle.\n', '  A bicycle.\n\n  position\n    otherwise: the Well Bottom\n  end position\n'));
    expect(errorCodes(src)).toContain('analysis.vehicle-line-not-for-movement');
  });
});

describe('the command sets (ADR-366 D5i)', () => {
  it('`drive: player` without `commands:` is analysis.vehicle-missing-commands', () => {
    expect(errorCodes(story(BICYCLE.replace('  commands: compass\n', '')))).toContain('analysis.vehicle-missing-commands');
  });

  it('`commands:` off `drive: player` is analysis.commands-not-player-driven', () => {
    expect(errorCodes(story(TRAM.replace('  pace: 2 turns\n', '  pace: 2 turns\n  commands: compass\n')))).toContain('analysis.commands-not-player-driven');
  });

  it('a set the type does not take is analysis.commands-not-for-movement', () => {
    expect(errorCodes(story(BICYCLE.replace('commands: compass', 'commands: destinations')))).toContain('analysis.commands-not-for-movement');
    // `naval` is a sailing vehicle's set (ADR-375 D1): off an open vehicle it is named as sailing's, not as an unknown set.
    expect(errorCodes(story(BICYCLE.replace('commands: compass', 'commands: naval')))).toContain('analysis.sailing-not-open');
  });

  it('the sets lower in order, once each', () => {
    const ir = compiled(story(MARIGOLD));
    expect(vehicleOf(ir, 'marigold')).toEqual({ movement: 'compass', carries: 'in', drive: 'player', commands: ['compass'], pace: 1 });
  });
});

describe('the line (ADR-366 D5a)', () => {
  it('fewer than two stops is analysis.line-too-few-stops', () => {
    expect(errorCodes(story(TRAM.replace('stops: the Well Bottom, the Top of the Well', 'stops: the Well Bottom')))).toContain('analysis.line-too-few-stops');
    expect(errorCodes(story(TRAM.replace('  stops: the Well Bottom, the Top of the Well\n', '')))).toContain('analysis.line-too-few-stops');
  });

  it('a repeated stop is analysis.line-repeated-stop', () => {
    expect(errorCodes(story(TRAM.replace('stops: the Well Bottom, the Top of the Well', 'stops: the Well Bottom, the Top of the Well, the Well Bottom')))).toContain('analysis.line-repeated-stop');
  });

  it('no `direction:` is analysis.line-missing-direction', () => {
    expect(errorCodes(story(TRAM.replace('  direction: both\n', '')))).toContain('analysis.line-missing-direction');
  });

  it('`drive: control` without `pace:` is analysis.vehicle-missing-pace', () => {
    expect(errorCodes(story(TRAM.replace('  pace: 2 turns\n', '')))).toContain('analysis.vehicle-missing-pace');
  });

  it('`drive: state` without a `position` block is analysis.state-without-position', () => {
    const src = story(BUCKET.replace(/\n  position[\s\S]*end position\n/, '\n'));
    expect(errorCodes(src)).toContain('analysis.state-without-position');
  });

  it('a `position` block under `drive: control` is analysis.position-without-state', () => {
    const src = story(TRAM.replace('  A tram.\n', '  A tram.\n\n  position\n    otherwise: the Well Bottom\n  end position\n'));
    expect(errorCodes(src)).toContain('analysis.position-without-state');
  });

  it('a row naming no stop of the line is analysis.not-a-stop', () => {
    expect(errorCodes(story(BUCKET.replace('otherwise: the Well Bottom', 'otherwise: the Alley')))).toContain('analysis.not-a-stop');
  });

  it('no `otherwise` row is analysis.position-no-otherwise', () => {
    expect(errorCodes(story(BUCKET.replace('    otherwise: the Well Bottom\n', '')))).toContain('analysis.position-no-otherwise');
  });

  it('a one-way line whose later row names a stop behind an earlier row is analysis.position-against-direction', () => {
    const src = story(BUCKET.replace('direction: both', 'direction: one-way'));
    expect(errorCodes(src)).toContain('analysis.position-against-direction');
    const forward = story(
      BUCKET.replace('direction: both', 'direction: one-way')
        .replace('when the bucket holds the water: the Top of the Well', 'when the bucket holds the water: the Well Bottom')
        .replace('otherwise: the Well Bottom', 'otherwise: the Top of the Well'),
    );
    expect(errorCodes(forward)).not.toContain('analysis.position-against-direction');
  });

  it('a line not starting at one of its stops is analysis.vehicle-not-at-stop', () => {
    expect(errorCodes(story(TRAM.replace('in the Well Bottom', 'in the Alley')))).toContain('analysis.vehicle-not-at-stop');
    expect(errorCodes(story(TRAM.replace('  in the Well Bottom\n', '')))).toContain('analysis.vehicle-not-at-stop');
  });

  it('a controlled line lowers its pace and no position', () => {
    const ir = compiled(story(TRAM));
    expect(vehicleOf(ir, 'tram-car')).toEqual({ movement: 'line', carries: 'in', drive: 'control', stops: ['well-bottom', 'top-of-the-well'], direction: 'both', pace: 2 });
  });
});

describe('the compass and free flight (ADR-366 D5c, D5d)', () => {
  it('a compass vehicle without `pace:` is analysis.vehicle-missing-pace', () => {
    expect(errorCodes(story(MARIGOLD.replace('  pace: 1 turn\n', '')))).toContain('analysis.vehicle-missing-pace');
  });

  it('fewer than two destinations is analysis.flight-too-few-destinations', () => {
    expect(errorCodes(story(SPARROW.replace('destinations: the Well Bottom, the Top of the Well', 'destinations: the Well Bottom')))).toContain('analysis.flight-too-few-destinations');
  });

  it('no `passage:` is analysis.flight-no-passage', () => {
    expect(errorCodes(story(SPARROW.replace('  passage: 5 turns\n', '')))).toContain('analysis.flight-no-passage');
  });

  it('a flight vehicle not starting at a destination is analysis.vehicle-not-at-stop', () => {
    expect(errorCodes(story(SPARROW.replace('in the Well Bottom', 'in the Alley')))).toContain('analysis.vehicle-not-at-stop');
  });

  it('the Sparrow lowers with its rooms aboard and no carries', () => {
    const ir = compiled(story(SPARROW));
    expect(vehicleOf(ir, 'sparrow')).toEqual({
      movement: 'flight',
      aboard: ['airlock', 'hold'],
      boardedThrough: 'airlock',
      drive: 'control',
      destinations: ['well-bottom', 'top-of-the-well'],
      passage: 5,
    });
  });
});

describe('rooms aboard and the outside exit (ADR-366 D7)', () => {
  it('`carries:` with rooms aboard is analysis.carries-with-aboard', () => {
    expect(errorCodes(story(SPARROW.replace('  drive: control\n', '  drive: control\n  carries: in\n')))).toContain('analysis.carries-with-aboard');
  });

  it('`aboard:` without `boarded through:` is analysis.aboard-without-boarding-room', () => {
    expect(errorCodes(story(SPARROW.replace('  boarded through: the Airlock\n', '')))).toContain('analysis.aboard-without-boarding-room');
  });

  it('a boarding room not listed aboard is analysis.boarding-room-not-aboard', () => {
    expect(errorCodes(story(SPARROW.replace('boarded through: the Airlock', 'boarded through: the Alley')))).toContain('analysis.boarding-room-not-aboard');
    expect(errorCodes(story(SPARROW.replace('  aboard: the Airlock, the Hold\n', '')))).toContain('analysis.boarding-room-not-aboard');
  });

  it('`openable` on a vehicle with rooms aboard is analysis.vehicle-aboard-openable', () => {
    expect(errorCodes(story(SPARROW.replace('create the Sparrow\n  a vehicle', 'create the Sparrow\n  a vehicle, openable')))).toContain('analysis.vehicle-aboard-openable');
  });

  it('`to outside` lowers with no destination and the flag', () => {
    const ir = compiled(story(SPARROW));
    const airlock = ir.entities.find((e) => e.id === 'airlock')!;
    expect(airlock.exits).toEqual([
      expect.objectContaining({ direction: 'east', to: 'hold', via: null }),
      expect.objectContaining({ direction: 'west', to: '', via: null, toOutside: true }),
    ]);
  });

  it('`to outside` in a room no vehicle lists aboard is analysis.outside-not-aboard', () => {
    expect(errorCodes(story(SPARROW.replace('aboard: the Airlock, the Hold', 'aboard: the Hold').replace('boarded through: the Airlock', 'boarded through: the Hold')))).toContain('analysis.outside-not-aboard');
  });

  it('`to outside` takes a door and an `exits:` line as any exit does', () => {
    const ir = compiled(story(SPARROW.replace('  west to outside\n', '  exits: west to outside through the outer hatch\n') + `
create the outer hatch
  a door, openable

  A hatch.
`));
    const airlock = ir.entities.find((e) => e.id === 'airlock')!;
    expect(airlock.exits.find((e) => e.direction === 'west')).toMatchObject({ to: '', via: 'outer-hatch', toOutside: true });
  });
});

describe('`admits:` (ADR-366 D6)', () => {
  it('a room and a region list the steered vehicles that may enter them', () => {
    const ir = compiled(story(BICYCLE, MARIGOLD, `
create the Streets
  a region
  admits: the bicycle, the Marigold
  rooms High Street 1 to 2
    admits: the bicycle

    A street.
`, `
create the Square
  a room
  admits: the bicycle

  A square.
`));
    expect(ir.entities.find((e) => e.id === 'streets')!.admits).toEqual(['bicycle', 'marigold']);
    expect(ir.entities.find((e) => e.id === 'high-street-1')!.admits).toEqual(['bicycle']);
    expect(ir.entities.find((e) => e.id === 'high-street-2')!.admits).toEqual(['bicycle']);
    expect(ir.entities.find((e) => e.id === 'square')!.admits).toEqual(['bicycle']);
    expect(ir.entities.find((e) => e.id === 'alley')!.admits).toBeUndefined();
  });

  it('a line or flight vehicle, or a non-vehicle, is analysis.admits-not-steered-vehicle', () => {
    expect(errorCodes(story(TRAM, `
create the Square
  a room
  admits: the tram car

  A square.
`))).toContain('analysis.admits-not-steered-vehicle');
    expect(errorCodes(story(`
create the Square
  a room
  admits: the water

  A square.
`))).toContain('analysis.admits-not-steered-vehicle');
  });

  it('`admits:` off a room, group or region is analysis.admits-owner', () => {
    expect(errorCodes(story(BICYCLE.replace('  commands: compass\n', '  commands: compass\n  admits: the bicycle\n')))).toContain('analysis.admits-owner');
  });
});

describe('the driving statements (ADR-366 D5f)', () => {
  const clause = (body: string, owner = 'the water') => `
create the lever
  a thing
  in the Well Bottom

  A lever.

  on the player pulling
${body}
  end on
`.replace('the water', owner);

  it('`start` and `stop` on a controlled line lower to the vehicle statements', () => {
    const ir = compiled(story(TRAM, clause('    start the tram car\n    stop the tram car when the water is in the Well Bottom')));
    const body = ir.entities.find((e) => e.id === 'lever')!.onClauses[0].body;
    expect(body[0]).toMatchObject({ kind: 'vehicle-start', vehicle: { kind: 'entity', id: 'tram-car' }, stmtWhen: null });
    expect(body[0]).not.toHaveProperty('heading');
    expect(body[1]).toMatchObject({ kind: 'vehicle-stop', vehicle: { kind: 'entity', id: 'tram-car' }, stmtWhen: { kind: 'predicate', pred: 'is-in' } });
  });

  it('a timer of the same name still wins the verb', () => {
    const ir = compiled(story(TRAM.replace(/tram car/g, 'tram'), `
define timer tram
  ticking
end timer
`, clause('    start the tram')));
    const body = ir.entities.find((e) => e.id === 'lever')!.onClauses[0].body;
    expect(body[0]).toMatchObject({ kind: 'timer', verb: 'start', timer: 'tram' });
  });

  it('`start … heading <direction>` lowers on a controlled compass vehicle and is refused elsewhere', () => {
    const controlled = MARIGOLD.replace('drive: player\n  commands: compass', 'drive: control');
    const ir = compiled(story(controlled, clause('    start the Marigold heading north')));
    const body = ir.entities.find((e) => e.id === 'lever')!.onClauses[0].body;
    expect(body[0]).toMatchObject({ kind: 'vehicle-start', vehicle: { kind: 'entity', id: 'marigold' }, heading: 'north' });
    expect(errorCodes(story(TRAM, clause('    start the tram car heading north')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(controlled, clause('    start the Marigold')))).toContain('analysis.vehicle-statement-not-for-movement');
  });

  it('a statement the type or drive does not take is analysis.vehicle-statement-not-for-movement', () => {
    expect(errorCodes(story(BUCKET, clause('    start the bucket')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(BICYCLE, clause('    stop the bicycle')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(TRAM, clause('    restart the tram car')))).toContain('analysis.vehicle-statement-not-for-movement');
  });

  it('`stop` halts a player-driven compass vehicle too', () => {
    const ir = compiled(story(MARIGOLD, clause('    stop the Marigold')));
    expect(ir.entities.find((e) => e.id === 'lever')!.onClauses[0].body[0]).toMatchObject({ kind: 'vehicle-stop' });
  });

  it('`send` lowers on a controlled flight vehicle to one of its destinations', () => {
    const ir = compiled(story(SPARROW, clause('    send the Sparrow to the Top of the Well')));
    expect(ir.entities.find((e) => e.id === 'lever')!.onClauses[0].body[0]).toEqual({
      kind: 'vehicle-send',
      vehicle: { kind: 'entity', id: 'sparrow' },
      destination: { kind: 'entity', id: 'top-of-the-well' },
      stmtWhen: null,
      span: expect.anything(),
    });
  });

  it('`send` to a room not among the destinations is analysis.not-a-destination', () => {
    expect(errorCodes(story(SPARROW, clause('    send the Sparrow to the Alley')))).toContain('analysis.not-a-destination');
  });

  it('`send` of a non-flight vehicle or a non-vehicle is refused', () => {
    expect(errorCodes(story(TRAM, clause('    send the tram car to the Top of the Well')))).toContain('analysis.vehicle-statement-not-for-movement');
    expect(errorCodes(story(clause('    send the water to the Top of the Well')))).toContain('analysis.not-a-vehicle');
  });

  it('`move` of a state-driven line is analysis.move-state-driven-vehicle; of a controlled line, only to a stop', () => {
    expect(errorCodes(story(BUCKET, clause('    move the bucket to the Top of the Well')))).toContain('analysis.move-state-driven-vehicle');
    expect(errorCodes(story(TRAM, clause('    move the tram car to the Alley')))).toContain('analysis.not-a-stop');
    expect(errorCodes(story(TRAM, clause('    move the tram car to the Top of the Well')))).toEqual([]);
  });
});

describe('the vehicle reads and the anchor (ADR-366 D5, D5c, D5e)', () => {
  const guarded = (condition: string) => `
create the lever
  a thing
  in the Well Bottom

  A lever.

  on the player pulling
    refuse when ${condition}: not-now
  end on

define phrase not-now
  Not now.
end phrase
`;

  it('`is under way`, `is at` and `is heading` lower to the vehicle conditions', () => {
    const ir = compiled(story(MARIGOLD, guarded('the Marigold is under way or the Marigold is not at the Well Bottom or the Marigold is heading north')));
    const clause = ir.entities.find((e) => e.id === 'lever')!.onClauses[0];
    expect(clause.body[0]).toMatchObject({
      kind: 'refuse-when',
      condition: {
        kind: 'or',
        operands: [
          { kind: 'vehicle-under-way', vehicle: { kind: 'entity', id: 'marigold' } },
          { kind: 'not', operand: { kind: 'vehicle-at', vehicle: { kind: 'entity', id: 'marigold' }, place: { kind: 'entity', id: 'well-bottom' } } },
          { kind: 'vehicle-heading', vehicle: { kind: 'entity', id: 'marigold' }, direction: 'north' },
        ],
      },
    });
  });

  it('`is at least` stays a comparison', () => {
    const src = story('\ndefine counter fare starts 0\n', guarded('fare is at least 3'));
    expect(errorCodes(src)).toEqual([]);
  });

  it('a read on a non-vehicle is analysis.not-a-vehicle', () => {
    expect(errorCodes(story(guarded('the water is under way')))).toContain('analysis.not-a-vehicle');
  });

  it('a read the type lacks is analysis.vehicle-condition-not-for-movement', () => {
    expect(errorCodes(story(BICYCLE, guarded('the bicycle is under way')))).toContain('analysis.vehicle-condition-not-for-movement');
    expect(errorCodes(story(TRAM, guarded('the tram car is heading north')))).toContain('analysis.vehicle-condition-not-for-movement');
  });

  it('`when <vehicle> becomes under way` anchors a sequence step', () => {
    const ir = compiled(story(TRAM, `
define sequence the tram ride
  when the tram car becomes under way
  2 turns later
    phrase tram-halfway
end sequence

define phrase tram-halfway
  Halfway.
end phrase
`));
    expect(ir.sequences[0].steps[0]).toMatchObject({ timing: 'becomes', anchor: { owner: 'tram-car', state: 'under way' } });
  });

  it('the anchor on a non-vehicle or a type that never gets under way is refused', () => {
    const seq = (owner: string) => `
define sequence the ride
  when ${owner} becomes under way
  2 turns later
    phrase tram-halfway
end sequence

define phrase tram-halfway
  Halfway.
end phrase
`;
    expect(errorCodes(story(seq('the water')))).toContain('analysis.not-a-vehicle');
    expect(errorCodes(story(BICYCLE, seq('the bicycle')))).toContain('analysis.vehicle-condition-not-for-movement');
  });
});

describe('the parser (ADR-366)', () => {
  it('a malformed vehicle line is parse.vehicle-line', () => {
    expect(errorCodes(story(TRAM.replace('pace: 2 turns', 'pace: fast')))).toContain('parse.vehicle-line');
    expect(errorCodes(story(TRAM.replace('pace: 2 turns', 'pace: 0 turns')))).toContain('parse.vehicle-line');
    expect(errorCodes(story(TRAM.replace('direction: both', 'direction: sideways')))).toContain('parse.vehicle-line');
    expect(errorCodes(story(TRAM.replace('movement: line', 'movement: rail')))).toContain('parse.vehicle-line');
  });

  it('a malformed position row is parse.position-row, and nothing follows `otherwise`', () => {
    expect(errorCodes(story(BUCKET.replace('otherwise: the Well Bottom', 'usually the Well Bottom')))).toContain('parse.position-row');
    expect(errorCodes(story(BUCKET.replace('    otherwise: the Well Bottom\n', '    otherwise: the Well Bottom\n    when the story is calm: the Well Bottom\n')))).toContain('parse.position-after-otherwise');
  });

  it('`carries <thing>` without a colon is still start inventory', () => {
    const ir = compiled(story(`
create the sack
  a thing
  in the Well Bottom

  A sack.
`).replace('starts in the Well Bottom', 'starts in the Well Bottom\n  carries the sack'));
    expect(ir.entities.find((e) => e.id === 'alex')!.carries).toEqual(['sack']);
  });
});
