// packages/core/examples/rule-examples.ts

import { 
  createRuleSystem, 
  player, 
  item, 
  location, 
  direction,
  StandardEventTypes,
  createGameContext,
  Condition,
  RuleContext,
  ValueCondition
} from '../src';

/**
 * Example of how to use the rule system in a game
 */
export function setupGameRules(gameContext) {
  // Create a rule system
  const ruleSystem = createRuleSystem();
  
  // Rule 1: Prevent taking objects that are too heavy
  ruleSystem.rule('heavy-object')
    .on('item:taken')
    .when(item.value('weight').gt(player.value('strength')))
    .prevent('RULE_HEAVY_OBJECT');
  
  // Rule 2: Give the player special abilities when taking certain items
  ruleSystem.rule('magic-mirror')
    .on('item:taken')
    .when(item.is('magic-mirror'))
    .instead(ctx => {
      return ctx.giveAbility('mirror-power')
        .say('RULE_MAGIC_MIRROR_TOUCH');
    });
  
  // Rule 3: Teleport the player when they go in a certain direction with an ability
  ruleSystem.rule('mirror-travel')
    .on(StandardEventTypes.PLAYER_MOVED)
    .when(direction.is('mirror').and(player.hasAbility('mirror-power')))
    .instead(ctx => {
      return ctx.teleportToRandomRoom('mirror')
        .say('RULE_MIRROR_TRAVEL');
    });
  
  // Rule 4: Update player's knowledge when entering a new area
  ruleSystem.rule('location-knowledge')
    .on(StandardEventTypes.PLAYER_MOVED)
    .after((ctx: RuleContext) => {
      const locationName = ctx.gameContext.currentLocation.attributes.name;
      return ctx.say('RULE_LOCATION_KNOWLEDGE');
    });
  
  // Rule 5: Create atmospheric effects in certain locations
  ruleSystem.rule('creepy-atmosphere')
    .on('command:look:started')
    .when(location.value('atmosphere').eq('creepy'))
    .after(ctx => {
      return ctx.say('RULE_CREEPY_ATMOSPHERE');
    });
  
  // Rule 6: Implement a day/night cycle
  ruleSystem.rule('day-night-cycle')
    .on('turn:advanced')
    .withPriority(100)
    .after(ctx => {
      // Get current time
      const worldTime = (ctx.gameContext.worldState.extensions?.globalState as any)?.time || 0;
      const newTime = (worldTime + 1) % 24;
      
      // Update world state
      const updatedContext = ctx.gameContext.updateWorldState(state => ({
        ...state,
        extensions: {
          ...state.extensions,
          globalState: {
            ...(state.extensions?.globalState as any || {}),
            time: newTime
          }
        }
      }));
      
      // Generate appropriate message based on time
      let messageKey = '';
      if (newTime === 6) {
        messageKey = 'RULE_SUNRISE';
      } else if (newTime === 12) {
        messageKey = 'RULE_MIDDAY';
      } else if (newTime === 18) {
        messageKey = 'RULE_SUNSET';
      } else if (newTime === 0) {
        messageKey = 'RULE_MIDNIGHT';
      }
      
      // Only return a message if there's something to say
      if (messageKey) {
        return ctx.say(messageKey);
      }
      
      // Modify the context in-place but don't return it
      // This fixes the type error by not returning GameContext
      ctx.gameContext = updatedContext;
      return;
    });
  
  // Rule 7: Make certain objects only accessible at night
  ruleSystem.rule('night-only-objects')
    .on('item:taken')
    .when(
      item.value('nightOnly').eq(true)
        .and(new ValueCondition((ctx) => {
          const time = (ctx.gameContext.worldState.extensions?.globalState as any)?.time || 0;
          return time < 6 || time > 18; // Night time: 6 PM to 6 AM
        }))
    )
    .prevent('RULE_NIGHT_ONLY_OBJECTS');
  
  // Rule 8: Add a suspense effect before combat
  ruleSystem.rule('combat-suspense')
    .on('command:attack:started')
    .after(ctx => {
      return ctx.say('RULE_COMBAT_SUSPENSE');
    });
  
  // Rule 9: Automatic healing over time in safe areas
  ruleSystem.rule('auto-heal')
    .on('turn:advanced')
    .when(location.value('safe').eq(true))
    .after(ctx => {
      const currentHealth = ctx.gameContext.player.attributes.health ? Number(ctx.gameContext.player.attributes.health) : 0;
      const maxHealth = ctx.gameContext.player.attributes.maxHealth ? Number(ctx.gameContext.player.attributes.maxHealth) : 10;
      
      if (currentHealth < maxHealth) {
        const updatedContext = ctx.gameContext.updateWorldState(state => {
          const playerEntity = { ...state.entities[ctx.player] };
          playerEntity.attributes = {
            ...playerEntity.attributes,
            health: Math.min(Number(currentHealth) + 1, Number(maxHealth))
          };
          
          return {
            ...state,
            entities: {
              ...state.entities,
              [ctx.player]: playerEntity
            }
          };
        });
        
        if (Number(currentHealth) + 1 === Number(maxHealth)) {
          return ctx.say('RULE_FULLY_HEALED');
        } else if ((Number(currentHealth) + 1) % 5 === 0) {
          // Give a message every 5 points of healing
          return ctx.say('RULE_PARTIAL_HEALING');
        }
        
        // Modify the context in-place but don't return it directly
        ctx.gameContext = updatedContext;
        return;
      }
      
      // Return void
      return;
    });
  
  // Rule 10: Implement a sanity system that decreases in creepy areas
  ruleSystem.rule('sanity-decrease')
    .on('turn:advanced')
    .when(location.value('atmosphere').eq('creepy'))
    .after(ctx => {
      const currentSanity = ctx.gameContext.player.attributes.sanity ? Number(ctx.gameContext.player.attributes.sanity) : 100;
      
      if (currentSanity > 0) {
        const updatedContext = ctx.gameContext.updateWorldState(state => {
          const playerEntity = { ...state.entities[ctx.player] };
          playerEntity.attributes = {
            ...playerEntity.attributes,
            sanity: Math.max(0, Number(currentSanity) - 1)
          };
          
          return {
            ...state,
            entities: {
              ...state.entities,
              [ctx.player]: playerEntity
            }
          };
        });
        
        // Give messages at certain thresholds
        if (Number(currentSanity) === 50) {
          return ctx.say('RULE_ANXIETY_START');
        } else if (Number(currentSanity) === 25) {
          return ctx.say('RULE_SANITY_TREMBLING');
        } else if (Number(currentSanity) === 10) {
          return ctx.say('RULE_SANITY_HALLUCINATIONS');
        } else if (Number(currentSanity) === 5) {
          return ctx.say('RULE_SANITY_BREAKDOWN');
        }
        
        // Modify the context in-place but don't return it directly
        ctx.gameContext = updatedContext;
        return;
      }
      
      // Return void
      return;
    });
  
  // Rule 11: Implement a quest completion system
  ruleSystem.rule('quest-completion')
    .on('item:taken')
    .when(item.is('quest-item'))
    .after(ctx => {
      // Check if all quest items have been collected
      const questItems = ['key', 'map', 'amulet', 'scroll'].map(id => 
        ctx.gameContext.isContainedIn(id, ctx.player)
      );
      
      if (questItems.every(Boolean)) {
        return ctx.giveAbility('quest-complete')
          .say('RULE_QUEST_COMPLETE');
      }
      
      // Return void
      return;
    });
  
  // Rule 12: Implement hidden passages that appear only with special abilities
  ruleSystem.rule('reveal-hidden-passage')
    .on('command:look:started')
    .when(
      location.is('ancient-chamber')
        .and(player.hasAbility('true-sight'))
    )
    .after(ctx => {
      // Modify the location to show the hidden passage
      const updatedContext = ctx.gameContext.updateWorldState(state => {
        const location = { ...state.entities['ancient-chamber'] };
        
        // Create a new description by concatenating the original with new text
        const originalDescription = location.attributes.description || '';
        const newDescription = originalDescription + ' You notice a hidden passage in the north wall that you didn\'t see before.';
        
        // Update the location's attributes with the new description
        location.attributes = {
          ...location.attributes,
          description: newDescription
        };
        // Add a connection to the hidden room if it doesn't already exist
        if (!location.relationships['connects-to']?.includes('hidden-room')) {
          location.relationships = {
            ...location.relationships,
            'connects-to': [
              ...(location.relationships['connects-to'] || []),
              'hidden-room'
            ]
          };
        }
        
        return {
          ...state,
          entities: {
            ...state.entities,
            'ancient-chamber': location
          }
        };
      });
      
      return ctx.say('RULE_HIDDEN_PASSAGE');
    });
  
  // Rule 13: Weather effects that change the environment
  ruleSystem.rule('weather-effects')
    .on('turn:advanced')
    .withPriority(90)
    .after(ctx => {
      // Randomly change weather every 10 turns
      const turn = (ctx.gameContext.worldState.extensions?.globalState as any)?.turn || 0;
      
      if (turn % 10 === 0) {
        const weathers = ['clear', 'rainy', 'stormy', 'foggy', 'snowy'];
        const newWeather = weathers[Math.floor(Math.random() * weathers.length)];
        
        const updatedContext = ctx.gameContext.updateWorldState(state => ({
          ...state,
          extensions: {
            ...state.extensions,
            globalState: {
              ...(state.extensions?.globalState || {}),
              weather: newWeather
            }
          }
        }));
        
        let messageKey = '';
        switch (newWeather) {
          case 'clear':
            messageKey = 'RULE_WEATHER_CLEAR';
            break;
          case 'rainy':
            messageKey = 'RULE_WEATHER_RAIN';
            break;
          case 'stormy':
            messageKey = 'RULE_WEATHER_STORM';
            break;
          case 'foggy':
            messageKey = 'RULE_WEATHER_FOG';
            break;
          case 'snowy':
            messageKey = 'RULE_WEATHER_SNOW';
            break;
        }
        
        return ctx.say(messageKey);
      }
      
      // Return void
      return;
    });
  
  // Rule 14: Implement environmental hazards based on weather
  ruleSystem.rule('weather-hazards')
    .on('command:move:started')
    .when(new ValueCondition((ctx) => {
      return (ctx.gameContext.worldState.extensions?.globalState as any)?.weather === 'stormy';
    }))
    .after(ctx => {
      // 20% chance of being struck by lightning in stormy weather
      if (Math.random() < 0.2) {
        const currentHealth = ctx.gameContext.player.attributes.health ? Number(ctx.gameContext.player.attributes.health) : 0;
        
        const updatedContext = ctx.gameContext.updateWorldState(state => {
          const playerEntity = { ...state.entities[ctx.player] };
          playerEntity.attributes = {
            ...playerEntity.attributes,
            health: Math.max(0, Number(currentHealth) - 3)
          };
          
          return {
            ...state,
            entities: {
              ...state.entities,
              [ctx.player]: playerEntity
            }
          };
        });
        
        return ctx.say('RULE_LIGHTNING_STRIKE');
      }
      
      // Return void
      return;
    });
  
  // Rule 15: Dynamic NPC interactions based on player reputation
  ruleSystem.rule('npc-reactions')
    .on('command:talk:started')
    .after(ctx => {
      const reputation = ctx.gameContext.player.attributes.reputation ? Number(ctx.gameContext.player.attributes.reputation) : 0;
      // Ensure npcId is a valid string
      const npcId = typeof ctx.data?.npcId === 'string' ? ctx.data.npcId : '';
      
      if (!npcId) return;
      
      const npc = ctx.gameContext.getEntity(npcId);
      if (!npc) return;
      
      const npcName = npc.attributes?.name || '';
      
      if (Number(reputation) < -50) {
        return ctx.say('RULE_NPC_HOSTILE');
      } else if (Number(reputation) < 0) {
        return ctx.say('RULE_NPC_SUSPICIOUS');
      } else if (Number(reputation) < 50) {
        return ctx.say('RULE_NPC_NEUTRAL');
      } else {
        return ctx.say('RULE_NPC_FRIENDLY');
      }
    });
  
  return ruleSystem;
}

