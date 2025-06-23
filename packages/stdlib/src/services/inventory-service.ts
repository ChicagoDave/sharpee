/**
 * Inventory Service
 * 
 * Handles complex container operations, weight/volume calculations,
 * and inventory management for the standard library.
 */

import { Entity as IFEntity } from '@sharpee/core';
import { IFWorld } from '../world-model/world-interface';
import { 
  TraitType, 
  ContainerBehavior, 
  WearableBehavior,
  IdentityBehavior
} from '@sharpee/world-model';

export class InventoryService {
  constructor(private world: IFWorld) {}

  /**
   * Check if a container can contain an item
   * Returns true if possible, or a string reason if not
   */
  canContain(container: IFEntity, item: IFEntity): boolean | string {
    // Can't contain itself
    if (container.id === item.id) {
      return "Cannot put something inside itself";
    }

    // Check if container has container trait
    if (!container.has(TraitType.CONTAINER)) {
      return "Not a container";
    }

    // Check if item would create a containment loop
    if (this.wouldCreateLoop(container, item)) {
      return "Would create a containment loop";
    }

    // Use ContainerBehavior to check capacity
    if (!ContainerBehavior.canAccept(container, item)) {
      return "Container is full or item is too large";
    }

    return true;
  }

  /**
   * Transfer an item from one location to another
   * Handles all necessary checks and updates
   */
  transfer(item: IFEntity, from: IFEntity | null, to: IFEntity): boolean {
    // Validate the transfer
    if (to.has(TraitType.CONTAINER)) {
      const canContain = this.canContain(to, item);
      if (canContain !== true) {
        return false;
      }
    }

    // If item is worn, remove it first
    if (item.has(TraitType.WEARABLE) && WearableBehavior.isWorn(item)) {
      const wearer = from || this.world.getEntity(this.world.getLocation(item.id) || '');
      if (wearer) {
        WearableBehavior.remove(item, wearer);
      }
    }

    // Perform the transfer
    try {
      this.world.moveEntity(item.id, to.id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get total weight of contents (recursive)
   */
  getTotalWeight(container: IFEntity): number {
    let weight = 0;

    // Add the container's own weight if it has Identity trait
    if (container.has(TraitType.IDENTITY)) {
      weight += IdentityBehavior.getWeight(container) || 0;
    }

    // Add weight of all contents
    const contents = this.world.getContents(container.id);
    for (const item of contents) {
      weight += this.getTotalWeight(item);
    }

    return weight;
  }

  /**
   * Get total volume of contents (not recursive - volume doesn't nest)
   */
  getTotalVolume(container: IFEntity): number {
    if (!container.has(TraitType.CONTAINER)) {
      return 0;
    }

    let volume = 0;
    const contents = this.world.getContents(container.id);
    
    for (const item of contents) {
      if (item.has(TraitType.IDENTITY)) {
        volume += IdentityBehavior.getVolume(item) || 0;
      }
    }

    return volume;
  }

  /**
   * Get inventory items (directly held, not worn)
   */
  getInventory(actor: IFEntity): IFEntity[] {
    const contents = this.world.getContents(actor.id);
    return contents.filter(item => {
      // Include items that are not worn
      if (item.has(TraitType.WEARABLE)) {
        return !WearableBehavior.isWorn(item);
      }
      return true;
    });
  }

  /**
   * Get worn items
   */
  getWornItems(actor: IFEntity): IFEntity[] {
    const contents = this.world.getContents(actor.id);
    return contents.filter(item => {
      return item.has(TraitType.WEARABLE) && WearableBehavior.isWorn(item);
    });
  }

  /**
   * Find the best container for an item in the actor's inventory
   * Returns null if no suitable container found
   */
  findBestContainer(actor: IFEntity, item: IFEntity): IFEntity | null {
    const inventory = this.getInventory(actor);
    
    // Look for containers that can hold the item
    const containers = inventory.filter(inv => {
      if (!inv.has(TraitType.CONTAINER)) return false;
      return this.canContain(inv, item) === true;
    });

    if (containers.length === 0) return null;

    // Sort by available capacity (best fit)
    containers.sort((a, b) => {
      const aCapacity = ContainerBehavior.getRemainingCapacity(a);
      const bCapacity = ContainerBehavior.getRemainingCapacity(b);
      
      // Prefer containers with less remaining capacity (better fit)
      // but that can still hold the item
      const itemVolume = item.has(TraitType.IDENTITY) 
        ? IdentityBehavior.getVolume(item) || 1 
        : 1;

      const aFit = aCapacity - itemVolume;
      const bFit = bCapacity - itemVolume;

      // Both must be able to fit the item
      if (aFit < 0) return 1;
      if (bFit < 0) return -1;

      // Prefer tighter fit
      return aFit - bFit;
    });

    return containers[0];
  }

  /**
   * Check if putting item in container would create a loop
   */
  private wouldCreateLoop(container: IFEntity, item: IFEntity): boolean {
    // If item is not a container, no loop possible
    if (!item.has(TraitType.CONTAINER)) {
      return false;
    }

    // Check if container is inside item (directly or indirectly)
    let current: string | null = this.world.getLocation(container.id);
    
    while (current) {
      if (current === item.id) {
        return true;
      }
      current = this.world.getLocation(current);
    }

    return false;
  }

  /**
   * Get all items in a container (recursive)
   */
  getAllContents(container: IFEntity, includeWorn: boolean = true): IFEntity[] {
    const result: IFEntity[] = [];
    const contents = this.world.getContents(container.id);

    for (const item of contents) {
      // Skip worn items if requested
      if (!includeWorn && item.has(TraitType.WEARABLE) && WearableBehavior.isWorn(item)) {
        continue;
      }

      result.push(item);

      // Recursively add contents of containers
      if (item.has(TraitType.CONTAINER)) {
        result.push(...this.getAllContents(item, includeWorn));
      }
    }

    return result;
  }
}
