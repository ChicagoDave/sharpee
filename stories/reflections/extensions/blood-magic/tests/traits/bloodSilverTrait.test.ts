import { describe, it, expect } from 'vitest';
import {
  BloodSilverTrait,
  createBloodSilverTrait,
  canSenseMirror,
  recordTravel,
  addActiveConnection
} from '../../src/traits/bloodSilverTrait/bloodSilverTrait';

describe('BloodSilverTrait', () => {
  describe('createBloodSilverTrait', () => {
    it('should create a silver trait with default properties', () => {
      const trait = createBloodSilverTrait();
      
      expect(trait.type).toBe('blood_silver');
      expect(trait.activeConnections).toBeInstanceOf(Set);
      expect(trait.activeConnections.size).toBe(0);
      expect(trait.knownMirrors).toBeInstanceOf(Set);
      expect(trait.knownMirrors.size).toBe(0);
      expect(trait.sensingRipples).toBe(true);
      expect(trait.senseRange).toBe('room');
      expect(trait.mirrorsEntered).toBe(0);
      expect(trait.lastMirrorUsed).toBeUndefined();
      expect(trait.lastTravelTime).toBeUndefined();
    });

    it('should create a silver trait with custom properties', () => {
      const connections = new Set(['mirror1', 'mirror2']);
      const known = new Set(['mirror1', 'mirror2', 'mirror3']);
      
      const trait = createBloodSilverTrait({
        activeConnections: connections,
        knownMirrors: known,
        sensingRipples: false,
        senseRange: 'unlimited',
        mirrorsEntered: 5,
        lastMirrorUsed: 'mirror3',
        lastTravelTime: 100
      });
      
      expect(trait.activeConnections).toBe(connections);
      expect(trait.knownMirrors).toBe(known);
      expect(trait.sensingRipples).toBe(false);
      expect(trait.senseRange).toBe('unlimited');
      expect(trait.mirrorsEntered).toBe(5);
      expect(trait.lastMirrorUsed).toBe('mirror3');
      expect(trait.lastTravelTime).toBe(100);
    });
  });

  describe('canSenseMirror', () => {
    it('should not sense if ripple sensing is disabled', () => {
      const trait = createBloodSilverTrait({ sensingRipples: false });
      trait.activeConnections.add('mirror1');
      
      const canSense = canSenseMirror(trait, 'mirror1', true, true);
      expect(canSense).toBe(false);
    });

    it('should not sense mirrors not in active connections', () => {
      const trait = createBloodSilverTrait();
      
      const canSense = canSenseMirror(trait, 'mirror1', true, true);
      expect(canSense).toBe(false);
    });

    describe('range-based sensing', () => {
      it('should handle touch range (never senses)', () => {
        const trait = createBloodSilverTrait({ senseRange: 'touch' });
        trait.activeConnections.add('mirror1');
        
        expect(canSenseMirror(trait, 'mirror1', true, true)).toBe(false);
      });

      it('should handle room range', () => {
        const trait = createBloodSilverTrait({ senseRange: 'room' });
        trait.activeConnections.add('mirror1');
        
        expect(canSenseMirror(trait, 'mirror1', true, false)).toBe(true);
        expect(canSenseMirror(trait, 'mirror1', false, false)).toBe(false);
      });

      it('should handle connected range', () => {
        const trait = createBloodSilverTrait({ senseRange: 'connected' });
        trait.activeConnections.add('mirror1');
        
        expect(canSenseMirror(trait, 'mirror1', false, true)).toBe(true);
        expect(canSenseMirror(trait, 'mirror1', false, false)).toBe(false);
      });

      it('should handle unlimited range', () => {
        const trait = createBloodSilverTrait({ senseRange: 'unlimited' });
        trait.activeConnections.add('mirror1');
        
        expect(canSenseMirror(trait, 'mirror1', false, false)).toBe(true);
        expect(canSenseMirror(trait, 'mirror1', true, true)).toBe(true);
      });
    });
  });

  describe('recordTravel', () => {
    it('should record mirror travel', () => {
      const trait = createBloodSilverTrait();
      const mirrorId = 'mirror1';
      const storyTime = 50;
      
      recordTravel(trait, mirrorId, storyTime);
      
      expect(trait.mirrorsEntered).toBe(1);
      expect(trait.lastMirrorUsed).toBe(mirrorId);
      expect(trait.lastTravelTime).toBe(storyTime);
      expect(trait.knownMirrors.has(mirrorId)).toBe(true);
    });

    it('should track multiple travels', () => {
      const trait = createBloodSilverTrait();
      
      recordTravel(trait, 'mirror1', 10);
      recordTravel(trait, 'mirror2', 20);
      recordTravel(trait, 'mirror1', 30); // Same mirror again
      
      expect(trait.mirrorsEntered).toBe(3);
      expect(trait.lastMirrorUsed).toBe('mirror1');
      expect(trait.lastTravelTime).toBe(30);
      expect(trait.knownMirrors.size).toBe(2); // Only 2 unique mirrors
      expect(trait.knownMirrors.has('mirror1')).toBe(true);
      expect(trait.knownMirrors.has('mirror2')).toBe(true);
    });
  });

  describe('addActiveConnection', () => {
    it('should add a connection and mark mirror as known', () => {
      const trait = createBloodSilverTrait();
      const mirrorId = 'mirror1';
      
      addActiveConnection(trait, mirrorId);
      
      expect(trait.activeConnections.has(mirrorId)).toBe(true);
      expect(trait.knownMirrors.has(mirrorId)).toBe(true);
    });

    it('should handle duplicate connections', () => {
      const trait = createBloodSilverTrait();
      
      addActiveConnection(trait, 'mirror1');
      addActiveConnection(trait, 'mirror1'); // Add same mirror again
      
      expect(trait.activeConnections.size).toBe(1);
      expect(trait.knownMirrors.size).toBe(1);
    });
  });
});