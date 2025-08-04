/**
 * Test container visibility and knowledge using clear patterns
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, AuthorModel, IFEntity, TraitType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../../src/scope/scope-resolver';
import { CommandValidator } from '../../src/validation/command-validator';
import { StandardActionRegistry } from '../../src/actions/registry';
import { parseCommand } from '../test-utils';
import { takingAction } from '../../src/actions/standard/taking';
import { examiningAction } from '../../src/actions/standard/examining';
import { openingAction } from '../../src/actions/standard/opening';

describe('Container visibility and knowledge', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let room1: IFEntity;
  let room2: IFEntity;
  let box: IFEntity;
  let ball: IFEntity;
  let actor: IFEntity;
  let validator: CommandValidator;
  let registry: StandardActionRegistry;

  beforeEach(() => {
    // 1. Create world
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);

    // 2. Create and connect rooms
    room1 = author.createEntity('Kitchen', 'location');
    room1.add({ type: TraitType.ROOM });
    
    room2 = author.createEntity('Living Room', 'location');
    room2.add({ type: TraitType.ROOM });
    
    // Connect without door
    room1.add({ 
      type: TraitType.EXIT,
      direction: 'north',
      destination: room2.id
    });
    room2.add({
      type: TraitType.EXIT,
      direction: 'south', 
      destination: room1.id
    });

    // 3. Create closed box
    box = author.createEntity('box', 'container');
    box.add({
      type: TraitType.IDENTITY,
      name: 'box',
      adjectives: ['wooden']
    });
    box.add({ type: TraitType.CONTAINER });
    box.add({
      type: TraitType.OPENABLE,
      isOpen: false
    });
    author.moveEntity(box.id, room1.id);

    // 4. Create ball in box
    ball = author.createEntity('ball', 'object');
    ball.add({
      type: TraitType.IDENTITY,
      name: 'ball',
      adjectives: ['red']
    });
    author.moveEntity(ball.id, box.id);

    // 5. Create actor in room2
    actor = author.createEntity('Bob', 'actor');
    actor.add({ type: TraitType.ACTOR });
    author.moveEntity(actor.id, room2.id);
    world.setPlayer(actor.id);

    // 6. Set up action registry and validator
    registry = new StandardActionRegistry();
    const mockLanguageProvider = {
      languageCode: 'en-US',
      getMessage: (id: string) => id,
      hasMessage: (id: string) => true,
      getActionPatterns: (actionId: string) => {
        const patterns: Record<string, string[]> = {
          'if.action.taking': ['take', 'get', 'grab', 'pick up'],
          'if.action.examining': ['examine', 'x', 'look at'],
          'if.action.opening': ['open']
        };
        return patterns[actionId];
      },
      getActionHelp: () => undefined,
      getSupportedActions: () => ['if.action.taking', 'if.action.examining', 'if.action.opening']
    };
    
    registry.setLanguageProvider(mockLanguageProvider as any);
    registry.register(takingAction);
    registry.register(examiningAction);
    registry.register(openingAction);
    
    validator = new CommandValidator(world, registry);
  });

  test('actor cannot see ball in closed box', () => {
    // Move actor to room1
    author.moveEntity(actor.id, room1.id);

    // Actor should see box but not ball
    const scopeResolver = new StandardScopeResolver(world);
    expect(scopeResolver.canSee(actor, box)).toBe(true);
    expect(scopeResolver.canSee(actor, ball)).toBe(false);

    // Try to take ball - should fail
    const parsed = parseCommand('take red ball', world);
    if (!parsed) throw new Error('Failed to parse command');
    
    const validated = validator.validate(parsed);
    expect(validated.success).toBe(false);
    if (!validated.success) {
      expect(validated.error.code).toBe('ENTITY_NOT_FOUND');
    }
  });

  test('actor can examine box when in same room', () => {
    // Move actor to room1
    author.moveEntity(actor.id, room1.id);

    // Try to examine box - should succeed
    const parsed = parseCommand('examine wooden box', world);
    if (!parsed) throw new Error('Failed to parse command');
    
    const validated = validator.validate(parsed);
    expect(validated.success).toBe(true);
  });

  test('actor cannot take ball that they do not know about', () => {
    // Move actor to room1
    author.moveEntity(actor.id, room1.id);

    // Even trying "take ball" should fail since it's hidden
    const parsed = parseCommand('take ball', world);
    if (!parsed) throw new Error('Failed to parse command');
    
    const validated = validator.validate(parsed);
    expect(validated.success).toBe(false);
    if (!validated.success) {
      expect(validated.error.code).toBe('ENTITY_NOT_FOUND');
      expect(validated.error.message).toContain("You can't see any ball here");
    }
  });

  test('actor can take ball after opening box', () => {
    // Move actor to room1
    author.moveEntity(actor.id, room1.id);

    // Open the box
    const openable = box.get(TraitType.OPENABLE) as any;
    openable.isOpen = true;

    // Now actor should see ball
    const scopeResolver = new StandardScopeResolver(world);
    expect(scopeResolver.canSee(actor, ball)).toBe(true);

    // Try to take ball - should succeed
    const parsed = parseCommand('take red ball', world);
    if (!parsed) throw new Error('Failed to parse command');
    
    const validated = validator.validate(parsed);
    expect(validated.success).toBe(true);
    if (validated.success) {
      expect(validated.value.directObject?.entity.id).toBe(ball.id);
    }
  });

  test('full scenario: move, examine, try take, open, take', () => {
    // Start in room2
    expect(world.getLocation(actor.id)).toBe(room2.id);

    // Move to room1
    author.moveEntity(actor.id, room1.id);
    expect(world.getLocation(actor.id)).toBe(room1.id);

    // 1. Examine the box - should work
    let parsed = parseCommand('examine box', world);
    let validated = validator.validate(parsed!);
    expect(validated.success).toBe(true);

    // 2. Try to take the ball - should fail (can't see it)
    parsed = parseCommand('take red ball', world);
    validated = validator.validate(parsed!);
    expect(validated.success).toBe(false);

    // 3. Open the box
    const openable = box.get(TraitType.OPENABLE) as any;
    openable.isOpen = true;

    // 4. Take the ball - should now work
    parsed = parseCommand('take red ball', world);
    validated = validator.validate(parsed!);
    expect(validated.success).toBe(true);
  });
});