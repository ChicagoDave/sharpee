import { describe, it, expect } from 'vitest';
import {
  MirrorTrait,
  createMirrorTrait,
  connectMirrors,
  disconnectMirror,
  breakMirror,
  addSignature,
  getRecentSignatures,
  updateTravelAbility
} from '../../src/traits/mirrorTrait/mirrorTrait';

describe('MirrorTrait', () => {
  describe('createMirrorTrait', () => {
    it('should create a mirror with default properties', () => {
      const mirror = createMirrorTrait();
      
      expect(mirror.type).toBe('mirror');
      expect(mirror.orientation).toBe('wall');
      expect(mirror.size).toBe('medium');
      expect(mirror.quality).toBe('good');
      expect(mirror.isBroken).toBe(false);
      expect(mirror.isCovered).toBe(false);
      expect(mirror.isFaceDown).toBe(false);
      expect(mirror.connections).toBeInstanceOf(Map);
      expect(mirror.connections.size).toBe(0);
      expect(mirror.signatures).toEqual([]);
      expect(mirror.canEnter).toBe(true);
      expect(mirror.canExit).toBe(true);
    });

    it('should create a mirror with custom properties', () => {
      const mirror = createMirrorTrait({
        orientation: 'floor',
        size: 'large',
        quality: 'excellent',
        isBroken: true
      });
      
      expect(mirror.orientation).toBe('floor');
      expect(mirror.size).toBe('large');
      expect(mirror.quality).toBe('excellent');
      expect(mirror.isBroken).toBe(true);
      expect(mirror.canEnter).toBe(false); // Broken mirrors can't be entered
      expect(mirror.canExit).toBe(false);
    });
  });

  describe('updateTravelAbility', () => {
    it('should prevent travel through broken mirrors', () => {
      const mirror = createMirrorTrait();
      mirror.isBroken = true;
      updateTravelAbility(mirror);
      
      expect(mirror.canEnter).toBe(false);
      expect(mirror.canExit).toBe(false);
    });

    it('should prevent travel through face-down mirrors', () => {
      const mirror = createMirrorTrait();
      mirror.isFaceDown = true;
      updateTravelAbility(mirror);
      
      expect(mirror.canEnter).toBe(false);
      expect(mirror.canExit).toBe(false);
    });

    it('should allow exit but not entry for covered mirrors', () => {
      const mirror = createMirrorTrait();
      mirror.isCovered = true;
      updateTravelAbility(mirror);
      
      expect(mirror.canEnter).toBe(false);
      expect(mirror.canExit).toBe(true);
    });

    it('should allow both entry and exit for normal mirrors', () => {
      const mirror = createMirrorTrait();
      updateTravelAbility(mirror);
      
      expect(mirror.canEnter).toBe(true);
      expect(mirror.canExit).toBe(true);
    });
  });

  describe('connectMirrors', () => {
    it('should establish a connection between mirrors', () => {
      const mirror1 = createMirrorTrait();
      const mirror2Id = 'mirror2';
      const connectorId = 'player1';
      const storyTime = 10;
      
      connectMirrors(mirror1, mirror2Id, connectorId, storyTime);
      
      expect(mirror1.connections.size).toBe(1);
      expect(mirror1.connections.has(mirror2Id)).toBe(true);
      
      const connection = mirror1.connections.get(mirror2Id);
      expect(connection).toBeDefined();
      expect(connection?.targetMirrorId).toBe(mirror2Id);
      expect(connection?.establishedBy).toBe(connectorId);
      expect(connection?.establishedAt).toBe(storyTime);
    });

    it('should add a signature when connecting', () => {
      const mirror = createMirrorTrait();
      const targetId = 'mirror2';
      const connectorId = 'player1';
      const storyTime = 10;
      
      connectMirrors(mirror, targetId, connectorId, storyTime);
      
      expect(mirror.signatures.length).toBe(1);
      expect(mirror.signatures[0].entityId).toBe(connectorId);
      expect(mirror.signatures[0].action).toBe('connected');
      expect(mirror.signatures[0].timestamp).toBe(storyTime);
    });

    it('should throw error when connecting broken mirror', () => {
      const mirror = createMirrorTrait({ isBroken: true });
      
      expect(() => {
        connectMirrors(mirror, 'mirror2', 'player1', 10);
      }).toThrow('Cannot connect broken mirror');
    });
  });

  describe('disconnectMirror', () => {
    it('should remove a connection', () => {
      const mirror = createMirrorTrait();
      const targetId = 'mirror2';
      
      connectMirrors(mirror, targetId, 'player1', 10);
      expect(mirror.connections.size).toBe(1);
      
      disconnectMirror(mirror, targetId);
      expect(mirror.connections.size).toBe(0);
      expect(mirror.connections.has(targetId)).toBe(false);
    });
  });

  describe('breakMirror', () => {
    it('should break mirror and clear all connections', () => {
      const mirror = createMirrorTrait();
      
      // Add some connections
      connectMirrors(mirror, 'mirror2', 'player1', 10);
      connectMirrors(mirror, 'mirror3', 'player1', 11);
      expect(mirror.connections.size).toBe(2);
      
      breakMirror(mirror);
      
      expect(mirror.isBroken).toBe(true);
      expect(mirror.connections.size).toBe(0);
      expect(mirror.canEnter).toBe(false);
      expect(mirror.canExit).toBe(false);
    });
  });

  describe('signatures', () => {
    it('should add signatures', () => {
      const mirror = createMirrorTrait();
      
      addSignature(mirror, 'player1', 10, 'touched');
      addSignature(mirror, 'player2', 11, 'entered');
      
      expect(mirror.signatures.length).toBe(2);
      expect(mirror.signatures[0].entityId).toBe('player1');
      expect(mirror.signatures[0].action).toBe('touched');
      expect(mirror.signatures[1].entityId).toBe('player2');
      expect(mirror.signatures[1].action).toBe('entered');
    });

    it('should limit signatures to 10 most recent', () => {
      const mirror = createMirrorTrait();
      
      // Add 12 signatures
      for (let i = 1; i <= 12; i++) {
        addSignature(mirror, `player${i}`, i, 'touched');
      }
      
      expect(mirror.signatures.length).toBe(10);
      expect(mirror.signatures[0].entityId).toBe('player3'); // First two should be removed
      expect(mirror.signatures[9].entityId).toBe('player12');
    });

    it('should get recent signatures', () => {
      const mirror = createMirrorTrait();
      
      addSignature(mirror, 'player1', 5, 'touched');
      addSignature(mirror, 'player2', 10, 'entered');
      addSignature(mirror, 'player3', 15, 'connected');
      addSignature(mirror, 'player4', 20, 'exited');
      
      // Get signatures from last 8 hours (current time = 20)
      const recent = getRecentSignatures(mirror, 20, 8);
      
      expect(recent.length).toBe(2); // Only signatures at time 15 and 20
      expect(recent[0].entityId).toBe('player3');
      expect(recent[1].entityId).toBe('player4');
    });
  });
});