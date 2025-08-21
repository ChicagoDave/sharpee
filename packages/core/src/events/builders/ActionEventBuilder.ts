/**
 * Builder for action-related events
 */

import { EventBuilder } from './EventBuilder';

/**
 * Data structure for action events
 */
export interface ActionEventData {
  actionId: string;
  success: boolean;
  messageId?: string;
  params?: Record<string, unknown>;
  reason?: string;
  validationErrors?: string[];
}

/**
 * Builder for creating action events
 */
export class ActionEventBuilder extends EventBuilder<ActionEventData> {
  constructor(type: string = 'action.executed') {
    super(type);
  }

  /**
   * Create a success event
   */
  static success(actionId: string, messageId?: string): ActionEventBuilder {
    return new ActionEventBuilder('action.success')
      .withData({
        actionId,
        success: true,
        messageId
      });
  }

  /**
   * Create a failure event
   */
  static failure(actionId: string, reason: string): ActionEventBuilder {
    return new ActionEventBuilder('action.failure')
      .withData({
        actionId,
        success: false,
        reason
      });
  }

  /**
   * Create a validation error event
   */
  static validationError(actionId: string, errors: string[]): ActionEventBuilder {
    return new ActionEventBuilder('action.validation_failed')
      .withData({
        actionId,
        success: false,
        validationErrors: errors
      });
  }

  /**
   * Add message parameters
   */
  withParams(params: Record<string, unknown>): this {
    if (!this.data) {
      this.data = {} as ActionEventData;
    }
    this.data.params = params;
    return this;
  }
}