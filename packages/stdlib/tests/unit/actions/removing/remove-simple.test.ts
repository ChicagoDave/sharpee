import { describe, it, expect, beforeEach } from 'vitest';
import { remove, IRemoveResult } from '../../../../src/actions/standard/removing/sub-actions/remove';
import { setupBasicWorld } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';

describe('remove sub-action', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let box: IFEntity;
  let table: IFEntity;
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
    
    // Create supporter (table)
    table = world.createEntity('table', 'supporter');
    table.add({ type: TraitType.IDENTITY, name: 'table' });
    table.add({ type: TraitType.SUPPORTER });
    world.moveEntity(table.id, room.id);
    
    // Create items
    ball = world.createEntity('ball', 'object');
    ball.add({ type: TraitType.IDENTITY, name: 'ball' });
    
    coin = world.createEntity('coin', 'object');
    coin.add({ type: TraitType.IDENTITY, name: 'coin' });
  });
  
  describe('removing from containers', () => {
    it('should remove item from container and give to actor', () => {
      // Put ball in box
      world.moveEntity(ball.id, box.id);
      
      const result: IRemoveResult = remove(ball, box, player, world);
      
      expect(result.success).toBe(true);
      expect(result.sourceType).toBe('container');
      expect(result.previousLocation).toBe(box.id);
      
      // Verify state mutation - ball should now be with player
      expect(world.getLocation(ball.id)).toBe(player.id);
    });
    
    it('should remove multiple items from container', () => {
      // Put items in box
      world.moveEntity(ball.id, box.id);
      world.moveEntity(coin.id, box.id);
      
      const result1: IRemoveResult = remove(ball, box, player, world);
      const result2: IRemoveResult = remove(coin, box, player, world);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      expect(world.getLocation(ball.id)).toBe(player.id);
      expect(world.getLocation(coin.id)).toBe(player.id);
    });
  });
  
  describe('removing from supporters', () => {
    it('should remove item from supporter and give to actor', () => {
      // Put ball on table
      world.moveEntity(ball.id, table.id);
      
      const result: IRemoveResult = remove(ball, table, player, world);
      
      expect(result.success).toBe(true);
      expect(result.sourceType).toBe('supporter');
      expect(result.previousLocation).toBe(table.id);
      
      // Verify state mutation - ball should now be with player
      expect(world.getLocation(ball.id)).toBe(player.id);
    });
    
    it('should handle removing multiple items from supporter', () => {
      // Put items on table
      world.moveEntity(ball.id, table.id);
      world.moveEntity(coin.id, table.id);
      
      const result1: IRemoveResult = remove(ball, table, player, world);
      const result2: IRemoveResult = remove(coin, table, player, world);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      expect(world.getLocation(ball.id)).toBe(player.id);
      expect(world.getLocation(coin.id)).toBe(player.id);
    });
  });
  
  describe('edge cases', () => {
    it('should handle removing item not in source', () => {
      // Ball is with player, not in box
      world.moveEntity(ball.id, player.id);
      
      const result: IRemoveResult = remove(ball, box, player, world);
      
      // Sub-action still executes the move
      expect(result.success).toBe(true);
      expect(result.sourceType).toBe('container');
      expect(result.previousLocation).toBe(player.id);
      expect(world.getLocation(ball.id)).toBe(player.id); // Already with player
    });
    
    it('should handle hybrid entities with both traits', () => {
      // Create entity with both container and supporter traits
      const desk = world.createEntity('desk', 'object');
      desk.add({ type: TraitType.IDENTITY, name: 'desk' });
      desk.add({ type: TraitType.CONTAINER });
      desk.add({ type: TraitType.SUPPORTER });
      world.moveEntity(desk.id, room.id);
      world.moveEntity(ball.id, desk.id);
      
      const result: IRemoveResult = remove(ball, desk, player, world);
      
      expect(result.success).toBe(true);
      expect(result.sourceType).toBe('container'); // Should prefer container
      expect(result.previousLocation).toBe(desk.id);
      expect(world.getLocation(ball.id)).toBe(player.id);
    });
  });
});