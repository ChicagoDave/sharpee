/**
 * Three Statues Puzzle - Event Handler Demo
 * 
 * This story demonstrates story-level event handlers (daemons).
 * Push all three statues to solve the puzzle and open the door.
 */

import { StoryWithEvents, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { createMessageHandler, composeHandlers } from '@sharpee/stdlib';

export class ThreeStatuesPuzzleStory extends StoryWithEvents {
  private pushedStatues = new Set<string>();
  private statueIds: string[] = [];
  private doorId: string = '';
  
  constructor() {
    super({
      id: 'three-statues-puzzle',
      title: 'The Temple of Three',
      author: 'Event Handler Demo',
      version: '1.0.0',
      description: 'A puzzle demonstrating story-level event handlers'
    });
  }
  
  initializeWorld(world: WorldModel): void {
    // Create the temple entrance
    const entrance = world.createEntity('entrance', 'room');
    entrance.attributes.name = 'Temple Entrance';
    entrance.attributes.description = 'You stand in the entrance of an ancient temple. Three stone statues stand before you: a warrior, a scholar, and a thief. Beyond them, a massive stone door blocks your path.';
    
    // Create the three statues
    const warrior = world.createEntity('warrior-statue', 'item');
    warrior.attributes.name = 'warrior statue';
    warrior.attributes.description = 'A stone statue of a mighty warrior, sword raised high. It looks like it could be pushed into position.';
    warrior.add({
      type: 'PUSHABLE',
      pushType: 'heavy',
      requiresStrength: 10
    });
    warrior.add({
      type: 'SCENERY'
    });
    world.setLocation(warrior.id, entrance.id);
    this.statueIds.push(warrior.id);
    
    const scholar = world.createEntity('scholar-statue', 'item');
    scholar.attributes.name = 'scholar statue';
    scholar.attributes.description = 'A stone statue of a wise scholar, holding an ancient tome. It appears to be on some kind of track.';
    scholar.add({
      type: 'PUSHABLE',
      pushType: 'heavy',
      requiresStrength: 10
    });
    scholar.add({
      type: 'SCENERY'
    });
    world.setLocation(scholar.id, entrance.id);
    this.statueIds.push(scholar.id);
    
    const thief = world.createEntity('thief-statue', 'item');
    thief.attributes.name = 'thief statue';
    thief.attributes.description = 'A stone statue of a cunning thief, crouched and ready. It seems designed to slide into place.';
    thief.add({
      type: 'PUSHABLE',
      pushType: 'heavy',
      requiresStrength: 10
    });
    thief.add({
      type: 'SCENERY'
    });
    world.setLocation(thief.id, entrance.id);
    this.statueIds.push(thief.id);
    
    // Create the door
    const door = world.createEntity('stone-door', 'door');
    door.attributes.name = 'massive stone door';
    door.attributes.description = 'A massive stone door covered in ancient carvings. Three indentations suggest the statues might be the key.';
    door.add({
      type: 'OPENABLE',
      isOpen: false
    });
    door.add({
      type: 'LOCKABLE',
      isLocked: true,
      keyId: 'statue-puzzle'  // Special key that doesn't exist - unlocked by puzzle
    });
    door.add({
      type: 'DOOR',
      destination: 'treasure-room',
      direction: 'north'
    });
    world.setLocation(door.id, entrance.id);
    this.doorId = door.id;
    
    // Create the treasure room
    const treasureRoom = world.createEntity('treasure-room', 'room');
    treasureRoom.attributes.name = 'Treasure Chamber';
    treasureRoom.attributes.description = 'The temple\'s treasure chamber! Gold and jewels sparkle in the dim light. You\'ve solved the ancient puzzle!';
    
    // Create some treasure
    const goldPile = world.createEntity('gold-pile', 'item');
    goldPile.attributes.name = 'pile of gold';
    goldPile.attributes.description = 'A massive pile of golden coins, more wealth than you could spend in a lifetime.';
    goldPile.attributes.value = 10000;
    world.setLocation(goldPile.id, treasureRoom.id);
    
    // Create the sacred relic (ultimate prize)
    const relic = world.createEntity('sacred-relic', 'item');
    relic.attributes.name = 'Sacred Relic of the Ancients';
    relic.attributes.description = 'The legendary relic you came here to find. It glows with an otherworldly light.';
    relic.attributes.value = 100000;
    world.setLocation(relic.id, treasureRoom.id);
    
    // Set up individual statue handlers for feedback
    warrior.on = {
      'if.event.pushed': (event) => {
        if (!this.pushedStatues.has(warrior.id)) {
          return [{
            id: `${Date.now()}-warrior-pushed`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'With great effort, you push the warrior statue into position. It clicks into place on a hidden pressure plate.'
            },
            entities: {}
          }];
        } else {
          return [{
            id: `${Date.now()}-warrior-already`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'The warrior statue is already in position.'
            },
            entities: {}
          }];
        }
      }
    };
    
    scholar.on = {
      'if.event.pushed': (event) => {
        if (!this.pushedStatues.has(scholar.id)) {
          return [{
            id: `${Date.now()}-scholar-pushed`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'You slide the scholar statue along its track. It settles into place with a satisfying thunk.'
            },
            entities: {}
          }];
        } else {
          return [{
            id: `${Date.now()}-scholar-already`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'The scholar statue is already in position.'
            },
            entities: {}
          }];
        }
      }
    };
    
    thief.on = {
      'if.event.pushed': (event) => {
        if (!this.pushedStatues.has(thief.id)) {
          return [{
            id: `${Date.now()}-thief-pushed`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'The thief statue glides smoothly into position, as if it was waiting for your touch.'
            },
            entities: {}
          }];
        } else {
          return [{
            id: `${Date.now()}-thief-already`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: 'The thief statue is already in position.'
            },
            entities: {}
          }];
        }
      }
    };
    
    // Set up story-level handler for the puzzle
    this.on('if.event.pushed', (event) => {
      const targetId = event.data?.target;
      
      // Check if a statue was pushed
      if (targetId && this.statueIds.includes(targetId)) {
        const wasComplete = this.pushedStatues.size === 3;
        this.pushedStatues.add(targetId);
        
        // Check puzzle completion
        if (!wasComplete && this.pushedStatues.size === 3) {
          // All three statues are in position!
          const door = world.getEntity(this.doorId);
          if (door) {
            const lockable = door.get('LOCKABLE');
            const openable = door.get('OPENABLE');
            
            if (lockable) {
              lockable.isLocked = false;
            }
            if (openable) {
              openable.isOpen = true;
            }
          }
          
          return [{
            id: `${Date.now()}-puzzle-complete`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: '\n*** PUZZLE COMPLETE! ***\n\nAs the third statue clicks into place, the temple rumbles. The ancient carvings on the door glow with golden light, and with a grinding sound that echoes through the ages, the massive stone door swings open!\n\nThe treasure chamber awaits to the north.'
            },
            entities: {}
          }];
        } else if (this.pushedStatues.size < 3) {
          // Progress update
          const remaining = 3 - this.pushedStatues.size;
          return [{
            id: `${Date.now()}-puzzle-progress`,
            type: 'action.message',
            timestamp: Date.now(),
            data: {
              message: `\n${this.pushedStatues.size} of 3 statues in position. ${remaining} more to go...`
            },
            entities: {}
          }];
        }
      }
    });
    
    // Add victory handler for taking the relic
    relic.on = {
      'if.event.taken': (event) => {
        return [{
          id: `${Date.now()}-victory`,
          type: 'action.message',
          timestamp: Date.now(),
          data: {
            message: '\n*** VICTORY! ***\n\nYou hold the Sacred Relic of the Ancients in your hands. After solving the puzzle of the three statues, you have claimed the ultimate prize! Your name will be remembered in legend!\n\nTHE END'
          },
          entities: {}
        }];
      }
    };
    
    // Create exit back from treasure room
    const exitBack = world.createEntity('exit-back', 'exit');
    exitBack.attributes.name = 'doorway south';
    exitBack.add({
      type: 'EXIT',
      direction: 'south',
      destination: entrance.id
    });
    world.setLocation(exitBack.id, treasureRoom.id);
  }
  
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', 'actor');
    player.attributes.name = 'you';
    player.attributes.description = 'An intrepid treasure hunter seeking the Sacred Relic.';
    
    // Give the player enough strength to push the statues
    player.attributes.strength = 15;
    
    // Start in the temple entrance
    const entrance = world.getEntity('entrance');
    if (entrance) {
      world.setLocation(player.id, entrance.id);
    }
    
    return player;
  }
}