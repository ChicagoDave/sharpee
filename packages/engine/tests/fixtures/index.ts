/**
 * Test fixtures for @sharpee/engine tests
 */

import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';
import { Action, ActionContext, ActionResult } from '@sharpee/stdlib';
import { SequencedEvent } from '../../src/types';

// Export mock parser
export { MockParser, createMockParser } from './mock-parser';

/**
 * Create a basic test world with a player and a simple room
 */
export function createTestWorld(): { world: WorldModel; player: IFEntity; room: IFEntity } {
  const world = new WorldModel();
  
  // Create a simple room
  const room = world.createEntity('test-room', 'Test Room');
  room.add(new IdentityTrait({
    name: 'Test Room',
    description: 'A simple test room.',
    article: 'the'
  }));
  // Rooms are identified by having a container trait without being portable
  room.add(new ContainerTrait({ portable: false }));
  
  // Create player
  const player = world.createEntity('player', 'You');
  player.add(new IdentityTrait({
    name: 'You',
    aliases: ['self', 'me', 'myself'],
    description: 'As good-looking as ever.',
    properName: true,
    article: ''
  }));
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait({
    capacity: { maxItems: 10 }
  }));
  
  // Place player in room
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);
  
  return { world, player, room };
}

// TestStory removed - use story-specific test stories instead

/**
 * Create a mock action for testing
 */
export function createMockAction(
  id: string,
  patterns: string[],
  execute: (context: ActionContext) => ActionResult | Promise<ActionResult>
): Action {
  return {
    id,
    patterns,
    execute,
    description: `Mock action ${id}`,
    examples: []
  };
}

/**
 * Create test events
 */
export function createTestEvent(
  type: string,
  data: any = {},
  sequence: number = Date.now()
): SequencedEvent {
  return {
    type,
    data,
    timestamp: new Date(),
    sequence,
    turn: 1,
    scope: 'turn',
    source: 'test'
  };
}

/**
 * Mock text channel for testing output
 */
export class MockTextChannel {
  public messages: Array<{ text: string; metadata?: any }> = [];

  write(text: string, metadata?: any): void {
    this.messages.push({ text, metadata });
  }

  clear(): void {
    this.messages = [];
  }

  getMessages(): string[] {
    return this.messages.map(m => m.text);
  }

  getLastMessage(): string | undefined {
    return this.messages[this.messages.length - 1]?.text;
  }
}
