import { describe, it, expect, beforeEach } from 'vitest';
import { put, IPutResult } from '../../../../src/actions/standard/putting/sub-actions/put';
import { setupBasicWorld } from '../../../test-utils';
import { IFEntity, TraitType, WorldModel } from '@sharpee/world-model';

describe('put sub-action', () => {
  let world: WorldModel;
  let room: IFEntity;
  let player: IFEntity;
  let box: IFEntity;
  let table: IFEntity;
  let ball: IFEntity;
  
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
    
    // Create item (ball)
    ball = world.createEntity('ball', 'object');
    ball.add({ type: TraitType.IDENTITY, name: 'ball' });
    world.moveEntity(ball.id, player.id); // Player holds ball
  });
  
  describe('putting into containers', () => {
    it('should move item into container', () => {
      const result: IPutResult = put(ball, box, world);
      
      expect(result.success).toBe(true);
      expect(result.targetType).toBe('container');
      expect(result.previousLocation).toBe(player.id);
      
      // Verify state mutation
      expect(world.getLocation(ball.id)).toBe(box.id);
    });
    
    it('should track previous location correctly', () => {
      // Start with ball on table
      world.moveEntity(ball.id, table.id);
      
      const result: IPutResult = put(ball, box, world);
      
      expect(result.success).toBe(true);
      expect(result.previousLocation).toBe(table.id);
      expect(world.getLocation(ball.id)).toBe(box.id);
    });
  });
  
  describe('putting onto supporters', () => {
    it('should move item onto supporter', () => {
      const result: IPutResult = put(ball, table, world);
      
      expect(result.success).toBe(true);
      expect(result.targetType).toBe('supporter');
      expect(result.previousLocation).toBe(player.id);
      
      // Verify state mutation
      expect(world.getLocation(ball.id)).toBe(table.id);
    });
    
    it('should handle item already on target', () => {
      // Put ball on table first
      world.moveEntity(ball.id, table.id);
      
      const result: IPutResult = put(ball, table, world);
      
      expect(result.success).toBe(true);
      expect(result.targetType).toBe('supporter');
      expect(result.previousLocation).toBe(table.id);
      expect(world.getLocation(ball.id)).toBe(table.id);
    });
  });
  
  describe('hybrid entities', () => {
    it('should prefer container trait when entity has both traits', () => {
      // Create entity with both container and supporter traits
      const desk = world.createEntity('desk', 'object');
      desk.add({ type: TraitType.IDENTITY, name: 'desk' });
      desk.add({ type: TraitType.CONTAINER });
      desk.add({ type: TraitType.SUPPORTER });
      world.moveEntity(desk.id, room.id);
      
      const result: IPutResult = put(ball, desk, world);
      
      expect(result.success).toBe(true);
      expect(result.targetType).toBe('container'); // Should prefer container
      expect(world.getLocation(ball.id)).toBe(desk.id);
    });
  });
});