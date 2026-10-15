/**
 * ADR-374 D6, D9, D10 on the REAL path: a sound made by `play sound` and
 * heard by a listener through ADR-172's propagation; a lantern lit with its
 * match and put out; a torch powered by the battery inside it. A compiled
 * Chord story, loaded through the loader and driven by
 * `GameEngine.executeTurn`; assertions read the world (locations, trait
 * fields, the story's declared state) and the turn's events.
 *
 * Behavior Statements:
 *   play sound / after hearing  DOES emit a world sound from the clause
 *               owner's room; a listener the sound reaches runs its
 *               `after hearing the <sound>` body in the same turn.
 *               Who hears is ADR-172's propagation (the sensor two rooms
 *               on hears a normal sound through open exits). REJECTS: a
 *               clause for another sound does not fire.
 *   lighting    DOES light a flame light with its tool held (isLit true);
 *               `starts unlit` begins it dark. REJECTS without the tool.
 *   powered by  DOES derive power from the battery inside the torch: the
 *               torch lights the dark room only while it holds it.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { SOUND_EVENT_TYPES } from '@sharpee/if-domain';
import { LightSourceTrait, SwitchableTrait, TraitType, VisibilityBehavior } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootEngine } from './helpers/boot-engine';

const SOURCE = `story
  title: Depot
  authors:
    T
  id: depot
  story-version: 0.0.1

before the game starts
  change the player to Courier
end before

define sound klaxon

define sound chime

create the Dock
  a room
  east to the Hall

  A dock.

create the Hall
  a room
  west to the Dock
  east to the Vault

  A hall.

create the Vault
  a room
  west to the Hall

  A vault.

create the Cellar
  a room, dark
  up to the Dock

  A cellar.

create Courier
  a person
  playable
  starts in the Dock

  You.

create the lever
  a thing, scenery, pullable
  in the Dock

  A lever.

  after the player pulling
    play sound klaxon
  end after

create the loader robot
  a person, listener
  in the Hall
  aka robot
  states, reversible: idle, alerted, chimed

  A robot.

  after hearing the klaxon
    change the loader robot to alerted
  end after

  after hearing the chime
    change the loader robot to chimed
  end after

create the deaf crate
  a thing
  in the Hall
  states, reversible: quiet, rattled

  A crate.

create the far sensor
  a thing, listener
  in the Vault
  states, reversible: waiting, tripped

  A sensor.

  after hearing the klaxon
    change the far sensor to tripped
  end after

create the matchbook
  a thing
  in the Dock

  A matchbook.

create the lantern
  a thing, light-source with the matchbook, starts unlit
  in the Dock

  A lantern.

create the battery
  a thing
  in the Dock

  A battery.

create the torch
  a container, light-source, switchable, powered by the battery
  in the Dock

  A torch.
`;

async function boot() {
  const b = bootEngine(SOURCE, 7);
  await b.engine.start();
  const byName = (name: string) => b.world.getAllEntities().find((e) => e.name === name)!;
  const state = (id: string) => b.world.getStateValue(`${CHORD_STATE_PREFIX}${id}`);
  const room = () => b.world.getContainingRoom(b.player.id)!;
  return { ...b, byName, state, room };
}

const types = (result: { events: ISemanticEvent[] }) => result.events.map((e) => e.type);

describe('a sound heard in the world (ADR-374 D6)', () => {
  it('pulling the lever makes the klaxon; the robot next door hears it this turn', async () => {
    const b = await boot();
    expect(b.state('loader-robot')).toBe('idle');
    const result = await b.engine.executeTurn('pull lever');
    expect(types(result)).toContain(SOUND_EVENT_TYPES.EMITTED);
    expect(types(result)).toContain(SOUND_EVENT_TYPES.AUDIBILITY_HEARD);
    expect(b.state('loader-robot')).toBe('alerted');
  });

  it('who hears is ADR-172\'s propagation, not a rule of its own: the sensor two rooms on hears too', async () => {
    const b = await boot();
    expect(b.state('far-sensor')).toBe('waiting');
    await b.engine.executeTurn('pull lever');
    expect(b.state('far-sensor')).toBe('tripped');
  });

  it('a clause for another sound does not fire', async () => {
    const b = await boot();
    await b.engine.executeTurn('pull lever');
    expect(b.state('loader-robot')).not.toBe('chimed');
  });

  it('the listener lowers to the platform trait', async () => {
    const b = await boot();
    expect(b.byName('loader robot').has(TraitType.LISTENER)).toBe(true);
    expect(b.byName('deaf crate').has(TraitType.LISTENER)).toBe(false);
  });
});

describe('a flame light (ADR-374 D9)', () => {
  it('starts unlit, refuses without the matchbook, and lights with it', async () => {
    const b = await boot();
    const lantern = b.byName('lantern');
    expect((lantern.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(false);
    await b.engine.executeTurn('take lantern');
    await b.engine.executeTurn('light lantern');
    expect((lantern.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(false);
    await b.engine.executeTurn('take matchbook');
    await b.engine.executeTurn('light lantern');
    expect((lantern.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(true);
    await b.engine.executeTurn('down');
    expect(VisibilityBehavior.isDarkFor(b.player, b.room(), b.world)).toBe(false);
    await b.engine.executeTurn('blow out lantern');
    expect(VisibilityBehavior.isDarkFor(b.player, b.room(), b.world)).toBe(true);
  });
});

describe('a torch powered by its battery (ADR-374 D10)', () => {
  it('lowers powered by to the switch\'s power sources', async () => {
    const b = await boot();
    const torch = b.byName('torch');
    expect((torch.get(TraitType.SWITCHABLE) as SwitchableTrait).powerSourceIds).toEqual([b.byName('battery').id]);
  });

  it('lights the cellar only while the battery is inside it', async () => {
    const b = await boot();
    const torch = b.byName('torch');
    await b.engine.executeTurn('take torch');
    await b.engine.executeTurn('switch on torch');
    expect((torch.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(false);
    await b.engine.executeTurn('take battery');
    await b.engine.executeTurn('put battery in torch');
    await b.engine.executeTurn('switch on torch');
    expect((torch.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(true);
    await b.engine.executeTurn('down');
    expect(VisibilityBehavior.isDarkFor(b.player, b.room(), b.world)).toBe(false);
    await b.engine.executeTurn('take battery');
    expect(VisibilityBehavior.isDarkFor(b.player, b.room(), b.world)).toBe(true);
    expect((torch.get(TraitType.SWITCHABLE) as SwitchableTrait).isOn).toBe(true);
  });
});
