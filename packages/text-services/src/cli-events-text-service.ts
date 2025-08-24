/**
 * CLI Events Text Service
 * 
 * A debugging-oriented text service that outputs raw events
 * Useful for testing and understanding the event flow
 */

import { 
  TextService, 
  TextServiceContext, 
  TextOutput 
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent } from '@sharpee/core';

export interface CLIEventsConfig {
  showTurnHeader?: boolean;
  showLocation?: boolean;
  showTimestamp?: boolean;
  showEventData?: boolean;
  indentEvents?: boolean;
  showPlatformEvents?: boolean;
}

export class CLIEventsTextService implements TextService {
  private context?: TextServiceContext;
  private languageProvider?: LanguageProvider;
  private config: CLIEventsConfig;

  constructor(config?: CLIEventsConfig) {
    this.config = {
      showTurnHeader: true,
      showLocation: true,
      showTimestamp: false,
      showEventData: true,
      indentEvents: true,
      showPlatformEvents: false,
      ...config
    };
  }

  initialize(context: TextServiceContext): void {
    this.context = context;
  }

  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
  }

  processTurn(): TextOutput {
    if (!this.context) {
      return '[ERROR] No context initialized';
    }

    const events = this.context.getCurrentTurnEvents();
    const lines: string[] = [];

    // Turn header
    if (this.config.showTurnHeader) {
      lines.push(`\n=== Turn ${this.context.currentTurn} ===`);
    }

    // Check if debug events are enabled
    const world = this.context.world;
    const debugData = world.getCapability('debug') || {};
    const showDebug = debugData.debugValidationEvents || debugData.debugSystemEvents || debugData.debugParserEvents;

    // Separate events into system and game events
    const systemEvents = events.filter(e => e.type.startsWith('system.'));
    const gameEvents = events.filter(e => !e.type.startsWith('system.'));

    // Show system events if debug is enabled
    if (showDebug && systemEvents.length > 0) {
      lines.push('\nSystem Events:');
      for (const event of systemEvents) {
        const line = this.formatEvent(event);
        if (line) {
          lines.push(this.config.indentEvents ? `  ${line}` : line);
        }
      }
    }

    // Process game events
    lines.push('\nGame Events:');
    for (const event of gameEvents) {
      const line = this.formatEvent(event);
      if (line) {
        lines.push(this.config.indentEvents ? `  ${line}` : line);
      }
    }
    if (gameEvents.length === 0) {
      lines.push('  (No game events)');
    }

    // Process platform events if requested
    if (this.config.showPlatformEvents && this.context.getPlatformEvents) {
      const platformEvents = this.context.getPlatformEvents();
      lines.push('\nPlatform Events:');
      for (const event of platformEvents) {
        const line = this.formatPlatformEvent(event);
        if (line) {
          lines.push(this.config.indentEvents ? `  ${line}` : line);
        }
      }
      if (platformEvents.length === 0) {
        lines.push('  (No platform events)');
      }
    }

    // Add location info
    if (this.config.showLocation) {
      const player = this.context.getPlayer();
      if (player) {
        const location = this.context.getLocation(player.id);
        if (location) {
          const room = this.context.world.getEntity(location);
          if (room) {
            lines.push(`\nLocation: ${room.name} [${room.id}]`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  private formatEvent(event: ISemanticEvent): string {
    const parts: string[] = [];
    
    // Event type
    parts.push(`[${event.type.toUpperCase()}]`);

    // Timestamp if requested
    if (this.config.showTimestamp && event.timestamp) {
      parts.push(`(${new Date(event.timestamp).toISOString()})`);
    }

    // Format entities
    if (event.entities && Object.keys(event.entities).length > 0) {
      const entityPairs = Object.entries(event.entities)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`);
      
      if (entityPairs.length > 0) {
        parts.push(`{${entityPairs.join(', ')}}`);
      }
    }

    // Add data if present and requested
    if (this.config.showEventData && event.data) {
      if (typeof event.data === 'object') {
        // Special handling for action.error events to show translated message
        if (event.type === 'action.error' && this.languageProvider) {
          const data = event.data as any;
          const messageId = data.messageId || data.error || data.reason;
          const params = data.params || {};
          
          // Try to get translated message from language provider
          let message = '';
          if (messageId) {
            // Try with action-specific message ID first
            if (data.actionId) {
              message = this.languageProvider.getMessage(`${data.actionId}.${messageId}`, params);
            }
            
            // If that didn't work or returned the ID itself, try the generic message
            if (!message || message === `${data.actionId}.${messageId}`) {
              message = this.languageProvider.getMessage(messageId, params);
            }
            
            // If we got a meaningful message, show it
            if (message && message !== messageId) {
              parts.push(`"${message}"`);
            } else {
              // Fall back to showing the raw data
              parts.push(JSON.stringify(event.data));
            }
          } else {
            parts.push(JSON.stringify(event.data));
          }
        } else {
          const data = event.data as any;
          if (data.message) {
            parts.push(`"${data.message}"`);
          } else if (data.text) {
            parts.push(`"${data.text}"`);
          } else {
            parts.push(JSON.stringify(event.data));
          }
        }
      } else {
        parts.push(String(event.data));
      }
    }

    return parts.join(' ');
  }

  private formatPlatformEvent(event: ISemanticEvent): string {
    const parts: string[] = [];
    
    // Event type (remove platform prefix for readability)
    const type = event.type.replace('platform.', '');
    parts.push(`[${type}]`);

    // Timestamp if requested
    if (this.config.showTimestamp && event.timestamp) {
      const time = new Date(event.timestamp);
      parts.push(`(${time.toTimeString().split(' ')[0]})`);
    }

    // Format data
    if (this.config.showEventData && (event as any).payload) {
      const payload = (event as any).payload;
      
      // Special formatting for common platform event types
      if (type.startsWith('parser.')) {
        if (payload.input) {
          parts.push(`input="${payload.input}"`);
        }
        if (payload.tokens && Array.isArray(payload.tokens)) {
          parts.push(`tokens=${payload.tokens.length}`);
        }
        if (payload.candidateCount !== undefined) {
          parts.push(`candidates=${payload.candidateCount}`);
        }
        if (payload.action) {
          parts.push(`action=${payload.action}`);
        }
        if (payload.pattern) {
          parts.push(`pattern=${payload.pattern}`);
        }
        if (payload.reason) {
          parts.push(`reason=${payload.reason}`);
        }
      } else if (type.startsWith('world.')) {
        if (payload.entityId) {
          parts.push(`entity=${payload.entityId}`);
        }
        if (payload.fromLocation) {
          parts.push(`from=${payload.fromLocation}`);
        }
        if (payload.toLocation) {
          parts.push(`to=${payload.toLocation}`);
        }
      }
      
      // Show any additional data not already displayed
      const displayed = ['subsystem', 'input', 'tokens', 'candidateCount', 'action', 'pattern', 'reason', 'entityId', 'fromLocation', 'toLocation'];
      const extra = Object.entries(payload)
        .filter(([key]) => !displayed.includes(key))
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}=${JSON.stringify(value)}`;
          }
          return `${key}=${value}`;
        });
      
      if (extra.length > 0) {
        parts.push(`{${extra.join(', ')}}`);
      }
    }

    return parts.join(' ');
  }

  reset(): void {
    this.context = undefined;
  }

  getLanguageProvider(): LanguageProvider | null {
    return this.languageProvider || null;
  }
}