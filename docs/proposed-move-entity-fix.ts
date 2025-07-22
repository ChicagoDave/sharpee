// Proposed fix for WorldModel.moveEntity to support forced placement

// In WorldModel.ts, modify these methods:

canMoveEntity(entityId: string, targetId: string | null, force: boolean = false): boolean {
  const entity = this.getEntity(entityId);
  if (!entity) return false;

  // Can always remove from world
  if (targetId === null) return true;

  const target = this.getEntity(targetId);
  if (!target) return false;

  // Check for containment loops
  if (this.wouldCreateLoop(entityId, targetId)) {
    return false;
  }

  // Check if target can contain
  if (!target.hasTrait(TraitType.CONTAINER) && !target.hasTrait(TraitType.SUPPORTER)) {
    return false;
  }

  // If force is true, skip container state checks
  if (force) {
    return true;
  }

  // Check container constraints (only when not forcing)
  if (target.hasTrait(TraitType.CONTAINER) && target.hasTrait(TraitType.OPENABLE)) {
    const openable = target.getTrait(TraitType.OPENABLE);
    if (openable && !(openable as any).isOpen) {
      return false;
    }
  }

  return true;
}

moveEntity(entityId: string, targetId: string | null, force: boolean = false): boolean {
  if (!this.canMoveEntity(entityId, targetId, force)) {
    return false;
  }

  // Remove from current location
  const currentLocation = this.getLocation(entityId);
  if (currentLocation) {
    this.spatialIndex.removeChild(currentLocation, entityId);
  }

  // Add to new location
  if (targetId) {
    this.spatialIndex.addChild(targetId, entityId);
  }

  return true;
}