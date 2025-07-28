/**
 * Completion test story for testing game over detection and completion handling
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait } from '@sharpee/world-model';

interface CompletionCondition {
  id: string;
  description: string;
  check: () => boolean;
  priority: number;
}

/**
 * Completion test story with configurable completion conditions
 * Tests: game over detection, completion handling
 */
export class CompletionTestStory implements Story {
  config: StoryConfig = {
    id: 'completion-test',
    title: 'Completion Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    language: 'en-us',
    description: 'A story for testing game completion conditions'
  };

  private _completionConditions: Map<string, CompletionCondition> = new Map();
  private _completionStatus: { isComplete: boolean; reason?: string } = { isComplete: false };
  private _turnCount: number = 0;
  private _score: number = 0;
  private _maxScore: number = 100;
  private _room: IFEntity | null = null;
  private _player: IFEntity | null = null;
  private _treasureFound: boolean = false;

  constructor() {
    // Set up default completion conditions
    this.addCompletionCondition({
      id: 'max-score',
      description: 'Player reaches maximum score',
      check: () => this._score >= this._maxScore,
      priority: 1
    });

    this.addCompletionCondition({
      id: 'turn-limit',
      description: 'Turn limit reached',
      check: () => this._turnCount >= 50,
      priority: 2
    });

    this.addCompletionCondition({
      id: 'treasure-found',
      description: 'Player finds the treasure',
      check: () => this._treasureFound,
      priority: 1
    });
  }

  initializeWorld(world: WorldModel): void {
    // Create test room
    this._room = world.createEntity('completion-test-room', 'Completion Test Room');
    this._room.add(new IdentityTrait({
      name: 'Completion Test Room',
      description: 'A room where victory awaits.',
      article: 'the'
    }));
    this._room.add(new ContainerTrait({ portable: false }));

    // Create treasure (finding it can complete the game)
    const treasure = world.createEntity('treasure', 'Treasure');
    treasure.add(new IdentityTrait({
      name: 'golden treasure',
      aliases: ['treasure', 'gold'],
      description: 'A magnificent golden treasure!',
      article: 'a'
    }));
    treasure.add(new ContainerTrait({ portable: true }));
    
    // Create exit door (using it can complete the game)
    const exitDoor = world.createEntity('exit-door', 'Exit Door');
    exitDoor.add(new IdentityTrait({
      name: 'exit door',
      aliases: ['door', 'exit'],
      description: 'The door leading to victory.',
      article: 'the'
    }));
    exitDoor.add(new ContainerTrait({ portable: false }));
    
    // Place objects
    world.moveEntity(treasure.id, this._room.id);
    world.moveEntity(exitDoor.id, this._room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('player', 'Player');
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'Seeking completion.',
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

  getCustomActions() {
    return [
      {
        id: 'win-game',
        patterns: ['win', 'win game'],
        execute: async () => {
          this.setComplete(true, 'Victory command used');
          return {
            success: true,
            message: 'You have won the game!'
          };
        },
        description: 'Instantly win the game',
        examples: ['win']
      },
      {
        id: 'lose-game',
        patterns: ['lose', 'lose game'],
        execute: async () => {
          this.setComplete(true, 'Defeat command used');
          return {
            success: true,
            message: 'You have lost the game!'
          };
        },
        description: 'Instantly lose the game',
        examples: ['lose']
      },
      {
        id: 'add-score',
        patterns: ['score <number>'],
        execute: async (ctx: any) => {
          const points = parseInt(ctx.args.number) || 0;
          this.addScore(points);
          return {
            success: true,
            message: `Added ${points} points. Score: ${this._score}/${this._maxScore}`
          };
        },
        description: 'Add points to score',
        examples: ['score 10']
      }
    ];
  }

  isComplete(): boolean {
    // Check all completion conditions
    for (const condition of this._completionConditions.values()) {
      if (condition.check()) {
        this._completionStatus = {
          isComplete: true,
          reason: condition.description
        };
        return true;
      }
    }
    
    return this._completionStatus.isComplete;
  }

  // Test helper methods
  addCompletionCondition(condition: CompletionCondition): void {
    this._completionConditions.set(condition.id, condition);
  }

  removeCompletionCondition(id: string): void {
    this._completionConditions.delete(id);
  }

  setComplete(isComplete: boolean, reason?: string): void {
    this._completionStatus = { isComplete, reason };
  }

  getCompletionStatus(): { isComplete: boolean; reason?: string } {
    return { ...this._completionStatus };
  }

  incrementTurn(): void {
    this._turnCount++;
  }

  getTurnCount(): number {
    return this._turnCount;
  }

  addScore(points: number): void {
    this._score = Math.min(this._score + points, this._maxScore);
  }

  getScore(): number {
    return this._score;
  }

  getMaxScore(): number {
    return this._maxScore;
  }

  setMaxScore(maxScore: number): void {
    this._maxScore = maxScore;
  }

  setTreasureFound(found: boolean): void {
    this._treasureFound = found;
  }

  // Configure completion behavior
  setTurnLimit(turns: number): void {
    this.addCompletionCondition({
      id: 'turn-limit',
      description: `Turn limit reached (${turns})`,
      check: () => this._turnCount >= turns,
      priority: 2
    });
  }

  disableTurnLimit(): void {
    this.removeCompletionCondition('turn-limit');
  }

  setScoreCompletionThreshold(threshold: number): void {
    this.addCompletionCondition({
      id: 'score-threshold',
      description: `Score threshold reached (${threshold})`,
      check: () => this._score >= threshold,
      priority: 1
    });
  }

  clearAllConditions(): void {
    this._completionConditions.clear();
  }

  getAllConditions(): CompletionCondition[] {
    return Array.from(this._completionConditions.values());
  }
}
