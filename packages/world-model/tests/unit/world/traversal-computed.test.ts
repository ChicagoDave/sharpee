/**
 * The computed way's two halves in traversal's one home (ADR-295 D5,
 * ADR-366 D6/D7, ADR-379; alignment finding F1, David's Q1 answer A):
 * `wayFor` refuses a computed way no candidate admits, and
 * `resolveComputed` draws the destination once and refuses the room it
 * reaches when that room does not admit the mover. A compass vehicle's
 * step takes a computed way by the same rule.
 *
 * The scenario is Q1's: a jolly boat steered west out of a ferry's Well
 * Deck (`west to outside`) rows into the Harbour when the ferry lies there
 * and the Harbour admits it, is refused at a quay that does not, and is
 * refused as a walker is while the ferry is under way. Each test asserts on
 * the answer against world state it set, or on where the boat ends up.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { RandomService } from '@sharpee/core';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { AboardTrait } from '../../../src/traits/vehicle/aboardTrait';
import { VehicleTrait } from '../../../src/traits/vehicle/vehicleTrait';
import { Direction } from '../../../src/constants/directions';
import { TraversalBehavior, type TraversalMover } from '../../../src/world/TraversalBehavior';
import { registerVehicleExitResolver, startVehicle, stepVehicle } from '../../../src/traits/vehicle/vehicleBehavior';

/**
 * The resolvers these tests take never draw (the outside exit reads where
 * the vehicle is; the counting resolver returns a fixed room), so any draw
 * is a defect and throws.
 */
const noDraws = new Proxy({}, { get: () => () => { throw new Error('this traversal draws nothing'); } }) as RandomService;

