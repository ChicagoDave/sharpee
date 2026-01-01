/**
 * Standard Text Service for Sharpee
 *
 * Converts semantic events into narrative text using the language provider
 * This follows the proper architecture where all text comes from:
 * 1. The language provider (via messageIds)
 * 2. The story/world (descriptions, text properties)
 */

import {
    TextService,
    TextServiceContext,
    TextOutput
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent, getUntypedEventData } from '@sharpee/core';

export class StandardTextService implements TextService {
    private context?: TextServiceContext;
    private languageProvider?: LanguageProvider;

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
        const output: string[] = [];

        // Process events in order
        for (const event of events) {
            const text = this.processEvent(event);
            if (text && text.trim()) {
                output.push(text);
            }
        }

        // Join non-empty outputs
        return output.filter(text => text.trim()).join('\n\n');
    }

    private processEvent(event: ISemanticEvent): string {
        // Skip system events (parser, validation, etc)
        if (event.type.startsWith('system.')) {
            return '';
        }

        // Handle different event types
        switch (event.type) {
            case 'if.event.room_description':
                return this.processRoomDescription(event);

            case 'if.event.list_contents':
                return this.processListContents(event);

            case 'action.success':
                return this.processActionSuccess(event);

            case 'action.failure':
                return this.processActionFailure(event);

            case 'if.event.examined':
                return this.processExamined(event);

            case 'if.event.looked':
                return this.processLooked(event);

            case 'if.event.actor_moved':
                return this.processActorMoved(event);

            case 'game.message':
                return this.processGameMessage(event);

            case 'game.over':
                return this.processGameOver(event);

            default:
                // For other events, check if they have text/message data
                return this.extractTextFromEvent(event);
        }
    }

    private processRoomDescription(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const output: string[] = [];

        // Get room entity for full description
        if (typeof data.roomId === 'string' && this.context) {
            const room = this.context.world.getEntity(data.roomId);
            if (room) {
                // Room name
                const name = room.name || (typeof data.roomName === 'string' ? data.roomName : undefined);
                if (name && data.verbose) {
                    output.push(`**${name}**`);
                }

                // Room description from identity trait
                const identity = room.get('identity');
                if (identity) {
                    const identityData = identity as unknown as Record<string, unknown>;
                    if (typeof identityData.description === 'string') {
                        output.push(identityData.description);
                    }
                }
            }
        }

        return output.join('\n\n');
    }

    private processListContents(event: ISemanticEvent): string {
        // The list contents is typically handled by the action.success event
        // that follows, which has the proper messageId
        // So we skip this event to avoid duplication
        return '';
    }

    private processActionSuccess(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);

        // Get message from language provider
        if (typeof data.messageId === 'string' && this.languageProvider) {
            // Build full message ID with action prefix
            const fullMessageId = typeof data.actionId === 'string'
                ? `${data.actionId}.${data.messageId}`
                : data.messageId;

            // Get message template
            const params = data.params as Record<string, unknown> | undefined;
            let message = this.languageProvider.getMessage(fullMessageId, params);

            // If not found, try without action prefix
            if (message === fullMessageId && data.messageId) {
                message = this.languageProvider.getMessage(data.messageId as string, params);
            }

            // If still not found, try to generate a default
            if (message === data.messageId || message === fullMessageId) {
                return this.generateDefaultSuccess(data);
            }

            return message;
        }

        // Fallback to any message in data
        const text = data.message || data.text;
        return typeof text === 'string' ? text : '';
    }

    private processActionFailure(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);

        // Get message from language provider
        if (typeof data.messageId === 'string' && this.languageProvider) {
            const fullMessageId = typeof data.actionId === 'string'
                ? `${data.actionId}.${data.messageId}`
                : data.messageId;

            const params = data.params as Record<string, unknown> | undefined;
            let message = this.languageProvider.getMessage(fullMessageId, params);

            if (message === fullMessageId && data.messageId) {
                message = this.languageProvider.getMessage(data.messageId as string, params);
            }

            if (message !== data.messageId && message !== fullMessageId) {
                return message;
            }
        }

        // Use reason or message from event
        const fallback = data.reason || data.message;
        return typeof fallback === 'string' ? fallback : "You can't do that.";
    }

    private processExamined(event: ISemanticEvent): string {
        // The actual description usually comes in the following action.success event
        // So we typically skip this event
        return '';
    }

    private processLooked(event: ISemanticEvent): string {
        // The look results come in the room_description and action.success events
        // So we skip this event
        return '';
    }

    private processActorMoved(event: ISemanticEvent): string {
        // Movement description comes in the action.success event
        // So we skip this event
        return '';
    }

    private processGameMessage(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const text = data.text || data.message;
        return typeof text === 'string' ? text : '';
    }

    private processGameOver(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const output: string[] = [];

        if (typeof data.message === 'string') {
            output.push(data.message);
        }

        if (data.won) {
            output.push('\n*** You have won! ***\n');
        } else {
            output.push('\n*** Game Over ***\n');
        }

        if (typeof data.score === 'number') {
            output.push(`Final score: ${data.score}`);
        }

        if (typeof data.turns === 'number') {
            output.push(`In ${data.turns} turns`);
        }

        return output.join('\n');
    }

    private extractTextFromEvent(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);

        // Try various text properties
        if (typeof data.text === 'string') return data.text;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.description === 'string') return data.description;

        return '';
    }

    private generateDefaultSuccess(data: Record<string, unknown>): string {
        // Generate default messages for common actions
        const params = data.params as Record<string, unknown> | undefined;
        if (params) {
            const { items, item, destination, surface, count } = params;

            // Handle common message IDs
            switch (data.messageId) {
                case 'contents_list':
                    if (items && typeof count === 'number' && count > 0) {
                        return `You can see ${items} here.`;
                    }
                    return '';

                case 'first_visit':
                    if (destination) {
                        return `\n${destination}`;
                    }
                    return '';

                case 'put_on':
                    if (item && surface) {
                        return `You put the ${item} on the ${surface}.`;
                    }
                    return 'Done.';

                case 'examined_wearable':
                case 'examined_readable':
                    if (typeof params.description === 'string') {
                        return params.description;
                    }
                    return '';

                case 'read_text':
                    if (typeof params.text === 'string') {
                        return params.text;
                    }
                    return '';
            }
        }

        return 'Done.';
    }

    reset(): void {
        this.context = undefined;
    }

    getLanguageProvider(): LanguageProvider | null {
        return this.languageProvider || null;
    }
}
