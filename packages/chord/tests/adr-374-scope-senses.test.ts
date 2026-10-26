/**
 * ADR-374 compile-time surface: a list or region placement makes a
 * backdrop (scenery, `in`, rooms only); `night-vision` is a person word;
 * `dark` is reserved as a state name off rooms (GH #537).
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { StoryIR } from '../src/ir';

const HEADER = `story
  title: Ceres
  authors:
    T
  id: ceres
  story-version: 0.0.1
`;

const story = (body: string) => `${HEADER}
before the game starts
  change the player to Courier
end before

create the Ceres Surface
  a region

create the Landing Pad
  a room
  in the Ceres Surface

  A pad.

create the Tram Platform
  a room
  in the Ceres Surface

  A platform.

create the Hold
  a room

  A hold.

create the crate
  a container
  in the Hold

  A crate.

create Courier
  a person
  playable
  starts in the Landing Pad

  You.

define phrase shards
  Shards.
end phrase

${body}`;

function codes(source: string): string[] {
  const result = compile(source);
  return result.ok ? [] : result.diagnostics.map((d) => d.code);
}

function ir(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

describe('backdrop placement (ADR-374 D2)', () => {
  it('lowers a list to every room, the first as its place', () => {
    const view = ir(story(`create the view of Ceres
  a thing, scenery
  in the Landing Pad, the Tram Platform and the Hold

  Ceres.
`)).entities.find((e) => e.id === 'view-of-ceres')!;
    expect(view.placement).toMatchObject({ relation: 'in', place: 'landing-pad', places: ['landing-pad', 'tram-platform', 'hold'] });
  });

  it('lowers a scenery thing in a region to the region\'s member rooms', () => {
    const haze = ir(story(`create the dust haze
  a thing, scenery
  in the Ceres Surface

  Haze.
`)).entities.find((e) => e.id === 'dust-haze')!;
    expect([...haze.placement!.places!].sort()).toEqual(['landing-pad', 'tram-platform']);
    expect(haze.placement!.place).toBe(haze.placement!.places![0]);
  });

  it('still refuses a portable thing in a region', () => {
    expect(codes(story(`create the rock
  a thing
  in the Ceres Surface

  A rock.
`))).toEqual(['analysis.thing-in-region']);
  });

  it('refuses a list on a thing that is not scenery', () => {
    expect(codes(story(`create the rock
  a thing
  in the Landing Pad and the Hold

  A rock.
`))).toEqual(['analysis.backdrop-not-scenery']);
  });

  it('refuses a list that names something other than a room', () => {
    expect(codes(story(`create the view of Ceres
  a thing, scenery
  in the Landing Pad and the crate

  Ceres.
`))).toEqual(['analysis.backdrop-not-room']);
  });

  it('refuses a list on `on`', () => {
    expect(codes(story(`create the shelf
  a supporter
  in the Hold

  A shelf.

create the view of Ceres
  a thing, scenery
  on the shelf and the crate

  Ceres.
`))).toEqual(['analysis.placement-list-relation']);
  });

  it('places into a thing whose name contains `and` by its alias, as every name list does', () => {
    const lid = ir(story(`create the pots and pans
  a container
  in the Hold
  aka cookware

  Pots.

create the lid
  a thing
  in the cookware

  A lid.
`)).entities.find((e) => e.id === 'lid')!;
    expect(lid.placement).toMatchObject({ place: 'pots-and-pans' });
    expect(lid.placement!.places).toBeUndefined();
  });
});

describe('night-vision (ADR-374 D3)', () => {
  it('composes on a person', () => {
    const robot = ir(story(`create the loader robot
  a person, night-vision
  in the Hold

  A robot.
`)).entities.find((e) => e.id === 'loader-robot')!;
    expect(robot.traits.map((t) => t.name)).toContain('night-vision');
  });

  it('refuses night-vision on a thing', () => {
    expect(codes(story(`create the lamp
  a thing, night-vision
  in the Hold

  A lamp.
`))).toEqual(['analysis.night-vision-not-person']);
  });
});

describe('dark as a state name (ADR-374 D8, GH #537)', () => {
  it('refuses a declared `dark` state off a room', () => {
    expect(codes(story(`create the lamp
  a thing
  in the Hold
  states, reversible: dark, glowing

  A lamp.
`))).toEqual(['analysis.dark-state-reserved']);
  });
});

describe('hearing (ADR-374 D6)', () => {
  const sounds = 'define sound klaxon\n\ndefine sound chime from "sounds/chime.ogg"\n\n';

  it('compiles `after hearing the <sound>` on a listener, carrying the sound', () => {
    const robot = ir(story(`${sounds}create the loader robot
  a person, listener
  in the Hold

  A robot.

  after hearing the klaxon
    phrase shards
  end after

  after hearing the chime
    phrase shards
  end after
`)).entities.find((e) => e.id === 'loader-robot')!;
    expect(robot.onClauses.map((c) => c.sound)).toEqual(['klaxon', 'chime']);
  });

  it('lets a thing listen, not only a person', () => {
    expect(codes(story(`${sounds}create the microphone
  a thing, listener
  in the Hold

  A microphone.

  after hearing the klaxon
    phrase shards
  end after
`))).toEqual([]);
  });

  it('refuses hearing on something that is not a listener', () => {
    expect(codes(story(`${sounds}create the packing case
  a thing
  in the Hold

  A packing case.

  after hearing the klaxon
    phrase shards
  end after
`))).toEqual(['analysis.hearing-not-listener']);
  });

  it('refuses an undeclared sound, `on hearing`, and a missing article', () => {
    const listener = (head: string) => story(`${sounds}create the robot
  a person, listener
  in the Hold

  A robot.

  ${head}
    phrase shards
  end ${head.startsWith('on') ? 'on' : 'after'}
`);
    expect(codes(listener('after hearing the siren'))).toEqual(['analysis.hearing-unknown-sound']);
    expect(codes(listener('on hearing the klaxon'))).toEqual(['analysis.hearing-after-only']);
    expect(codes(listener('after hearing klaxon'))).toContain('analysis.hearing-needs-article');
  });

  it('lowers `play sound` to one statement carrying the sound and, when it has one, its file', () => {
    const lever = ir(story(`${sounds}create the lever
  a thing, scenery, pullable
  in the Hold

  A lever.

  after the player pulling
    play sound klaxon
    play sound chime
  end after
`)).entities.find((e) => e.id === 'lever')!;
    expect(lever.onClauses[0].body).toEqual([
      expect.objectContaining({ kind: 'play-sound', sound: 'klaxon' }),
      expect.objectContaining({ kind: 'play-sound', sound: 'chime', src: 'sounds/chime.ogg' }),
    ]);
    expect((lever.onClauses[0].body[0] as { src?: string }).src).toBeUndefined();
  });
});

describe('two tails on one owner are two clauses (ADR-372 D1, found 2026-10-15)', () => {
  it('compiles throwing at two different things in one block', () => {
    expect(codes(story(`create the gong
  a thing, scenery
  in the Hold

  A gong.

create the ball
  a thing
  in the Hold

  A ball.

  on the player throwing at the gong
    phrase shards
  end on

  on the player throwing at the crate
    phrase shards
  end on
`))).toEqual([]);
  });
});

describe('lamps (ADR-374 D9, D10)', () => {
  it('lowers `light-source with the <tool>`, `starts unlit` and `powered by` a list', () => {
    const compiled = ir(story(`create the matchbook
  a thing
  in the Hold

  A matchbook.

create the lantern
  a thing, light-source with the matchbook, starts unlit
  in the Hold

  A lantern.

create the cell
  a thing
  in the Hold

  A cell.

create the spare cell
  a thing
  in the Hold

  A spare cell.

create the torch
  a container, light-source, switchable, powered by the cell and the spare cell
  in the Hold

  A torch.
`));
    const lantern = compiled.entities.find((e) => e.id === 'lantern')!;
    expect(lantern.startsStates).toContain('unlit');
    expect(lantern.traits.find((t) => t.name === 'light-source')!.config).toEqual([expect.objectContaining({ value: 'matchbook', valueKind: 'name' })]);
    const torch = compiled.entities.find((e) => e.id === 'torch')!;
    expect(torch.traits.find((t) => t.name === 'powered')!.config.map((c) => c.value)).toEqual(['cell', 'spare cell']);
  });

  it('refuses `powered by` off a switchable container, and a power source that names nothing', () => {
    expect(codes(story(`create the cell
  a thing
  in the Hold

  A cell.

create the torch
  a container, light-source, powered by the cell
  in the Hold

  A torch.
`))).toEqual(['analysis.powered-not-switchable']);
    expect(codes(story(`create the cell
  a thing
  in the Hold

  A cell.

create the torch
  a thing, light-source, switchable, powered by the cell
  in the Hold

  A torch.
`))).toEqual(['analysis.powered-not-container']);
    expect(codes(story(`create the torch
  a container, light-source, switchable, powered by the moon
  in the Hold

  A torch.
`))).toEqual(['analysis.setting-names-no-entity']);
  });

  it('refuses a light-source tool that names nothing, and `starts lit` off a light source', () => {
    expect(codes(story(`create the lantern
  a thing, light-source with the flint
  in the Hold

  A lantern.
`))).toEqual(['analysis.setting-names-no-entity']);
    expect(codes(story(`create the lantern
  a thing, starts lit
  in the Hold

  A lantern.
`))).toContain('analysis.starts-state-pairing');
  });
});
