/**
 * Minimal test story for basic engine functionality testing
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait, RoomBehavior, OpenableTrait, RoomTrait } from '@sharpee/world-model';

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

    this._room = world.createEntity('Test Room', 'room');
    this._room.add(new RoomTrait({}));
    this._room.add(new IdentityTrait({
      name: 'Test Room',
      description: 'A simple room for testing.',
      article: 'the'
    }));

    const lamp = world.createEntity('lamp', 'object');
    lamp.add(new IdentityTrait({
      name: 'lamp',
      aliases: ['brass lamp'],
      description: 'A brass lamp.',
      article: 'a'
    }));
    world.moveEntity(lamp.id, this._room.id);

    const box = world.createEntity('box', 'object');
    box.add(new ContainerTrait());
    box.add(new IdentityTrait({
      name: 'box',
      aliases: ['wooden box'],
      description: 'A wooden box.',
      article: 'a'
    }));
    box.add(new OpenableTrait({ isOpen: false }));
    world.moveEntity(box.id, this._room.id);

    this._northRoom = world.createEntity('North Room', 'room');
    this._northRoom.add(new RoomTrait({}));
    this._northRoom.add(new IdentityTrait({
      name: 'North Room',
      description: 'A room to the north.',
      article: 'the'
    }));

    RoomBehavior.setExit(this._room, 'north', this._northRoom.id);
    RoomBehavior.setExit(this._northRoom, 'south', this._room.id);

    if (this._player) {
      world.moveEntity(this._player.id, this._room.id);
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('yourself', 'actor');
    this._player.add(new ActorTrait());
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'As good-looking as ever.',
      properName: true,
      article: ''
    }));
    this._player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));

    // Note: Player is NOT placed here because createPlayer() is called
    // BEFORE initializeWorld() by the engine's setStory(). The room doesn't
    // exist yet. Player placement happens in initializeWorld() instead.

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
