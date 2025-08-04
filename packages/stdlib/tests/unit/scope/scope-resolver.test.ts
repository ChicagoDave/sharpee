/**
 * Tests for the StandardScopeResolver
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, TraitType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../../../src/scope/scope-resolver';
import { ScopeLevel } from '../../../src/scope/types';

describe('StandardScopeResolver', () => {
  let world: WorldModel;
  let resolver: StandardScopeResolver;
  let player: any;
  let room: any;

  beforeEach(() => {
    world = new WorldModel();
    resolver = new StandardScopeResolver(world);

    // Create basic test world
    room = world.createEntity('Test Room', 'room');
    room.add({ type: TraitType.ROOM });

    player = world.createEntity('Player', 'actor');
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER }); // Can hold things
    
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Basic Visibility', () => {
    test('should see objects in same room', () => {
      const ball = world.createEntity('red ball', 'thing');
      world.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(true);
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.REACHABLE);
    });

    test('should not see objects in different room', () => {
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      const ball = world.createEntity('red ball', 'thing');
      world.moveEntity(ball.id, otherRoom.id);

      expect(resolver.canSee(player, ball)).toBe(false);
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.OUT_OF_SCOPE);
    });

    test('should see carried items', () => {
      const coin = world.createEntity('gold coin', 'thing');
      world.moveEntity(coin.id, player.id);

      expect(resolver.canSee(player, coin)).toBe(true);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.CARRIED);
    });
  });

  describe('Container Visibility', () => {
    test('should see objects in open containers', () => {
      const box = world.createEntity('wooden box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('gold coin', 'thing');
      world.moveEntity(coin.id, box.id);

      expect(resolver.canSee(player, coin)).toBe(true);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.REACHABLE);
    });

    test('should not see objects in closed containers', () => {
      const box = world.createEntity('wooden box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('gold coin', 'thing');
      world.moveEntity(coin.id, box.id);

      expect(resolver.canSee(player, coin)).toBe(false);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.OUT_OF_SCOPE);
    });

    test('should see nested containers when open', () => {
      const chest = world.createEntity('treasure chest', 'container');
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(chest.id, room.id);

      const box = world.createEntity('small box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, chest.id);

      const ring = world.createEntity('diamond ring', 'thing');
      world.moveEntity(ring.id, box.id);

      expect(resolver.canSee(player, ring)).toBe(true);
    });

    test('should not see through any closed container in hierarchy', () => {
      const chest = world.createEntity('treasure chest', 'container');
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(chest.id, room.id);

      const box = world.createEntity('small box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false }); // Closed!
      world.moveEntity(box.id, chest.id);

      const ring = world.createEntity('diamond ring', 'thing');
      world.moveEntity(ring.id, box.id);

      expect(resolver.canSee(player, ring)).toBe(false);
    });
  });

  describe('Supporter Visibility', () => {
    test('should see objects on supporters', () => {
      const table = world.createEntity('wooden table', 'supporter');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const lamp = world.createEntity('table lamp', 'thing');
      world.moveEntity(lamp.id, table.id);

      expect(resolver.canSee(player, lamp)).toBe(true);
      expect(resolver.getScope(player, lamp)).toBe(ScopeLevel.REACHABLE);
    });

    test('should see objects on nested supporters', () => {
      const table = world.createEntity('table', 'supporter');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const tray = world.createEntity('silver tray', 'supporter');
      tray.add({ type: TraitType.SUPPORTER });
      world.moveEntity(tray.id, table.id);

      const cup = world.createEntity('teacup', 'thing');
      world.moveEntity(cup.id, tray.id);

      expect(resolver.canSee(player, cup)).toBe(true);
    });
  });

  describe('Reachability', () => {
    test('should reach objects in same location', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      expect(resolver.canReach(player, ball)).toBe(true);
    });

    test('should reach objects on supporters', () => {
      const table = world.createEntity('table', 'supporter');
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const book = world.createEntity('book', 'thing');
      world.moveEntity(book.id, table.id);

      expect(resolver.canReach(player, book)).toBe(true);
    });

    test('should reach objects in open containers', () => {
      const box = world.createEntity('box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('coin', 'thing');
      world.moveEntity(coin.id, box.id);

      expect(resolver.canReach(player, coin)).toBe(true);
    });

    test('should not reach objects in closed containers', () => {
      const box = world.createEntity('box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('coin', 'thing');
      world.moveEntity(coin.id, box.id);

      expect(resolver.canReach(player, coin)).toBe(false);
    });

    test('should not reach high objects', () => {
      // Since height is conceptual, not physical, we'll skip this test
      // until we implement a proper "reachability" trait or property
      // that authors can use to mark things as out of reach
    });
  });

  describe('getVisible and getReachable', () => {
    test('should return all visible entities', () => {
      const ball = world.createEntity('ball', 'thing');
      const box = world.createEntity('box', 'container');
      const coin = world.createEntity('coin', 'thing');
      
      world.moveEntity(ball.id, room.id);
      world.moveEntity(box.id, room.id);
      world.moveEntity(coin.id, player.id); // Carried

      const visible = resolver.getVisible(player);
      
      expect(visible).toHaveLength(3); // ball, box, coin
      expect(visible.map(e => e.name)).toContain('ball');
      expect(visible.map(e => e.name)).toContain('box');
      expect(visible.map(e => e.name)).toContain('coin');
    });

    test('should return only reachable entities', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const closedBox = world.createEntity('locked box', 'container');
      closedBox.add({ type: TraitType.CONTAINER });
      closedBox.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(closedBox.id, room.id);

      const vase = world.createEntity('vase', 'thing');
      world.moveEntity(vase.id, closedBox.id);

      const reachable = resolver.getReachable(player);
      
      expect(reachable).toHaveLength(2);
      expect(reachable.map(e => e.name)).toContain('ball');
      expect(reachable.map(e => e.name)).toContain('locked box');
      // vase is not reachable because it's in a closed container
    });
  });

  describe('Edge Cases', () => {
    test('should handle entities with no location', () => {
      const floating = world.createEntity('floating', 'thing');
      // No location set

      expect(resolver.canSee(player, floating)).toBe(false);
      expect(resolver.getScope(player, floating)).toBe(ScopeLevel.OUT_OF_SCOPE);
    });

    test('should handle circular containment gracefully', () => {
      const box1 = world.createEntity('box1', 'container');
      const box2 = world.createEntity('box2', 'container');
      
      // This would be invalid, but we should handle it
      world.moveEntity(box1.id, box2.id);
      world.moveEntity(box2.id, box1.id);

      // Should not crash
      expect(resolver.canSee(player, box1)).toBe(false);
    });
  });
});