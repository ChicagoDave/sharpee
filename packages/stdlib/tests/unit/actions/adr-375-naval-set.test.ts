/**
 * The naval command set (ADR-375 D3, D7; Chord 4.0 Phase 13 Slice 6): turns
 * by degrees with and without the word, bare turns refused, hard over,
 * ahead on the bearing, coming about with its two refusals, the sail words
 * and their end refusals, and the set refused on a vehicle without it.
 * Every test asserts on the trait's fields and the message id the player
 * would read.
 */

import { describe, test, expect } from 'vitest';
import {
  ContainerTrait,
  EnterableTrait,
  ExpanseTrait,
  IdentityTrait,
  RoomTrait,
  VehicleTrait,
  type IFEntity,
  type VehicleOpenModel,
  WorldModel,
} from '@sharpee/world-model';
import { steeringAction } from '../../../src/actions/standard/steering';
import { IFActions } from '../../../src/actions/constants';
import { createCommand, createRealTestContext, executeWithValidation, setupBasicWorld } from '../../test-utils';

const TABLE = {
  bands: [
    { from: 0, to: 44, paces: [{ setting: 'furled', pace: 'stopped' as const }, { setting: 'full', pace: 'stopped' as const }] },
    { from: 45, to: 180, paces: [{ setting: 'furled', pace: 'stopped' as const }, { setting: 'full', pace: 1 }] },
  ],
  calm: 'stopped' as const,
};

interface Sea {
  world: WorldModel;
  player: IFEntity;
  sea: IFEntity;
  ship: IFEntity;
}

function sea(commands: string[] = ['naval'], withSails = true): Sea {
  const { world, player } = setupBasicWorld();
  const expanse = world.createEntity('Sargasso', 'room');
  expanse.add(new RoomTrait());
  expanse.add(new IdentityTrait({ name: 'Sargasso' }));
  expanse.add(new ExpanseTrait({ width: 40, height: 40, wind: 45 }));
  const ship = world.createEntity('Marigold', 'object');
  ship.add(new IdentityTrait({ name: 'Marigold' }));
  ship.add(new ContainerTrait());
  ship.add(new EnterableTrait());
  ship.add(new VehicleTrait({
    model: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 8, sailing: TABLE, position: { x: 20, y: 20 }, ...(withSails ? { sails: { settings: ['furled', 'full'], current: 'furled' } } : {}) },
    commands,
  }));
  world.moveEntity(ship.id, expanse.id);
  world.moveEntity(player.id, ship.id);
  return { world, player, sea: expanse, ship };
}

function model(ship: IFEntity): VehicleOpenModel {
  return ship.get(VehicleTrait)!.model as VehicleOpenModel;
}

function messageIds(events: { data?: any }[]): string[] {
  return events.map((e) => e.data?.messageId).filter((id): id is string => typeof id === 'string');
}

function say(world: WorldModel, verb: string, topic?: string) {
  const command = createCommand(IFActions.STEERING, { verb });
  if (topic !== undefined) command.topic = { text: topic };
  return executeWithValidation(steeringAction, createRealTestContext(steeringAction, world, command));
}

