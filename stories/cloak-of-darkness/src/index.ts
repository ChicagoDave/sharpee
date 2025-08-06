/**
 * Cloak of Darkness - A Sharpee Story
 * 
 * The classic IF demonstration game by Roger Firth.
 * 
 * Story: You are in a cloakroom with a velvet cloak. 
 * You must hang the cloak on a hook before exploring the dark bar.
 * The message is scrawled in sawdust on the floor of the bar,
 * but you can only read it if you're not carrying the cloak
 * (which would disturb the sawdust).
 */

import { Story, StoryConfig } from '@sharpee/engine';
import { 
  WorldModel, 
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  WearableTrait,
  SupporterTrait,
  SceneryTrait,
  ReadableTrait,
  ScopeRule,
  LightSourceTrait,
  EntityType
} from '@sharpee/world-model';

/**
 * Cloak of Darkness story configuration
 */
export const config: StoryConfig = {
  id: "cloak-of-darkness",
  title: "Cloak of Darkness",
  author: "Roger Firth (Sharpee implementation)",
  version: "1.0.0",
  language: "en-us",
  description: "A basic IF demonstration - hang up your cloak!",
  textService: {
    type: "cli-events",
    config: {
      showTurnHeader: true,
      showLocation: true,
      showEventData: true,
      showPlatformEvents: true
    }
  }
};

/**
 * Cloak of Darkness story implementation
 */
export class CloakOfDarknessStory implements Story {
  config = config;
  
  private world!: WorldModel;
  private message = "You have won!"; // The message in the sawdust
  private disturbances = 0; // Times the message has been disturbed
  private roomIds: Record<string, string> = {}; // Map of room names to IDs
  
  /**
   * Update the message based on current game state
   */
  private updateMessage(): void {
    const message = this.world.getEntity('message');
    if (!message) return;
    
    const identity = message.get(IdentityTrait);
    const readable = message.get(ReadableTrait);
    
    if (!identity || !readable) return;
    
    // Update description based on state
    if (this.isBarDark()) {
      identity.description = "In the darkness, you can't see any message.";
      readable.text = "It's too dark to read.";
      readable.isReadable = false;
    } else if (this.disturbances === 0) {
      identity.description = "The message, neatly marked in the sawdust, reads...";
      readable.text = this.message;
      readable.isReadable = true;
    } else if (this.disturbances < 3) {
      identity.description = "The message has been carelessly trampled, making it difficult to read.";
      readable.text = "You can just make out: " + this.garbleMessage(this.message, this.disturbances);
      readable.isReadable = true;
    } else {
      identity.description = "The message has been completely obliterated.";
      readable.text = "The message is too trampled to read.";
      readable.isReadable = false;
    }
  }
  
  /**
   * Initialize the world for Cloak of Darkness
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;
    
    // Remove default visibility rules so we can control darkness properly
    world.removeScopeRule('default_room_visibility');
    world.removeScopeRule('default_inventory_visibility');
    
    // Set up darkness rules using scope system
    this.setupDarknessRules();
    
    // Create all rooms first without exits
    const foyer = this.createFoyerBase();
    const cloakroom = this.createCloakroomBase();
    const bar = this.createBarBase();
    const outside = this.createOutsideBase();
    
    // Store room IDs for later reference
    this.roomIds['foyer'] = foyer.id;
    this.roomIds['cloakroom'] = cloakroom.id;
    this.roomIds['bar'] = bar.id;
    this.roomIds['outside'] = outside.id;
    
    // Now add exits with proper IDs
    this.addExits(foyer, cloakroom, bar, outside);
    
    // Create the cloak
    const cloak = this.createCloak();
    
    // Create the hook
    const hook = this.createHook(cloakroom);
    
    // Create the message
    const message = this.createMessage(bar);
    
    // Set initial player location to foyer
    const player = world.getPlayer();
    if (player) {
      console.log(`Moving player ${player.id} to foyer ${foyer.id}`);
      world.moveEntity(player.id, foyer.id);
      // Give player the cloak initially
      world.moveEntity(cloak.id, player.id);
    }
  }
  
  /**
   * Set up darkness rules using the scope system
   */
  private setupDarknessRules(): void {
    // Basic visibility rule - handles both lit and dark rooms
    const basicVisibilityRule: ScopeRule = {
      id: 'cloak_basic_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const results: string[] = [];
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get('room') as RoomTrait | undefined;
        const isDark = roomTrait?.isDark === true;
        
        // Always include current location
        results.push(context.currentLocation);
        
        // Check if player is carrying the cloak
        const carried = context.world.getContents(context.actorId);
        const hasCloak = carried.some((item: IFEntity) => item.attributes.name === 'cloak');
        
        // In dark room with cloak - can only see the room itself
        if (isDark && hasCloak) {
          // Cloak absorbs all light - return only the room
          return results;
        }
        
        // Otherwise, see everything in the room
        const contents = context.world.getContents(context.currentLocation);
        results.push(...contents.map((e: IFEntity) => e.id));
        
        // Also see nested contents (in containers, on supporters)
        for (const entity of contents) {
          const nested = context.world.getAllContents(entity.id);
          results.push(...nested.map((e: IFEntity) => e.id));
        }
        
        return results;
      },
      priority: 100
    };
    
