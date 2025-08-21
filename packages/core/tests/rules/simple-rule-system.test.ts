import { 
  ISimpleRuleSystem, 
  createSimpleRuleSystem,
  IRule,
  IRuleWorld,
  IRuleResult
} from '../../src/rules';
import { ISemanticEvent } from '../../src/events';

describe('ISimpleRuleSystem', () => {
  let ruleSystem: ISimpleRuleSystem;
  let mockWorld: IRuleWorld;

  beforeEach(() => {
    ruleSystem = createSimpleRuleSystem();
    
    // Create a mock world
    const entities = new Map<string, any>();
    entities.set('player', {
      id: 'player',
      type: 'actor',
      attributes: { name: 'Player', health: 100 }
    });
    entities.set('sword', {
      id: 'sword',
      type: 'thing',
      attributes: { name: 'Sword', damage: 10, heavy: true }
    });
    entities.set('room1', {
      id: 'room1',
      type: 'location',
      attributes: { name: 'Room 1', dark: false }
    });

    mockWorld = {
      getEntity: (id: string) => entities.get(id),
      updateEntity: (id: string, changes: Record<string, any>) => {
        const entity = entities.get(id);
        if (entity) {
          Object.assign(entity.attributes, changes);
        }
      },
      getPlayer: () => entities.get('player'),
      getCurrentLocation: () => entities.get('room1')
    };
  });

  describe('Rule Management', () => {
    it('should add and retrieve rules', () => {
      const rule: IRule = {
        id: 'test-rule',
        eventType: 'item:taking',
        action: () => ({ prevent: false })
      };

      ruleSystem.addRule(rule);
      const rules = ruleSystem.getRules();
      
      expect(rules).toHaveLength(1);
      expect(rules[0]).toBe(rule);
    });

    it('should remove rules', () => {
      const rule1: IRule = {
        id: 'rule1',
        eventType: 'test',
        action: () => ({ prevent: false })
      };
      const rule2: IRule = {
        id: 'rule2',
        eventType: 'test',
        action: () => ({ prevent: false })
      };

      ruleSystem.addRule(rule1);
      ruleSystem.addRule(rule2);
      expect(ruleSystem.getRules()).toHaveLength(2);

      ruleSystem.removeRule('rule1');
      const rules = ruleSystem.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('rule2');
    });

    it('should handle removing non-existent rules', () => {
      expect(() => ruleSystem.removeRule('non-existent')).not.toThrow();
    });
  });

  describe('Event Matching', () => {
    it('should match rules by exact event type', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'exact-match',
        eventType: 'item:taking',
        action: () => {
          results.push('exact');
          return { prevent: false };
        }
      });

      ruleSystem.addRule({
        id: 'no-match',
        eventType: 'item:dropping',
        action: () => {
          results.push('should not run');
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'item:taking',
        timestamp: Date.now(),
        entities: { actor: 'player', target: 'sword' }
      };

      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual(['exact']);
    });

    it('should handle wildcard rules (*)', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'wildcard',
        eventType: '*',
        action: () => {
          results.push('wildcard');
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'anything:goes',
        timestamp: Date.now(),
        entities: {}
      };

      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual(['wildcard']);
    });

    it('should handle category wildcards (category:*)', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'item-wildcard',
        eventType: 'item:*',
        action: () => {
          results.push('item-wildcard');
          return { prevent: false };
        }
      });

      const takingEvent: SemanticEvent = {
        id: 'evt1',
        type: 'item:taking',
        timestamp: Date.now(),
        entities: {}
      };

      const droppingEvent: SemanticEvent = {
        id: 'evt2',
        type: 'item:dropping',
        timestamp: Date.now(),
        entities: {}
      };

      const otherEvent: SemanticEvent = {
        id: 'evt3',
        type: 'action:moving',
        timestamp: Date.now(),
        entities: {}
      };

      ruleSystem.processEvent(takingEvent, mockWorld);
      ruleSystem.processEvent(droppingEvent, mockWorld);
      ruleSystem.processEvent(otherEvent, mockWorld);

      expect(results).toEqual(['item-wildcard', 'item-wildcard']);
    });
  });

  describe('Rule Conditions', () => {
    it('should evaluate conditions before running actions', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'conditional',
        eventType: 'test',
        condition: (event, world) => {
          const player = world.getPlayer();
          return player.attributes.health > 50;
        },
        action: () => {
          results.push('healthy');
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      };

      // Should run when health > 50
      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual(['healthy']);

      // Should not run when health <= 50
      mockWorld.updateEntity('player', { health: 30 });
      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual(['healthy']); // No new entry
    });

    it('should skip rules with false conditions', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'always-false',
        eventType: 'test',
        condition: () => false,
        action: () => {
          results.push('should not run');
          return { prevent: false };
        }
      });

      ruleSystem.addRule({
        id: 'always-true',
        eventType: 'test',
        condition: () => true,
        action: () => {
          results.push('should run');
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      };

      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual(['should run']);
    });
  });

  describe('Rule Priority', () => {
    it('should execute rules in priority order (highest first)', () => {
      const results: number[] = [];
      
      ruleSystem.addRule({
        id: 'low',
        eventType: 'test',
        priority: 1,
        action: () => {
          results.push(1);
          return { prevent: false };
        }
      });

      ruleSystem.addRule({
        id: 'high',
        eventType: 'test',
        priority: 10,
        action: () => {
          results.push(10);
          return { prevent: false };
        }
      });

      ruleSystem.addRule({
        id: 'medium',
        eventType: 'test',
        priority: 5,
        action: () => {
          results.push(5);
          return { prevent: false };
        }
      });

      ruleSystem.addRule({
        id: 'default',
        eventType: 'test',
        // No priority (defaults to 0)
        action: () => {
          results.push(0);
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      };

      ruleSystem.processEvent(event, mockWorld);
      expect(results).toEqual([10, 5, 1, 0]);
    });
  });

  describe('Event Prevention', () => {
    it('should stop processing when a rule prevents the event', () => {
      const results: string[] = [];
      
      ruleSystem.addRule({
        id: 'first',
        eventType: 'test',
        priority: 10,
        action: () => {
          results.push('first');
          return { prevent: true, message: 'Prevented by first rule' };
        }
      });

      ruleSystem.addRule({
        id: 'second',
        eventType: 'test',
        priority: 5,
        action: () => {
          results.push('should not run');
          return { prevent: false };
        }
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: { actor: 'player' }
      };

      const result = ruleSystem.processEvent(event, mockWorld);
      
      expect(results).toEqual(['first']);
      expect(result.prevent).toBe(true);
      expect(result.message).toBe('Prevented by first rule');
    });

    it('should use the first prevention message', () => {
      ruleSystem.addRule({
        id: 'first',
        eventType: 'test',
        priority: 10,
        action: () => ({ prevent: true, message: 'First message' })
      });

      ruleSystem.addRule({
        id: 'second',
        eventType: 'test',
        priority: 5,
        action: () => ({ prevent: true, message: 'Second message' })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: {}
      };

      const result = ruleSystem.processEvent(event, mockWorld);
      expect(result.message).toBe('First message');
    });
  });

  describe('Result Aggregation', () => {
    it('should collect events from multiple rules', () => {
      ruleSystem.addRule({
        id: 'rule1',
        eventType: 'test',
        action: (event) => ({
          prevent: false,
          events: [{
            id: 'evt-from-rule1',
            type: 'custom:event1',
            timestamp: Date.now(),
            entities: event.entities
          }]
        })
      });

      ruleSystem.addRule({
        id: 'rule2',
        eventType: 'test',
        action: (event) => ({
          prevent: false,
          events: [{
            id: 'evt-from-rule2',
            type: 'custom:event2',
            timestamp: Date.now(),
            entities: event.entities
          }]
        })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: { actor: 'player' }
      };

      const result = ruleSystem.processEvent(event, mockWorld);
      
      expect(result.events).toHaveLength(2);
      expect(result.events![0].type).toBe('custom:event1');
      expect(result.events![1].type).toBe('custom:event2');
    });

    it('should create narrative events for messages', () => {
      ruleSystem.addRule({
        id: 'message-rule',
        eventType: 'test',
        action: () => ({
          prevent: false,
          message: 'Something interesting happened!'
        })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'test',
        timestamp: Date.now(),
        entities: { actor: 'player', location: 'room1' }
      };

      const result = ruleSystem.processEvent(event, mockWorld);
      
      expect(result.events).toHaveLength(1);
      expect(result.events![0].type).toBe('narrative');
      expect(result.events![0].data).toEqual({ 
        message: 'Something interesting happened!' 
      });
      expect(result.events![0].entities.actor).toBe('player');
      expect(result.events![0].entities.location).toBe('room1');
    });

    it('should apply entity changes', () => {
      ruleSystem.addRule({
        id: 'damage-rule',
        eventType: 'combat:hit',
        action: () => ({
          prevent: false,
          changes: [
            { entityId: 'player', attribute: 'health', value: 80 }
          ]
        })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'combat:hit',
        timestamp: Date.now(),
        entities: { target: 'player' }
      };

      expect(mockWorld.getPlayer().attributes.health).toBe(100);
      
      ruleSystem.processEvent(event, mockWorld);
      
      expect(mockWorld.getPlayer().attributes.health).toBe(80);
    });

    it('should handle multiple entity changes', () => {
      ruleSystem.addRule({
        id: 'trade-rule',
        eventType: 'trade:complete',
        action: () => ({
          prevent: false,
          changes: [
            { entityId: 'player', attribute: 'gold', value: 50 },
            { entityId: 'sword', attribute: 'owner', value: 'player' }
          ]
        })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'trade:complete',
        timestamp: Date.now(),
        entities: {}
      };

      ruleSystem.processEvent(event, mockWorld);
      
      expect(mockWorld.getEntity('player')?.attributes.gold).toBe(50);
      expect(mockWorld.getEntity('sword')?.attributes.owner).toBe('player');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle heavy item prevention', () => {
      ruleSystem.addRule({
        id: 'heavy-item-rule',
        eventType: 'item:taking',
        condition: (event, world) => {
          const item = world.getEntity(event.entities.target!);
          const player = world.getPlayer();
          return item?.attributes.heavy && player?.attributes.health < 50;
        },
        action: () => ({
          prevent: true,
          message: "You're too weak to lift that!"
        })
      });

      const event: SemanticEvent = {
        id: 'evt1',
        type: 'item:taking',
        timestamp: Date.now(),
        entities: { actor: 'player', target: 'sword' }
      };

      // Should allow when healthy
      let result = ruleSystem.processEvent(event, mockWorld);
      expect(result.prevent).toBe(false);

      // Should prevent when weak
      mockWorld.updateEntity('player', { health: 30 });
      result = ruleSystem.processEvent(event, mockWorld);
      expect(result.prevent).toBe(true);
      expect(result.message).toBe("You're too weak to lift that!");
    });

    it('should handle darkness rules', () => {
      ruleSystem.addRule({
        id: 'darkness-rule',
        eventType: 'action:*',
        condition: (event, world) => {
          const location = world.getCurrentLocation();
          return location?.attributes.dark === true;
        },
        action: (event) => {
          // Allow movement and light-related actions in the dark
          if (event.type === 'action:moving' || event.type === 'action:lighting') {
            return { prevent: false };
          }
          return {
            prevent: true,
            message: "It's too dark to do that!"
          };
        },
        priority: 100 // High priority to check first
      });

      // Make room dark
      mockWorld.updateEntity('room1', { dark: true });

      // Should prevent most actions
      let result = ruleSystem.processEvent({
        id: 'evt1',
        type: 'action:examining',
        timestamp: Date.now(),
        entities: {}
      }, mockWorld);
      expect(result.prevent).toBe(true);

      // Should allow movement
      result = ruleSystem.processEvent({
        id: 'evt2',
        type: 'action:moving',
        timestamp: Date.now(),
        entities: {}
      }, mockWorld);
      expect(result.prevent).toBe(false);
    });
  });
});