describe('a computed way, admitted by traversal (F1)', () => {
  let world: WorldModel;
  let harbour: IFEntity;
  let quay: IFEntity;
  let wellDeck: IFEntity;
  let ferry: IFEntity;
  let boat: IFEntity;
  let player: IFEntity;
  let steered: TraversalMover;
  let walker: TraversalMover;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function vehicle(name: string, trait: VehicleTrait, at: IFEntity): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(trait);
    world.moveEntity(v.id, at.id);
    return v;
  }

  function ferryModel(): { underWay: boolean } {
    return ferry.get(VehicleTrait)!.model as unknown as { underWay: boolean };
  }

  const ctx = () => ({ world, actorId: player.id, random: noDraws });

  beforeEach(() => {
    world = new WorldModel();
    harbour = room('Harbour');
    quay = room('Quay');
    ferry = vehicle('ferry', new VehicleTrait({ model: { kind: 'line', stops: [harbour.id, quay.id], oneWay: false, drive: 'control', pace: 1 } }), harbour);
    wellDeck = room('Well Deck');
    wellDeck.add(new AboardTrait({ vehicleId: ferry.id, outside: { [Direction.WEST]: { candidates: [harbour.id, quay.id] } } }));
    registerVehicleExitResolver(world);
    boat = vehicle('jolly boat', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 1 } }), wellDeck);
    harbour.get(RoomTrait)!.admits.vehicles.push(boat.id);
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait());
    world.moveEntity(player.id, boat.id);
    steered = { kind: 'steered', vehicle: boat };
    walker = { kind: 'walker', entity: player };
  });

  describe('wayFor, before the draw', () => {
    it('answers computed while some candidate admits the boat', () => {
      expect(TraversalBehavior.wayFor(world, wellDeck, Direction.WEST, steered).kind).toBe('computed');
    });

    it('refuses not_admitted when no candidate admits the boat, a pushed crate pushing_not_admitted', () => {
      harbour.get(RoomTrait)!.admits.vehicles = [];
      expect(TraversalBehavior.wayFor(world, wellDeck, Direction.WEST, steered)).toMatchObject({ kind: 'refused', reason: 'not_admitted' });
      const crate = world.createEntity('crate', EntityType.ITEM);
      expect(TraversalBehavior.wayFor(world, wellDeck, Direction.WEST, { kind: 'walker', entity: player, pushing: crate })).toMatchObject({ kind: 'refused', reason: 'pushing_not_admitted' });
    });

    it('never refuses a walker for admittance', () => {
      harbour.get(RoomTrait)!.admits.vehicles = [];
      expect(TraversalBehavior.wayFor(world, wellDeck, Direction.WEST, walker).kind).toBe('computed');
    });
  });

  describe('resolveComputed, at the draw', () => {
    it('reaches the Harbour when the ferry lies there and the Harbour admits the boat', () => {
      expect(TraversalBehavior.resolveComputed(world, wellDeck, Direction.WEST, steered, ctx())).toEqual({ kind: 'exit', destination: harbour.id });
    });

    it('refuses not_admitted at a quay that does not admit the boat, but lets a walker off there', () => {
      world.moveEntity(ferry.id, quay.id);
      expect(TraversalBehavior.resolveComputed(world, wellDeck, Direction.WEST, steered, ctx())).toEqual({ kind: 'refused', reason: 'not_admitted' });
      expect(TraversalBehavior.resolveComputed(world, wellDeck, Direction.WEST, walker, ctx())).toEqual({ kind: 'exit', destination: quay.id });
    });

    it("passes the resolver's own block through while the ferry is under way", () => {
      ferryModel().underWay = true;
      expect(TraversalBehavior.resolveComputed(world, wellDeck, Direction.WEST, steered, ctx())).toMatchObject({ kind: 'blocked', messageId: 'if.action.going.vehicle_under_way' });
    });

    it('answers undefined for a way that is not computed', () => {
      harbour.get(RoomTrait)!.exits[Direction.EAST] = { destination: quay.id };
      expect(TraversalBehavior.resolveComputed(world, harbour, Direction.EAST, walker, ctx())).toBeUndefined();
    });

    it('calls the resolver exactly once, and admits a deferring resolver\'s static exit by the same rule', () => {
      let calls = 0;
      let defer = false;
      world.registerExitResolver('test.trait.carousel', () => {
        calls += 1;
        return defer ? undefined : { kind: 'exit', destination: harbour.id };
      });
      const hub = room('Hub');
      hub.get(RoomTrait)!.exits[Direction.NORTH] = { destination: quay.id };
      hub.add({ type: 'test.trait.carousel', computedExits: { [Direction.NORTH]: { candidates: [harbour.id, quay.id] } } } as never);

      expect(TraversalBehavior.resolveComputed(world, hub, Direction.NORTH, steered, ctx())).toEqual({ kind: 'exit', destination: harbour.id });
      expect(calls).toBe(1);

      defer = true;
      expect(TraversalBehavior.resolveComputed(world, hub, Direction.NORTH, steered, ctx())).toEqual({ kind: 'refused', reason: 'not_admitted' });
      expect(calls).toBe(2);
      quay.get(RoomTrait)!.admits.vehicles.push(boat.id);
      expect(TraversalBehavior.resolveComputed(world, hub, Direction.NORTH, steered, ctx())).toEqual({ kind: 'exit', destination: quay.id });
    });

    it('refuses no_exit when the resolver defers and there is no static exit to fall back on', () => {
      world.registerExitResolver('test.trait.void', () => undefined);
      const hub = room('Hub');
      hub.add({ type: 'test.trait.void', computedExits: { [Direction.NORTH]: { candidates: [harbour.id] } } } as never);
      expect(TraversalBehavior.resolveComputed(world, hub, Direction.NORTH, walker, ctx())).toEqual({ kind: 'refused', reason: 'no_exit' });
    });
  });

  describe("a compass vehicle's step (Q1 A)", () => {
    it('rows the boat into the Harbour, carrying the rower', () => {
      startVehicle(world, boat, Direction.WEST);
      expect(stepVehicle(world, boat, undefined, noDraws)).toEqual({ kind: 'arrived', roomId: harbour.id });
      expect(world.getLocation(boat.id)).toBe(harbour.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(harbour.id);
    });

    it('stops the boat in the Well Deck when the ferry lies at the quay, and while it is under way', () => {
      world.moveEntity(ferry.id, quay.id);
      startVehicle(world, boat, Direction.WEST);
      expect(stepVehicle(world, boat, undefined, noDraws)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(boat.id)).toBe(wellDeck.id);

      world.moveEntity(ferry.id, harbour.id);
      ferryModel().underWay = true;
      startVehicle(world, boat, Direction.WEST);
      expect(stepVehicle(world, boat, undefined, noDraws)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(boat.id)).toBe(wellDeck.id);
    });

    it('throws rather than stop silently when the host passes no random service', () => {
      startVehicle(world, boat, Direction.WEST);
      expect(() => stepVehicle(world, boat)).toThrow(/no random service/);
      expect(world.getLocation(boat.id)).toBe(wellDeck.id);
    });
  });
});
