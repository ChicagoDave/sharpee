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
  ReadableTrait
} from '@sharpee/world-model';

/**
 * Cloak of Darkness story configuration
 */
export const config: StoryConfig = {
  title: "Cloak of Darkness",
  author: "Roger Firth (Sharpee implementation)",
  version: "1.0.0",
  language: "en-us",
  description: "A basic IF demonstration - hang up your cloak!"
};

/**
 * Cloak of Darkness story implementation
 */
export class CloakOfDarknessStory implements Story {
  config = config;
  
  private world!: WorldModel;
  private message = "You have won!"; // The message in the sawdust
  private disturbances = 0; // Times the message has been disturbed
  
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
    
    // Create the three rooms
    const foyer = this.createFoyer();
    const cloakroom = this.createCloakroom();
    const bar = this.createBar();
    const outside = this.createOutside();
    
    // Create the cloak
    const cloak = this.createCloak();
    
    // Create the hook
    const hook = this.createHook(cloakroom);
    
    // Create the message
    const message = this.createMessage(bar);
    
    // Set initial player location to foyer
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, foyer.id);
      // Give player the cloak initially
      world.moveEntity(cloak.id, player.id);
    }
  }
  
  /**
   * Create the player entity
   */
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('player', 'yourself');
    
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
   * Create the Foyer (starting room)
   */
  private createFoyer(): IFEntity {
    const foyer = this.world.createEntity('foyer', 'Foyer of the Opera House');
    
    foyer.add(new RoomTrait({
      exits: {
        north: { destination: 'outside' },
        south: { destination: 'bar' },
        west: { destination: 'cloakroom' }
      },
      baseLight: 10 // Well lit
    }));
    
    foyer.add(new IdentityTrait({
      name: 'Foyer of the Opera House',
      aliases: ['foyer', 'hall', 'entrance'],
      description: 'You are standing in a spacious hall, splendidly decorated in red and gold, with glittering chandeliers overhead. The entrance from the street is to the north, and there are doorways south and west.',
      properName: false,
      article: 'the'
    }));
    
    // Foyer is well-lit by its baseLight property, no need for separate light source
    
    return foyer;
  }
  
  /**
   * Create the Cloakroom
   */
  private createCloakroom(): IFEntity {
    const cloakroom = this.world.createEntity('cloakroom', 'Cloakroom');
    
    cloakroom.add(new RoomTrait({
      exits: {
        east: { destination: 'foyer' }
      },
      baseLight: 10 // Well lit
    }));
    
    cloakroom.add(new IdentityTrait({
      name: 'Cloakroom',
      aliases: ['cloakroom', 'room'],
      description: 'The walls of this small room were clearly once lined with hooks, though now only one remains. The exit is a door to the east.',
      properName: false,
      article: 'the'
    }));
    
    // Cloakroom is well-lit by its baseLight property
    
    return cloakroom;
  }
  
  /**
   * Create the Bar (dark room with the message)
   */
  private createBar(): IFEntity {
    const bar = this.world.createEntity('bar', 'Foyer Bar');
    
    bar.add(new RoomTrait({
      exits: {
        north: { destination: 'foyer' }
      },
      baseLight: 0 // Dark!
    }));
    
    bar.add(new IdentityTrait({
      name: 'Foyer Bar',
      aliases: ['bar', 'room'],
      description: 'The bar, much rougher than you\'d have guessed after the opulence of the foyer to the north, is completely empty. There seems to be some sort of message scrawled in the sawdust on the floor.',
      properName: false,
      article: 'the'
    }));
    
    // The bar is dark - no light source!
    
    return bar;
  }
  
  /**
   * Create the Outside (ending/exit)
   */
  private createOutside(): IFEntity {
    const outside = this.world.createEntity('outside', 'Outside');
    
    outside.add(new RoomTrait({
      exits: {
        south: { destination: 'foyer' }
      },
      baseLight: 10, // Well lit
      isOutdoors: true
    }));
    
    outside.add(new IdentityTrait({
      name: 'Outside',
      aliases: ['outside', 'street'],
      description: 'You\'ve only just arrived, and besides, the weather outside seems to be getting worse.',
      properName: false,
      article: ''
    }));
    
    // Outside is well-lit by its baseLight property
    
    return outside;
  }
  
  /**
   * Create the velvet cloak
   */
  private createCloak(): IFEntity {
    const cloak = this.world.createEntity('cloak', 'velvet cloak');
    
    cloak.add(new IdentityTrait({
      name: 'velvet cloak',
      description: 'A handsome cloak of velvet trimmed with satin, and slightly splattered with raindrops. Its blackness is so deep that it almost seems to suck light from the room.',
      aliases: ['cloak', 'velvet cloak'],
      properName: false,
      article: 'a'
    }));
    
    cloak.add(new WearableTrait({
      worn: false
    }));
    
    // The cloak's darkness effect will be handled by game logic
    
    return cloak;
  }
  
  /**
   * Create the hook in the cloakroom
   */
  private createHook(cloakroom: IFEntity): IFEntity {
    const hook = this.world.createEntity('hook', 'brass hook');
    
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
    const message = this.world.createEntity('message', 'message');
    
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
   * Check if the bar is dark
   */
  private isBarDark(): boolean {
    const player = this.world.getPlayer();
    if (!player) return true;
    
    // Check if player is in the bar
    const playerRoom = this.world.getContainingRoom(player.id);
    if (!playerRoom || playerRoom.id !== 'bar') {
      return false; // Not in bar, doesn't matter
    }
    
    // Check if player is carrying the cloak
    const cloak = this.world.getEntity('cloak');
    if (!cloak) return false;
    
    const cloakLocation = this.world.getLocation(cloak.id);
    return cloakLocation === player.id;
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
   * Get custom actions for this story
   */
  getCustomActions(): any[] {
    // We'll add a custom action to track sawdust disturbance
    return [{
      id: 'DISTURB_SAWDUST',
      verbs: ['disturb', 'trample', 'mess'],
      execute: (command: any, context: any) => {
        this.disturbances++;
        return [{
          type: 'game_message',
          message: 'You accidentally disturb the sawdust on the floor.'
        }];
      }
    }];
  }
  
  /**
   * Story-specific initialization
   */
  initialize(): void {
    // Set up event handlers for entering the bar in darkness
    this.world.registerEventHandler('entity_moved', (event: any, world: any) => {
      const data = event.data as any;
      
      // Check if player entered the bar
      if (data.entity === 'player' && data.to === 'bar') {
        // Check if it's dark (carrying cloak)
        if (this.isBarDark()) {
          this.disturbances++;
          this.updateMessage(); // Update the message state
          
          // Emit a message about stumbling in the dark
          setTimeout(() => {
            world.applyEvent({
              id: `dark_stumble_${Date.now()}`,
              timestamp: Date.now(),
              type: 'game_message',
              data: {
                message: 'Blundering around in the dark isn\'t a good idea!'
              }
            });
          }, 100);
        } else {
          // Player entered bar with light, update message in case it needs to be displayed
          this.updateMessage();
        }
      }
    });
  }
  
  /**
   * Check if the story is complete
   */
  isComplete(): boolean {
    // Story is complete when the message has been read successfully
    const message = this.world.getEntity('message');
    if (!message) return false;
    
    // Check if message was read without disturbance
    return this.disturbances === 0 && !this.isBarDark();
  }
}

// Create and export the story instance
export const story = new CloakOfDarknessStory();

// Default export for convenience
export default story;
