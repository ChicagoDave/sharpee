import { Entity } from '@sharpee/world-model';
import { BloodSilverTrait } from './bloodSilverTrait';
import { MirrorTrait } from '../mirrorTrait/mirrorTrait';

/**
 * Blood of Silver behavior logic - handles Silver carrier abilities
 */
export class BloodSilverBehavior {
  /**
   * Check if an entity can sense mirror ripples
   */
  static canSenseRipples(entity: Entity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    return trait?.active === true;
  }

  /**
   * Detect if a Silver carrier would sense someone using their connected mirrors
   */
  static detectRipple(silverCarrier: Entity, usedMirror: Entity): boolean {
    const bloodTrait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver');
    const mirrorTrait = usedMirror.getTrait<MirrorTrait>('mirror');
    
    if (!bloodTrait?.active || !mirrorTrait) return false;
    
    // Check if this Silver carrier has used this mirror or its connected pair
    return bloodTrait.mirrorsUsed.includes(usedMirror.id) ||
           (mirrorTrait.connectedTo && bloodTrait.mirrorsUsed.includes(mirrorTrait.connectedTo));
  }

  /**
   * Record that a Silver carrier has used a mirror
   */
  static recordMirrorUse(entity: Entity, mirror: Entity): void {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return;
    
    if (!trait.mirrorsUsed.includes(mirror.id)) {
      trait.mirrorsUsed.push(mirror.id);
    }
    
    trait.lastMirrorUsed = mirror.id;
  }

  /**
   * Activate Silver blood abilities
   */
  static activate(entity: Entity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return false;
    
    trait.active = true;
    return true;
  }

  /**
   * Deactivate Silver blood abilities
   */
  static deactivate(entity: Entity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return false;
    
    trait.active = false;
    return true;
  }

  /**
   * Check if an entity can create mirror connections
   */
  static canConnect(entity: Entity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    return trait?.active === true;
  }
}