/**
 * Usage example of integrating the rule system with a game
 */
export function setupGame() {
  // Create a minimal world state
  const worldState = {
    entities: {
      'player': {
        id: 'player',
        type: 'player',
        attributes: {
          name: 'Player',
          strength: 10,
          health: 100,
          maxHealth: 100,
          sanity: 100,
          reputation: 0
        },
        relationships: {
          'contains': []
        }
      },
      'starting-room': {
        id: 'starting-room',
        type: 'location',
        attributes: {
          name: 'Starting Room',
          description: 'You are in a simple room with white walls.',
          safe: true
        },
        relationships: {
          'contains': ['player', 'magic-mirror'],
          'connects-to': ['dark-corridor']
        }
      },
      'dark-corridor': {
        id: 'dark-corridor',
        type: 'location',
        attributes: {
          name: 'Dark Corridor',
          description: 'A long, dark corridor stretches before you.',
          atmosphere: 'creepy'
        },
        relationships: {
          'contains': ['heavy-statue'],
          'connects-to': ['starting-room', 'ancient-chamber']
        }
      },
      'ancient-chamber': {
        id: 'ancient-chamber',
        type: 'location',
        attributes: {
          name: 'Ancient Chamber',
          description: 'An ancient chamber with strange symbols on the walls.'
        },
        relationships: {
          'contains': ['quest-item'],
          'connects-to': ['dark-corridor']
        }
      },
      'hidden-room': {
        id: 'hidden-room',
        type: 'location',
        attributes: {
          name: 'Hidden Room',
          description: 'A secret room filled with treasures.',
          locationType: 'hidden'
        },
        relationships: {
          'contains': ['treasure'],
          'connects-to': ['ancient-chamber']
        }
      },
      'mirror-room': {
        id: 'mirror-room',
        type: 'location',
        attributes: {
          name: 'Mirror Room',
          description: 'A room with mirrors on all walls.',
          locationType: 'mirror'
        },
        relationships: {
          'contains': [],
          'connects-to': []
        }
      },
      'magic-mirror': {
        id: 'magic-mirror',
        type: 'item',
        attributes: {
          name: 'magic mirror',
          description: 'A mysterious mirror with a shimmering surface.',
          takeable: true
        },
        relationships: {}
      },
      'heavy-statue': {
        id: 'heavy-statue',
        type: 'item',
        attributes: {
          name: 'heavy statue',
          description: 'A very heavy stone statue.',
          takeable: true,
          weight: 50
        },
        relationships: {}
      },
      'quest-item': {
        id: 'quest-item',
        type: 'item',
        attributes: {
          name: 'ancient amulet',
          description: 'An ancient amulet glowing with power.',
          takeable: true,
          questItem: true
        },
        relationships: {}
      },
      'treasure': {
        id: 'treasure',
        type: 'item',
        attributes: {
          name: 'treasure chest',
          description: 'A chest filled with gold and jewels.',
          takeable: true
        },
        relationships: {}
      },
      'npc-guard': {
        id: 'npc-guard',
        type: 'npc',
        attributes: {
          name: 'Guard',
          description: 'A stern-looking guard standing at attention.'
        },
        relationships: {}
      }
    },
    meta: {
      version: '1.0',
      timestamp: Date.now(),
      turnNumber: 0
    },
    extensions: {
      globalState: {
        turn: 0,
        time: 12, // Start at noon
        weather: 'clear'
      }
    }
  };
  
  // Create entity manager (mock for this example)
  const entityManager = {
    createEntity: (params) => params,
    updateEntity: (id, updater) => updater(worldState.entities[id]),
    deleteEntity: (id) => delete worldState.entities[id],
    getEntity: (id) => worldState.entities[id]
  };
  
  // Create game context
  const gameContext = createGameContext(worldState, 'player', entityManager);
  
  // Setup rules
  const ruleSystem = setupGameRules(gameContext);
  
  // Create a command router with the rule system
  const commandRouter = gameContext.commandRouter;
  
  // CommandRouter interface doesn't define setRuleSystem, but the implementation does
  if (commandRouter && typeof (commandRouter as any).setRuleSystem === 'function') {
    (commandRouter as any).setRuleSystem(ruleSystem);
  }
  
  return {
    gameContext,
    ruleSystem,
    commandRouter
  }
}