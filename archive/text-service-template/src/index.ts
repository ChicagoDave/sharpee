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
import {
  ISemanticEvent,
  isEventType,
  getEventData,
  getEventDataWithDefaults,
  QueryPendingData,
  QueryInvalidData,
  QuitConfirmedData,
  MessageData
} from '@sharpee/core';

type SemanticEvent = ISemanticEvent;

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

  private processEvent(event: SemanticEvent): string | null {
    // Special handling for query events
    if (isEventType(event, 'query.pending')) {
      return this.processQueryEvent(event);
    }

    if (isEventType(event, 'query.invalid')) {
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
    if (isEventType(event, 'quit.confirmed')) {
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

  private processQueryEvent(
    event: SemanticEvent & { type: 'query.pending'; data: QueryPendingData }
  ): string | null {
    const query = event.data.query;
    if (!query) return null;

    if (!this.languageProvider) {
      // Fallback without language provider
      let prompt = query.messageId || 'Please respond:';

      if (query.options && query.options.length > 0) {
        const options = query.options
          .map((opt: string, idx: number) => `${idx + 1}. ${opt}`)
          .join('\n');
        return `${prompt}\n\n${options}`;
      }

      return prompt;
    }

    // Get the message from language provider
    const message = this.languageProvider.getMessage(query.messageId);
    if (!message) return query.messageId;

    // Format the message
    let text = this.formatMessage(message, query.messageParams || {});

    // Add options if multiple choice
    if (query.options && query.options.length > 0) {
      const optionTexts = query.options
        .map((opt: string, idx: number) => {
          // Try to get localized option text
          const optionMessage = this.languageProvider!.getMessage(`option.${opt}`);
          const optionText = optionMessage ? optionMessage : opt;
          return `${idx + 1}. ${optionText}`;
        })
        .join('\n');

      text = `${text}\n\n${optionTexts}`;
    }

    return text;
  }

  private processQueryInvalidEvent(
    event: SemanticEvent & { type: 'query.invalid'; data: QueryInvalidData }
  ): string | null {
    const { message, hint } = getEventDataWithDefaults(event, 'query.invalid', {
      message: 'Invalid response.',
      hint: undefined
    });

    return hint ? `${message} ${hint}` : (message ?? 'Invalid response.');
  }

  private processMessageEvent(event: SemanticEvent): string | null {
    // Message events have messageId in data
    const data = getEventData(event, 'message.success') ||
                 getEventData(event, 'message.failure') ||
                 getEventData(event, 'message.info') ||
                 getEventData(event, 'message.warning');

    const messageId = data?.messageId;
    if (!messageId || !this.languageProvider) return null;

    const message = this.languageProvider.getMessage(messageId);
    if (!message) return null;

    const params = data?.params || {};
    return this.formatMessage(message, params as Record<string, unknown>);
  }

  private processQuitConfirmedEvent(
    event: SemanticEvent & { type: 'quit.confirmed'; data: QuitConfirmedData }
  ): string | null {
    const { messageId, finalScore, maxScore, moves } = getEventDataWithDefaults(
      event,
      'quit.confirmed',
      {
        messageId: 'quit_confirmed',
        finalScore: 0,
        maxScore: 0,
        moves: 0
      }
    );

    if (!this.languageProvider) {
      return 'Thanks for playing!';
    }

    const message = this.languageProvider.getMessage(messageId ?? 'quit_confirmed');
    if (!message) return 'Thanks for playing!';

    const params = {
      finalScore: finalScore ?? 0,
      maxScore: maxScore ?? 0,
      moves: moves ?? 0
    };

    return this.formatMessage(message, params);
  }

  private processPlatformEvent(event: SemanticEvent): string | null {
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

    const message = this.languageProvider.getMessage(messageId);
    if (!message) return null;

    // Extract parameters from the event using typed helpers
    const params: Record<string, unknown> = {};

    // Add specific parameters based on event type
    const saveData = getEventData(event, 'platform.save_completed');
    if (saveData) {
      params.slotName = saveData.slotName || 'default';
      if (saveData.timestamp) {
        params.timestamp = new Date(saveData.timestamp).toLocaleString();
      }
    }

    const saveFailedData = getEventData(event, 'platform.save_failed');
    if (saveFailedData) {
      params.error = saveFailedData.error || 'Unknown error';
    }

    const restoreFailedData = getEventData(event, 'platform.restore_failed');
    if (restoreFailedData) {
      params.error = restoreFailedData.error || 'Unknown error';
    }

    return this.formatMessage(message, params);
  }

  private formatMessage(
    template: string,
    params: Record<string, unknown>
  ): string {
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

/**
 * Create a template text service
 */
export function createTemplateTextService(): TextService {
  return new TemplateTextService();
}
