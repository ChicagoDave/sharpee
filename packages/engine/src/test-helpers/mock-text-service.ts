/**
 * Mock text service for testing
 */

import { TextService, TextServiceContext, TextOutput } from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';

export class MockTextService implements TextService {
  private context?: TextServiceContext;
  private languageProvider: LanguageProvider | null = null;

  initialize(context: TextServiceContext): void {
    this.context = context;
  }

  setLanguageProvider(provider: LanguageProvider): void {
    this.languageProvider = provider;
  }

  getLanguageProvider(): LanguageProvider | null {
    return this.languageProvider;
  }

  processTurn(): TextOutput {
    if (!this.context) {
      throw new Error('Text service not initialized');
    }

    // Get events for this turn
    const events = this.context.getCurrentTurnEvents();
    
    // Simple output generation for testing
    const messages: string[] = [];
    
    // Process events
    for (const event of events) {
      const data = event.data as Record<string, any>;
      if (event.type === 'action.error') {
        messages.push(String(data?.message || 'Error occurred'));
      } else if (event.type === 'action.success') {
        messages.push(`Action completed: ${String(data?.action || 'unknown')}`);
      } else if (event.type === 'room.described') {
        messages.push(String(data?.description || 'You are in a room.'));
      }
    }

    // Default message if no events
    if (messages.length === 0) {
      messages.push('Nothing happened.');
    }

    return messages.join('\n');
  }
}

export function createMockTextService(): TextService {
  return new MockTextService();
}