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

    test('should make entity reachable from vehicle room via setMinimumScope', () => {
      // Scenario: player is in a balloon (item) which is in vairRoom,
      // but hook is scenery in a different room (ledgeRoom).
      // setMinimumScope(REACHABLE, [vairRoom]) should make the hook reachable.

      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const ledgeRoom = world.createEntity('Narrow Ledge', EntityType.ROOM);
      ledgeRoom.add({ type: TraitType.ROOM });

      // Balloon is an enterable item (vehicle) in the vair room.
      // Must also have ENTERABLE trait so canContain() allows moveEntity.
      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      world.moveEntity(balloon.id, vairRoom.id);

      // Player is inside the balloon — verify move succeeds
      const moved = world.moveEntity(player.id, balloon.id);
      expect(moved).toBe(true);
      expect(world.getLocation(player.id)).toBe(balloon.id);

      // Hook is scenery in the ledge room (different room!)
      const hook = world.createEntity('hook', EntityType.SCENERY);
      hook.add({ type: TraitType.SCENERY });
      world.moveEntity(hook.id, ledgeRoom.id);

      // Without minimum scope, hook is UNAWARE (different rooms)
      expect(resolver.getScope(player, hook)).toBe(ScopeLevel.UNAWARE);

      // Set minimum scope: hook is REACHABLE from the vair room
      hook.setMinimumScope(ScopeLevel.REACHABLE, [vairRoom.id]);

      // Now the hook should be REACHABLE because:
      // 1. getContainingRoom(player) walks: player → balloon → vairRoom
      // 2. hook.getMinimumScope(vairRoom.id) returns REACHABLE (3)
      // 3. max(UNAWARE, REACHABLE) = REACHABLE
      expect(resolver.getScope(player, hook)).toBe(ScopeLevel.REACHABLE);
    });

    test('should NOT make entity reachable from wrong vehicle room', () => {
      // Same setup, but the hook's minimum scope is for a different room
      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const otherVairRoom = world.createEntity('Other Vair Room', EntityType.ROOM);
      otherVairRoom.add({ type: TraitType.ROOM });

      const ledgeRoom = world.createEntity('Wide Ledge', EntityType.ROOM);
      ledgeRoom.add({ type: TraitType.ROOM });

      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      world.moveEntity(balloon.id, vairRoom.id);

      const moved = world.moveEntity(player.id, balloon.id);
      expect(moved).toBe(true);

      const hook = world.createEntity('hook', EntityType.SCENERY);
      hook.add({ type: TraitType.SCENERY });
      world.moveEntity(hook.id, ledgeRoom.id);

      // Hook is reachable from otherVairRoom, NOT from vairRoom
      hook.setMinimumScope(ScopeLevel.REACHABLE, [otherVairRoom.id]);

      // Player is in vairRoom via balloon — hook should still be UNAWARE
      expect(resolver.getScope(player, hook)).toBe(ScopeLevel.UNAWARE);
    });

    test('should include vehicle-scoped entities in getReachable', () => {
      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const ledgeRoom = world.createEntity('Ledge Room', EntityType.ROOM);
      ledgeRoom.add({ type: TraitType.ROOM });

      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      world.moveEntity(balloon.id, vairRoom.id);

      const moved = world.moveEntity(player.id, balloon.id);
      expect(moved).toBe(true);

      const hook = world.createEntity('hook', EntityType.SCENERY);
      hook.add({ type: TraitType.SCENERY });
      // Hook is in a DIFFERENT room (not the one the player came from)
      world.moveEntity(hook.id, ledgeRoom.id);

      hook.setMinimumScope(ScopeLevel.REACHABLE, [vairRoom.id]);

      const reachable = resolver.getReachable(player);
      expect(reachable.some(e => e.id === hook.id)).toBe(true);
    });

    test('should preserve vehicle scope through WorldModel serialization round-trip', () => {
      // This test reproduces the exact runtime scenario:
      // 1. Build world with player in balloon, hook in different room
      // 2. Set minimumScope on hook
      // 3. Serialize via WorldModel.toJSON()
      // 4. Restore via WorldModel.loadJSON()
      // 5. Verify scope resolution still works

      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const ledgeRoom = world.createEntity('Narrow Ledge', EntityType.ROOM);
      ledgeRoom.add({ type: TraitType.ROOM });

      // Balloon is enterable vehicle in vairRoom
      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      balloon.add({ type: TraitType.CONTAINER }); // Balloon also has container (like real game)
      world.moveEntity(balloon.id, vairRoom.id);

      // Player enters balloon
      const moved = world.moveEntity(player.id, balloon.id);
      expect(moved).toBe(true);

      // Hook is scenery in ledge room
      const hook = world.createEntity('hook', EntityType.SCENERY);
      hook.add({ type: TraitType.SCENERY });
      world.moveEntity(hook.id, ledgeRoom.id);

      // Wire is inside balloon (carried by player or in balloon)
      const wire = world.createEntity('braided wire', EntityType.OBJECT);
      world.moveEntity(wire.id, balloon.id);

      // Set minimum scope: hook is REACHABLE from vairRoom
      hook.setMinimumScope(ScopeLevel.REACHABLE, [vairRoom.id]);

      // TRACE: Pre-serialization state
      const preScope = resolver.getScope(player, hook);
      console.log('=== PRE-SERIALIZATION TRACE ===');
      console.log('Player ID:', player.id);
      console.log('Player location:', world.getLocation(player.id));
      console.log('Balloon ID:', balloon.id);
      console.log('Balloon location:', world.getLocation(balloon.id));
      console.log('VairRoom ID:', vairRoom.id);
      console.log('LedgeRoom ID:', ledgeRoom.id);
      console.log('Hook ID:', hook.id);
      console.log('Hook location:', world.getLocation(hook.id));
      console.log('Hook minimumScopes:', hook.getMinimumScopes());
      console.log('Hook scope (pre-serialize):', preScope);
      expect(preScope).toBe(ScopeLevel.REACHABLE);

      // Serialize the world
      const json = world.toJSON();

      // Create a fresh world and load from JSON
      const world2 = new WorldModel();
      world2.loadJSON(json);

      // Create new resolver for the restored world
      const resolver2 = new StandardScopeResolver(world2);

      // Get restored entities
      const player2 = world2.getPlayer()!;
      const hook2 = world2.getEntity(hook.id)!;
      const balloon2 = world2.getEntity(balloon.id)!;
      const wire2 = world2.getEntity(wire.id)!;

      // TRACE: Post-deserialization state
      console.log('\n=== POST-DESERIALIZATION TRACE ===');
      console.log('Player2 ID:', player2.id);
      console.log('Player2 location:', world2.getLocation(player2.id));
      console.log('Balloon2 ID:', balloon2.id);
      console.log('Balloon2 location:', world2.getLocation(balloon2.id));
      console.log('Hook2 ID:', hook2.id);
      console.log('Hook2 location:', world2.getLocation(hook2.id));
      console.log('Hook2 minimumScopes:', hook2.getMinimumScopes());
      console.log('Hook2 has SCENERY trait:', hook2.has(TraitType.SCENERY));
      console.log('Balloon2 has ROOM trait:', balloon2.has(TraitType.ROOM));
      console.log('Balloon2 has VEHICLE trait:', balloon2.has(TraitType.VEHICLE));

      // Verify the restored entities exist
      expect(player2).toBeDefined();
      expect(hook2).toBeDefined();
      expect(balloon2).toBeDefined();
      expect(wire2).toBeDefined();

      // Verify spatial relationships survived
      expect(world2.getLocation(player2.id)).toBe(balloon2.id);
      expect(world2.getLocation(balloon2.id)).toBe(vairRoom.id);
      expect(world2.getLocation(hook2.id)).toBe(ledgeRoom.id);

      // Verify minimumScopes survived
      expect(hook2.getMinimumScope(vairRoom.id)).toBe(ScopeLevel.REACHABLE);

      // THE CRITICAL TEST: Does scope resolution work after deserialization?
      const postScope = resolver2.getScope(player2, hook2);
      console.log('Hook2 scope (post-deserialize):', postScope);
      console.log('Expected:', ScopeLevel.REACHABLE, '(REACHABLE)');

      expect(postScope).toBe(ScopeLevel.REACHABLE);
    });

    test('should resolve entities by name + scope after serialization (command validator flow)', () => {
      // This simulates what the command validator does:
      // 1. Find entities by name (world.findWhere matching entity.name)
      // 2. Filter by scope
      // This tests the FULL chain that fails at runtime with ENTITY_NOT_FOUND

      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const ledgeRoom = world.createEntity('Narrow Ledge', EntityType.ROOM);
      ledgeRoom.add({ type: TraitType.ROOM });

      // Balloon
      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      balloon.add({ type: TraitType.CONTAINER });
      world.moveEntity(balloon.id, vairRoom.id);

      // Player in balloon
      world.moveEntity(player.id, balloon.id);

      // Wire in balloon (with alias "wire")
      const wire = world.createEntity('braided wire', EntityType.SCENERY);
      wire.add({ type: TraitType.IDENTITY, name: 'braided wire', aliases: ['wire', 'rope'] });
      wire.add({ type: TraitType.SCENERY });
      world.moveEntity(wire.id, balloon.id);

      // Hook in ledge room with minimumScope for vairRoom
      const hook = world.createEntity('hook', EntityType.SCENERY);
      hook.add({ type: TraitType.IDENTITY, name: 'hook', aliases: ['metal hook'] });
      hook.add({ type: TraitType.SCENERY });
      world.moveEntity(hook.id, ledgeRoom.id);
      hook.setMinimumScope(ScopeLevel.REACHABLE, [vairRoom.id]);

      // Serialize and restore
      const json = world.toJSON();
      const world2 = new WorldModel();
      world2.loadJSON(json);
      const resolver2 = new StandardScopeResolver(world2);

      const player2 = world2.getPlayer()!;

      // === SIMULATE COMMAND VALIDATOR: getEntitiesByName + filterByScope ===

      // Step 1: Find entities named "hook" (like getEntitiesByName does)
      const hookCandidates = world2.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player2.id) return false;
        const name = entity.name?.toLowerCase();
        return name === 'hook';
      });
      console.log('\n=== COMMAND VALIDATOR SIMULATION ===');
      console.log('Hook candidates by name:', hookCandidates.length, hookCandidates.map(e => ({ id: e.id, name: e.name, type: e.type })));
      expect(hookCandidates.length).toBeGreaterThan(0);

      // Step 2: Also try synonym search (getEntitiesBySynonym)
      const hookBySynonym = world2.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player2.id) return false;
        const identity = entity.get('identity') as any;
        const aliases = identity?.aliases || [];
        return aliases.map((a: string) => a.toLowerCase()).includes('hook');
      });
      console.log('Hook candidates by synonym:', hookBySynonym.length);

      // Step 3: Filter by scope (command validator uses VISIBLE as default)
      const allHookCandidates = [...hookCandidates, ...hookBySynonym].filter(
        (e, i, arr) => arr.findIndex(x => x.id === e.id) === i
      );
      console.log('All hook candidates (deduped):', allHookCandidates.length);

      const inScope = allHookCandidates.filter(entity => {
        const scope = resolver2.getScope(player2, entity);
        console.log(`  Hook candidate ${entity.id} (${entity.name}): scope=${scope}, location=${world2.getLocation(entity.id)}`);
        // VISIBLE scope check (same as command validator filterByScope)
        return scope === ScopeLevel.CARRIED || scope === ScopeLevel.REACHABLE || scope === ScopeLevel.VISIBLE;
      });
      console.log('Hooks in scope:', inScope.length);
      expect(inScope.length).toBeGreaterThan(0);

      // Step 4: Find entities named "wire" (head noun from "braided wire")
      const wireCandidatesByName = world2.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player2.id) return false;
        const name = entity.name?.toLowerCase();
        return name === 'wire';
      });
      console.log('\nWire candidates by name "wire":', wireCandidatesByName.length);

      // Also check "braided wire" (full text)
      const wireCandidatesByFullName = world2.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player2.id) return false;
        const name = entity.name?.toLowerCase();
        return name === 'braided wire';
      });
      console.log('Wire candidates by name "braided wire":', wireCandidatesByFullName.length);

      // Also check by synonym "wire"
      const wireBySynonym = world2.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player2.id) return false;
        const identity = entity.get('identity') as any;
        const aliases = identity?.aliases || [];
        return aliases.map((a: string) => a.toLowerCase()).includes('wire');
      });
      console.log('Wire candidates by synonym "wire":', wireBySynonym.length);

      // Filter wire candidates by scope
      const allWireCandidates = [...wireCandidatesByName, ...wireCandidatesByFullName, ...wireBySynonym].filter(
        (e, i, arr) => arr.findIndex(x => x.id === e.id) === i
      );
      const wireInScope = allWireCandidates.filter(entity => {
        const scope = resolver2.getScope(player2, entity);
        console.log(`  Wire candidate ${entity.id} (${entity.name}): scope=${scope}, location=${world2.getLocation(entity.id)}`);
        return scope === ScopeLevel.CARRIED || scope === ScopeLevel.REACHABLE || scope === ScopeLevel.VISIBLE;
      });
      console.log('Wire in scope:', wireInScope.length);
      expect(wireInScope.length).toBeGreaterThan(0);
    });

    test('REPRO: two wires with shared alias cause ENTITY_NOT_FOUND via modifier mismatch', () => {
      // REPRODUCES the actual runtime bug:
      // "tie braided wire to hook" fails because:
      // 1. Parser extracts head noun "wire" from "braided wire"
      // 2. Two entities have alias "wire": "shiny wire" and "braided wire"
      // 3. Both found, both in scope
      // 4. Modifier "braided" doesn't match adjectives on EITHER entity
      //    (braided wire has name "braided wire" but no adjectives: ['braided'])
      // 5. Command validator returns ENTITY_NOT_FOUND (modifiers not matched)

      const vairRoom = world.createEntity('Vair Room', EntityType.ROOM);
      vairRoom.add({ type: TraitType.ROOM });

      const balloon = world.createEntity('balloon', EntityType.ITEM);
      balloon.add({ type: TraitType.VEHICLE });
      balloon.add({ type: TraitType.ENTERABLE });
      balloon.add({ type: TraitType.CONTAINER });
      world.moveEntity(balloon.id, vairRoom.id);
      world.moveEntity(player.id, balloon.id);

      // Wire 1: "braided wire" with alias "wire" but NO adjectives
      const braidedWire = world.createEntity('braided wire', EntityType.SCENERY);
      braidedWire.add({ type: TraitType.IDENTITY, name: 'braided wire', aliases: ['wire', 'rope'] });
      braidedWire.add({ type: TraitType.SCENERY });
      world.moveEntity(braidedWire.id, balloon.id);

      // Wire 2: "shiny wire" with alias "wire" - in player inventory
      const shinyWire = world.createEntity('shiny wire', EntityType.ITEM);
      shinyWire.add({ type: TraitType.IDENTITY, name: 'shiny wire', aliases: ['wire', 'fuse wire'] });
      world.moveEntity(shinyWire.id, player.id);

      // Simulate what command validator does for "braided wire" with head="wire"
      const searchTerm = 'wire'; // Parser extracts head noun

      // Step 1: getEntitiesByName("wire")
      const byName = world.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player.id) return false;
        return entity.name?.toLowerCase() === searchTerm.toLowerCase();
      });

      // Step 2: getEntitiesBySynonym("wire")
      const bySynonym = world.findWhere(entity => {
        if (entity.type === 'room' || entity.id === player.id) return false;
        const identity = entity.get('identity') as any;
        const aliases = identity?.aliases || [];
        return aliases.map((a: string) => a.toLowerCase()).includes(searchTerm.toLowerCase());
      });

      const candidates = [...byName, ...bySynonym].filter(
        (e, i, arr) => arr.findIndex(x => x.id === e.id) === i
      );

      console.log('\n=== DISAMBIGUATION BUG REPRO ===');
      console.log('Search term (head noun):', searchTerm);
      console.log('By name:', byName.length, byName.map(e => e.name));
      console.log('By synonym:', bySynonym.length, bySynonym.map(e => e.name));
      console.log('Total candidates:', candidates.length, candidates.map(e => e.name));

      // Step 3: Filter by scope
      const inScope = candidates.filter(entity => {
        const scope = resolver.getScope(player, entity);
        return scope >= ScopeLevel.VISIBLE;
      });
      console.log('In scope:', inScope.length, inScope.map(e => e.name));

      // Step 4: Score entities - simulate ref with text="braided wire", head="wire"
      const ref = { text: 'braided wire', head: 'wire', modifiers: [] as string[] };
      const modifiers = (() => {
        const head = ref.head.toLowerCase();
        const words = ref.text.toLowerCase().split(/\s+/).filter(w => w !== head);
        const nonModifiers = ['the', 'a', 'an', 'all', 'some', 'every', 'any', 'my'];
        return words.filter(w => !nonModifiers.includes(w));
      })();
      console.log('Inferred modifiers:', modifiers); // Should be ["braided"]

      // Check if ANY entity has the modifier as an adjective
      for (const entity of inScope) {
        const identity = entity.get('identity') as any;
        const adjectives = identity?.adjectives || [];
        console.log(`  Entity "${entity.name}": adjectives=${JSON.stringify(adjectives)}`);
      }

      const anyModifierMatch = inScope.some(entity => {
        const identity = entity.get('identity') as any;
        const adjectives = (identity?.adjectives || []).map((a: string) => a.toLowerCase());
        return modifiers.every(mod => adjectives.includes(mod.toLowerCase()));
      });
      console.log('Any modifier match?', anyModifierMatch);

      // THIS IS THE BUG: anyModifierMatch is false because neither wire has adjectives: ['braided']
      // Command validator would return ENTITY_NOT_FOUND here
      // FIX: Add adjectives: ['braided'] to the braided wire entity
      expect(anyModifierMatch).toBe(false); // Confirms the bug exists

      // VERIFY FIX: If braided wire had adjectives: ['braided'], it would match
      const braidedWireIdentity = braidedWire.get('identity') as any;
      if (braidedWireIdentity) {
        braidedWireIdentity.adjectives = ['braided'];
      }

      const fixedModifierMatch = inScope.some(entity => {
        const identity = entity.get('identity') as any;
        const adjectives = (identity?.adjectives || []).map((a: string) => a.toLowerCase());
        return modifiers.every(mod => adjectives.includes(mod.toLowerCase()));
      });
      console.log('After fix - any modifier match?', fixedModifierMatch);
      expect(fixedModifierMatch).toBe(true); // Fix works
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