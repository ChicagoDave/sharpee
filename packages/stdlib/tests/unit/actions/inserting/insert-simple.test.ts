import { describe, it, expect, beforeEach } from 'vitest';
import { insert, IInsertResult } from '../../../../src/actions/standard/inserting/sub-actions/insert';
import { setupBasicWorld } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';

describe('insert sub-action', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let box: IFEntity;
  let ball: IFEntity;
  let coin: IFEntity;
  
  beforeEach(() => {
    const setup = setupBasicWorld();
    world = setup.world;
    room = setup.room;
    player = setup.player;
    
    // Create container (box)
    box = world.createEntity('box', 'container');
    box.add({ type: TraitType.IDENTITY, name: 'box' });
    box.add({ type: TraitType.CONTAINER });
    world.moveEntity(box.id, room.id);
    
    // Create items
    ball = world.createEntity('ball', 'object');
    ball.add({ type: TraitType.IDENTITY, name: 'ball' });
    world.moveEntity(ball.id, player.id); // Player holds ball
    
    coin = world.createEntity('coin', 'object');
    coin.add({ type: TraitType.IDENTITY, name: 'coin' });
    world.moveEntity(coin.id, player.id); // Player holds coin
  });
  
  describe('basic insertion', () => {
    it('should insert item into container', () => {
      const result: IInsertResult = insert(ball, box, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(player.id);
      
      // Verify state mutation
      expect(world.getLocation(ball.id)).toBe(box.id);
    });
    
    it('should handle inserting multiple items', () => {
      const result1: IInsertResult = insert(ball, box, world);
      const result2: IInsertResult = insert(coin, box, world);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      expect(world.getLocation(ball.id)).toBe(box.id);
      expect(world.getLocation(coin.id)).toBe(box.id);
    });
    
    it('should track previous location', () => {
      // Start with ball on floor
      world.moveEntity(ball.id, room.id);
      
      const result: IInsertResult = insert(ball, box, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(room.id);
      expect(world.getLocation(ball.id)).toBe(box.id);
    });
  });
  
  describe('edge cases', () => {
    it('should handle inserting item already in container', () => {
      // Put ball in box first
      world.moveEntity(ball.id, box.id);
      
      const result: IInsertResult = insert(ball, box, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(box.id);
      expect(world.getLocation(ball.id)).toBe(box.id); // Still in box
    });
    
    it('should move item from one container to another', () => {
      // Create second container
      const chest = world.createEntity('chest', 'container');
      chest.add({ type: TraitType.IDENTITY, name: 'chest' });
      chest.add({ type: TraitType.CONTAINER });
      world.moveEntity(chest.id, room.id);
      
      // Put ball in box first
      world.moveEntity(ball.id, box.id);
      
      const result: IInsertResult = insert(ball, chest, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(box.id);
      expect(world.getLocation(ball.id)).toBe(chest.id);
    });
  });
});