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
import type { GameEngine, CustomVocabulary } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
// @ts-ignore - lang-en-us types not available yet
import type { LanguageProvider } from '@sharpee/lang-en-us';
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
  IScopeRule,
  LightSourceTrait,
  EntityType,
  Direction
} from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import type { IGameEvent, Effect, WorldQuery } from '@sharpee/event-processor';

/**
 * Cloak of Darkness story configuration
 */
export const config: StoryConfig = {
  id: "cloak-of-darkness",
  title: "Cloak of Darkness",
  author: "Roger Firth (Sharpee implementation)",
  version: "1.0.0",
  description: "A basic IF demonstration - hang up your cloak!"
};

/**
 * Cloak of Darkness story implementation
 */
export class CloakOfDarknessStory implements Story {
  config = config;

  private world!: WorldModel;
  private winningText = "You have won!"; // The message in the sawdust
  private disturbances = 0; // Times the message has been disturbed
  private roomIds: Record<string, string> = {}; // Map of room names to IDs
  private messageEntity!: IFEntity; // Reference to the message entity
  private hookId!: string;
  private cloakId!: string;
  
  /**
   * Update the message based on current game state
   */
  private updateMessage(): void {
    if (!this.messageEntity) return;

    const identity = this.messageEntity.get(IdentityTrait);
    const readable = this.messageEntity.get(ReadableTrait);

    if (!identity || !readable) return;

    // Update description based on state
    if (this.isBarDark()) {
      identity.description = "In the darkness, you can't see any message.";
      readable.text = "It's too dark to read.";
      readable.isReadable = false;
      readable.cannotReadMessage = "It's too dark to read the message.";
    } else if (this.disturbances === 0) {
      identity.description = "The message, neatly marked in the sawdust, reads...";
      readable.text = this.winningText;
      readable.isReadable = true;
      readable.cannotReadMessage = undefined;
    } else if (this.disturbances < 3) {
      identity.description = "The message has been carelessly trampled, making it difficult to read.";
      readable.text = "You can just make out: " + this.garbleMessage(this.winningText, this.disturbances);
      readable.isReadable = true;
      readable.cannotReadMessage = undefined;
    } else {
      identity.description = "The message has been completely obliterated.";
      readable.text = "The message is too trampled to read.";
      readable.isReadable = false;
      readable.cannotReadMessage = "The message has been trampled beyond recognition. You have lost!";
    }
  }

