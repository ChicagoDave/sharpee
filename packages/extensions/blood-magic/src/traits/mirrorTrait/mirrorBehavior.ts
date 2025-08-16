import { Entity, ActionContext } from '@sharpee/world-model';
import { MirrorTrait } from './mirrorTrait';
import { BloodSilverTrait } from '../bloodSilverTrait/bloodSilverTrait';

/**
 * Mirror behavior logic - handles all mirror-related operations
 */
export class MirrorBehavior {
  /**
   * Check if a mirror can be entered based on its state and orientation
   */
  static canEnter(mirror: Entity): boolean {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return false;
    
    // Can't enter broken mirrors
    if (trait.state === 'broken') return false;
    
    // Can't enter face-down mirrors
    if (trait.state === 'face-down') return false;
    
    // Must have a connection
    return trait.connectedTo !== null;
  }

  /**
   * Check if a mirror can be looked through
   */
  static canLookThrough(mirror: Entity): boolean {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return false;
    
    // Can't look through broken or covered mirrors
    if (trait.state === 'broken' || trait.state === 'covered') return false;
    
    // Must have a connection
    return trait.connectedTo !== null;
  }

  /**
   * Get the quality-adjusted description when looking through a mirror
   */
  static getViewQuality(mirror: Entity): 'clear' | 'distorted' | 'murky' {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return 'murky';
    
    if (trait.quality >= 0.8) return 'clear';
    if (trait.quality >= 0.4) return 'distorted';
    return 'murky';
  }

  /**
   * Connect two mirrors together
   */
  static connectMirrors(mirror1: Entity, mirror2: Entity, connector: Entity): boolean {
    const trait1 = mirror1.getTrait<MirrorTrait>('mirror');
    const trait2 = mirror2.getTrait<MirrorTrait>('mirror');
    const bloodTrait = connector.getTrait<BloodSilverTrait>('bloodSilver');
    
    if (!trait1 || !trait2 || !bloodTrait) return false;
    
    // Update connections
    trait1.connectedTo = mirror2.id;
    trait2.connectedTo = mirror1.id;
    
    // Record signatures
    const timestamp = Date.now();
    trait1.signatures.push({
      entityId: connector.id,
      timestamp,
      action: 'connect'
    });
    trait2.signatures.push({
      entityId: connector.id,
      timestamp,
      action: 'connect'
    });
    
    return true;
  }

  /**
   * Record a mirror usage and notify connected Silver carriers
   */
  static recordUsage(mirror: Entity, user: Entity, action: 'enter' | 'look' | 'touch'): void {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return;
    
    // Add signature
    trait.signatures.push({
      entityId: user.id,
      timestamp: Date.now(),
      action
    });
    
    // Ripple detection would go here for Silver carriers
  }

  /**
   * Check if signatures have faded (based on story time, not real time)
   */
  static hasSignatureFaded(signature: any, currentStoryTime: number): boolean {
    // This would use story time, not Date.now()
    // For now, signatures last 2 story hours
    const FADE_TIME = 2 * 60; // 2 hours in story minutes
    return (currentStoryTime - signature.timestamp) > FADE_TIME;
  }
}