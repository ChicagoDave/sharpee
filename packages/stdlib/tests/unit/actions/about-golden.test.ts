/**
 * Golden tests for the about action
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { aboutAction } from '../../../src/actions/standard/about/about';
import { IFActions } from '../../../src/actions/constants';
import { ActionContext } from '../../../src/actions/enhanced-types';
import { WorldModel, AuthorModel } from '@sharpee/world-model';
import { createRealTestContext, setupBasicWorld, createCommand } from '../../test-utils';

describe('about action', () => {
  let world: WorldModel;
  let authorModel: AuthorModel;
  let context: ActionContext;

  beforeEach(() => {
    // Setup basic world with player and room
    const setup = setupBasicWorld();
    world = setup.world;
    authorModel = new AuthorModel(world);
    
    // Create command for about action
    const command = createCommand(IFActions.ABOUT, {
      verb: 'about'
    });
    
    // Create test context
    context = createRealTestContext(aboutAction, world, command);
  });

  describe('structure', () => {
    it('should have correct ID', () => {
      expect(aboutAction.id).toBe(IFActions.ABOUT);
    });

    it('should be in meta group', () => {
      expect(aboutAction.group).toBe('meta');
    });

    it('should not require objects', () => {
      expect(aboutAction.metadata.requiresDirectObject).toBe(false);
      expect(aboutAction.metadata.requiresIndirectObject).toBe(false);
    });

    it('should implement three-phase pattern', () => {
      expect(aboutAction).toHaveProperty('validate');
      expect(aboutAction).toHaveProperty('execute');
      expect(aboutAction).toHaveProperty('report');
      expect(typeof aboutAction.validate).toBe('function');
      expect(typeof aboutAction.execute).toBe('function');
      expect(typeof aboutAction.report).toBe('function');
    });
  });

  describe('validate phase', () => {
    it('should always validate successfully', () => {
      const result = aboutAction.validate(context);
      
      expect(result).toEqual({
        valid: true
      });
    });
  });

  describe('execute phase', () => {
    it('should not throw', () => {
      expect(() => aboutAction.execute(context)).not.toThrow();
    });

    it('should not modify world state', () => {
      const stateBefore = JSON.stringify(world.getState());
      aboutAction.execute(context);
      const stateAfter = JSON.stringify(world.getState());
      
      expect(stateAfter).toEqual(stateBefore);
    });
  });

  describe('report phase', () => {
    it('should emit about event', () => {
      const events = aboutAction.report(context);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.action.about');
    });

    it('should emit event with empty data', () => {
      const events = aboutAction.report(context);
      
      expect(events[0].data).toEqual({});
    });

    it('should create well-formed semantic event', () => {
      const events = aboutAction.report(context);
      const event = events[0];
      
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('data');
      expect(event.type).toBe('if.action.about');
      expect(typeof event.data).toBe('object');
    });
  });

  describe('full action flow', () => {
    it('should validate, execute, and report successfully', () => {
      // Validate
      const validationResult = aboutAction.validate(context);
      expect(validationResult.valid).toBe(true);
      
      // Execute
      expect(() => aboutAction.execute(context)).not.toThrow();
      
      // Report
      const events = aboutAction.report(context);
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.action.about');
    });
  });
});