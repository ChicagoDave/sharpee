/**
 * Unit tests for report-helpers.ts
 *
 * Tests the standardized error handling helpers used across all stdlib actions
 * in the report phase of the three-phase pattern.
 */

import { describe, test, expect } from 'vitest';
import {
  handleValidationError,
  handleExecutionError,
  handleReportErrors,
  ErrorEventOptions
} from '../../../src/actions/base/report-helpers';
import { ValidationResult } from '../../../src/actions/enhanced-types';
import {
  setupBasicWorld,
  createRealTestContext,
  createCommand
} from '../../test-utils';
import { IFActions } from '../../../src/actions/constants';
import { takingAction } from '../../../src/actions/standard/taking';

describe('report-helpers', () => {
  describe('handleValidationError', () => {
    test('should return null when validationResult is undefined', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const result = handleValidationError(context, undefined);

      expect(result).toBeNull();
    });

    test('should return null when validation passed', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = { valid: true };
      const result = handleValidationError(context, validationResult);

      expect(result).toBeNull();
    });

    test('should return error event when validation failed', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'no_target',
        params: {}
      };
      const result = handleValidationError(context, validationResult);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('action.error');
      expect((result![0].data as any).error).toBe('no_target');
      expect((result![0].data as any).messageId).toBe('no_target');
    });

    test('should include validation params in error event', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'already_have',
        params: { item: 'golden key' }
      };
      const result = handleValidationError(context, validationResult);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.item).toBe('golden key');
    });

    test('should use messageId from validationResult if provided', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'generic_error',
        messageId: 'custom_message_id',
        params: {}
      };
      const result = handleValidationError(context, validationResult);

      expect(result).not.toBeNull();
      expect((result![0].data as any).messageId).toBe('custom_message_id');
    });

    test('should include target snapshot by default when directObject exists', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('golden key', 'object');
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.TAKING, { entity: item });
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'already_have',
        params: {}
      };
      const result = handleValidationError(context, validationResult);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.targetSnapshot).toBeDefined();
      // Snapshot captures id and name - id is always available
      expect((result![0].data as any).params.targetSnapshot.id).toBe(item.id);
    });

    test('should exclude target snapshot when includeTargetSnapshot is false', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('golden key', 'object');
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.TAKING, { entity: item });
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'already_have',
        params: {}
      };
      const options: ErrorEventOptions = { includeTargetSnapshot: false };
      const result = handleValidationError(context, validationResult, options);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.targetSnapshot).toBeUndefined();
    });

    test('should include indirect target snapshot by default when indirectObject exists', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('golden key', 'object');
      const container = world.createEntity('wooden box', 'object');
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.PUTTING, {
        entity: item,
        secondEntity: container,
        preposition: 'in'
      });
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'cant_put',
        params: {}
      };
      const result = handleValidationError(context, validationResult);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.indirectTargetSnapshot).toBeDefined();
      // Snapshot captures id and name - id is always available
      expect((result![0].data as any).params.indirectTargetSnapshot.id).toBe(container.id);
    });

    test('should exclude indirect target snapshot when includeIndirectSnapshot is false', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('golden key', 'object');
      const container = world.createEntity('wooden box', 'object');
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.PUTTING, {
        entity: item,
        secondEntity: container,
        preposition: 'in'
      });
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'cant_put',
        params: {}
      };
      const options: ErrorEventOptions = { includeIndirectSnapshot: false };
      const result = handleValidationError(context, validationResult, options);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.indirectTargetSnapshot).toBeUndefined();
    });
  });

  describe('handleExecutionError', () => {
    test('should return null when executionError is undefined', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const result = handleExecutionError(context, undefined);

      expect(result).toBeNull();
    });

    test('should return error event when execution error occurred', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const error = new Error('Something went wrong');
      const result = handleExecutionError(context, error);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].type).toBe('action.error');
      expect((result![0].data as any).error).toBe('execution_failed');
      expect((result![0].data as any).messageId).toBe('action_failed');
      expect((result![0].data as any).params.error).toBe('Something went wrong');
    });

    test('should include action ID in error event', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const error = new Error('Test error');
      const result = handleExecutionError(context, error);

      expect(result).not.toBeNull();
      expect((result![0].data as any).actionId).toBe(IFActions.TAKING);
    });
  });

  describe('handleReportErrors', () => {
    test('should return null when validation passed and no execution error', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = { valid: true };
      const result = handleReportErrors(context, validationResult, undefined);

      expect(result).toBeNull();
    });

    test('should return null when both validationResult and executionError are undefined', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const result = handleReportErrors(context, undefined, undefined);

      expect(result).toBeNull();
    });

    test('should return validation error when validation failed', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'no_target',
        params: {}
      };
      const result = handleReportErrors(context, validationResult, undefined);

      expect(result).not.toBeNull();
      expect((result![0].data as any).error).toBe('no_target');
    });

    test('should return validation error even when both validation failed and execution error occurred', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'validation_error',
        params: {}
      };
      const executionError = new Error('Execution error');

      const result = handleReportErrors(context, validationResult, executionError);

      // Should return validation error, not execution error
      expect(result).not.toBeNull();
      expect((result![0].data as any).error).toBe('validation_error');
      expect((result![0].data as any).messageId).toBe('validation_error');
    });

    test('should return execution error when validation passed but execution failed', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.TAKING);
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = { valid: true };
      const executionError = new Error('Execution failed');

      const result = handleReportErrors(context, validationResult, executionError);

      expect(result).not.toBeNull();
      expect((result![0].data as any).error).toBe('execution_failed');
      expect((result![0].data as any).params.error).toBe('Execution failed');
    });

    test('should pass options through to handleValidationError', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('golden key', 'object');
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.TAKING, { entity: item });
      const context = createRealTestContext(takingAction, world, command);

      const validationResult: ValidationResult = {
        valid: false,
        error: 'already_have',
        params: {}
      };
      const options: ErrorEventOptions = { includeTargetSnapshot: false };
      const result = handleReportErrors(context, validationResult, undefined, options);

      expect(result).not.toBeNull();
      expect((result![0].data as any).params.targetSnapshot).toBeUndefined();
    });
  });

  describe('Integration with three-phase pattern', () => {
    test('should integrate correctly with actual action report phase', () => {
      const { world, room } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.TAKING, { entity: item });
      const context = createRealTestContext(takingAction, world, command);

      // Simulate validation failure
      const validationResult: ValidationResult = {
        valid: false,
        error: 'fixed_in_place',
        params: { item: 'test item' }
      };

      // Call report with validation error (as the engine would)
      const events = takingAction.report(context, validationResult);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.error');
      expect((events[0].data as any).messageId).toBe('fixed_in_place');
    });

    test('should generate success events when no errors', () => {
      const { world, room, player } = setupBasicWorld();
      const item = world.createEntity('test item', 'object');
      world.moveEntity(item.id, room.id);

      const command = createCommand(IFActions.TAKING, { entity: item });
      const context = createRealTestContext(takingAction, world, command);

      // Full three-phase execution
      const validationResult = takingAction.validate(context);
      expect(validationResult.valid).toBe(true);

      takingAction.execute(context);

      const events = takingAction.report(context, validationResult);

      // Should have both domain event and success message
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events.some(e => e.type === 'if.event.taken')).toBe(true);
      expect(events.some(e => e.type === 'action.success')).toBe(true);
    });
  });
});
