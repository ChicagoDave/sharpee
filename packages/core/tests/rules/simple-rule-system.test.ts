/**
 * Simple Rule System v2 Tests
 */

import { 
  createSimpleRuleSystem, 
  createSimpleRuleWorld,
  getTargetItem,
  getAttribute,
  entityIs,
  giveAbility,
  itemTooHeavy,
  isTaking
} from '../../src/rules';
import { createEvent } from '../../src/events/event-system';
import { StandardEventTypes } from '../../src/events/standard-events';

describe('Simple Rule System v2', () => {
  // Simple test world state
  const worldState = {
    entities: {
      'player': {
        id: 'player',
        attributes: { name: 'Player', strength: 10 }
      },
      'apple': {
        id: 'apple',
        attributes: { name: 'apple', weight: 1 }
      },
      'heavy-statue': {
        id: 'heavy-statue',
        attributes: { name: 'heavy statue', weight: 50 }
      },
      'magic-mirror': {
        id: 'magic-mirror',
        attributes: { name: 'magic mirror', weight: 5 }
      }
    }
  };

  let ruleSystem: any;
  let world: any;

  beforeEach(() => {
    // Reset world state
    worldState.entities.player.attributes = { name: 'Player', strength: 10 };
    
    ruleSystem = createSimpleRuleSystem();
    world = createSimpleRuleWorld(worldState, 'player');
  });

  test('Should prevent taking heavy items', () => {
    // Add a rule that prevents taking heavy items
    ruleSystem.addRule({
      id: 'prevent-heavy-items',
      eventType: 'item:taken',
      condition: itemTooHeavy,
      action: () => ({
        prevent: true,
        message: "That's too heavy for you to lift!"
      })
    });

    // Create event for taking heavy statue
    const event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'heavy-statue' },
      { actor: 'player', target: 'heavy-statue' }
    );

    // Process the event
    const result = ruleSystem.processEvent(event, world);

    // Check results
    expect(result.prevent).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('narrative:event');
    expect(result.events[0].payload.message).toBe("That's too heavy for you to lift!");
  });

  test('Should give abilities when taking special items', () => {
    // Add a rule that gives mirror power when taking the magic mirror
    ruleSystem.addRule({
      id: 'magic-mirror-power',
      eventType: 'item:taken',
      condition: isTaking('magic-mirror'),
      action: (event) => ({
        message: 'As you touch the mirror, you feel strange power flowing through you.',
        changes: [giveAbility('player', 'mirror-power')]
      })
    });

    // Create event for taking magic mirror
    const event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'magic-mirror' },
      { actor: 'player', target: 'magic-mirror' }
    );

    // Process the event
    const result = ruleSystem.processEvent(event, world);

    // Check results
    expect(result.prevent).toBe(false);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].payload.message).toBe('As you touch the mirror, you feel strange power flowing through you.');
    
    // Check that ability was added
    const player = world.getPlayer();
    expect(player.attributes['ability_mirror-power']).toBe(true);
  });

  test('Should handle multiple rules in priority order', () => {
    // Add high priority rule
    ruleSystem.addRule({
      id: 'high-priority',
      eventType: 'item:taken',
      priority: 100,
      action: () => ({ message: 'High priority message' })
    });

    // Add low priority rule
    ruleSystem.addRule({
      id: 'low-priority', 
      eventType: 'item:taken',
      priority: 1,
      action: () => ({ message: 'Low priority message' })
    });

    // Create event
    const event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'apple' },
      { actor: 'player', target: 'apple' }
    );

    // Process the event
    const result = ruleSystem.processEvent(event, world);

    // Check that high priority rule ran first
    expect(result.events).toHaveLength(2);
    expect(result.events[0].payload.message).toBe('High priority message');
    expect(result.events[1].payload.message).toBe('Low priority message');
  });

  test('Should stop processing when rule prevents action', () => {
    // Add preventing rule
    ruleSystem.addRule({
      id: 'prevent-rule',
      eventType: 'item:taken',
      priority: 100,
      action: () => ({
        prevent: true,
        message: 'Action prevented!'
      })
    });

    // Add rule that should not run
    ruleSystem.addRule({
      id: 'should-not-run',
      eventType: 'item:taken',
      priority: 50,
      action: () => ({ message: 'This should not appear' })
    });

    // Create event
    const event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'apple' },
      { actor: 'player', target: 'apple' }
    );

    // Process the event
    const result = ruleSystem.processEvent(event, world);

    // Check that only prevent rule ran
    expect(result.prevent).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].payload.message).toBe('Action prevented!');
  });

  test('Should handle conditional rules', () => {
    // Add rule with condition
    ruleSystem.addRule({
      id: 'conditional-rule',
      eventType: 'item:taken',
      condition: (event, world) => {
        const item = getTargetItem(event, world);
        return getAttribute(item, 'name') === 'apple';
      },
      action: () => ({ message: 'You take the delicious apple!' })
    });

    // Test with apple (should match)
    let event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'apple' },
      { actor: 'player', target: 'apple' }
    );

    let result = ruleSystem.processEvent(event, world);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].payload.message).toBe('You take the delicious apple!');

    // Test with statue (should not match)
    event = createEvent(
      StandardEventTypes.ITEM_TAKEN,
      { itemId: 'heavy-statue' },
      { actor: 'player', target: 'heavy-statue' }
    );

    result = ruleSystem.processEvent(event, world);
    expect(result.events).toHaveLength(0);
  });
});
