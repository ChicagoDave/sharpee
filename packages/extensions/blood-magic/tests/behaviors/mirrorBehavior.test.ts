import { describe, it, expect, vi } from 'vitest';
import { MirrorBehavior } from '../../src/traits/mirrorTrait/mirrorBehavior';
import { createMirrorTrait } from '../../src/traits/mirrorTrait/mirrorTrait';
import { createBloodSilverTrait } from '../../src/traits/bloodSilverTrait/bloodSilverTrait';
import { IFEntity } from '@sharpee/world-model';

// Mock IFEntity
function createMockEntity(id: string, traits: Record<string, any> = {}): IFEntity {
  return {
    id,
    getTrait: vi.fn((traitType: string) => traits[traitType]),
    // Add other required IFEntity properties as needed
  } as unknown as IFEntity;
}

describe('MirrorBehavior', () => {
  describe('canEnter', () => {
    it('should return false for entity without mirror trait', () => {
      const entity = createMockEntity('mirror1');
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });

    it('should return false for broken mirrors', () => {
      const mirrorTrait = createMirrorTrait({ isBroken: true });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });

    it('should return false for face-down mirrors', () => {
      const mirrorTrait = createMirrorTrait({ isFaceDown: true });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });

    it('should return false for covered mirrors', () => {
      const mirrorTrait = createMirrorTrait({ isCovered: true });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });

    it('should return false for mirrors without connections', () => {
      const mirrorTrait = createMirrorTrait();
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });

    it('should return true for normal mirrors with connections', () => {
      const mirrorTrait = createMirrorTrait();
      mirrorTrait.connections.set('mirror2', {
        targetMirrorId: 'mirror2',
        establishedBy: 'player1',
        establishedAt: 10
      });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canEnter(entity)).toBe(true);
    });
  });

  describe('canLookThrough', () => {
    it('should return false for broken mirrors', () => {
      const mirrorTrait = createMirrorTrait({ isBroken: true });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canLookThrough(entity)).toBe(false);
    });

    it('should return false for covered mirrors', () => {
      const mirrorTrait = createMirrorTrait({ isCovered: true });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.canLookThrough(entity)).toBe(false);
    });

    it('should return true for face-down mirrors with connections', () => {
      const mirrorTrait = createMirrorTrait({ isFaceDown: true });
      mirrorTrait.connections.set('mirror2', {
        targetMirrorId: 'mirror2',
        establishedBy: 'player1',
        establishedAt: 10
      });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      // Face-down mirrors can be looked through but not entered
      expect(MirrorBehavior.canLookThrough(entity)).toBe(true);
      expect(MirrorBehavior.canEnter(entity)).toBe(false);
    });
  });

  describe('getViewQuality', () => {
    it('should return murky for no trait', () => {
      const entity = createMockEntity('mirror1');
      expect(MirrorBehavior.getViewQuality(entity)).toBe('murky');
    });

    it('should return clear for excellent quality', () => {
      const mirrorTrait = createMirrorTrait({ quality: 'excellent' });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.getViewQuality(entity)).toBe('clear');
    });

    it('should return distorted for good and fair quality', () => {
      const goodMirror = createMirrorTrait({ quality: 'good' });
      const goodEntity = createMockEntity('mirror1', { mirror: goodMirror });
      
      const fairMirror = createMirrorTrait({ quality: 'fair' });
      const fairEntity = createMockEntity('mirror2', { mirror: fairMirror });
      
      expect(MirrorBehavior.getViewQuality(goodEntity)).toBe('distorted');
      expect(MirrorBehavior.getViewQuality(fairEntity)).toBe('distorted');
    });

    it('should return murky for poor quality', () => {
      const mirrorTrait = createMirrorTrait({ quality: 'poor' });
      const entity = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.getViewQuality(entity)).toBe('murky');
    });
  });

  describe('connectMirrors', () => {
    it('should connect two mirrors with silver carrier', () => {
      const mirror1Trait = createMirrorTrait();
      const mirror1 = createMockEntity('mirror1', { mirror: mirror1Trait });
      
      const mirror2Trait = createMirrorTrait();
      const mirror2 = createMockEntity('mirror2', { mirror: mirror2Trait });
      
      const silverTrait = createBloodSilverTrait();
      const connector = createMockEntity('player1', { bloodSilver: silverTrait });
      
      const result = MirrorBehavior.connectMirrors(mirror1, mirror2, connector);
      
      expect(result).toBe(true);
      expect(mirror1Trait.connections.has('mirror2')).toBe(true);
      expect(mirror2Trait.connections.has('mirror1')).toBe(true);
      expect(silverTrait.activeConnections.has('mirror1')).toBe(true);
      expect(silverTrait.activeConnections.has('mirror2')).toBe(true);
    });

    it('should fail without proper traits', () => {
      const mirror1 = createMockEntity('mirror1');
      const mirror2 = createMockEntity('mirror2');
      const connector = createMockEntity('player1');
      
      const result = MirrorBehavior.connectMirrors(mirror1, mirror2, connector);
      
      expect(result).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should record usage and maintain signature limit', () => {
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      const user = createMockEntity('player1');
      
      // Add 12 signatures
      for (let i = 0; i < 12; i++) {
        MirrorBehavior.recordUsage(mirror, user, 'touched');
      }
      
      // Should only keep last 10
      expect(mirrorTrait.signatures.length).toBe(10);
    });
  });

  describe('getFirstConnection', () => {
    it('should return undefined for no connections', () => {
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.getFirstConnection(mirror)).toBeUndefined();
    });

    it('should return first connection ID', () => {
      const mirrorTrait = createMirrorTrait();
      mirrorTrait.connections.set('mirror2', {
        targetMirrorId: 'mirror2',
        establishedBy: 'player1',
        establishedAt: 10
      });
      mirrorTrait.connections.set('mirror3', {
        targetMirrorId: 'mirror3',
        establishedBy: 'player1',
        establishedAt: 11
      });
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      expect(MirrorBehavior.getFirstConnection(mirror)).toBe('mirror2');
    });
  });

  describe('disconnectMirror', () => {
    it('should remove a connection', () => {
      const mirrorTrait = createMirrorTrait();
      mirrorTrait.connections.set('mirror2', {
        targetMirrorId: 'mirror2',
        establishedBy: 'player1',
        establishedAt: 10
      });
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      MirrorBehavior.disconnectMirror(mirror, 'mirror2');
      
      expect(mirrorTrait.connections.has('mirror2')).toBe(false);
    });
  });
});