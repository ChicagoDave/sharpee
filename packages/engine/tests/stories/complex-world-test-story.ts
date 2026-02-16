/**
 * Complex world test story for testing world navigation and object manipulation
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait, EntityType } from '@sharpee/world-model';

/**
 * Complex world test story with multiple rooms, objects, and containers
 * Tests: world navigation, object manipulation, scope/visibility
 */
export class ComplexWorldTestStory implements Story {
  config: StoryConfig = {
    id: 'complex-world-test',
    title: 'Complex World Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    language: 'en-us',
    description: 'A story with complex world structure for testing'
  };

  private _rooms: Map<string, IFEntity> = new Map();
  private _objects: Map<string, IFEntity> = new Map();
  private _player: IFEntity | null = null;

  initializeWorld(world: WorldModel): void {
    // Create rooms
    const mainRoom = this.createRoom(world, 'main-room', 'Main Room', 'The central room of the test area.');
    const northRoom = this.createRoom(world, 'north-room', 'North Room', 'A room to the north.');
    const southRoom = this.createRoom(world, 'south-room', 'South Room', 'A room to the south.');
    const secretRoom = this.createRoom(world, 'secret-room', 'Secret Room', 'A hidden room.');

    // Create connections using exits instead of createConnection
    // For now, we'll skip connections as WorldModel doesn't have createConnection
    // TODO: Implement proper room connections
    // Secret room is not directly connected initially

    // Create objects
    const table = this.createContainer(world, 'table', 'wooden table', 'A sturdy wooden table.', false);
    const box = this.createContainer(world, 'box', 'small box', 'A small wooden box.', true);
    const key = this.createObject(world, 'key', 'brass key', 'A small brass key.');
    const book = this.createObject(world, 'book', 'old book', 'An old leather-bound book.');
    const lamp = this.createObject(world, 'lamp', 'lamp', 'A portable lamp.');

    // Create nested container
    const chest = this.createContainer(world, 'chest', 'treasure chest', 'A large treasure chest.', true);
    const coin = this.createObject(world, 'coin', 'gold coin', 'A shiny gold coin.');

    // Place objects
    world.moveEntity(table.id, mainRoom.id);
    world.moveEntity(box.id, table.id);  // Box on table
    world.moveEntity(key.id, box.id);     // Key in box
    world.moveEntity(book.id, mainRoom.id);
    world.moveEntity(lamp.id, northRoom.id);
    world.moveEntity(chest.id, southRoom.id);
    world.moveEntity(coin.id, chest.id);  // Coin in chest

    // Add some objects to track
    this._objects.set('table', table);
    this._objects.set('box', box);
    this._objects.set('key', key);
    this._objects.set('book', book);
    this._objects.set('lamp', lamp);
    this._objects.set('chest', chest);
    this._objects.set('coin', coin);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('Player', EntityType.ACTOR);
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'An intrepid explorer.',
      properName: true,
      article: ''
    }));
    this._player.add(new ActorTrait({ isPlayer: true }));
    this._player.add(new ContainerTrait({
      capacity: { maxItems: 10, maxWeight: 50 }
    }));
    
    // Start player in main room
    const mainRoom = this._rooms.get('main-room');
    if (mainRoom) {
      world.moveEntity(this._player.id, mainRoom.id);
    }
    
    return this._player;
  }

  // Helper methods for creating world entities
  private createRoom(world: WorldModel, id: string, name: string, description: string): IFEntity {
    const room = world.createEntity(name, EntityType.ROOM);
    room.add(new IdentityTrait({
      name,
      description,
      article: 'the'
    }));
    room.add(new ContainerTrait({ portable: false }));
    
    this._rooms.set(id, room);
    return room;
  }

  private createObject(world: WorldModel, id: string, name: string, description: string): IFEntity {
    const obj = world.createEntity(name, EntityType.OBJECT);
    obj.add(new IdentityTrait({
      name,
      description,
      article: name.match(/^[aeiou]/i) ? 'an' : 'a'
    }));
    obj.add(new ContainerTrait({ portable: true }));
    return obj;
  }

  private createContainer(world: WorldModel, id: string, name: string, description: string, portable: boolean): IFEntity {
    const container = world.createEntity(name, EntityType.CONTAINER);
    container.add(new IdentityTrait({
      name,
      description,
      article: name.match(/^[aeiou]/i) ? 'an' : 'a'
    }));
    container.add(new ContainerTrait({ 
      portable,
      capacity: { maxItems: 5 }
    }));
    return container;
  }

  // Test helper methods
  getRoom(id: string): IFEntity | undefined {
    return this._rooms.get(id);
  }

  getObject(id: string): IFEntity | undefined {
    return this._objects.get(id);
  }

  getAllRooms(): IFEntity[] {
    return Array.from(this._rooms.values());
  }

  getAllObjects(): IFEntity[] {
    return Array.from(this._objects.values());
  }

  getPlayer(): IFEntity | null {
    return this._player;
  }

  connectSecretRoom(world: WorldModel): void {
    // TODO: Implement when room connections are available
    // For now, just move the secret room as a child of main room
    const mainRoom = this._rooms.get('main-room');
    const secretRoom = this._rooms.get('secret-room');
    if (mainRoom && secretRoom) {
      // This is a workaround - not proper room connection
      world.moveEntity(secretRoom.id, mainRoom.id);
    }
  }
}