  /**
   * Initialize the world for Cloak of Darkness
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;
    
    // Register the debug capability for trace commands
    world.registerCapability('debug', {
      schema: {
        debugParserEvents: { type: 'boolean', default: false },
        debugValidationEvents: { type: 'boolean', default: false },
        debugSystemEvents: { type: 'boolean', default: false }
      }
    });
    
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
    this.messageEntity = this.createMessage(bar);
    
    // Set initial player location to foyer
    const player = world.getPlayer();
    if (player) {
      console.log(`Moving player ${player.id} to foyer ${foyer.id}`);
      world.moveEntity(player.id, foyer.id);
      // Give player the cloak initially
      console.log(`Moving cloak ${cloak.id} to player ${player.id}`);
      world.moveEntity(cloak.id, player.id);
      // Verify cloak location
      const cloakLoc = world.getLocation(cloak.id);
      console.log(`Cloak location after move: ${cloakLoc}`);
      const playerContents = world.getContents(player.id);
      console.log(`Player contents: ${playerContents.map((e: any) => e.name).join(', ')}`);
    } else {
      console.log('WARNING: No player found in world!');
    }
  }
  
  /**
   * Set up darkness rules using the scope system
   */
  private setupDarknessRules(): void {
    // Basic visibility rule - handles both lit and dark rooms
    const basicVisibilityRule: IScopeRule = {
      id: 'cloak_basic_visibility',
      fromLocations: '*',
      includeEntities: (context: any) => {
        const results: string[] = [];
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get('room') as RoomTrait | undefined;
        const isDark = roomTrait?.isDark === true;
        
        // Always include current location
        results.push(context.currentLocation);
        
        // Check if player is carrying the cloak
        const carried = context.world.getContents(context.actorId);
        const hasCloak = carried.some((item: IFEntity) =>
          item.attributes.name === 'velvet cloak' || item.name === 'velvet cloak'
        );

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
    const inventoryRule: IScopeRule = {
      id: 'cloak_inventory_visibility',
      fromLocations: '*',
      includeEntities: (context: any) => {
        const location = context.world.getEntity(context.currentLocation);
        const roomTrait = location?.get('room') as RoomTrait | undefined;
        const isDark = roomTrait?.isDark === true;
        
        // Check if player is carrying the cloak
        const carried = context.world.getContents(context.actorId);
        const hasCloak = carried.some((item: IFEntity) =>
          item.attributes.name === 'velvet cloak' || item.name === 'velvet cloak'
        );

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
        [Direction.NORTH]: { destination: outside.id },
        [Direction.SOUTH]: { destination: bar.id },
        [Direction.WEST]: { destination: cloakroom.id }
      };
    }
    
    // Update cloakroom exits
    const cloakroomTrait = cloakroom.get(RoomTrait) as RoomTrait;
    if (cloakroomTrait) {
      cloakroomTrait.exits = {
        [Direction.EAST]: { destination: foyer.id }
      };
    }
    
    // Update bar exits
    const barTrait = bar.get(RoomTrait) as RoomTrait;
    if (barTrait) {
      barTrait.exits = {
        [Direction.NORTH]: { destination: foyer.id }
      };
    }
    
    // Update outside exits
    const outsideTrait = outside.get(RoomTrait) as RoomTrait;
    if (outsideTrait) {
      outsideTrait.exits = {
        [Direction.SOUTH]: { destination: foyer.id }
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
   * The bar starts dark - hanging the cloak on the hook lights it up
   */
  private createBarBase(): IFEntity {
    const bar = this.world.createEntity('Foyer Bar', EntityType.ROOM);

    bar.add(new RoomTrait({
      exits: {}, // Will be added later
      isDark: true // Dark until cloak is hung on hook
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
    this.cloakId = cloak.id;

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

    this.hookId = hook.id;

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
      text: this.winningText
    }));
    
    // Place message in bar
    this.world.moveEntity(message.id, bar.id);
    
    return message;
  }
  
  /**
   * Check if the bar is dark (player can't see)
   */
  private isBarDark(): boolean {
    const bar = this.world.getEntity(this.roomIds['bar']);
    if (!bar) return true;
    
    const roomTrait = bar.get(RoomTrait);
    return roomTrait?.isDark === true;
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
   * Extend the parser with custom vocabulary for this story
   */
  extendParser(_parser: Parser): void {
    // Verbs are registered via getCustomVocabulary() — no parser.addVerb needed
  }

  /**
   * Register custom vocabulary — "hang" as a PUT_ON synonym
   */
  getCustomVocabulary(): CustomVocabulary {
    return {
      verbs: [
        {
          actionId: 'PUT_ON',
          verbs: ['hang', 'hook'],
          pattern: 'VERB NOUN PREP NOUN',
          prepositions: ['on']
        }
      ]
    };
  }
  
  /**
   * Extend the language provider with custom messages for this story
   */
  extendLanguage(language: LanguageProvider): void {
    // Stumble message for dark bar
    language.addMessage('cloak.stumble', 'Blundering around in the dark isn\'t a good idea!');

    // Custom messages for READ action
    language.addMessage('action.read.error.what_to_read', 'What do you want to read?');
    language.addMessage('READ.cant_read_message', '{reason}');
    language.addMessage('action.read.success.read_message', '{description}\n\n{text}');
    language.addMessage('action.read.error.nothing_to_read', 'There\'s nothing written on {item}.');
  }
  
  /**
   * Get custom actions for this story
   */
  getCustomActions(): any[] {
    return [
      // Custom READ action for reading the message
      {
        id: 'READ',
        patterns: ['VERB NOUN'],
        
        execute: (context: any) => {
          const { directObject } = context.command;
          
          if (!directObject) {
            return [context.event('action.failure', {
              actionId: context.action.id,
              messageId: 'what_to_read',
              reason: 'missing_object'
            })];
          }
          
          const item = directObject.entity;
          if (!item) {
            return [context.event('action.failure', {
              actionId: context.action.id,
              messageId: 'not_found',
              reason: 'entity_not_found'
            })];
          }
          
          // Check if it's the message (could be 'message' or 'message in the sawdust')
          if (item.name === 'message' || item.name === 'message in the sawdust') {
            // Ensure message state is current before checking readability
            this.updateMessage();
            const readable = item.get(ReadableTrait);

            if (!readable || !readable.isReadable) {
              const reasonText = readable?.text || "You can't read that.";
              const events: any[] = [
                context.event('action.failure', {
                  actionId: context.action.id,
                  messageId: 'cant_read_message',
                  reason: reasonText,
                  params: { item: item.name, reason: reasonText }
                })
              ];

              // If message is too trampled (not just too dark), it's a loss
              if (readable?.text === "The message is too trampled to read.") {
                this.world.setStateValue('game_lost', true);
                events.push({
                  id: `loss-${Date.now()}`,
                  type: 'story.defeat',
                  timestamp: Date.now(),
                  entities: {},
                  data: {
                    message: 'You have lost!',
                    reason: 'The message has been completely destroyed.'
                  }
                });
              }

              return events;
            }

            // Emit read event — story-level handler checks for victory
            return [
              context.event('if.event.read', {
                targetId: item.id,
                target: item.id,
                actorId: context.player.id
              }),
              context.event('action.success', {
                actionId: context.action.id,
                messageId: 'read_message',
                params: {
                  text: readable.text,
                  description: item.get(IdentityTrait)?.description
                }
              })
            ];
          }
          
          // Not the message
          return [context.event('action.failure', {
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
            
            // Emit the movement event - the bar's event handler will handle darkness
            events.push(context.event('if.event.actor_moved', {
              actorId: context.actor.id,
              fromLocation: currentLoc,
              toLocation: this.roomIds['bar'],
              direction: direction
            }));
            
            // Standard success message
            events.push(context.event('action.success', {
              actionId: 'GO',
              messageId: 'moved',
              params: {
                direction: direction
              }
            }));
            
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
   * Register story-level event handlers via EventProcessor (ADR-075).
   * These fire for ALL events of a given type, regardless of entities.target.
   */
  onEngineReady(engine: GameEngine): void {
    const eventProcessor = engine.getEventProcessor();

    // Handler: when player enters the bar while carrying cloak
    eventProcessor.registerHandler('if.event.actor_moved',
      (event: IGameEvent, query: WorldQuery): Effect[] => {
        const eventData = event.data || {};
        const actorSnapshot = eventData.actor;
        const destinationSnapshot = eventData.destinationRoom;

        const worldPlayer = query.getPlayer();
        const isPlayer = actorSnapshot?.id === worldPlayer?.id;
        const isBar = destinationSnapshot?.id === this.roomIds['bar'] ||
                      eventData.toRoom === this.roomIds['bar'];

        if (!isPlayer || !isBar) return [];

        const hasCloak = actorSnapshot?.contents?.some((item: any) =>
          item.name === 'velvet cloak' || item.name === 'cloak'
        ) || false;

        const isDark = destinationSnapshot?.isDark === true;

        if (isDark && hasCloak) {
          this.disturbances++;
          this.updateMessage();
          return [{
            type: 'message',
            id: 'cloak.stumble',
            data: { text: "Blundering around in the dark isn't a good idea!" }
          }];
        } else {
          this.updateMessage();
        }
        return [];
      }
    );

    // Handler: when cloak is placed on the hook, light the bar
    eventProcessor.registerHandler('if.event.put_on',
      (event: IGameEvent, _query: WorldQuery): Effect[] => {
        const eventData = event.data || {};
        const isHook = eventData.targetId === this.hookId;
        const isCloak = eventData.itemId === this.cloakId;

        if (isHook && isCloak) {
          // Directly update room trait — pragmatic approach during ADR-075 migration
          const bar = this.world.getEntity(this.roomIds['bar']);
          if (bar) {
            const roomTrait = bar.get(RoomTrait);
            if (roomTrait) {
              roomTrait.isDark = false;
            }
          }
          this.updateMessage();
        }
        return [];
      }
    );

    // Handler: victory check when message is read
    eventProcessor.registerHandler('if.event.read',
      (event: IGameEvent, _query: WorldQuery): Effect[] => {
        const eventData = event.data || {};
        const isMessage = eventData.targetId === this.messageEntity?.id ||
                          eventData.target === this.messageEntity?.id;

        if (isMessage && this.disturbances === 0) {
          return [
            { type: 'set_state', key: 'message_read_successfully', value: true },
            {
              type: 'emit',
              event: {
                id: `victory-${Date.now()}`,
                type: 'story.victory',
                timestamp: Date.now(),
                entities: {
                  actor: eventData.actorId || 'player',
                  target: this.messageEntity.id
                },
                data: {
                  message: 'Congratulations! You have won!',
                  reason: 'Message read without disturbing the sawdust',
                  disturbances: this.disturbances
                }
              }
            }
          ];
        }
        return [];
      }
    );
  }

  /**
   * Check if the story is complete
   */
  isComplete(): boolean {
    // Story is complete when the message has been read (win) or destroyed (loss)
    return this.world.getStateValue('message_read_successfully') === true ||
           this.world.getStateValue('game_lost') === true;
  }
}

// Create and export the story instance
export const story = new CloakOfDarknessStory();

// Default export for convenience
export default story;
