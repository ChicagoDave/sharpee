import { IFEntity } from '@sharpee/world-model';
import { BloodMoonTrait } from './bloodMoonTrait';

/**
 * Blood of Moon behavior logic - handles invisibility abilities
 */
export class BloodMoonBehavior {
  /**
   * Activate invisibility for a Moon carrier
   */
  static becomeInvisible(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait || trait.isInvisible) return false;
    
    trait.isInvisible = true;
    trait.lastActivationTime = Date.now() / 1000 / 3600; // Convert to story hours
    return true;
  }

  /**
   * Deactivate invisibility for a Moon carrier
   */
  static becomeVisible(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    trait.isInvisible = false;
    return true;
  }

  /**
   * Check if an entity is currently invisible
   */
  static isInvisible(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait?.isInvisible === true;
  }

  /**
   * Check if an entity can become invisible
   */
  static canBecomeInvisible(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait !== undefined && !trait.isInvisible;
  }

  /**
   * Check if an entity can become visible
   */
  static canBecomeVisible(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    return trait?.isInvisible === true;
  }

  /**
   * Activate Moon blood abilities
   */
  static activate(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    // Moon trait doesn't have active property - just track activation
    return true;
  }

  /**
   * Deactivate Moon blood abilities (also makes visible)
   */
  static deactivate(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait) return false;
    
    // Moon trait doesn't have active property
    trait.isInvisible = false;
    return true;
  }

  /**
   * Check if invisibility should affect a specific scope
   * (e.g., some actions might still be visible to certain observers)
   */
  static isInvisibleInScope(entity: IFEntity, scope: string): boolean {
    const trait = entity.getTrait<BloodMoonTrait>('bloodMoon');
    if (!trait?.isInvisible) return false;
    
    // Could have logic for different scopes
    // For now, invisible is invisible to all
    return true;
  }
}