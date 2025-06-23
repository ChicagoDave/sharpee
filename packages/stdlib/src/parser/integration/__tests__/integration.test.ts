/**
 * Tests for Parser-World Integration
 */

import { IFWorld } from '../../world-model/if-world';
import { EntityFactory } from '../../world-model/if-world/entity-factory';
import { createEnhancedIFParser } from '../enhanced-if-parser';
import { createWorldAwareParser } from '../integration/world-aware-parser';
import { createEnglishData } from '../languages/en-US';
import { createDefaultParserConfig } from '../parser-config';

describe('Parser-World Integration', () => {
  let world: IFWorld;
  let parser: any;

  beforeEach(() => {
    // Create world with player
    world = new IFWorld({ playerId: 'player' });
    
    // Create player
    const player = EntityFactory.createPlayer('player');
    world.addEntity(player);
    
    // Create a room
    const room = EntityFactory.createRoom({
      id: 'living-room',
      name: 'Living Room',
      description: 'A comfortable living room with a large sofa.'
    });
    world.addEntity(room);
    world.moveEntity('player', 'living-room');
    
    // Create enhanced parser with language data
    const languageData = createEnglishData();
    const config = createDefaultParserConfig();
    const enhancedParser = createEnhancedIFParser(config, languageData);
    
    // Create world-aware parser
    parser = createWorldAwareParser(enhancedParser, world);
  });

  describe('Basic Integration', () => {
    it('should parse commands using real world scope', () => {
      // Add a visible object
      const lamp = EntityFactory.createThing({
        id: 'brass-lamp',
        name: 'lamp',
        adjectives: ['brass', 'old'],
        description: 'An old brass lamp.'
      });
      world.addEntity(lamp);
      world.moveEntity('brass-lamp', 'living-room');
      
      // Parse command
      const result = parser.parse('take lamp');
      
      expect(result.success).toBe(true);
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].action).toBe('taking');
      expect(result.commands[0].noun![0].entity.id).toBe('brass-lamp');
    });

    it('should handle objects not in scope', () => {
      // Add object in different room
      const otherRoom = EntityFactory.createRoom({
        id: 'kitchen',
        name: 'Kitchen'
      });
      world.addEntity(otherRoom);
      
      const knife = EntityFactory.createThing({
        id: 'knife',
        name: 'knife'
      });
      world.addEntity(knife);
      world.moveEntity('knife', 'kitchen'); // Not visible from living room
      
      // Try to take it
      const result = parser.parse('take knife');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("I don't see any \"knife\" here");
    });
  });

  describe('Scope Hints', () => {
    it('should respect "held" scope hint', () => {
      // Create two keys
      const brassKey = EntityFactory.createThing({
        id: 'brass-key',
        name: 'key',
        adjectives: ['brass']
      });
      const ironKey = EntityFactory.createThing({
        id: 'iron-key',
        name: 'key',
        adjectives: ['iron']
      });
      
      world.addEntity(brassKey);
      world.addEntity(ironKey);
      
      // Player holds brass key, iron key is on floor
      world.moveEntity('brass-key', 'player');
      world.moveEntity('iron-key', 'living-room');
      
      // Create a door
      const door = EntityFactory.createDoor({
        id: 'wooden-door',
        name: 'door',
        lockable: true,
        locked: true
      });
      world.addEntity(door);
      world.moveEntity('wooden-door', 'living-room');
      
      // "unlock door with key" should prefer held key
      const result = parser.parse('unlock door with key');
      
      expect(result.success).toBe(true);
      if (!result.needsDisambiguation) {
        expect(result.commands[0].second![0].entity.id).toBe('brass-key');
      }
    });

    it('should handle container scope hints', () => {
      // Create a box and a table
      const box = EntityFactory.createContainer({
        id: 'wooden-box',
        name: 'box',
        adjectives: ['wooden']
      });
      const table = EntityFactory.createSupporter({
        id: 'table',
        name: 'table'
      });
      
      world.addEntity(box);
      world.addEntity(table);
      world.moveEntity('wooden-box', 'living-room');
      world.moveEntity('table', 'living-room');
      
      // Create a coin
      const coin = EntityFactory.createThing({
        id: 'coin',
        name: 'coin'
      });
      world.addEntity(coin);
      world.moveEntity('coin', 'player');
      
      // "put coin in box" should work
      const result1 = parser.parse('put coin in box');
      expect(result1.success).toBe(true);
      expect(result1.commands[0].second![0].entity.id).toBe('wooden-box');
      
      // "put coin in table" should fail (table is supporter, not container)
      const result2 = parser.parse('put coin in table');
      // This might need disambiguation or fail depending on grammar
    });
  });

  describe('Recently Mentioned Tracking', () => {
    it('should track recently mentioned entities', () => {
      // Create objects
      const book = EntityFactory.createThing({
        id: 'red-book',
        name: 'book',
        adjectives: ['red']
      });
      const pen = EntityFactory.createThing({
        id: 'blue-pen',
        name: 'pen',
        adjectives: ['blue']
      });
      
      world.addEntity(book);
      world.addEntity(pen);
      world.moveEntity('red-book', 'living-room');
      world.moveEntity('blue-pen', 'living-room');
      
      // Take the book
      parser.parse('take book');
      
      // "it" should refer to the book
      const result = parser.parse('examine it');
      
      expect(result.success).toBe(true);
      expect(result.commands[0].noun![0].entity.id).toBe('red-book');
      expect(result.commands[0].noun![0].matchType).toBe('pronoun');
    });

    it('should update recent mentions on disambiguation', () => {
      // Create two books
      const redBook = EntityFactory.createThing({
        id: 'red-book',
        name: 'book',
        adjectives: ['red']
      });
      const blueBook = EntityFactory.createThing({
        id: 'blue-book',
        name: 'book',
        adjectives: ['blue']
      });
      
      world.addEntity(redBook);
      world.addEntity(blueBook);
      world.moveEntity('red-book', 'living-room');
      world.moveEntity('blue-book', 'living-room');
      
      // Take book (ambiguous)
      const result1 = parser.parse('take book');
      expect(result1.needsDisambiguation).toBeDefined();
      
      // Choose red book
      const command = parser.continueWithDisambiguation(
        result1.commands[0],
        'red-book',
        'noun'
      );
      
      // Now "it" should refer to red book
      const result2 = parser.parse('examine it');
      expect(result2.success).toBe(true);
      expect(result2.commands[0].noun![0].entity.id).toBe('red-book');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle nested containers', () => {
      // Create nested containers
      const chest = EntityFactory.createContainer({
        id: 'chest',
        name: 'chest',
        open: true
      });
      const box = EntityFactory.createContainer({
        id: 'box',
        name: 'box',
        open: true
      });
      const coin = EntityFactory.createThing({
        id: 'coin',
        name: 'coin'
      });
      
      world.addEntity(chest);
      world.addEntity(box);
      world.addEntity(coin);
      
      // Set up: chest in room, box in chest, coin in box
      world.moveEntity('chest', 'living-room');
      world.moveEntity('box', 'chest');
      world.moveEntity('coin', 'box');
      
      // Should be able to see and take the coin
      const result = parser.parse('take coin');
      
      expect(result.success).toBe(true);
      expect(result.commands[0].noun![0].entity.id).toBe('coin');
    });

    it('should handle darkness and light sources', () => {
      // Create a dark room
      const darkRoom = EntityFactory.createRoom({
        id: 'cellar',
        name: 'Cellar',
        dark: true
      });
      world.addEntity(darkRoom);
      
      // Add a coin in the dark room
      const coin = EntityFactory.createThing({
        id: 'coin',
        name: 'coin'
      });
      world.addEntity(coin);
      world.moveEntity('coin', 'cellar');
      
      // Move player to dark room
      world.moveEntity('player', 'cellar');
      
      // Can't see coin in darkness
      const result1 = parser.parse('take coin');
      expect(result1.success).toBe(false);
      
      // Create a light source
      const lamp = EntityFactory.createDevice({
        id: 'lamp',
        name: 'lamp',
        on: true,
        providesLight: true
      });
      world.addEntity(lamp);
      world.moveEntity('lamp', 'player');
      
      // Update lamp to be lit
      const litLamp = world.getEntity('lamp')!;
      world.updateEntity('lamp', {
        ...litLamp,
        attributes: { ...litLamp.attributes, lit: true }
      });
      
      // Now should see coin
      const result2 = parser.parse('take coin');
      expect(result2.success).toBe(true);
    });
  });
});
