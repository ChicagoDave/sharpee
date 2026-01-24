import { describe, it, expect, vi } from 'vitest';
import { touchingMirrorAction } from '../../src/actions/touchingMirror/touchingMirror';
import { createMirrorTrait } from '../../src/traits/mirrorTrait/mirrorTrait';
import { createBloodSilverTrait } from '../../src/traits/bloodSilverTrait/bloodSilverTrait';
import { ActionContext } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';

// Mock entity
function createMockEntity(id: string, traits: Record<string, any> = {}): IFEntity {
  return {
    id,
    getTrait: vi.fn((traitType: string) => traits[traitType]),
  } as unknown as IFEntity;
}

// Mock world
function createMockWorld(player: IFEntity): WorldModel {
  return {
    getPlayer: vi.fn(() => player),
    getEntity: vi.fn((id: string) => undefined),
  } as unknown as WorldModel;
}

describe('touchingMirrorAction', () => {
  describe('metadata', () => {
    it('should have correct configuration', () => {
      expect(touchingMirrorAction.id).toBe('blood.action.touching_mirror');
      expect(touchingMirrorAction.group).toBe('mirror_interaction');
      expect(touchingMirrorAction.metadata.requiresDirectObject).toBe(true);
      expect(touchingMirrorAction.metadata.requiresIndirectObject).toBe(false);
    });
  });

  describe('validate', () => {
    it('should fail when no mirror is provided', () => {
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: undefined,
        },
      } as ActionContext;

      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_mirror');
    });

    it('should fail when object is not a mirror', () => {
      const entity = createMockEntity('object1');
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity },
        },
      } as ActionContext;

      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('no_mirror');
    });

    it('should fail when mirror is broken', () => {
      const mirrorTrait = createMirrorTrait({ isBroken: true });
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
      } as ActionContext;

      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('mirror_broken');
    });

    it('should pass with valid mirror', () => {
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
      } as ActionContext;

      const result = touchingMirrorAction.validate(context);
      
      expect(result.valid).toBe(true);
    });
  });

  describe('execute', () => {
    it('should create event for non-silver carrier touching mirror', () => {
      const player = createMockEntity('player1');
      const world = createMockWorld(player);
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
        world,
      } as ActionContext;

      const events = touchingMirrorAction.execute(context);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('blood.event.touched_mirror');
      expect(events[0].entities.actor).toBe('player1');
      expect(events[0].entities.target).toBe('mirror1');
      expect(events[0].data?.message).toBe('touched_mirror');
    });

    it('should detect connections for silver carrier', () => {
      const silverTrait = createBloodSilverTrait();
      const player = createMockEntity('player1', { bloodSilver: silverTrait });
      const world = createMockWorld(player);
      
      const mirrorTrait = createMirrorTrait();
      mirrorTrait.connections.set('mirror2', {
        targetMirrorId: 'mirror2',
        establishedBy: 'player1',
        establishedAt: 10
      });
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
        world,
      } as ActionContext;

      const events = touchingMirrorAction.execute(context);
      
      expect(events).toHaveLength(1);
      expect(events[0].data?.message).toBe('silver_senses_connection');
      expect(events[0].data?.connectedTo).toBe('mirror2');
    });

    it('should detect no connection for silver carrier with unconnected mirror', () => {
      const silverTrait = createBloodSilverTrait();
      const player = createMockEntity('player1', { bloodSilver: silverTrait });
      const world = createMockWorld(player);
      
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
        world,
      } as ActionContext;

      const events = touchingMirrorAction.execute(context);
      
      expect(events).toHaveLength(1);
      expect(events[0].data?.message).toBe('silver_no_connection');
    });

    it('should return empty array if no player', () => {
      const world = createMockWorld(undefined as any);
      const mirrorTrait = createMirrorTrait();
      const mirror = createMockEntity('mirror1', { mirror: mirrorTrait });
      
      const context: ActionContext = {
        command: {
          verb: 'touch',
          directObject: { entity: mirror },
        },
        world,
      } as ActionContext;

      const events = touchingMirrorAction.execute(context);
      
      expect(events).toHaveLength(0);
    });
  });
});