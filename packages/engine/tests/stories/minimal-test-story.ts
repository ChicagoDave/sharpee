/**
 * Minimal test story for basic engine functionality testing
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';

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
    language: 'en-us',
    description: 'A minimal story for testing basic engine functionality'
  };

  private _initCalled = false;
  private _worldInitCalled = false;
  private _playerCreated = false;
  private _room: IFEntity | null = null;
  private _player: IFEntity | null = null;

  initializeWorld(world: WorldModel): void {
    this._worldInitCalled = true;
    
    // Create a simple test room
    this._room = world.createEntity('test-room', 'Test Room');
    this._room.add(new IdentityTrait({
      name: 'Test Room',
      description: 'A simple room for testing.',
      article: 'the'
    }));
    // Rooms are containers that aren't portable
    this._room.add(new ContainerTrait({ portable: false }));
  }

  createPlayer(world: WorldModel): IFEntity {
    // Create player entity
    this._player = world.createEntity('player', 'Player');
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'As good-looking as ever.',
      properName: true,
      article: ''
    }));
    this._player.add(new ActorTrait({ isPlayer: true }));
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
