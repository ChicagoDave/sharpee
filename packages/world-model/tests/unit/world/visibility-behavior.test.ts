// packages/world-model/tests/unit/world/visibility-behavior.test.ts

import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LightSourceTrait } from '../../../src/traits/light-source/lightSourceTrait';
import { SceneryTrait } from '../../../src/traits/scenery/sceneryTrait';
// Test helpers are not needed - we create entities directly

describe('VisibilityBehavior', () => {
  let world: WorldModel;
  let observer: IFEntity;
  let room: IFEntity;

  beforeEach(() => {
    world = new WorldModel();
    
    // Create basic setup
    room = world.createEntity('Test Room', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    
    observer = world.createEntity('Observer', 'actor');
    observer.add(new ContainerTrait());
    
    world.moveEntity(observer.id, room.id);
  });

  describe('canSee', () => {
    it('should always see self', () => {
      expect(VisibilityBehavior.canSee(observer, observer, world)).toBe(true);
    });

    it('should see entities in same room', () => {
      const target = world.createEntity('Target', 'object');
      world.moveEntity(target.id, room.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });

    it('should not see entities in different room', () => {
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add(new RoomTrait());
      otherRoom.add(new ContainerTrait());
      
      const target = world.createEntity('Target', 'object');
      world.moveEntity(target.id, otherRoom.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
    });

    it('should see the room observer is in', () => {
      expect(VisibilityBehavior.canSee(observer, room, world)).toBe(true);
    });

    it('should not see invisible entities', () => {
      const target = world.createEntity('Target', 'scenery');
      const scenery = new SceneryTrait();
      target.add(scenery);
      // Mock the visible property on the scenery trait
      (scenery as any).visible = false;
      world.moveEntity(target.id, room.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
    });

    it('should see entities in transparent containers', () => {
      const container = world.createEntity('Glass Box', 'container');
      const containerTrait = new ContainerTrait({ isTransparent: true });
      container.add(containerTrait);
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(container.id, room.id);
      world.moveEntity(target.id, container.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });

    it('should see entities in open opaque containers', () => {
      const container = world.createEntity('Box', 'container');
      container.add(new ContainerTrait({ isTransparent: false }));
      container.add(new OpenableTrait({ isOpen: true }));
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(container.id, room.id);
      world.moveEntity(target.id, container.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });

    it('should not see entities in closed opaque containers', () => {
      const container = world.createEntity('Box', 'container');
      container.add(new ContainerTrait({ isTransparent: false }));
      container.add(new OpenableTrait({ isOpen: false }));
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(container.id, room.id);
      world.moveEntity(target.id, container.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
    });

    it('should handle nested containers', () => {
      const outerBox = world.createEntity('Outer Box', 'container');
      outerBox.add(new ContainerTrait({ isTransparent: false }));
      outerBox.add(new OpenableTrait({ isOpen: true }));
      
      const innerBox = world.createEntity('Inner Box', 'container');
      innerBox.add(new ContainerTrait({ isTransparent: true }));
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(outerBox.id, room.id);
      world.moveEntity(innerBox.id, outerBox.id);
      world.moveEntity(target.id, innerBox.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });

    it('should block sight through any closed container in path', () => {
      const outerBox = world.createEntity('Outer Box', 'container');
      outerBox.add(new ContainerTrait({ isTransparent: false }));
      outerBox.add(new OpenableTrait({ isOpen: false })); // Closed!
      
      const innerBox = world.createEntity('Inner Box', 'container');
      innerBox.add(new ContainerTrait({ isTransparent: true }));
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(outerBox.id, room.id);
      world.moveEntity(innerBox.id, outerBox.id);
      world.moveEntity(target.id, innerBox.id);
      
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
    });
  });

  describe('dark rooms', () => {
    let darkRoom: IFEntity;
    let lamp: IFEntity;

    beforeEach(() => {
      darkRoom = world.createEntity('Dark Room', 'room');
      darkRoom.add(new RoomTrait({ isDark: true })); // Explicitly dark
      darkRoom.add(new ContainerTrait());
      
      lamp = world.createEntity('Lamp', 'item');
      lamp.add(new LightSourceTrait({ isLit: false }));
    });

    it('should not see anything in dark room without light', () => {
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(observer.id, darkRoom.id);
      world.moveEntity(target.id, darkRoom.id);
      
      // Can't see anything in the dark
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
      expect(VisibilityBehavior.canSee(observer, darkRoom, world)).toBe(false);
    });

    it('should only see lit light sources in dark room', () => {
      world.moveEntity(observer.id, darkRoom.id);
      world.moveEntity(lamp.id, darkRoom.id);
      
      // Can't see unlit lamp
      expect(VisibilityBehavior.canSee(observer, lamp, world)).toBe(false);
      
      // Turn on lamp
      (lamp.getTrait(TraitType.LIGHT_SOURCE) as any).isLit = true;
      
      // Now can see the lamp itself
      expect(VisibilityBehavior.canSee(observer, lamp, world)).toBe(true);
      // And the room is lit, so can see the room
      expect(VisibilityBehavior.canSee(observer, darkRoom, world)).toBe(true);
    });

    it('should see everything when carrying lit lamp', () => {
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(observer.id, darkRoom.id);
      world.moveEntity(lamp.id, observer.id); // Carry the lamp
      world.moveEntity(target.id, darkRoom.id);
      
      // Turn on lamp
      (lamp.getTrait(TraitType.LIGHT_SOURCE) as any).isLit = true;
      
      // Can see everything
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
      expect(VisibilityBehavior.canSee(observer, darkRoom, world)).toBe(true);
    });

    it('should not benefit from light in closed container', () => {
      const box = world.createEntity('Box', 'container');
      box.add(new ContainerTrait({ isTransparent: false }));
      box.add(new OpenableTrait({ isOpen: true })); // Start open to add lamp
      
      world.moveEntity(observer.id, darkRoom.id);
      world.moveEntity(box.id, darkRoom.id);
      world.moveEntity(lamp.id, box.id);
      
      // Now close the box
      (box.getTrait(TraitType.OPENABLE) as any).isOpen = false;
      
      // Turn on lamp (but it's in closed box)
      (lamp.getTrait(TraitType.LIGHT_SOURCE) as any).isLit = true;
      
      // Still can't see in the dark
      expect(VisibilityBehavior.canSee(observer, box, world)).toBe(false);
      expect(VisibilityBehavior.canSee(observer, darkRoom, world)).toBe(false);
      
      // Open box
      (box.getTrait(TraitType.OPENABLE) as any).isOpen = true;
      
      // Now room is lit and can see
      expect(VisibilityBehavior.canSee(observer, box, world)).toBe(true);
      expect(VisibilityBehavior.canSee(observer, darkRoom, world)).toBe(true);
    });

    it('should handle room lighting toggle', () => {
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(observer.id, darkRoom.id);
      world.moveEntity(target.id, darkRoom.id);
      
      // Initially dark
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
      
      // Turn on room lights (e.g., found light switch)
      (darkRoom.getTrait(TraitType.ROOM) as any).isDark = false;
      
      // Now can see
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });
  });

  describe('getVisible', () => {
    it('should return all visible entities', () => {
      const item1 = world.createEntity('Item 1', 'item');
      const item2 = world.createEntity('Item 2', 'item');
      const hiddenItem = world.createEntity('Hidden', 'scenery');
      const hiddenScenery = new SceneryTrait();
      hiddenItem.add(hiddenScenery);
      (hiddenScenery as any).visible = false;
      
      world.moveEntity(item1.id, room.id);
      world.moveEntity(item2.id, room.id);
      world.moveEntity(hiddenItem.id, room.id);
      
      const visible = VisibilityBehavior.getVisible(observer, world);
      const visibleIds = visible.map(e => e.id);
      
      expect(visibleIds).toContain(room.id);
      expect(visibleIds).toContain(item1.id);
      expect(visibleIds).toContain(item2.id);
      expect(visibleIds).not.toContain(hiddenItem.id);
      expect(visibleIds).not.toContain(observer.id); // Don't include self
    });

    it('should include carried items', () => {
      const carried = world.createEntity('Carried Item', 'item');
      world.moveEntity(carried.id, observer.id);
      
      const visible = VisibilityBehavior.getVisible(observer, world);
      
      expect(visible.map(e => e.id)).toContain(carried.id);
    });

    it('should handle empty room', () => {
      const visible = VisibilityBehavior.getVisible(observer, world);
      
      expect(visible.map(e => e.id)).toContain(room.id);
      expect(visible).toHaveLength(1); // Just the room
    });

    it('should handle observer not in room', () => {
      const floatingObserver = world.createEntity('Floating', 'actor');
      
      const visible = VisibilityBehavior.getVisible(floatingObserver, world);
      
      expect(visible).toEqual([]);
    });
  });

  describe('isVisible', () => {
    it('should return true for uncontained entities', () => {
      const entity = world.createEntity('Entity', 'object');
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(true);
    });

    it('should return false for invisible scenery', () => {
      const entity = world.createEntity('Entity', 'scenery');
      const scenery = new SceneryTrait();
      entity.add(scenery);
      (scenery as any).visible = false;
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(false);
    });

    it('should return true for entity in transparent container', () => {
      const container = world.createEntity('Container', 'container');
      container.add(new ContainerTrait({ isTransparent: true }));
      
      const entity = world.createEntity('Entity', 'object');
      world.moveEntity(entity.id, container.id);
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(true);
    });

    it('should return true for entity in open opaque container', () => {
      const container = world.createEntity('Container', 'container');
      container.add(new ContainerTrait({ isTransparent: false }));
      container.add(new OpenableTrait({ isOpen: true }));
      
      const entity = world.createEntity('Entity', 'object');
      world.moveEntity(entity.id, container.id);
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(true);
    });

    it('should return false for entity in closed opaque container', () => {
      const container = world.createEntity('Container', 'container');
      container.add(new ContainerTrait({ isTransparent: false }));
      container.add(new OpenableTrait({ isOpen: true })); // Start open so we can add the entity
      
      const entity = world.createEntity('Entity', 'object');
      world.moveEntity(entity.id, container.id);
      
      // Now close the container
      const openable = container.getTrait(TraitType.OPENABLE) as any;
      openable.isOpen = false;
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(false);
    });

    it('should handle opaque container without openable trait', () => {
      const container = world.createEntity('Container', 'container');
      container.add(new ContainerTrait({ isTransparent: false }));
      // No openable trait means it can't be closed
      
      const entity = world.createEntity('Entity', 'object');
      world.moveEntity(entity.id, container.id);
      
      expect(VisibilityBehavior.isVisible(entity, world)).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle deeply nested visibility', () => {
      // Create nested boxes: outer (will be closed) -> middle (open) -> inner (transparent)
      const outer = world.createEntity('Outer', 'container');
      outer.add(new ContainerTrait({ isTransparent: false }));
      outer.add(new OpenableTrait({ isOpen: true })); // Start open to build hierarchy
      
      const middle = world.createEntity('Middle', 'container');
      middle.add(new ContainerTrait({ isTransparent: false }));
      middle.add(new OpenableTrait({ isOpen: true }));
      
      const inner = world.createEntity('Inner', 'container');
      inner.add(new ContainerTrait({ isTransparent: true }));
      
      const target = world.createEntity('Target', 'object');
      
      world.moveEntity(outer.id, room.id);
      world.moveEntity(middle.id, outer.id);
      world.moveEntity(inner.id, middle.id);
      world.moveEntity(target.id, inner.id);
      
      // Now close the outer box
      (outer.getTrait(TraitType.OPENABLE) as any).isOpen = false;
      
      // Can't see through closed outer box
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(false);
      
      // Open outer box
      const outerOpenable = outer.getTrait(TraitType.OPENABLE);
      if (outerOpenable) {
        (outerOpenable as any).isOpen = true;
      }
      
      // Now can see target
      expect(VisibilityBehavior.canSee(observer, target, world)).toBe(true);
    });

    it('should handle supporter visibility', () => {
      const table = world.createEntity('Table', 'supporter');
      table.add({ type: TraitType.SUPPORTER } as any); // Simplified supporter
      
      const item = world.createEntity('Item', 'item');
      
      world.moveEntity(table.id, room.id);
      world.moveEntity(item.id, table.id);
      
      // Items on supporters are always visible
      expect(VisibilityBehavior.canSee(observer, item, world)).toBe(true);
    });

    it('should handle visibility in nested containers', () => {
      const box = world.createEntity('Box', 'container');
      box.add(new ContainerTrait({ isTransparent: false }));
      box.add(new OpenableTrait({ isOpen: true })); // Start open to add item
      
      const item = world.createEntity('Item', 'item');
      
      // Use the existing room from beforeEach
      world.moveEntity(box.id, room.id);
      world.moveEntity(item.id, box.id);
      
      // Now close the box
      (box.getTrait(TraitType.OPENABLE) as any).isOpen = false;
      
      // Item is in closed box, not visible
      const visible = VisibilityBehavior.getVisible(observer, world);
      expect(visible.map(e => e.id)).toContain(room.id);
      expect(visible.map(e => e.id)).toContain(box.id);
      expect(visible.map(e => e.id)).not.toContain(item.id);
      
      // Open box
      const boxOpenable = box.getTrait(TraitType.OPENABLE);
      if (boxOpenable) {
        (boxOpenable as any).isOpen = true;
      }
      
      // Now item is visible
      const visibleWithOpen = VisibilityBehavior.getVisible(observer, world);
      expect(visibleWithOpen.map(e => e.id)).toContain(box.id);
      expect(visibleWithOpen.map(e => e.id)).toContain(item.id);
    });

    it('should handle circular containment gracefully', () => {
      // This shouldn't happen in practice, but test graceful handling
      const box1 = world.createEntity('Box 1', 'container');
      box1.add(new ContainerTrait());
      
      const box2 = world.createEntity('Box 2', 'container');
      box2.add(new ContainerTrait());
      
      world.moveEntity(box1.id, room.id);
      world.moveEntity(box2.id, box1.id);
      // Note: Can't actually create circular containment with the world model
      
      expect(() => {
        VisibilityBehavior.canSee(observer, box2, world);
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle missing entities gracefully', () => {
      // Create a mock entity that has required methods
      const missingEntity = {
        id: 'missing',
        getTrait: () => undefined,
        hasTrait: () => false
      } as any as IFEntity;
      
      expect(VisibilityBehavior.canSee(observer, missingEntity, world)).toBe(false);
      expect(VisibilityBehavior.isVisible(missingEntity, world)).toBe(true); // Not contained
    });

    it('should handle entities with no location', () => {
      const floating = world.createEntity('Floating', 'object');
      
      expect(VisibilityBehavior.canSee(observer, floating, world)).toBe(false);
      expect(VisibilityBehavior.isVisible(floating, world)).toBe(true);
    });

    it('should handle max depth in containment path', () => {
      // Create very deep nesting
      let current = room.id;
      for (let i = 0; i < 15; i++) {
        const container = world.createEntity(`Container ${i}`, 'container');
        container.add(new ContainerTrait({ isTransparent: true }));
        world.moveEntity(container.id, current);
        current = container.id;
      }
      
      const deepItem = world.createEntity('Deep Item', 'item');
      world.moveEntity(deepItem.id, current);
      
      // Should still work despite deep nesting
      expect(() => {
        VisibilityBehavior.canSee(observer, deepItem, world);
      }).not.toThrow();
    });
  });
});
