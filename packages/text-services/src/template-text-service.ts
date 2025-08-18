/**
 * Template-based text service implementation
 * 
 * This text service uses the language provider templates to generate
 * output for each event. It includes special handling for query events.
 */

import {
  TextService,
  TextServiceContext,
  TextOutput,
  TextOutputJSON,
  TextOutputChanneled
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent } from '@sharpee/core';

export class TemplateTextService implements TextService {
  private context?: TextServiceContext;
  private languageProvider?: LanguageProvider | null;
  private outputFormat: 'text' | 'json' | 'channeled' = 'text';
  
  initialize(context: TextServiceContext): void {
    this.context = context;
  }
  
  processTurn(): TextOutput {
    if (!this.context) {
      throw new Error('Text service not initialized');
    }
    
    const events = this.context.getCurrentTurnEvents();
    const messages: string[] = [];
    
    for (const event of events) {
      const message = this.processEvent(event);
      if (message) {
        messages.push(message);
      }
    }
    
    const output = messages.join('\n\n');
    
    switch (this.outputFormat) {
      case 'json':
        return this.formatAsJSON(output);
      case 'channeled':
        return this.formatAsChanneled(messages);
      default:
        return output;
    }
  }
  
  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
  }
  
  getLanguageProvider(): LanguageProvider | null {
    return this.languageProvider || null;
  }
  
  setOutputFormat(format: 'text' | 'json' | 'channeled'): void {
    this.outputFormat = format;
  }
  
  private processEvent(event: ISemanticEvent): string | null {
    // Type guard for query data
    interface QueryData {
      query?: {
        messageId: string;
        messageParams?: Record<string, any>;
        options?: string[];
      };
      messageId?: string;
      message?: string;
      hint?: string;
    }
    
    const data = event.data as QueryData | undefined;
    // Special handling for query events
    if (event.type === 'query.pending') {
      return this.processQueryEvent(event);
    }
    
    if (event.type === 'query.invalid') {
      return this.processQueryInvalidEvent(event);
    }
    
    if (event.type === 'query.response') {
      // Don't show anything for query responses
      return null;
    }
    
    // Handle message events
    if (event.type.startsWith('message.')) {
      return this.processMessageEvent(event);
    }
    
    // Handle platform events
    if (event.type.startsWith('platform.')) {
      return this.processPlatformEvent(event);
    }
    
    // Handle other specific event types
    if (event.type === 'quit.confirmed') {
      return this.processQuitConfirmedEvent(event);
    }
    
    if (event.type === 'quit.cancelled') {
      return this.processMessageEvent({
        ...event,
        type: 'message.success',
        data: { messageId: 'quit_cancelled' }
      });
    }
    
    // Default: no output for this event
    return null;
  }
  
  private processQueryEvent(event: ISemanticEvent): string | null {
    const data = event.data as any;
    const query = data?.query || event.payload?.query;
    if (!query) return null;
    
    if (!this.languageProvider) {
      // Fallback without language provider
      let prompt = query.messageId || 'Please respond:';
      
      if (query.options && query.options.length > 0) {
        const options = query.options.map((opt: string, idx: number) => 
          `${idx + 1}. ${opt}`
        ).join('\n');
        return `${prompt}\n\n${options}`;
      }
      
      return prompt;
    }
    
    // Get the message from language provider
    const message = this.languageProvider.getMessage(query.messageId, query.messageParams || {});
    if (!message) return query.messageId;
    
    // The message is already formatted
    let text = message;
    
    // Add options if multiple choice
    if (query.options && query.options.length > 0) {
      const optionTexts = query.options.map((opt: string, idx: number) => {
        // Try to get localized option text
        const optionText = this.languageProvider!.getMessage(`option.${opt}`) || opt;
        return `${idx + 1}. ${optionText}`;
      }).join('\n');
      
      text = `${text}\n\n${optionTexts}`;
    }
    
    return text;
  }
  
  private processQueryInvalidEvent(event: ISemanticEvent): string | null {
    const data = event.data as any;
    const message = data?.message || 'Invalid response.';
    const hint = data?.hint;
    
    return hint ? `${message} ${hint}` : message;
  }
  
  private processMessageEvent(event: ISemanticEvent): string | null {
    const data = event.data as any;
    const messageId = data?.messageId || event.payload?.messageId;
    if (!messageId || !this.languageProvider) return null;
    
    const params = event.data?.params || event.payload?.params || {};
    const message = this.languageProvider.getMessage(messageId, params);
    return message || null;
  }
  
  private processQuitConfirmedEvent(event: ISemanticEvent): string | null {
    const data = event.data as any;
    const messageId = data?.messageId || 'quit_confirmed';
    
    if (!this.languageProvider) {
      return 'Thanks for playing!';
    }
    
    const params = {
      finalScore: data?.finalScore || 0,
      maxScore: data?.maxScore || 0,
      moves: data?.moves || 0
    };
    
    const message = this.languageProvider.getMessage(messageId, params);
    return message || 'Thanks for playing!';
  }
  
  private processPlatformEvent(event: ISemanticEvent): string | null {
    // Map platform event types to message IDs
    const platformEventMessages: Record<string, string> = {
      'platform.save_requested': 'saving_game',
      'platform.save_completed': 'game_saved',
      'platform.save_failed': 'save_failed',
      'platform.restore_requested': 'restoring_game',
      'platform.restore_completed': 'game_restored',
      'platform.restore_failed': 'restore_failed',
      'platform.quit_requested': 'quitting_game',
      'platform.quit_confirmed': 'quit_confirmed',
      'platform.quit_cancelled': 'quit_cancelled',
      'platform.restart_requested': 'restarting_game',
      'platform.restart_completed': 'game_restarted',
      'platform.restart_cancelled': 'restart_cancelled'
    };
    
    const messageId = platformEventMessages[event.type];
    if (!messageId) return null;
    
    // Don't show messages for request events - only completion events
    if (event.type.endsWith('_requested')) {
      return null;
    }
    
    if (!this.languageProvider) {
      // Fallback messages
      const fallbacks: Record<string, string> = {
        'platform.save_completed': 'Game saved.',
        'platform.save_failed': 'Save failed.',
        'platform.restore_completed': 'Game restored.',
        'platform.restore_failed': 'Restore failed.',
        'platform.quit_confirmed': 'Thanks for playing!',
        'platform.quit_cancelled': 'Quit cancelled.',
        'platform.restart_completed': 'Game restarted.',
        'platform.restart_cancelled': 'Restart cancelled.'
      };
      return fallbacks[event.type] || null;
    }
    
    // Extract parameters from the event
    const params: Record<string, any> = {};
    
    // Add specific parameters based on event type
    if (event.type === 'platform.save_completed' || event.type === 'platform.save_failed') {
      const context = event.payload?.context as any;
      if (context) {
        params.saveName = context.saveName || 'default';
        params.timestamp = new Date(context.timestamp).toLocaleString();
      }
    }
    
    if (event.type === 'platform.save_failed' || event.type === 'platform.restore_failed') {
      params.error = event.payload?.error || 'Unknown error';
    }
    
    const message = this.languageProvider.getMessage(messageId, params);
    return message || null;
  }
  
  private formatMessage(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }
  
  private formatAsJSON(mainText: string): TextOutputJSON {
    if (!this.context) {
      return { type: 'json', main: mainText };
    }
    
    const player = this.context.getPlayer();
    const location = this.context.getLocation(player.id);
    
    return {
      type: 'json',
      main: mainText,
      metadata: {
        turn: this.context.currentTurn,
        location: location || undefined
      }
    };
  }
  
  private formatAsChanneled(messages: string[]): TextOutputChanneled {
    const channels = new Map<string, string>();
    
    // For now, put everything in main channel
    channels.set('main', messages.join('\n\n'));
    
    // Could separate by event type in the future
    
    return {
      type: 'channeled',
      channels
    };
  }
}