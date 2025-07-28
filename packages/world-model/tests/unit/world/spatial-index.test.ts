// packages/world-model/tests/unit/world/spatial-index.test.ts

import { SpatialIndex } from '../../../src/world/SpatialIndex';

describe('SpatialIndex', () => {
  let index: SpatialIndex;

  beforeEach(() => {
    index = new SpatialIndex();
  });

  describe('basic operations', () => {
    it('should add child to parent', () => {
      index.addChild('parent-1', 'child-1');
      
      expect(index.getParent('child-1')).toBe('parent-1');
      expect(index.getChildren('parent-1')).toEqual(['child-1']);
    });

    it('should add multiple children to parent', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      index.addChild('parent-1', 'child-3');
      
      const children = index.getChildren('parent-1');
      expect(children).toHaveLength(3);
      expect(children).toContain('child-1');
      expect(children).toContain('child-2');
      expect(children).toContain('child-3');
    });

    it('should remove child from parent', () => {
      index.addChild('parent-1', 'child-1');
      index.removeChild('parent-1', 'child-1');
      
      expect(index.getParent('child-1')).toBeUndefined();
      expect(index.getChildren('parent-1')).toEqual([]);
    });

    it('should move child to new parent', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-2', 'child-1');
      
      expect(index.getParent('child-1')).toBe('parent-2');
      expect(index.getChildren('parent-1')).toEqual([]);
      expect(index.getChildren('parent-2')).toEqual(['child-1']);
    });

    it('should handle non-existent parent', () => {
      expect(index.getChildren('missing')).toEqual([]);
      expect(index.hasChildren('missing')).toBe(false);
    });

    it('should handle non-existent child', () => {
      expect(index.getParent('missing')).toBeUndefined();
    });
  });

  describe('remove operations', () => {
    it('should remove entity and its relationships', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('child-1', 'grandchild-1');
      
      index.remove('child-1');
      
      expect(index.getParent('child-1')).toBeUndefined();
      expect(index.getChildren('parent-1')).toEqual([]);
      expect(index.getChildren('child-1')).toEqual([]);
      expect(index.getParent('grandchild-1')).toBeUndefined();
    });

    it('should remove only specified child', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      
      index.removeChild('parent-1', 'child-1');
      
      expect(index.getChildren('parent-1')).toEqual(['child-2']);
      expect(index.getParent('child-1')).toBeUndefined();
      expect(index.getParent('child-2')).toBe('parent-1');
    });

    it('should handle removing non-existent child', () => {
      index.addChild('parent-1', 'child-1');
      
      index.removeChild('parent-1', 'missing');
      
      expect(index.getChildren('parent-1')).toEqual(['child-1']);
    });

    it('should clean up empty parent sets', () => {
      index.addChild('parent-1', 'child-1');
      index.removeChild('parent-1', 'child-1');
      
      expect(index.hasChildren('parent-1')).toBe(false);
    });
  });

  describe('hasChildren', () => {
    it('should return true for parent with children', () => {
      index.addChild('parent-1', 'child-1');
      
      expect(index.hasChildren('parent-1')).toBe(true);
    });

    it('should return false for parent without children', () => {
      expect(index.hasChildren('parent-1')).toBe(false);
    });

    it('should return false after removing all children', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      
      index.removeChild('parent-1', 'child-1');
      index.removeChild('parent-1', 'child-2');
      
      expect(index.hasChildren('parent-1')).toBe(false);
    });
  });

  describe('getAllDescendants', () => {
    beforeEach(() => {
      // Create a hierarchy:
      // parent-1
      //   ├── child-1
      //   │   ├── grandchild-1
      //   │   └── grandchild-2
      //   └── child-2
      //       └── grandchild-3
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      index.addChild('child-1', 'grandchild-1');
      index.addChild('child-1', 'grandchild-2');
      index.addChild('child-2', 'grandchild-3');
    });

    it('should get all descendants', () => {
      const descendants = index.getAllDescendants('parent-1');
      
      expect(descendants).toHaveLength(5);
      expect(descendants).toContain('child-1');
      expect(descendants).toContain('child-2');
      expect(descendants).toContain('grandchild-1');
      expect(descendants).toContain('grandchild-2');
      expect(descendants).toContain('grandchild-3');
    });

    it('should respect max depth', () => {
      // getAllDescendants starts at depth 0, so maxDepth 0 gets immediate children
      const descendants = index.getAllDescendants('parent-1', 0);
      
      expect(descendants).toHaveLength(2);
      expect(descendants).toContain('child-1');
      expect(descendants).toContain('child-2');
    });

    it('should handle entity with no descendants', () => {
      const descendants = index.getAllDescendants('grandchild-1');
      
      expect(descendants).toEqual([]);
    });

    it('should handle circular references', () => {
      // Create a loop: a -> b -> c -> a
      index.addChild('a', 'b');
      index.addChild('b', 'c');
      index.addChild('c', 'a'); // This would create a loop
      
      // Should not infinite loop
      const descendants = index.getAllDescendants('a');
      expect(descendants).toBeDefined();
    });

    it('should collect all descendants up to max depth', () => {
      // Create deep hierarchy
      for (let i = 1; i <= 20; i++) {
        index.addChild(`level-${i-1}`, `level-${i}`);
      }
      
      // maxDepth 4 means we go 5 levels deep (0-4)
      const descendants = index.getAllDescendants('level-0', 4);
      expect(descendants).toHaveLength(5); // level-1 through level-5
    });
  });

  describe('getAncestors', () => {
    beforeEach(() => {
      // Create a hierarchy
      index.addChild('root', 'parent-1');
      index.addChild('parent-1', 'child-1');
      index.addChild('child-1', 'grandchild-1');
      index.addChild('grandchild-1', 'great-grandchild-1');
    });

    it('should get all ancestors', () => {
      const ancestors = index.getAncestors('great-grandchild-1');
      
      expect(ancestors).toEqual(['grandchild-1', 'child-1', 'parent-1', 'root']);
    });

    it('should get ancestors up to depth', () => {
      const ancestors = index.getAncestors('great-grandchild-1', 2);
      
      expect(ancestors).toEqual(['grandchild-1', 'child-1']);
    });

    it('should handle entity with no ancestors', () => {
      const ancestors = index.getAncestors('root');
      
      expect(ancestors).toEqual([]);
    });

    it('should handle missing entity', () => {
      const ancestors = index.getAncestors('missing');
      
      expect(ancestors).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should clear all relationships', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-2', 'child-2');
      
      index.clear();
      
      expect(index.getChildren('parent-1')).toEqual([]);
      expect(index.getChildren('parent-2')).toEqual([]);
      expect(index.getParent('child-1')).toBeUndefined();
      expect(index.getParent('child-2')).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('should serialize to JSON', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      index.addChild('parent-2', 'child-3');
      
      const json = index.toJSON();
      
      expect(json.parentToChildren).toHaveLength(2);
      expect(json.childToParent).toHaveLength(3);
    });

    it('should load from JSON', () => {
      // Set up original index
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-2');
      index.addChild('parent-2', 'child-3');
      
      // Serialize
      const json = index.toJSON();
      
      // Create new index and load
      const newIndex = new SpatialIndex();
      newIndex.loadJSON(json);
      
      // Verify
      expect(newIndex.getChildren('parent-1')).toHaveLength(2);
      expect(newIndex.getChildren('parent-1')).toContain('child-1');
      expect(newIndex.getChildren('parent-1')).toContain('child-2');
      expect(newIndex.getChildren('parent-2')).toEqual(['child-3']);
      expect(newIndex.getParent('child-1')).toBe('parent-1');
      expect(newIndex.getParent('child-2')).toBe('parent-1');
      expect(newIndex.getParent('child-3')).toBe('parent-2');
    });

    it('should handle empty JSON', () => {
      const newIndex = new SpatialIndex();
      newIndex.loadJSON({});
      
      expect(newIndex.getChildren('any')).toEqual([]);
    });

    it('should clear before loading', () => {
      index.addChild('old-parent', 'old-child');
      
      const json = {
        parentToChildren: [{ parent: 'new-parent', children: ['new-child'] }],
        childToParent: [['new-child', 'new-parent']]
      };
      
      index.loadJSON(json);
      
      expect(index.getChildren('old-parent')).toEqual([]);
      expect(index.getChildren('new-parent')).toEqual(['new-child']);
    });
  });

  describe('edge cases', () => {
    it('should handle adding same child multiple times', () => {
      index.addChild('parent-1', 'child-1');
      index.addChild('parent-1', 'child-1');
      
      expect(index.getChildren('parent-1')).toEqual(['child-1']);
    });

    it('should handle removing child from wrong parent', () => {
      index.addChild('parent-1', 'child-1');
      // removeChild will remove the child regardless of parent specified
      index.removeChild('parent-2', 'child-1');
      
      // The implementation removes from childToParent map regardless
      expect(index.getParent('child-1')).toBeUndefined();
      expect(index.getChildren('parent-1')).toEqual(['child-1']); // Still in parent's children
    });

    it('should handle self-parenting', () => {
      index.addChild('entity-1', 'entity-1');
      
      expect(index.getParent('entity-1')).toBe('entity-1');
      expect(index.getChildren('entity-1')).toEqual(['entity-1']);
    });

    it('should handle very deep hierarchies', () => {
      // Create a chain of 100 entities
      for (let i = 1; i <= 100; i++) {
        index.addChild(`entity-${i-1}`, `entity-${i}`);
      }
      
      const ancestors = index.getAncestors('entity-100', 10);
      expect(ancestors).toHaveLength(10);
      
      const descendants = index.getAllDescendants('entity-0', 9);
      expect(descendants).toHaveLength(10); // entity-1 through entity-10
    });

    it('should maintain consistency when moving entities', () => {
      // Set up complex hierarchy
      index.addChild('root', 'branch-1');
      index.addChild('root', 'branch-2');
      index.addChild('branch-1', 'leaf-1');
      index.addChild('branch-1', 'leaf-2');
      
      // Move branch-1 under branch-2
      index.addChild('branch-2', 'branch-1');
      
      expect(index.getParent('branch-1')).toBe('branch-2');
      expect(index.getChildren('root')).toEqual(['branch-2']);
      // Children should be preserved when parent is moved
      expect(index.getChildren('branch-1')).toEqual(['leaf-1', 'leaf-2']);
      expect(index.getParent('leaf-1')).toBe('branch-1');
      expect(index.getParent('leaf-2')).toBe('branch-1');
    });
  });
});
