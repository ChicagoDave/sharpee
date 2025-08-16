import { Entity } from '@sharpee/world-model';
import { BloodMoonTrait } from './bloodMoonTrait';

/**
 * Blood of Moon behavior logic - handles invisibility abilities
 */
export class BloodMoonBehavior {
  /**
   * Activate invisibility for a Moon carrier
   */
  static becomeInvisible(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait || !trait.active) return false;
    
    trait.invisible = true;
    trait.lastInvisibleTime = Date.now();
    return true;
  }

  /**
   * Deactivate invisibility for a Moon carrier
   */
  static becomeVisible(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    trait.invisible = false;
    return true;
  }

  /**
   * Check if an entity is currently invisible
   */
  static isInvisible(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait?.invisible === true;
  }

  /**
   * Check if an entity can become invisible
   */
  static canBecomeInvisible(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait?.active === true && !trait.invisible;
  }

  /**
   * Check if an entity can become visible
   */
  static canBecomeVisible(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait?.invisible === true;
  }

  /**
   * Activate Moon blood abilities
   */
  static activate(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    trait.active = true;
    return true;
  }

  /**
   * Deactivate Moon blood abilities (also makes visible)
   */
  static deactivate(entity: Entity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    trait.active = false;
    trait.invisible = false;
    return true;
  }

  /**
   * Check if invisibility should affect a specific scope
   * (e.g., some actions might still be visible to certain observers)
   */
  static isInvisibleInScope(entity: Entity, scope: string): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait?.invisible) return false;
    
    // Could have logic for different scopes
    // For now, invisible is invisible to all
    return true;
  }
}