describe('turns (D3)', () => {
  test('`starboard 15 degrees` and `starboard 15` turn from north when the ship has no bearing; `port` turns back; bare `port` asks how far', () => {
    const { world, ship } = sea();
    expect(messageIds(say(world, 'starboard', '15 degrees'))).toContain('if.action.steering.turned');
    expect(model(ship).heading).toBe(15);
    expect(messageIds(say(world, 'starboard', '15'))).toContain('if.action.steering.turned');
    expect(model(ship).heading).toBe(30);
    expect(messageIds(say(world, 'port', '45'))).toContain('if.action.steering.turned');
    expect(model(ship).heading).toBe(345);
    expect(messageIds(say(world, 'port'))).toContain('if.action.steering.naval_how_far');
    expect(model(ship).heading).toBe(345);
    expect(model(ship).underWay).toBe(false);
  });

  test('`hard to port` and `hard to starboard` turn ninety; a turn under way keeps the ship under way', () => {
    const { world, ship } = sea();
    say(world, 'ahead');
    expect(model(ship)).toMatchObject({ heading: 0, underWay: true });
    expect(messageIds(say(world, 'hard to starboard'))).toContain('if.action.steering.turned');
    expect(model(ship)).toMatchObject({ heading: 90, underWay: true });
    say(world, 'hard to port');
    expect(model(ship).heading).toBe(0);
  });

  test('`ahead` puts the ship under way on its bearing and `heave to` keeps the bearing', () => {
    const { world, ship } = sea();
    say(world, 'starboard', '135');
    expect(messageIds(say(world, 'ahead'))).toContain('if.action.steering.ahead');
    expect(model(ship)).toMatchObject({ heading: 135, underWay: true });
    expect(messageIds(say(world, 'heave to'))).toContain('if.action.steering.vehicle_no_such_command');
    const { world: w2, ship: s2 } = sea(['naval', 'compass']);
    say(w2, 'starboard', '135');
    say(w2, 'ahead');
    expect(messageIds(say(w2, 'heave to'))).toContain('if.action.steering.hove_to');
    expect(model(s2)).toMatchObject({ heading: 135, underWay: false });
  });

  test('at an edge, ahead on a bearing into it is refused and the ship stays hove to; a turn away is not', () => {
    const { world, ship } = sea();
    model(ship).position = { x: 20, y: 39 };
    model(ship).atEdge = 'NORTH';
    expect(messageIds(say(world, 'ahead'))).toContain('if.action.steering.expanse_edge');
    expect(model(ship)).toMatchObject({ heading: null, underWay: false });
    say(world, 'starboard', '90');
    expect(messageIds(say(world, 'ahead'))).toContain('if.action.steering.ahead');
    expect(model(ship)).toMatchObject({ heading: 90, underWay: true });
  });

  test('the set is refused aboard a vehicle without it', () => {
    const { world, ship } = sea(['compass']);
    expect(messageIds(say(world, 'starboard', '15'))).toContain('if.action.steering.vehicle_no_such_command');
    expect(model(ship).heading).toBeNull();
  });
});

describe('coming about (D3)', () => {
  test('mirrors the bearing across the wind; dead into or before it, or in a calm, refuses', () => {
    const { world, sea: expanse, ship } = sea();
    say(world, 'starboard', '90');
    expect(messageIds(say(world, 'come about'))).toContain('if.action.steering.came_about');
    expect(model(ship).heading).toBe(0);
    say(world, 'starboard', '45');
    expect(messageIds(say(world, 'come about'))).toContain('if.action.steering.naval_cannot_come_about');
    expect(model(ship).heading).toBe(45);
    expanse.get(ExpanseTrait)!.wind = 'calm';
    expect(messageIds(say(world, 'come about'))).toContain('if.action.steering.naval_no_wind');
  });
});

describe('the sail words (D7)', () => {
  test('make sail, shorten sail and furl sails move one setting at a time, refusing at the ends', () => {
    const { world, ship } = sea();
    expect(messageIds(say(world, 'shorten sail'))).toContain('if.action.steering.sails_already_furled');
    expect(messageIds(say(world, 'furl sails'))).toContain('if.action.steering.sails_already_furled');
    expect(messageIds(say(world, 'make sail'))).toContain('if.action.steering.sail_made');
    expect(model(ship).sails!.current).toBe('full');
    expect(messageIds(say(world, 'make sail'))).toContain('if.action.steering.sails_at_full');
    expect(messageIds(say(world, 'shorten sail'))).toContain('if.action.steering.sail_shortened');
    expect(model(ship).sails!.current).toBe('furled');
    say(world, 'make sail');
    expect(messageIds(say(world, 'furl sails'))).toContain('if.action.steering.sails_furled');
    expect(model(ship).sails!.current).toBe('furled');
  });

  test('the sail words are refused aboard a ship without sails', () => {
    const { world } = sea(['naval'], false);
    expect(messageIds(say(world, 'make sail'))).toContain('if.action.steering.vehicle_no_such_command');
  });
});
