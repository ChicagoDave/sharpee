import { 
  createSemanticEventSource,
  createSimpleRuleSystem,
  createEvent,
  StandardEventTypes
} from '../../src';
import { Rule, RuleWorld } from '../../src/rules';
import { vi } from 'vitest';

describe('Event and Rule Integration', () => {
  let eventSource: ReturnType<typeof createSemanticEventSource>;
  let ruleSystem: ReturnType<typeof createSimpleRuleSystem>;
  let mockWorld: RuleWorld;

  beforeEach(() => {
    eventSource = createSemanticEventSource();
    ruleSystem = createSimpleRuleSystem();

    // Create a mock world with some entities
    const entities = new Map<string, any>([
      ['player', {
        id: 'player',
        type: 'actor',
        attributes: { 
          name: 'Hero',
          health: 100,
          inventory: []
        }
      }],
      ['goblin', {
        id: 'goblin',
        type: 'actor',
        attributes: {
          name: 'Goblin',
          health: 30,
          hostile: true
        }
      }],
      ['sword', {
        id: 'sword',
        type: 'item',
        attributes: {
          name: 'Iron Sword',
          damage: 15,
          weight: 5
        }
      }],
      ['dungeon', {
        id: 'dungeon',
        type: 'location',
        attributes: {
          name: 'Dark Dungeon',
          lightLevel: 0
        }
      }]
    ]);

    mockWorld = {
      getEntity: (id: string) => entities.get(id),
      updateEntity: (id: string, changes: Record<string, any>) => {
        const entity = entities.get(id);
        if (entity) {
          Object.assign(entity.attributes, changes);
        }
      },
      getPlayer: () => entities.get('player'),
      getCurrentLocation: () => entities.get('dungeon')
    };
  });

  describe('Event Flow Through Rules', () => {
    it('should process events through rules and generate new events', () => {
      // Add a rule that reacts to taking items
      const takeRule: Rule = {
        id: 'item-take-rule',
        eventType: 'item:taking',
        action: (event, world) => {
          const item = world.getEntity(event.entities.target!);
          if (!item) {
            return {
              prevent: true,
              message: "That item doesn't exist!"
            };
          }

          // Add item to player inventory
          const player = world.getPlayer();
          player.attributes.inventory.push(item.id);

          return {
            prevent: false,
            message: `You take the ${item.attributes.name}.`,
            events: [
              createEvent(
                'inventory:added',
                { itemId: item.id, itemName: item.attributes.name },
                { actor: event.entities.actor, target: item.id }
              )
            ]
          };
        }
      };

      ruleSystem.addRule(takeRule);

      // Create and process a taking event
      const takeEvent = createEvent(
        'item:taking',
        {},
        { actor: 'player', target: 'sword', location: 'dungeon' }
      );

      const result = ruleSystem.processEvent(takeEvent, mockWorld);

      // Verify the rule executed
      expect(result.prevent).toBe(false);
      expect(result.message).toBe('You take the Iron Sword.');
      
      // Should generate a narrative event and an inventory event
      expect(result.events).toHaveLength(2);
      expect(result.events![0].type).toBe('inventory:added');
      expect(result.events![1].type).toBe('narrative');
      
      // Check player inventory was updated
      expect(mockWorld.getPlayer().attributes.inventory).toContain('sword');
    });

    it('should handle rule chains where one event triggers another', () => {
      const events: string[] = [];

      // Rule 1: Combat damage triggers health check
      ruleSystem.addRule({
        id: 'damage-rule',
        eventType: 'combat:damage',
        action: (event, world) => {
          const target = world.getEntity(event.entities.target!);
          const damage = event.payload?.damage || 0;
          
          // Apply damage
          const newHealth = Math.max(0, target.attributes.health - damage);
          world.updateEntity(target.id, { health: newHealth });

          events.push(`damage-rule: ${target.id} takes ${damage} damage`);

          // Generate health check event
          return {
            prevent: false,
            events: [
              createEvent(
                'actor:health-changed',
                { 
                  oldHealth: target.attributes.health + damage,
                  newHealth,
                  entityId: target.id
                },
                { target: target.id }
              )
            ]
          };
        }
      });

      // Rule 2: Health check triggers death if health <= 0
      ruleSystem.addRule({
        id: 'death-check-rule',
        eventType: 'actor:health-changed',
        condition: (event) => event.payload?.newHealth <= 0,
        action: (event, world) => {
          const entity = world.getEntity(event.entities.target!);
          events.push(`death-check-rule: ${entity.id} dies`);

          return {
            prevent: false,
            message: `${entity.attributes.name} has been defeated!`,
            events: [
              createEvent(
                'actor:died',
                { entityId: entity.id, entityName: entity.attributes.name },
                { target: entity.id }
              )
            ]
          };
        }
      });

      // Store all events in the event source
      eventSource.subscribe(event => {
        eventSource.addEvent(event);
      });

      // Initial damage event
      const damageEvent = createEvent(
        'combat:damage',
        { damage: 35 },
        { actor: 'player', target: 'goblin' }
      );

      // Process through rules
      const result1 = ruleSystem.processEvent(damageEvent, mockWorld);
      
      // Process the generated health-changed event
      const healthEvent = result1.events![0];
      const result2 = ruleSystem.processEvent(healthEvent, mockWorld);

      // Verify the chain
      expect(events).toEqual([
        'damage-rule: goblin takes 35 damage',
        'death-check-rule: goblin dies'
      ]);

      // Verify final state
      expect(mockWorld.getEntity('goblin')?.attributes.health).toBe(0);
      expect(result2.events).toHaveLength(2); // death event + narrative
      expect(result2.events![0].type).toBe('actor:died');
    });

    it('should handle complex rule interactions with priorities', () => {
      // Darkness prevents most actions
      ruleSystem.addRule({
        id: 'darkness-rule',
        eventType: 'action:*',
        priority: 100, // High priority - check first
        condition: (event, world) => {
          const location = world.getCurrentLocation();
          return location?.attributes.lightLevel === 0;
        },
        action: (event) => {
          if (event.type === 'action:light-torch') {
            return { prevent: false }; // Allow lighting
          }
          return {
            prevent: true,
            message: "It's too dark to see!"
          };
        }
      });

      // Specific rule for examining
      ruleSystem.addRule({
        id: 'examine-rule',
        eventType: 'action:examine',
        priority: 50,
        action: (event, world) => {
          const target = world.getEntity(event.entities.target!);
          return {
            prevent: false,
            message: `You examine the ${target.attributes.name}.`
          };
        }
      });

      // Try to examine in the dark
      const examineEvent = createEvent(
        'action:examine',
        {},
        { actor: 'player', target: 'sword', location: 'dungeon' }
      );

      const result = ruleSystem.processEvent(examineEvent, mockWorld);
      
      // Darkness rule should prevent it
      expect(result.prevent).toBe(true);
      expect(result.message).toBe("It's too dark to see!");

      // But lighting a torch should work
      const lightEvent = createEvent(
        'action:light-torch',
        {},
        { actor: 'player', location: 'dungeon' }
      );

      const lightResult = ruleSystem.processEvent(lightEvent, mockWorld);
      expect(lightResult.prevent).toBe(false);
    });
  });

  describe('Event Source and Rule System Working Together', () => {
    it('should accumulate events from rules in the event source', () => {
      // Set up a rule that generates multiple events
      ruleSystem.addRule({
        id: 'multi-event-rule',
        eventType: 'test:trigger',
        action: () => ({
          prevent: false,
          events: [
            createEvent('test:result1', { value: 1 }),
            createEvent('test:result2', { value: 2 }),
            createEvent('test:result3', { value: 3 })
          ]
        })
      });

      // Process an event
      const trigger = createEvent('test:trigger', {});
      const result = ruleSystem.processEvent(trigger, mockWorld);

      // Add all generated events to the event source
      result.events?.forEach(event => eventSource.addEvent(event));

      // Verify they're all stored
      const allEvents = eventSource.getAllEvents();
      expect(allEvents).toHaveLength(3);
      expect(allEvents.map(e => e.type)).toEqual([
        'test:result1',
        'test:result2',
        'test:result3'
      ]);
    });

    it('should allow querying events generated by rules', () => {
      // Rule that tags events
      ruleSystem.addRule({
        id: 'tagging-rule',
        eventType: 'player:*',
        action: (event) => ({
          prevent: false,
          events: [
            createEvent(
              'achievement:unlocked',
              { achievement: 'First Action' },
              { actor: event.entities.actor },
              { tags: ['achievement', 'player-progress'] }
            )
          ]
        })
      });

      // Process several player events
      const events = [
        createEvent('player:moved', {}, { actor: 'player' }),
        createEvent('player:attacked', {}, { actor: 'player' }),
        createEvent('player:talked', {}, { actor: 'player' })
      ];

      events.forEach(event => {
        const result = ruleSystem.processEvent(event, mockWorld);
        result.events?.forEach(e => eventSource.addEvent(e));
      });

      // Query by tag
      const achievements = eventSource.getEventsByTag('achievement');
      expect(achievements).toHaveLength(3);

      // Query by type
      const achievementEvents = eventSource.getEventsByType('achievement:unlocked');
      expect(achievementEvents).toHaveLength(3);

      // Query by entity
      const playerEvents = eventSource.getEventsByEntity('player');
      expect(playerEvents).toHaveLength(3);
    });

    it('should handle narrative flow through events and rules', () => {
      const narrativeEvents: string[] = [];

      // Subscribe to narrative events
      eventSource.getEmitter().on(StandardEventTypes.NARRATIVE, (event) => {
        narrativeEvents.push(event.payload?.message || '');
      });

      // Combat sequence rules
      ruleSystem.addRule({
        id: 'attack-rule',
        eventType: 'combat:attack',
        action: (event, world) => {
          const attacker = world.getEntity(event.entities.actor!);
          const target = world.getEntity(event.entities.target!);
          const weapon = world.getEntity(event.entities.instrument!);
          
          const damage = weapon?.attributes.damage || 5;
          
          return {
            prevent: false,
            message: `${attacker.attributes.name} attacks ${target.attributes.name} with ${weapon?.attributes.name || 'bare hands'}!`,
            events: [
              createEvent(
                'combat:damage',
                { damage },
                event.entities
              )
            ]
          };
        }
      });

      ruleSystem.addRule({
        id: 'damage-description-rule',
        eventType: 'combat:damage',
        action: (event, world) => {
          const target = world.getEntity(event.entities.target!);
          const damage = event.payload?.damage || 0;
          
          return {
            prevent: false,
            message: `${target.attributes.name} takes ${damage} damage!`
          };
        }
      });

      // Create attack event
      const attackEvent = createEvent(
        'combat:attack',
        {},
        { 
          actor: 'player', 
          target: 'goblin', 
          instrument: 'sword',
          location: 'dungeon'
        }
      );

      // Process and add events
      const attackResult = ruleSystem.processEvent(attackEvent, mockWorld);
      attackResult.events?.forEach(e => {
        eventSource.addEvent(e);
        // Process damage event too
        if (e.type === 'combat:damage') {
          const damageResult = ruleSystem.processEvent(e, mockWorld);
          damageResult.events?.forEach(de => eventSource.addEvent(de));
        }
      });

      // Check narrative flow
      expect(narrativeEvents).toContain('Hero attacks Goblin with Iron Sword!');
      expect(narrativeEvents).toContain('Goblin takes 15 damage!');
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle missing entities gracefully', () => {
      ruleSystem.addRule({
        id: 'safe-rule',
        eventType: 'test:missing',
        action: (event, world) => {
          const entity = world.getEntity('non-existent');
          return {
            prevent: false,
            message: entity ? 'Found it' : 'Entity not found'
          };
        }
      });

      const event = createEvent('test:missing', {});
      const result = ruleSystem.processEvent(event, mockWorld);
      
      expect(result.message).toBe('Entity not found');
      expect(result.prevent).toBe(false);
    });

    it('should continue processing when rules throw errors', () => {
      const results: string[] = [];
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      ruleSystem.addRule({
        id: 'error-rule',
        eventType: 'test',
        priority: 10,
        action: () => {
          results.push('error-rule');
          throw new Error('Rule error!');
        }
      });

      ruleSystem.addRule({
        id: 'safe-rule',
        eventType: 'test',
        priority: 5,
        action: () => {
          results.push('safe-rule');
          return { prevent: false };
        }
      });

      const event = createEvent('test', {});
      
      // Process event - error should be caught
      const result = ruleSystem.processEvent(event, mockWorld);
      
      // Error rule should run but fail, safe rule should still run
      expect(results).toEqual(['error-rule', 'safe-rule']);
      expect(result.prevent).toBe(false);
      
      // Verify error was logged
      expect(consoleError).toHaveBeenCalledWith(
        'Error executing rule error-rule:',
        expect.any(Error)
      );
      
      consoleError.mockRestore();
    });
  });
});
