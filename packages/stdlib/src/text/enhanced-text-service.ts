// packages/stdlib/src/text/enhanced-text-service.ts

import { SemanticEvent, EventSource } from '@sharpee/core';
import { IFWorld } from '../world-model/if-world';
import { LanguageInstance } from '../languages/types';
import { TextService, TextTemplate, TextContext } from './text-service';
import { ActionFailureReason, IFEvents } from '../constants';

/**
 * Message provider interface for language packages
 */
export interface MessageProvider {
  getFailureMessage(reason: ActionFailureReason): string;
  getEventMessage(event: IFEvents, data?: Record<string, any>): string | null;
  getSystemMessage(key: string, data?: Record<string, any>): string;
  formatMessage(template: string, data: Record<string, any>): string;
}

/**
 * Enhanced text service that integrates with the message system
 */
export class EnhancedTextService extends TextService {
  private messageProvider?: MessageProvider;
  
  constructor(eventSource: EventSource) {
    super(eventSource);
    this.setupDefaultTemplates();
  }
  
  /**
   * Set the message provider (typically from a language package)
   */
  setMessageProvider(provider: MessageProvider): void {
    this.messageProvider = provider;
  }
  
  /**
   * Setup default templates that use the message system
   */
  private setupDefaultTemplates(): void {
    // Template for action failure events
    this.registerTemplate({
      id: 'action-failure',
      matches: (event) => event.type === IFEvents.ACTION_FAILED,
      render: (event, context) => {
        const reason = event.data?.reason as ActionFailureReason;
        if (!reason || !this.messageProvider) {
          return event.data?.message || "That didn't work.";
        }
        return this.messageProvider.getFailureMessage(reason);
      },
      section: 'main',
      priority: 100
    });
    
    // Template for standard IF events
    this.registerTemplate({
      id: 'standard-events',
      matches: (event) => Object.values(IFEvents).includes(event.type as IFEvents),
      render: (event, context) => {
        if (!this.messageProvider) {
          return event.data?.message || null;
        }
        return this.messageProvider.getEventMessage(event.type as IFEvents, event.data);
      },
      section: 'main',
      priority: 50
    });
    
    // Template for system messages
    this.registerTemplate({
      id: 'system-messages',
      matches: (event) => event.type.startsWith('system.'),
      render: (event, context) => {
        if (!this.messageProvider) {
          return event.data?.message || null;
        }
        const key = event.type.replace('system.', '');
        return this.messageProvider.getSystemMessage(key, event.data);
      },
      section: 'system',
      priority: 75
    });
    
    // Fallback template for events with message data
    this.registerTemplate({
      id: 'fallback-message',
      matches: (event) => !!event.data?.message,
      render: (event) => event.data.message,
      section: 'main',
      priority: 0
    });
  }
  
  /**
   * Create a failure event with the appropriate reason
   */
  static createFailureEvent(
    action: string,
    reason: ActionFailureReason,
    actor?: string,
    data?: Record<string, any>
  ): SemanticEvent {
    return {
      type: IFEvents.ACTION_FAILED,
      data: {
        action,
        reason,
        actor,
        ...data
      },
      narrate: true
    };
  }
  
  /**
   * Create a success event with the appropriate type
   */
  static createSuccessEvent(
    eventType: IFEvents,
    data: Record<string, any>,
    narrate: boolean = true
  ): SemanticEvent {
    return {
      type: eventType,
      data,
      narrate
    };
  }
}

/**
 * Default English message provider implementation
 */
export class DefaultMessageProvider implements MessageProvider {
  private failureMessages: Map<ActionFailureReason, string>;
  private eventMessages: Map<IFEvents, string>;
  private systemMessages: Map<string, string>;
  
  constructor(
    failureMessages: Record<ActionFailureReason, string>,
    eventMessages: Partial<Record<IFEvents, string>>,
    systemMessages: Record<string, string>
  ) {
    this.failureMessages = new Map(Object.entries(failureMessages) as [ActionFailureReason, string][]);
    this.eventMessages = new Map(Object.entries(eventMessages) as [IFEvents, string][]);
    this.systemMessages = new Map(Object.entries(systemMessages));
  }
  
  getFailureMessage(reason: ActionFailureReason): string {
    return this.failureMessages.get(reason) || "You can't do that.";
  }
  
  getEventMessage(event: IFEvents, data?: Record<string, any>): string | null {
    const template = this.eventMessages.get(event);
    if (!template) return null;
    
    return data ? this.formatMessage(template, data) : template;
  }
  
  getSystemMessage(key: string, data?: Record<string, any>): string {
    const template = this.systemMessages.get(key) || `[${key}]`;
    return data ? this.formatMessage(template, data) : template;
  }
  
  formatMessage(template: string, data: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match;
    });
  }
}
