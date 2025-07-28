/**
 * Game state test story for testing save/load and state persistence
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';

interface StateMarker {
  id: string;
  value: any;
  turnSet: number;
}

/**
 * Game state test story with stateful objects and markers
 * Tests: save/load, turn history, state persistence
 */
export class GameStateTestStory implements Story {
  config: StoryConfig = {
    id: 'game-state-test',
    title: 'Game State Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    language: 'en-us',
    description: 'A story for testing game state management'
  };

  private _stateMarkers: Map<string, StateMarker> = new Map();
  private _stateHistory: Array<{ turn: number; markers: Map<string, any> }> = [];
  private _room: IFEntity | null = null;
  private _player: IFEntity | null = null;
  private _currentTurn: number = 0;

  initializeWorld(world: WorldModel): void {
    // Create test room with state
    this._room = world.createEntity('state-test-room', 'State Test Room');
    this._room.add(new IdentityTrait({
      name: 'State Test Room',
      description: 'A room that tracks state changes.',
      article: 'the'
    }));
    this._room.add(new ContainerTrait({ portable: false }));

    // Create objects with different states
    const door = world.createEntity('door', 'Door');
    door.add(new IdentityTrait({
      name: 'wooden door',
      aliases: ['door'],
      description: 'A wooden door that can be opened or closed.',
      article: 'a'
    }));
    door.add(new ContainerTrait({ portable: false }));
    
    // Add custom state
    (door as any).isOpen = false;
    (door as any).isLocked = true;
    
    const lamp = world.createEntity('lamp', 'Lamp');
    lamp.add(new IdentityTrait({
      name: 'brass lamp',
      aliases: ['lamp', 'light'],
      description: 'A brass lamp that can be lit or unlit.',
      article: 'a'
    }));
    lamp.add(new ContainerTrait({ portable: true }));
    
    // Add custom state
    (lamp as any).isLit = false;
    (lamp as any).fuelLevel = 100;
    
    // Place objects
    world.moveEntity(door.id, this._room.id);
    world.moveEntity(lamp.id, this._room.id);

    // Set initial state markers
    this.setStateMarker('game.started', true);
    this.setStateMarker('room.visited.state-test-room', false);
    this.setStateMarker('puzzle.solved', false);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('player', 'Player');
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'A state-aware adventurer.',
      properName: true,
      article: ''
    }));
    this._player.add(new ActorTrait({ isPlayer: true }));
    this._player.add(new ContainerTrait({
      capacity: { maxItems: 10 }
    }));
    
    // Add player state
    (this._player as any).score = 0;
    (this._player as any).moves = 0;
    
    // Place player in room
    if (this._room) {
      world.moveEntity(this._player.id, this._room.id);
    }
    
    return this._player;
  }

  getCustomActions() {
    return [
      {
        id: 'set-state',
        patterns: ['set state <text> to <text>'],
        execute: async (ctx: any) => {
          const key = ctx.args.text;
          const value = ctx.args.text2;
          this.setStateMarker(key, value);
          return {
            success: true,
            message: `State '${key}' set to '${value}'`
          };
        },
        description: 'Set a state marker',
        examples: ['set state puzzle.solved to true']
      },
      {
        id: 'check-state',
        patterns: ['check state <text>'],
        execute: async (ctx: any) => {
          const key = ctx.args.text;
          const value = this.getStateMarker(key);
          return {
            success: true,
            message: `State '${key}' is '${value}'`
          };
        },
        description: 'Check a state marker',
        examples: ['check state puzzle.solved']
      }
    ];
  }

  // State management methods
  setStateMarker(id: string, value: any): void {
    this._stateMarkers.set(id, {
      id,
      value,
      turnSet: this._currentTurn
    });
  }

  getStateMarker(id: string): any {
    return this._stateMarkers.get(id)?.value;
  }

  hasStateMarker(id: string): boolean {
    return this._stateMarkers.has(id);
  }

  removeStateMarker(id: string): void {
    this._stateMarkers.delete(id);
  }

  getAllStateMarkers(): Map<string, any> {
    const result = new Map<string, any>();
    this._stateMarkers.forEach((marker, key) => {
      result.set(key, marker.value);
    });
    return result;
  }

  // Turn tracking
  incrementTurn(): void {
    this._currentTurn++;
    // Save state snapshot
    const snapshot = new Map<string, any>();
    this._stateMarkers.forEach((marker, key) => {
      snapshot.set(key, marker.value);
    });
    this._stateHistory.push({
      turn: this._currentTurn,
      markers: snapshot
    });
  }

  getCurrentTurn(): number {
    return this._currentTurn;
  }

  // State history
  getStateAtTurn(turn: number): Map<string, any> | undefined {
    const snapshot = this._stateHistory.find(h => h.turn === turn);
    return snapshot?.markers;
  }

  getStateHistory(): Array<{ turn: number; markers: Map<string, any> }> {
    return [...this._stateHistory];
  }

  // Save/Load helpers
  exportState(): any {
    return {
      markers: Array.from(this._stateMarkers.entries()),
      currentTurn: this._currentTurn,
      history: this._stateHistory.map(h => ({
        turn: h.turn,
        markers: Array.from(h.markers.entries())
      }))
    };
  }

  importState(state: any): void {
    // Clear current state
    this._stateMarkers.clear();
    this._stateHistory = [];
    
    // Import markers
    if (state.markers) {
      state.markers.forEach(([key, marker]: [string, StateMarker]) => {
        this._stateMarkers.set(key, marker);
      });
    }
    
    // Import turn
    this._currentTurn = state.currentTurn || 0;
    
    // Import history
    if (state.history) {
      this._stateHistory = state.history.map((h: any) => ({
        turn: h.turn,
        markers: new Map(h.markers)
      }));
    }
  }
}
