/**
 * Event test story for testing event generation and sequencing
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait, EntityType } from '@sharpee/world-model';
import { Action, ActionContext, ActionResult } from '@sharpee/stdlib';
import { GameEvent } from '@sharpee/event-processor';

interface RecordedEvent {
  type: string;
  data: any;
  timestamp: Date;
  turn?: number;
  sequence?: number;
}

/**
 * Event test story with event logging and inspection helpers
 * Tests: event generation, sequencing, event metadata
 */
export class EventTestStory implements Story {
  config: StoryConfig = {
    id: 'event-test',
    title: 'Event Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    language: 'en-us',
    description: 'A story for testing event generation and handling'
  };

  private _events: RecordedEvent[] = [];
  private _eventFilters: Set<string> = new Set();
  private _captureAllEvents: boolean = false;
  private _room: IFEntity | null = null;
  private _player: IFEntity | null = null;

  constructor() {
    // Set up some default event types to capture
    this._eventFilters.add('turn.start');
    this._eventFilters.add('turn.complete');
    this._eventFilters.add('action.executed');
    this._eventFilters.add('player.moved');
    this._eventFilters.add('object.taken');
    this._eventFilters.add('object.dropped');
  }

  initializeWorld(world: WorldModel): void {
    // Create test room
    this._room = world.createEntity('Event Test Room', EntityType.ROOM);
    this._room.add(new IdentityTrait({
      name: 'Event Test Room',
      description: 'A room for testing event generation.',
      article: 'the'
    }));
    this._room.add(new ContainerTrait({ portable: false }));

    // Create test objects that will generate events
    const testItem = world.createEntity('Test Item', EntityType.OBJECT);
    testItem.add(new IdentityTrait({
      name: 'test item',
      aliases: ['item', 'thing'],
      description: 'An item that triggers events.',
      article: 'a'
    }));
    testItem.add(new ContainerTrait({ portable: true }));
    
    world.moveEntity(testItem.id, this._room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('Player', EntityType.ACTOR);
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'Event observer.',
      properName: true,
      article: ''
    }));
    this._player.add(new ActorTrait({ isPlayer: true }));
    this._player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));
    
    // Place player in room
    if (this._room) {
      world.moveEntity(this._player.id, this._room.id);
    }
    
    return this._player;
  }

  getCustomActions(): Action[] {
    return [
      {
        id: 'emit-test-event',
        patterns: ['emit <text>'],
        execute: async (ctx: ActionContext): Promise<ActionResult> => {
          const eventType = ctx.args.text || 'test.event';
          
          // This action would emit a custom event through the engine
          return {
            success: true,
            message: `Test event '${eventType}' emitted`,
            data: { eventType }
          };
        },
        description: 'Emit a test event',
        examples: ['emit custom.event']
      },
      {
        id: 'trigger-multiple',
        patterns: ['trigger multiple'],
        execute: async (ctx: ActionContext): Promise<ActionResult> => {
          // This would trigger multiple events in sequence
          return {
            success: true,
            message: 'Multiple events triggered',
            data: { count: 3 }
          };
        },
        description: 'Trigger multiple events',
        examples: ['trigger multiple']
      }
    ];
  }

  // Event capture methods (would be hooked into engine's event system)
  recordEvent(event: GameEvent | RecordedEvent): void {
    const recordedEvent: RecordedEvent = {
      type: event.type,
      data: event.data,
      timestamp: 'timestamp' in event ? event.timestamp : new Date(),
      turn: 'turn' in event ? event.turn : undefined,
      sequence: 'sequence' in event ? event.sequence : undefined
    };

    if (this._captureAllEvents || this._eventFilters.has(event.type)) {
      this._events.push(recordedEvent);
    }
  }

  // Test helper methods
  getCapturedEvents(): RecordedEvent[] {
    return [...this._events];
  }

  getEventsByType(type: string): RecordedEvent[] {
    return this._events.filter(e => e.type === type);
  }

  getEventsInSequence(startSeq: number, endSeq: number): RecordedEvent[] {
    return this._events.filter(e => 
      e.sequence !== undefined && 
      e.sequence >= startSeq && 
      e.sequence <= endSeq
    );
  }

  getLastEvent(): RecordedEvent | undefined {
    return this._events[this._events.length - 1];
  }

  clearCapturedEvents(): void {
    this._events = [];
  }

  setCaptureAllEvents(capture: boolean): void {
    this._captureAllEvents = capture;
  }

  addEventFilter(eventType: string): void {
    this._eventFilters.add(eventType);
  }

  removeEventFilter(eventType: string): void {
    this._eventFilters.delete(eventType);
  }

  getEventCount(): number {
    return this._events.length;
  }

  hasEventOccurred(type: string): boolean {
    return this._events.some(e => e.type === type);
  }

  getEventSequence(): string[] {
    return this._events.map(e => e.type);
  }
}
