/**
 * Action test story for testing custom actions and command execution
 */

import { Story, StoryConfig } from '../../src/story';
import { WorldModel, IFEntity, IdentityTrait, ActorTrait, ContainerTrait, EntityType } from '@sharpee/world-model';
import { Action, ActionContext, ActionResult } from '@sharpee/stdlib';

/**
 * Action test story with custom actions and test helpers
 * Tests: action registration, command execution, action context
 */
export class ActionTestStory implements Story {
  config: StoryConfig = {
    id: 'action-test',
    title: 'Action Test Story',
    author: 'Test Suite',
    version: '1.0.0',
    language: 'en-us',
    description: 'A story for testing custom actions and command execution'
  };

  private _customActions: Action[] = [];
  private _actionExecutions: Map<string, { count: number; lastContext?: ActionContext }> = new Map();
  private _room: IFEntity | null = null;
  private _player: IFEntity | null = null;

  constructor() {
    // Set up default test actions
    // Note: These need to be registered in vocabulary too
    this.addTestAction('test-simple', ['test'], async (ctx) => ({
      success: true,
      message: 'Test action executed'
    }));

    this.addTestAction('test-with-args', ['test <text>'], async (ctx) => ({
      success: true,
      message: `Test with args: ${ctx.args.text || 'no args'}`
    }));

    this.addTestAction('test-fail', ['fail'], async (ctx) => ({
      success: false,
      message: 'Test action failed'
    }));
  }

  initializeWorld(world: WorldModel): void {
    // Create test room
    this._room = world.createEntity('Action Test Room', EntityType.ROOM);
    this._room.add(new IdentityTrait({
      name: 'Action Test Room',
      description: 'A room for testing actions.',
      article: 'the'
    }));
    this._room.add(new ContainerTrait({ portable: false }));

    // Create a test object
    const testObject = world.createEntity('Test Object', EntityType.OBJECT);
    testObject.add(new IdentityTrait({
      name: 'test object',
      aliases: ['object', 'thing'],
      description: 'A simple test object.',
      article: 'a'
    }));
    testObject.add(new ContainerTrait({ portable: true }));
    
    // Place object in room
    world.moveEntity(testObject.id, this._room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    this._player = world.createEntity('Player', EntityType.ACTOR);
    this._player.add(new IdentityTrait({
      name: 'yourself',
      aliases: ['self', 'me', 'myself'],
      description: 'Ready for action testing.',
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
    return this._customActions;
  }

  // Test helper methods
  addCustomAction(action: Action): void {
    this._customActions.push(action);
  }

  addTestAction(id: string, patterns: string[], execute: (ctx: ActionContext) => ActionResult | Promise<ActionResult>): void {
    const wrappedExecute = async (ctx: ActionContext): Promise<ActionResult> => {
      // Track execution
      const execData = this._actionExecutions.get(id) || { count: 0 };
      execData.count++;
      execData.lastContext = ctx;
      this._actionExecutions.set(id, execData);
      
      // Execute the action
      return execute(ctx);
    };

    this._customActions.push({
      id,
      patterns,
      execute: wrappedExecute,
      description: `Test action: ${id}`,
      examples: []
    });
  }

  getActionExecutionCount(actionId: string): number {
    return this._actionExecutions.get(actionId)?.count || 0;
  }

  getLastActionContext(actionId: string): ActionContext | undefined {
    return this._actionExecutions.get(actionId)?.lastContext;
  }

  wasActionExecuted(actionId: string): boolean {
    return this.getActionExecutionCount(actionId) > 0;
  }

  clearActionHistory(): void {
    this._actionExecutions.clear();
  }
}
