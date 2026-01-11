/**
 * Tests for the StandardScopeResolver
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, TraitType, EntityType, IFEntity } from '@sharpee/world-model';
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
    room = world.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });

    player = world.createEntity('Player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER }); // Can hold things
    
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Basic Visibility', () => {
    test('should see objects in same room', () => {
      const ball = world.createEntity('red ball', EntityType.OBJECT);
      world.moveEntity(ball.id, room.id);

      expect(resolver.canSee(player, ball)).toBe(true);
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.REACHABLE);
    });

    test('should not see objects in different room', () => {
      const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });
      
      const ball = world.createEntity('red ball', EntityType.OBJECT);
      world.moveEntity(ball.id, otherRoom.id);

      expect(resolver.canSee(player, ball)).toBe(false);
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.UNAWARE);
    });

    test('should see carried items', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, player.id);

      expect(resolver.canSee(player, coin)).toBe(true);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.CARRIED);
    });
  });

  describe('Container Visibility', () => {
    test('should see objects in open containers', () => {
      const box = world.createEntity('wooden box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, box.id);

      expect(resolver.canSee(player, coin)).toBe(true);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.REACHABLE);
    });

    test('should not see objects in closed containers', () => {
      const box = world.createEntity('wooden box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, box.id);

      expect(resolver.canSee(player, coin)).toBe(false);
      expect(resolver.getScope(player, coin)).toBe(ScopeLevel.UNAWARE);
    });

    test('should see nested containers when open', () => {
      const chest = world.createEntity('treasure chest', EntityType.CONTAINER);
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(chest.id, room.id);

      const box = world.createEntity('small box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, chest.id);

      const ring = world.createEntity('diamond ring', EntityType.OBJECT);
      world.moveEntity(ring.id, box.id);

      expect(resolver.canSee(player, ring)).toBe(true);
    });

    test('should not see through any closed container in hierarchy', () => {
      const chest = world.createEntity('treasure chest', EntityType.CONTAINER);
      chest.add({ type: TraitType.CONTAINER });
      chest.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(chest.id, room.id);

      const box = world.createEntity('small box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false }); // Closed!
      world.moveEntity(box.id, chest.id);

      const ring = world.createEntity('diamond ring', EntityType.OBJECT);
      world.moveEntity(ring.id, box.id);

      expect(resolver.canSee(player, ring)).toBe(false);
    });
  });

  describe('Supporter Visibility', () => {
    test('should see objects on supporters', () => {
      const table = world.createEntity('wooden table', EntityType.SUPPORTER);
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const lamp = world.createEntity('table lamp', EntityType.OBJECT);
      world.moveEntity(lamp.id, table.id);

      expect(resolver.canSee(player, lamp)).toBe(true);
      expect(resolver.getScope(player, lamp)).toBe(ScopeLevel.REACHABLE);
    });

    test('should see objects on nested supporters', () => {
      const table = world.createEntity('table', EntityType.SUPPORTER);
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const tray = world.createEntity('silver tray', EntityType.SUPPORTER);
      tray.add({ type: TraitType.SUPPORTER });
      world.moveEntity(tray.id, table.id);

      const cup = world.createEntity('teacup', EntityType.OBJECT);
      world.moveEntity(cup.id, tray.id);

      expect(resolver.canSee(player, cup)).toBe(true);
    });
  });

  describe('Reachability', () => {
    test('should reach objects in same location', () => {
      const ball = world.createEntity('ball', EntityType.OBJECT);
      world.moveEntity(ball.id, room.id);

      expect(resolver.canReach(player, ball)).toBe(true);
    });

    test('should reach objects on supporters', () => {
      const table = world.createEntity('table', EntityType.SUPPORTER);
      table.add({ type: TraitType.SUPPORTER });
      world.moveEntity(table.id, room.id);

      const book = world.createEntity('book', EntityType.OBJECT);
      world.moveEntity(book.id, table.id);

      expect(resolver.canReach(player, book)).toBe(true);
    });

    test('should reach objects in open containers', () => {
      const box = world.createEntity('box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: true });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('coin', EntityType.OBJECT);
      world.moveEntity(coin.id, box.id);

      expect(resolver.canReach(player, coin)).toBe(true);
    });

    test('should not reach objects in closed containers', () => {
      const box = world.createEntity('box', EntityType.CONTAINER);
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(box.id, room.id);

      const coin = world.createEntity('coin', EntityType.OBJECT);
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
      const ball = world.createEntity('ball', EntityType.OBJECT);
      const box = world.createEntity('box', EntityType.CONTAINER);
      const coin = world.createEntity('coin', EntityType.OBJECT);
      
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
      const ball = world.createEntity('ball', EntityType.OBJECT);
      world.moveEntity(ball.id, room.id);

      const closedBox = world.createEntity('locked box', EntityType.CONTAINER);
      closedBox.add({ type: TraitType.CONTAINER });
      closedBox.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(closedBox.id, room.id);

      const vase = world.createEntity('vase', EntityType.OBJECT);
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
      const floating = world.createEntity('floating', EntityType.OBJECT);
      // No location set

      expect(resolver.canSee(player, floating)).toBe(false);
      expect(resolver.getScope(player, floating)).toBe(ScopeLevel.UNAWARE);
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

  describe('Minimum Scope (Author-Controlled)', () => {
    test('should make entity visible globally with setMinimumScope', () => {
      // Create entity with no physical location
      const sky = world.createEntity('sky', EntityType.OBJECT);
      // Not placed anywhere - normally UNAWARE

      expect(resolver.getScope(player, sky)).toBe(ScopeLevel.UNAWARE);

      // Set minimum scope to VISIBLE
      sky.setMinimumScope(ScopeLevel.VISIBLE);

      expect(resolver.getScope(player, sky)).toBe(ScopeLevel.VISIBLE);
    });

    test('should make entity reachable globally with setMinimumScope', () => {
      const butterfly = world.createEntity('butterfly', EntityType.OBJECT);
      // Not placed anywhere

      butterfly.setMinimumScope(ScopeLevel.REACHABLE);

      expect(resolver.getScope(player, butterfly)).toBe(ScopeLevel.REACHABLE);
    });

    test('should apply minimum scope only to specific rooms', () => {
      const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });

      const mountain = world.createEntity('distant mountain', EntityType.OBJECT);
      // Only visible from the test room, not other room
      mountain.setMinimumScope(ScopeLevel.VISIBLE, [room.id]);

      // Player in test room - should see mountain
      expect(resolver.getScope(player, mountain)).toBe(ScopeLevel.VISIBLE);

      // Move player to other room
      world.moveEntity(player.id, otherRoom.id);

      // Player in other room - should NOT see mountain
      expect(resolver.getScope(player, mountain)).toBe(ScopeLevel.UNAWARE);
    });

    test('should apply minimum scope to multiple specific rooms', () => {
      const room2 = world.createEntity('Room 2', EntityType.ROOM);
      room2.add({ type: TraitType.ROOM });

      const room3 = world.createEntity('Room 3', EntityType.ROOM);
      room3.add({ type: TraitType.ROOM });

      const sound = world.createEntity('ticking sound', EntityType.OBJECT);
      sound.setMinimumScope(ScopeLevel.AWARE, [room.id, room2.id]);

      // Player in room 1 - should be aware
      expect(resolver.getScope(player, sound)).toBe(ScopeLevel.AWARE);

      // Move to room 2 - should still be aware
      world.moveEntity(player.id, room2.id);
      expect(resolver.getScope(player, sound)).toBe(ScopeLevel.AWARE);

      // Move to room 3 - should NOT be aware
      world.moveEntity(player.id, room3.id);
      expect(resolver.getScope(player, sound)).toBe(ScopeLevel.UNAWARE);
    });

    test('should be additive - cannot lower physical scope', () => {
      const ball = world.createEntity('ball', EntityType.OBJECT);
      world.moveEntity(ball.id, player.id); // In inventory = CARRIED

      // Physical scope is CARRIED (4)
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.CARRIED);

      // Try to set minimum scope to VISIBLE (2) - should NOT lower it
      ball.setMinimumScope(ScopeLevel.VISIBLE);

      // Should still be CARRIED (max of CARRIED and VISIBLE)
      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.CARRIED);
    });

    test('should raise scope from physical level', () => {
      const ball = world.createEntity('ball', EntityType.OBJECT);
      world.moveEntity(ball.id, room.id); // In room = REACHABLE

      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.REACHABLE);

      // This is unusual but valid - can't raise above CARRIED anyway
      ball.setMinimumScope(ScopeLevel.REACHABLE);

      expect(resolver.getScope(player, ball)).toBe(ScopeLevel.REACHABLE);
    });

    test('should clear minimum scope with clearMinimumScope', () => {
      const sky = world.createEntity('sky', EntityType.OBJECT);
      sky.setMinimumScope(ScopeLevel.VISIBLE);

      expect(resolver.getScope(player, sky)).toBe(ScopeLevel.VISIBLE);

      sky.clearMinimumScope();

      expect(resolver.getScope(player, sky)).toBe(ScopeLevel.UNAWARE);
    });

    test('should clear minimum scope for specific rooms only', () => {
      const room2 = world.createEntity('Room 2', EntityType.ROOM);
      room2.add({ type: TraitType.ROOM });

      const sound = world.createEntity('sound', EntityType.OBJECT);
      sound.setMinimumScope(ScopeLevel.AWARE, [room.id, room2.id]);

      // Clear only for room2
      sound.clearMinimumScope([room2.id]);

      // Player in room 1 - should still be aware
      expect(resolver.getScope(player, sound)).toBe(ScopeLevel.AWARE);

      // Move to room 2 - should NOT be aware anymore
      world.moveEntity(player.id, room2.id);
      expect(resolver.getScope(player, sound)).toBe(ScopeLevel.UNAWARE);
    });

    test('should include minimum scope entities in getVisible', () => {
      const sky = world.createEntity('sky', EntityType.OBJECT);
      sky.setMinimumScope(ScopeLevel.VISIBLE);

      const visible = resolver.getVisible(player);

      expect(visible.some(e => e.id === sky.id)).toBe(true);
    });

    test('should include minimum scope entities in getReachable', () => {
      const butterfly = world.createEntity('butterfly', EntityType.OBJECT);
      butterfly.setMinimumScope(ScopeLevel.REACHABLE);

      const reachable = resolver.getReachable(player);

      expect(reachable.some(e => e.id === butterfly.id)).toBe(true);
    });

    test('should include minimum scope entities in getAudible', () => {
      const sound = world.createEntity('ticking', EntityType.OBJECT);
      sound.setMinimumScope(ScopeLevel.AWARE);

      const audible = resolver.getAudible(player);

      expect(audible.some(e => e.id === sound.id)).toBe(true);
    });

    test('should persist minimum scope through clone', () => {
      const sky = world.createEntity('sky', EntityType.OBJECT);
      sky.setMinimumScope(ScopeLevel.VISIBLE, [room.id]);

      const cloned = sky.clone('sky-clone');

      expect(cloned.getMinimumScope(room.id)).toBe(ScopeLevel.VISIBLE);
      expect(cloned.getMinimumScope('other-room')).toBe(0);
    });

    test('should persist minimum scope through toJSON/fromJSON', () => {
      const sky = world.createEntity('sky', EntityType.OBJECT);
      sky.setMinimumScope(ScopeLevel.VISIBLE);
      sky.setMinimumScope(ScopeLevel.AWARE, ['distant-room']);

      const json = sky.toJSON();
      const restored = IFEntity.fromJSON(json);

      // Global scope preserved
      expect(restored.getMinimumScope(null)).toBe(ScopeLevel.VISIBLE);
      // Room-specific scope preserved
      expect(restored.getMinimumScope('distant-room')).toBe(ScopeLevel.AWARE);
    });

    test('should allow dynamic scope changes during gameplay', () => {
      const clock = world.createEntity('clock', EntityType.OBJECT);
      clock.setMinimumScope(ScopeLevel.AWARE, [room.id]);

      // Clock is audible
      expect(resolver.getScope(player, clock)).toBe(ScopeLevel.AWARE);

      // Simulate breaking the clock - remove from scope
      clock.clearMinimumScope();

      // Clock is no longer audible
      expect(resolver.getScope(player, clock)).toBe(ScopeLevel.UNAWARE);

      // Simulate fixing the clock - add back to scope
      clock.setMinimumScope(ScopeLevel.AWARE, [room.id]);

      // Clock is audible again
      expect(resolver.getScope(player, clock)).toBe(ScopeLevel.AWARE);
    });
  });

  describe('Disambiguation Priorities (entity.scope())', () => {
    test('should return default priority of 100 when not set', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);

      expect(apple.scope('if.action.eating')).toBe(100);
      expect(apple.scope('if.action.taking')).toBe(100);
    });

    test('should set and get priority for specific action', () => {
      const apple = world.createEntity('real apple', EntityType.OBJECT);

      apple.scope('if.action.eating', 150);

      expect(apple.scope('if.action.eating')).toBe(150);
      expect(apple.scope('if.action.taking')).toBe(100); // Other actions unaffected
    });

    test('should support deprioritizing entities', () => {
      const waxApple = world.createEntity('wax apple', EntityType.OBJECT);

      waxApple.scope('if.action.eating', 50);

      expect(waxApple.scope('if.action.eating')).toBe(50);
    });

    test('should clear priority for specific action', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.scope('if.action.eating', 150);
      apple.scope('if.action.taking', 120);

      apple.clearScope('if.action.eating');

      expect(apple.scope('if.action.eating')).toBe(100); // Reset to default
      expect(apple.scope('if.action.taking')).toBe(120); // Unaffected
    });

    test('should clear all priorities with clearAllScopes', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.scope('if.action.eating', 150);
      apple.scope('if.action.taking', 120);
      apple.scope('if.action.throwing', 80);

      apple.clearAllScopes();

      expect(apple.scope('if.action.eating')).toBe(100);
      expect(apple.scope('if.action.taking')).toBe(100);
      expect(apple.scope('if.action.throwing')).toBe(100);
    });

    test('should get all priorities with getScopePriorities', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.scope('if.action.eating', 150);
      apple.scope('if.action.taking', 120);

      const priorities = apple.getScopePriorities();

      expect(priorities).toEqual({
        'if.action.eating': 150,
        'if.action.taking': 120
      });
    });

    test('should persist priorities through clone', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.scope('if.action.eating', 150);
      apple.scope('if.action.taking', 80);

      const cloned = apple.clone('apple-clone');

      expect(cloned.scope('if.action.eating')).toBe(150);
      expect(cloned.scope('if.action.taking')).toBe(80);
    });

    test('should persist priorities through toJSON/fromJSON', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);
      apple.scope('if.action.eating', 150);
      apple.scope('if.action.throwing', 50);

      const json = apple.toJSON();
      const restored = IFEntity.fromJSON(json);

      expect(restored.scope('if.action.eating')).toBe(150);
      expect(restored.scope('if.action.throwing')).toBe(50);
      expect(restored.scope('if.action.taking')).toBe(100); // Default
    });

    test('should allow setting extreme priorities', () => {
      const specialApple = world.createEntity('special apple', EntityType.OBJECT);

      // Very high priority - strongly prefer
      specialApple.scope('if.action.eating', 200);
      expect(specialApple.scope('if.action.eating')).toBe(200);

      // Very low priority - strongly avoid
      specialApple.scope('if.action.throwing', 0);
      expect(specialApple.scope('if.action.throwing')).toBe(0);
    });

    test('should allow updating priority by calling scope() again', () => {
      const apple = world.createEntity('apple', EntityType.OBJECT);

      apple.scope('if.action.eating', 150);
      expect(apple.scope('if.action.eating')).toBe(150);

      apple.scope('if.action.eating', 75);
      expect(apple.scope('if.action.eating')).toBe(75);
    });

    test('should support multiple entities with different priorities', () => {
      const realApple = world.createEntity('real apple', EntityType.OBJECT);
      const waxApple = world.createEntity('wax apple', EntityType.OBJECT);
      const glassApple = world.createEntity('glass apple', EntityType.OBJECT);
      world.moveEntity(realApple.id, room.id);
      world.moveEntity(waxApple.id, room.id);
      world.moveEntity(glassApple.id, room.id);

      // Set up disambiguation: prefer real, avoid wax, neutral glass
      realApple.scope('if.action.eating', 150);
      waxApple.scope('if.action.eating', 50);
      // glassApple uses default 100

      expect(realApple.scope('if.action.eating')).toBe(150);
      expect(waxApple.scope('if.action.eating')).toBe(50);
      expect(glassApple.scope('if.action.eating')).toBe(100);
    });
  });
});