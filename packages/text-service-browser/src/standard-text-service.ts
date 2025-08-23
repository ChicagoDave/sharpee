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
import { ISemanticEvent } from '@sharpee/core';

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
        const data = event.data || {};
        const output: string[] = [];
        
        // Get room entity for full description
        if (data.roomId && this.context) {
            const room = this.context.world.getEntity(data.roomId);
            if (room) {
                // Room name
                const name = room.name || data.roomName;
                if (name && data.verbose) {
                    output.push(`**${name}**`);
                }
                
                // Room description from identity trait
                const identity = room.get('identity');
                if (identity && identity.description) {
                    output.push(identity.description);
                }
            }
        }
        
        return output.join('\n\n');
    }
    
    private processListContents(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // The list contents is typically handled by the action.success event
        // that follows, which has the proper messageId
        // So we skip this event to avoid duplication
        return '';
    }
    
    private processActionSuccess(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // Get message from language provider
        if (data.messageId && this.languageProvider) {
            // Build full message ID with action prefix
            const fullMessageId = data.actionId ? 
                `${data.actionId}.${data.messageId}` : 
                data.messageId;
            
            // Get message template
            let message = this.languageProvider.getMessage(fullMessageId, data.params);
            
            // If not found, try without action prefix
            if (message === fullMessageId && data.messageId) {
                message = this.languageProvider.getMessage(data.messageId, data.params);
            }
            
            // If still not found, try to generate a default
            if (message === data.messageId || message === fullMessageId) {
                return this.generateDefaultSuccess(data);
            }
            
            return message;
        }
        
        // Fallback to any message in data
        return data.message || data.text || '';
    }
    
    private processActionFailure(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // Get message from language provider
        if (data.messageId && this.languageProvider) {
            const fullMessageId = data.actionId ? 
                `${data.actionId}.${data.messageId}` : 
                data.messageId;
            
            let message = this.languageProvider.getMessage(fullMessageId, data.params);
            
            if (message === fullMessageId && data.messageId) {
                message = this.languageProvider.getMessage(data.messageId, data.params);
            }
            
            if (message !== data.messageId && message !== fullMessageId) {
                return message;
            }
        }
        
        // Use reason or message from event
        return data.reason || data.message || "You can't do that.";
    }
    
    private processExamined(event: ISemanticEvent): string {
        const data = event.data || {};
        
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
        const data = event.data || {};
        return data.text || data.message || '';
    }
    
    private processGameOver(event: ISemanticEvent): string {
        const data = event.data || {};
        const output: string[] = [];
        
        if (data.message) {
            output.push(data.message);
        }
        
        if (data.won) {
            output.push('\n*** You have won! ***\n');
        } else {
            output.push('\n*** Game Over ***\n');
        }
        
        if (data.score !== undefined) {
            output.push(`Final score: ${data.score}`);
        }
        
        if (data.turns !== undefined) {
            output.push(`In ${data.turns} turns`);
        }
        
        return output.join('\n');
    }
    
    private extractTextFromEvent(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // Try various text properties
        if (data.text) return data.text;
        if (data.message) return data.message;
        if (data.description) return data.description;
        
        return '';
    }
    
    private generateDefaultSuccess(data: any): string {
        // Generate default messages for common actions
        if (data.params) {
            const { items, item, direction, destination, surface } = data.params;
            
            // Handle common message IDs
            switch (data.messageId) {
                case 'contents_list':
                    if (items && data.params.count > 0) {
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
                    if (data.params.description) {
                        return data.params.description;
                    }
                    return '';
                    
                case 'read_text':
                    if (data.params.text) {
                        return data.params.text;
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