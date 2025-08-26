/**
 * Minimal test story for basic engine functionality testing
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait, EntityType, RoomBehavior, OpenableTrait, RoomTrait } from '@sharpee/world-model';

/**
 * Minimal test story with one room and basic player
 * Tests: engine lifecycle, initialization, start/stop
 */
export class MinimalTestStory implements Story {
  config: StoryConfig = {
    id: 'minimal-test',
    title: 'Minimal Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    description: 'A minimal story for testing basic engine functionality'
  };
  
  forceInitError: boolean = false;

  private _initCalled = false;
  private _worldInitCalled = false;
  private _playerCreated = false;
  private _room: IFEntity | null = null;
  private _northRoom: IFEntity | null = null;
  private _player: IFEntity | null = null;

  initializeWorld(world: WorldModel): void {
    if (this.forceInitError) {
      throw new Error('Forced initialization error');
    }
    this._worldInitCalled = true;
    
    // Create a simple test room (createEntityWithTraits automatically adds RoomTrait)
    this._room = world.createEntityWithTraits(EntityType.ROOM);
    this._room.add(new IdentityTrait({
      name: 'Test Room',
      description: 'A simple room for testing.',
      article: 'the'
    }));
    
    // Add a lamp for testing purposes (objects are portable by default)
    const lamp = world.createEntityWithTraits(EntityType.ITEM);
    lamp.add(new IdentityTrait({
      name: 'lamp',
      aliases: ['brass lamp'],
      description: 'A brass lamp.',
      article: 'a'
    }));
    world.moveEntity(lamp.id, this._room.id);
    
    // Add a box for testing purposes (createEntityWithTraits automatically adds ContainerTrait)
    const box = world.createEntityWithTraits(EntityType.CONTAINER);
    box.add(new IdentityTrait({
      name: 'box',
      aliases: ['wooden box'],
      description: 'A wooden box.',
      article: 'a'
    }));
    // Make the box openable
    box.add(new OpenableTrait({ isOpen: false }));
    world.moveEntity(box.id, this._room.id);
    
    // Create a north room for movement testing (createEntityWithTraits automatically adds RoomTrait)
    this._northRoom = world.createEntityWithTraits(EntityType.ROOM);
    this._northRoom.add(new IdentityTrait({
      name: 'North Room',
      description: 'A room to the north.',
      article: 'the'
    }));
    
    // Connect the rooms using RoomBehavior
    RoomBehavior.setExit(this._room, 'north', this._northRoom.id);
    RoomBehavior.setExit(this._northRoom, 'south', this._room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    // Create player entity (createEntityWithTraits automatically adds ActorTrait)
    this._player = world.createEntityWithTraits(EntityType.ACTOR);
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'As good-looking as ever.',
      properName: true,
      article: ''
    }));
    // ActorTrait is already added by createEntityWithTraits
    // Just add ContainerTrait to allow the player to carry items
    this._player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));
    
    // Place player in the room
    if (this._room) {
      world.moveEntity(this._player.id, this._room.id);
    }
    
    // Mark that player was created AFTER successful creation
    this._playerCreated = true;
    
    return this._player;
  }

  initialize(): void {
    this._initCalled = true;
  }

  // Test helper methods
  wasInitialized(): boolean {
    return this._initCalled;
  }

  wasWorldInitialized(): boolean {
    return this._worldInitCalled;
  }

  wasPlayerCreated(): boolean {
    return this._playerCreated;
  }

  getRoom(): IFEntity | null {
    return this._room;
  }

  getPlayer(): IFEntity | null {
    return this._player;
  }
}
