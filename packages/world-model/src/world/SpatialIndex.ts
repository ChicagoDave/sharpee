// SpatialIndex.ts - Efficient spatial relationship tracking

export class SpatialIndex {
  // Map from parent ID to set of child IDs
  private parentToChildren: Map<string, Set<string>> = new Map();
  // Map from child ID to parent ID
  private childToParent: Map<string, string> = new Map();

  addChild(parentId: string, childId: string): void {
    // Remove from any existing parent (but preserve this entity's children)
    const currentParent = this.childToParent.get(childId);
    if (currentParent) {
      this.removeChild(currentParent, childId);
    }

    // Add to new parent
    if (!this.parentToChildren.has(parentId)) {
      this.parentToChildren.set(parentId, new Set());
    }
    this.parentToChildren.get(parentId)!.add(childId);
    this.childToParent.set(childId, parentId);
  }

  removeChild(parentId: string, childId: string): void {
    const children = this.parentToChildren.get(parentId);
    if (children) {
      children.delete(childId);
      if (children.size === 0) {
        this.parentToChildren.delete(parentId);
      }
    }
    this.childToParent.delete(childId);
  }

  remove(entityId: string): void {
    // Remove as child from its parent
    const parent = this.childToParent.get(entityId);
    if (parent) {
      this.removeChild(parent, entityId);
    }

    // Remove all children relationships (this entity is being deleted)
    const children = this.parentToChildren.get(entityId);
    if (children) {
      // Copy to avoid mutation during iteration
      const childArray = Array.from(children);
      childArray.forEach(childId => {
        this.childToParent.delete(childId);
      });
      this.parentToChildren.delete(entityId);
    }
  }

  getParent(childId: string): string | undefined {
    return this.childToParent.get(childId);
  }

  getChildren(parentId: string): string[] {
    const children = this.parentToChildren.get(parentId);
    return children ? Array.from(children) : [];
  }

  hasChildren(parentId: string): boolean {
    const children = this.parentToChildren.get(parentId);
    return children ? children.size > 0 : false;
  }

  getAllDescendants(parentId: string, maxDepth: number = 10): string[] {
    const result: string[] = [];
    const visited = new Set<string>();

    const traverse = (id: string, depth: number) => {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);

      const children = this.getChildren(id);
      result.push(...children);
      
      children.forEach(childId => traverse(childId, depth + 1));
    };

    traverse(parentId, 0);
    return result;
  }

  getAncestors(childId: string, maxDepth: number = 10): string[] {
    const result: string[] = [];
    let current = childId;
    let depth = 0;

    while (depth < maxDepth) {
      const parent = this.getParent(current);
      if (!parent) break;
      
      result.push(parent);
      current = parent;
      depth++;
    }

    return result;
  }

  clear(): void {
    this.parentToChildren.clear();
    this.childToParent.clear();
  }

  toJSON(): any {
    return {
      parentToChildren: Array.from(this.parentToChildren.entries()).map(([parent, children]) => ({
        parent,
        children: Array.from(children)
      })),
      childToParent: Array.from(this.childToParent.entries())
    };
  }

  loadJSON(data: any): void {
    this.clear();

    if (data.parentToChildren) {
      for (const { parent, children } of data.parentToChildren) {
        this.parentToChildren.set(parent, new Set(children));
      }
    }

    if (data.childToParent) {
      for (const [child, parent] of data.childToParent) {
        this.childToParent.set(child, parent);
      }
    }
  }
}