    // Inventory is visible unless in pitch darkness
    const inventoryRule: ScopeRule = {
      id: 'cloak_inventory_visibility',
      fromLocations: '*',
      includeEntities: (context) => {
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get('room') as RoomTrait | undefined;
        const isDark = roomTrait?.isDark === true;
        
        // Check if player is carrying the cloak
        const carried = context.world.getContents(context.actorId);
        const hasCloak = carried.some((item: IFEntity) => item.attributes.name === 'cloak');
        
        // In pitch darkness (dark room with cloak), can't even see inventory
        if (isDark && hasCloak) {
          return [];
        }
        
        // Otherwise, can see carried items
        const results = carried.map((e: IFEntity) => e.id);
        
        // Add nested contents of carried items
        for (const entity of carried) {
          const nested = context.world.getAllContents(entity.id);
          results.push(...nested.map((e: IFEntity) => e.id));
        }
        
        return results;
      },
      priority: 150
    };
    
    this.world.addScopeRule(basicVisibilityRule);
    this.world.addScopeRule(inventoryRule);
  }

  /**
   * Create the player entity
   */
  createPlayer(world: WorldModel): IFEntity {
    // Check if a player already exists
    const existingPlayer = world.getPlayer();
    if (existingPlayer) {
      // Just update the existing player with our traits
      existingPlayer.add(new IdentityTrait({
        name: 'yourself',
        description: 'As good-looking as ever.',
        aliases: ['self', 'myself', 'me', 'yourself'],
        properName: true,
        article: ''
      }));
      
      // These might already exist, but add them anyway
      if (!existingPlayer.has('actor')) {
        existingPlayer.add(new ActorTrait({
          isPlayer: true
        }));
      }
      
      if (!existingPlayer.has('container')) {
        existingPlayer.add(new ContainerTrait({
          capacity: {
            maxItems: 10
          }
        }));
      }
      
      return existingPlayer;
    }
    
    // Otherwise create a new player
    const player = world.createEntity('yourself', EntityType.ACTOR);
    
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'As good-looking as ever.',
      aliases: ['self', 'myself', 'me', 'yourself'],
      properName: true,
      article: ''
    }));
    
    player.add(new ActorTrait({
      isPlayer: true
    }));
    
    player.add(new ContainerTrait({
      capacity: {
        maxItems: 10
      }
    }));
    
    return player;
  }
  
  /**
   * Add exits to rooms after all rooms are created
   */
  private addExits(foyer: IFEntity, cloakroom: IFEntity, bar: IFEntity, outside: IFEntity): void {
    // Update foyer exits with actual IDs
    const foyerTrait = foyer.get(RoomTrait) as RoomTrait;
    if (foyerTrait) {
      foyerTrait.exits = {
        north: { destination: outside.id },
        south: { destination: bar.id },
        west: { destination: cloakroom.id }
      };
    }
    
    // Update cloakroom exits
    const cloakroomTrait = cloakroom.get(RoomTrait) as RoomTrait;
    if (cloakroomTrait) {
      cloakroomTrait.exits = {
        east: { destination: foyer.id }
      };
    }
    
    // Update bar exits
    const barTrait = bar.get(RoomTrait) as RoomTrait;
    if (barTrait) {
      barTrait.exits = {
        north: { destination: foyer.id }
      };
    }
    
    // Update outside exits
    const outsideTrait = outside.get(RoomTrait) as RoomTrait;
    if (outsideTrait) {
      outsideTrait.exits = {
        south: { destination: foyer.id }
      };
    }
  }
  
  /**
   * Create the Foyer (starting room) without exits
   */
  private createFoyerBase(): IFEntity {
    const foyer = this.world.createEntity('Foyer of the Opera House', EntityType.ROOM);
    
    foyer.add(new RoomTrait({
      exits: {}, // Will be added later
      isDark: false // Well lit
    }));
    
    foyer.add(new IdentityTrait({
      name: 'Foyer of the Opera House',
      aliases: ['foyer', 'hall', 'entrance'],
      description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
      properName: false,
      article: 'the'
    }));
    
    return foyer;
  }
  
  /**
   * Create the Cloakroom without exits
   */
  private createCloakroomBase(): IFEntity {
    const cloakroom = this.world.createEntity('Cloakroom', EntityType.ROOM);
    
    cloakroom.add(new RoomTrait({
      exits: {}, // Will be added later
      isDark: false // Well lit
    }));
    
    cloakroom.add(new IdentityTrait({
      name: 'Cloakroom',
      aliases: ['cloakroom', 'room'],
      description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
      properName: false,
      article: 'the'
    }));
    
    return cloakroom;
  }
  
  /**
   * Create the Bar (dark room with the message) without exits
   */
  private createBarBase(): IFEntity {
    const bar = this.world.createEntity('Foyer Bar', EntityType.ROOM);
    
    bar.add(new RoomTrait({
      exits: {}, // Will be added later
      isDark: true // Dark!
    }));
    
    bar.add(new IdentityTrait({
      name: 'Foyer Bar',
      aliases: ['bar', 'room'],
      description: 'The bar, much rougher than you\'d have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
      properName: false,
      article: 'the'
    }));
    
    return bar;
  }
  
  /**
   * Create the Outside (ending/exit) without exits
   */
  private createOutsideBase(): IFEntity {
    const outside = this.world.createEntity('Outside', EntityType.ROOM);
    
    outside.add(new RoomTrait({
      exits: {}, // Will be added later
      isDark: false, // Well lit
      isOutdoors: true
    }));
    
    outside.add(new IdentityTrait({
      name: 'Outside',
      aliases: ['outside', 'street'],
      description: 'You\'ve only just arrived, and besides, the weather outside seems to be getting worse.',
      properName: false,
      article: ''
    }));
    
    return outside;
  }
  
  /**
   * Create the velvet cloak
   */
  private createCloak(): IFEntity {
    const cloak = this.world.createEntity('velvet cloak', EntityType.ITEM);
    
    cloak.add(new IdentityTrait({
      name: 'velvet cloak',
      description: 'A handsome cloak of velvet trimmed with satin, and slightly splattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
      aliases: ['cloak', 'velvet cloak'],
      properName: false,
      article: 'a'
    }));
    
    cloak.add(new WearableTrait({
      isWorn: false
    }));
    
    // The cloak's darkness effect will be handled by game logic
    
    return cloak;
  }
  
  /**
   * Create the hook in the cloakroom
   */
  private createHook(cloakroom: IFEntity): IFEntity {
    const hook = this.world.createEntity('brass hook', EntityType.SUPPORTER);
    
    hook.add(new IdentityTrait({
      name: 'brass hook',
      description: 'It\'s just a small brass hook, screwed to the wall.',
      aliases: ['hook', 'peg', 'brass hook'],
      properName: false,
      article: 'a'
    }));
    
    hook.add(new SupporterTrait({
      capacity: {
        maxItems: 1
      }
    }));
    
    hook.add(new SceneryTrait());
    
    // Place hook in cloakroom
    this.world.moveEntity(hook.id, cloakroom.id);
    
    return hook;
  }
  
  /**
   * Create the message in the sawdust
   */
  private createMessage(bar: IFEntity): IFEntity {
    const message = this.world.createEntity('message in the sawdust', EntityType.SCENERY);
    
    message.add(new IdentityTrait({
      name: 'message in the sawdust',
      description: "The message, neatly marked in the sawdust, reads...",
      aliases: ['message', 'sawdust', 'floor', 'writing'],
      properName: false,
      article: 'a'
    }));
    
    message.add(new SceneryTrait());
    
    message.add(new ReadableTrait({
      text: this.message
    }));
    
    // Place message in bar
    this.world.moveEntity(message.id, bar.id);
    
    return message;
  }
  
  /**
   * Check if the bar is dark (player can't see)
   */
  private isBarDark(): boolean {
    const player = this.world.getPlayer();
    if (!player) return true;
    
    // Check if player is in the bar
    const playerRoom = this.world.getContainingRoom(player.id);
    if (!playerRoom || playerRoom.id !== this.roomIds['bar']) {
      return false; // Not in bar, doesn't matter
    }
    
    // Check visibility using scope system
    const visible = this.world.getVisible(player.id);
    
    // If we can only see the room itself, it's dark
    return visible.length === 1 && visible[0].id === this.roomIds['bar'];
  }
  
  /**
   * Garble a message based on disturbance level
   */
  private garbleMessage(text: string, level: number): string {
    // Simple garbling - replace some characters with dots
    const chars = text.split('');
    const disturbanceRate = level * 0.2;
    
    return chars.map(char => {
      if (char === ' ') return ' ';
      return Math.random() < disturbanceRate ? '.' : char;
    }).join('');
  }
  
  /**
   * Get custom vocabulary for this story
   */
  getCustomVocabulary() {
    return {
      verbs: [
        {
          actionId: 'HANG',
          verbs: ['hang', 'hook'],
          pattern: 'VERB_NOUN_PREP_NOUN'
        },
        {
          actionId: 'READ',
          verbs: ['read', 'examine'],
          pattern: 'VERB_NOUN'
        }
      ]
    };
  }
  
  /**
   * Get custom actions for this story
   */
  getCustomActions(): any[] {
    return [
      // Custom HANG action for hanging the cloak
      {
        id: 'HANG',
        // verbs are registered via getCustomVocabulary
        patterns: ['VERB NOUN PREP NOUN'],
        
        execute: (context: any) => {
          const events: any[] = [];
          console.log('HANG action executed!');
          console.log('Command:', JSON.stringify(context.command, null, 2));
          
          const { directObject, preposition, indirectObject } = context.command;
          
          // Check if we have the required parts
          if (!directObject || !preposition || !indirectObject) {
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'incomplete_command',
              reason: 'missing_parts'
            })];
          }
          
          // Check if it's "hang X on Y"
          const prep = preposition.text?.toLowerCase();
          if (prep !== 'on') {
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'cant_hang_that_way',
              reason: 'wrong_preposition'
            })];
          }
          
          // Get the entities
          const item = directObject.entity;
          const supporter = indirectObject.entity;
          
          if (!item || !supporter) {
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'not_found',
              reason: 'entity_not_found'
            })];
          }
          
          // Check if we're hanging the cloak on the hook
          if (item.name === 'cloak' && supporter.name === 'hook') {
            // Check if player is carrying the cloak
            const cloakLocation = context.world.getLocation(item.id);
            if (cloakLocation !== context.player.id) {
              return [context.event('action.error', {
                actionId: context.action.id,
                messageId: 'not_carrying',
                reason: 'not_carrying',
                params: { item: item.name }
              })];
            }
            
            // Move the cloak to the hook
            context.world.moveEntity(item.id, supporter.id);
            
            // Success!
            return [
              context.event('if.event.object_moved', {
                objectId: item.id,
                fromLocation: cloakLocation,
                toLocation: supporter.id,
                actorId: context.player.id
              }),
              context.event('action.success', {
                actionId: context.action.id,
                messageId: 'hung_cloak',
                params: {
                  item: item.name,
                  supporter: supporter.name
                }
              })
            ];
          } else {
            // Generic hang message
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'cant_hang_that',
              reason: 'invalid_combination',
              params: {
                item: item.name,
                supporter: supporter.name
              }
            })];
          }
        },
        
        metadata: {
          requiresDirectObject: true,
          requiresIndirectObject: true,
          directObjectScope: 'CARRIED',
          indirectObjectScope: 'REACHABLE'
        }
      },
      
      // Custom READ action for reading the message
      {
        id: 'READ',
        patterns: ['VERB NOUN'],
        
        execute: (context: any) => {
          const { directObject } = context.command;
          
          if (!directObject) {
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'what_to_read',
              reason: 'missing_object'
            })];
          }
          
          const item = directObject.entity;
          if (!item) {
            return [context.event('action.error', {
              actionId: context.action.id,
              messageId: 'not_found',
              reason: 'entity_not_found'
            })];
          }
          
          // Check if it's the message
          if (item.name === 'message') {
            const readable = item.get(ReadableTrait);
            
            if (!readable || !readable.isReadable) {
              // Can't read it (too dark or too disturbed)
              return [context.event('action.error', {
                actionId: context.action.id,
                messageId: 'cant_read_message',
                reason: readable?.text || "You can't read that.",
                params: { item: item.name }
              })];
            }
            
            // Success! Mark as complete if undisturbed
            if (this.disturbances === 0) {
              this.world.setStateValue('message_read_successfully', true);
            }
            
            return [context.event('action.success', {
              actionId: context.action.id,
              messageId: 'read_message',
              params: {
                text: readable.text,
                description: item.get(IdentityTrait)?.description
              }
            })];
          }
          
          // Not the message
          return [context.event('action.error', {
            actionId: context.action.id,
            messageId: 'nothing_to_read',
            reason: 'not_readable',
            params: { item: item.name }
          })];
        },
        
        metadata: {
          requiresDirectObject: true,
          directObjectScope: 'VISIBLE'
        }
      },
      
      // Override GO action to handle bar entry in darkness
      {
      id: 'GO_ENHANCED',
      verbs: ['go', 'walk'],
      priority: 100, // Higher priority than standard GO
      
      // Let standard GO do validation
      validate: () => ({ valid: true }),
      
      execute: (command: any, context: any) => {
        const events: any[] = [];
        const direction = command.parsed?.direction || command.entities?.direction;
        
        // Get current location
        const currentLoc = context.world.getLocation(context.actor.id);
        const currentRoom = context.world.getEntity(currentLoc);
        
        if (currentRoom) {
          const roomTrait = currentRoom.get(RoomTrait);
          const exit = roomTrait?.exits?.[direction];
          
          // Check if we're entering the bar
          if (exit?.destination === this.roomIds['bar']) {
            // Move the player
            context.world.moveEntity(context.actor.id, this.roomIds['bar']);
            
            // Record the movement
            events.push(context.event('actor_moved', {
              actor: context.actor.id,
              from: currentLoc,
              to: 'bar',
              direction: direction
            }));
            
            // Check if it's dark (carrying cloak)
            if (this.isBarDark()) {
              this.disturbances++;
              this.updateMessage();
              
              // Add message about stumbling
              events.push(context.event('game_message', {
                message: 'Blundering around in the dark isn\'t a good idea!'
              }));
            } else {
              // Update message visibility
              this.updateMessage();
            }
            
            return events;
          }
        }
        
        // Not going to bar, use standard GO action
        const standardGo = context.stdlib.getAction('GO');
        if (standardGo) {
          return standardGo.execute(command, context);
        }
        
        return events;
      }
    }];
  }
  
  /**
   * Story-specific initialization
   */
  initialize(): void {
    // Initialize message state
    this.updateMessage();
  }
  
  /**
   * Check if the story is complete
   */
  isComplete(): boolean {
    // Story is complete when the message has been read successfully
    return this.world.getStateValue('message_read_successfully') === true;
  }
}

// Create and export the story instance
export const story = new CloakOfDarknessStory();

// Default export for convenience
export default story;
