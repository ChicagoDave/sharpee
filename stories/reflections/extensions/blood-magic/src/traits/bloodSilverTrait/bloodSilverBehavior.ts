import { IFEntity } from '@sharpee/world-model';
import { BloodSilverTrait } from './bloodSilverTrait';
import { MirrorTrait } from '../mirrorTrait/mirrorTrait';

/**
 * Blood of Silver behavior logic - handles Silver carrier abilities
 */
export class BloodSilverBehavior {
  /**
   * Check if an entity can sense mirror ripples
   */
  static canSenseRipples(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    return trait?.sensingRipples === true;
  }

  /**
   * Detect if a Silver carrier would sense someone using their connected mirrors
   */
  static detectRipple(silverCarrier: IFEntity, usedMirror: IFEntity): boolean {
    const bloodTrait = silverCarrier.getTrait<BloodSilverTrait>('bloodSilver');
    const mirrorTrait = usedMirror.getTrait<MirrorTrait>('mirror');
    
    if (!bloodTrait?.sensingRipples || !mirrorTrait) return false;
    
    // Check if this Silver carrier has connected this mirror
    return bloodTrait.activeConnections.has(usedMirror.id) ||
           Array.from(mirrorTrait.connections.keys()).some(id => 
             bloodTrait.activeConnections.has(id)
           );
  }

  /**
   * Record that a Silver carrier has used a mirror
   */
  static recordMirrorUse(entity: IFEntity, mirror: IFEntity): void {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return;
    
    trait.knownMirrors.add(mirror.id);
    trait.lastMirrorUsed = mirror.id;
    trait.mirrorsEntered++;
    trait.lastTravelTime = Date.now() / 1000 / 3600; // Convert to story hours
  }

  /**
   * Add a mirror connection for a Silver carrier
   */
  static addConnection(entity: IFEntity, mirrorId: string): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return false;
    
    trait.activeConnections.add(mirrorId);
    trait.knownMirrors.add(mirrorId);
    return true;
  }

  /**
   * Remove a mirror connection
   */
  static removeConnection(entity: IFEntity, mirrorId: string): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    if (!trait) return false;
    
    trait.activeConnections.delete(mirrorId);
    return true;
  }

  /**
   * Check if an entity can create mirror connections
   */
  static canConnect(entity: IFEntity): boolean {
    const trait = entity.getTrait<BloodSilverTrait>('bloodSilver');
    return trait !== undefined;
  }
}