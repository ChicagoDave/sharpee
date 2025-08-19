import { IFEntity } from '@sharpee/world-model';
import { MirrorTrait, MirrorSignature } from './mirrorTrait';
import { BloodSilverTrait } from '../bloodSilverTrait/bloodSilverTrait';

/**
 * Mirror behavior logic - handles all mirror-related operations
 */
export class MirrorBehavior {
  /**
   * Check if a mirror can be entered based on its state and orientation
   */
  static canEnter(mirror: IFEntity): boolean {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return false;
    
    // Can't enter broken mirrors
    if (trait.isBroken) return false;
    
    // Can't enter face-down or covered mirrors
    if (trait.isFaceDown || trait.isCovered) return false;
    
    // Must have a connection
    return trait.connections.size > 0;
  }

  /**
   * Check if a mirror can be looked through
   */
  static canLookThrough(mirror: IFEntity): boolean {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return false;
    
    // Can't look through broken or covered mirrors
    if (trait.isBroken || trait.isCovered) return false;
    
    // Must have a connection
    return trait.connections.size > 0;
  }

  /**
   * Get the quality-adjusted description when looking through a mirror
   */
  static getViewQuality(mirror: IFEntity): 'clear' | 'distorted' | 'murky' {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return 'murky';
    
    switch (trait.quality) {
      case 'excellent':
        return 'clear';
      case 'good':
      case 'fair':
        return 'distorted';
      case 'poor':
      default:
        return 'murky';
    }
  }

  /**
   * Connect two mirrors together
   */
  static connectMirrors(mirror1: IFEntity, mirror2: IFEntity, connector: IFEntity): boolean {
    const trait1 = mirror1.getTrait<MirrorTrait>('mirror');
    const trait2 = mirror2.getTrait<MirrorTrait>('mirror');
    const bloodTrait = connector.getTrait<BloodSilverTrait>('bloodSilver');
    
    if (!trait1 || !trait2 || !bloodTrait) return false;
    
    const timestamp = Date.now() / 1000 / 3600; // Convert to story hours
    
    // Update connections
    trait1.connections.set(mirror2.id, {
      targetMirrorId: mirror2.id,
      establishedBy: connector.id,
      establishedAt: timestamp
    });
    trait2.connections.set(mirror1.id, {
      targetMirrorId: mirror1.id,
      establishedBy: connector.id,
      establishedAt: timestamp
    });
    
    // Record signatures
    trait1.signatures.push({
      entityId: connector.id,
      timestamp,
      action: 'connected'
    });
    trait2.signatures.push({
      entityId: connector.id,
      timestamp,
      action: 'connected'
    });
    
    // Record in Silver carrier's connections
    bloodTrait.activeConnections.add(mirror1.id);
    bloodTrait.activeConnections.add(mirror2.id);
    bloodTrait.knownMirrors.add(mirror1.id);
    bloodTrait.knownMirrors.add(mirror2.id);
    
    return true;
  }

  /**
   * Record a mirror usage and notify connected Silver carriers
   */
  static recordUsage(mirror: IFEntity, user: IFEntity, action: 'entered' | 'touched' | 'connected' | 'exited'): void {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return;
    
    const timestamp = Date.now() / 1000 / 3600; // Convert to story hours
    
    // Add signature
    trait.signatures.push({
      entityId: user.id,
      timestamp,
      action
    });
    
    // Keep only last 10 signatures
    if (trait.signatures.length > 10) {
      trait.signatures = trait.signatures.slice(-10);
    }
    
    // Ripple detection would go here for Silver carriers
  }

  /**
   * Check if signatures have faded (based on story time, not real time)
   */
  static hasSignatureFaded(signature: MirrorSignature, currentStoryTime: number): boolean {
    // Signatures last 2 story hours
    const FADE_TIME = 2;
    return (currentStoryTime - signature.timestamp) > FADE_TIME;
  }

  /**
   * Get the first connected mirror (if any)
   */
  static getFirstConnection(mirror: IFEntity): string | undefined {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait || trait.connections.size === 0) return undefined;
    
    return Array.from(trait.connections.keys())[0];
  }

  /**
   * Disconnect a mirror from another
   */
  static disconnectMirror(mirror: IFEntity, targetId: string): void {
    const trait = mirror.getTrait<MirrorTrait>('mirror');
    if (!trait) return;
    
    trait.connections.delete(targetId);
  }
}