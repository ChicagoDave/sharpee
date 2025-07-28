/**
 * Tests for the refactored capability system
 */

import { describe, test, expect } from '@jest/globals';
import {
  StandardCapabilitySchemas,
  registerStandardCapabilities,
  CommandHistoryCapabilitySchema,
  CommandHistoryData,
  CommandHistoryEntry
} from '../../../src/capabilities';
import { StandardCapabilities, WorldModel } from '@sharpee/world-model';

describe('Capability Refactoring', () => {
  describe('StandardCapabilitySchemas', () => {
    test('should contain all standard capabilities', () => {
      expect(StandardCapabilitySchemas).toHaveProperty(StandardCapabilities.SCORING);
      expect(StandardCapabilitySchemas).toHaveProperty(StandardCapabilities.SAVE_RESTORE);
      expect(StandardCapabilitySchemas).toHaveProperty(StandardCapabilities.CONVERSATION);
      expect(StandardCapabilitySchemas).toHaveProperty(StandardCapabilities.GAME_META);
      expect(StandardCapabilitySchemas).toHaveProperty(StandardCapabilities.COMMAND_HISTORY);
    });

    test('should have valid schemas for each capability', () => {
      // Test scoring schema
      const scoringSchema = StandardCapabilitySchemas[StandardCapabilities.SCORING];
      expect(scoringSchema.scoreValue).toEqual({
        type: 'number',
        default: 0,
        required: true
      });
      expect(scoringSchema.maxScore).toBeDefined();

      // Test command history schema
      const historySchema = StandardCapabilitySchemas[StandardCapabilities.COMMAND_HISTORY];
      expect(historySchema.entries).toEqual({
        type: 'array',
        default: [],
        required: true
      });
      expect(historySchema.maxEntries).toEqual({
        type: 'number',
        default: 100,
        required: false
      });
    });
  });

  describe('registerStandardCapabilities', () => {
    test('should register all capabilities by default', () => {
      const world = new WorldModel();
      const registeredCapabilities: Record<string, any> = {};
      
      // Override registerCapability to track registrations
      const originalRegister = world.registerCapability.bind(world);
      world.registerCapability = (name: string, schema: any) => {
        registeredCapabilities[name] = schema;
        return originalRegister(name, schema);
      };

      registerStandardCapabilities(world);

      // Should register all 5 capabilities
      expect(Object.keys(registeredCapabilities)).toHaveLength(5);
      expect(registeredCapabilities).toHaveProperty(StandardCapabilities.SCORING);
      expect(registeredCapabilities).toHaveProperty(StandardCapabilities.COMMAND_HISTORY);
    });

    test('should register only specified capabilities', () => {
      const world = new WorldModel();
      const registeredCapabilities: Record<string, any> = {};
      
      // Override registerCapability to track registrations
      const originalRegister = world.registerCapability.bind(world);
      world.registerCapability = (name: string, schema: any) => {
        registeredCapabilities[name] = schema;
        return originalRegister(name, schema);
      };

      registerStandardCapabilities(world, [
        StandardCapabilities.SCORING,
        StandardCapabilities.COMMAND_HISTORY
      ]);

      // Should register only 2 capabilities
      expect(Object.keys(registeredCapabilities)).toHaveLength(2);
      expect(registeredCapabilities).toHaveProperty(StandardCapabilities.SCORING);
      expect(registeredCapabilities).toHaveProperty(StandardCapabilities.COMMAND_HISTORY);
      expect(registeredCapabilities).not.toHaveProperty(StandardCapabilities.CONVERSATION);
    });
  });

  describe('CommandHistoryCapability', () => {
    test('should define correct schema structure', () => {
      expect(CommandHistoryCapabilitySchema.entries).toBeDefined();
      expect(CommandHistoryCapabilitySchema.maxEntries).toBeDefined();
    });

    test('should support CommandHistoryData interface', () => {
      const historyData: CommandHistoryData = {
        entries: [],
        maxEntries: 50
      };

      const entry: CommandHistoryEntry = {
        actionId: 'if.action.taking',
        originalText: 'take the lamp',
        parsedCommand: {
          verb: 'take',
          directObject: 'lamp'
        },
        turnNumber: 5,
        timestamp: Date.now()
      };

      historyData.entries.push(entry);
      expect(historyData.entries).toHaveLength(1);
      expect(historyData.entries[0].actionId).toBe('if.action.taking');
    });

    test('should handle entry trimming logic', () => {
      const historyData: CommandHistoryData = {
        entries: [],
        maxEntries: 3
      };

      // Add 5 entries
      for (let i = 0; i < 5; i++) {
        const entry: CommandHistoryEntry = {
          actionId: `if.action.test${i}`,
          originalText: `test ${i}`,
          parsedCommand: { verb: `test${i}` },
          turnNumber: i,
          timestamp: Date.now()
        };
        
        historyData.entries.push(entry);
        
        // Simulate trimming logic
        if (historyData.maxEntries && historyData.entries.length > historyData.maxEntries) {
          historyData.entries.shift();
        }
      }

      // Should only have 3 entries (the last 3)
      expect(historyData.entries).toHaveLength(3);
      expect(historyData.entries[0].actionId).toBe('if.action.test2');
      expect(historyData.entries[2].actionId).toBe('if.action.test4');
    });
  });

  describe('Capability integration with WorldModel', () => {
    test('should work with real WorldModel instance', () => {
      const world = new WorldModel();
      
      // Register command history capability
      registerStandardCapabilities(world, [StandardCapabilities.COMMAND_HISTORY]);
      
      // Update capability data
      const historyData: CommandHistoryData = {
        entries: [],
        maxEntries: 10
      };
      world.updateCapability(StandardCapabilities.COMMAND_HISTORY, historyData);
      
      // Retrieve and verify
      const retrievedData = world.getCapability(StandardCapabilities.COMMAND_HISTORY);
      expect(retrievedData).toEqual(historyData);
      
      // Add an entry
      const entry: CommandHistoryEntry = {
        actionId: 'if.action.looking',
        originalText: 'look around',
        parsedCommand: { verb: 'look' },
        turnNumber: 1,
        timestamp: Date.now()
      };
      
      // Update with new entry
      world.updateCapability(StandardCapabilities.COMMAND_HISTORY, {
        entries: [...historyData.entries, entry]
      });
      
      // Verify update
      const updatedData = world.getCapability(StandardCapabilities.COMMAND_HISTORY) as CommandHistoryData;
      expect(updatedData.entries).toHaveLength(1);
      expect(updatedData.entries[0].actionId).toBe('if.action.looking');
    });
  });
});
