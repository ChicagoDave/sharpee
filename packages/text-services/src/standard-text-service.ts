/**
 * Standard Text Service
 * 
 * Translation layer between story/engine events and client output
 * Converts semantic events into narrative text using the language provider
 * 
 * This text service queries the world model to get entity details,
 * which is the intended design - events contain IDs, not full data.
 */

import { 
    TextService, 
    TextServiceContext, 
    TextOutput 
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent } from '@sharpee/core';

// Event data type definitions
interface RoomDescriptionData {
    roomId: string;
    verbose?: boolean;
    includeContents?: boolean;
}

interface ListContentsData {
    items: string[];
    itemNames: string[];
    npcs?: string[];
    containers?: string[];
    supporters?: string[];
    context?: string;
}

interface ActionSuccessData {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
    message?: string;
    text?: string;
}

interface ActionFailureData {
    actionId?: string;
    messageId?: string;
    params?: Record<string, any>;
    reason?: string;
    message?: string;
}

interface GameMessageData {
    text?: string;
    message?: string;
}

interface GameOverData {
    message?: string;
    won?: boolean;
    score?: number;
    turns?: number;
}

// Interface for IdentityTrait data
interface IdentityData {
    name?: string;
    description?: string;
    aliases?: string[];
}

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
        
        // Process events in order, translating to narrative text
        for (const event of events) {
            const text = this.translateEvent(event);
            if (text && text.trim()) {
                output.push(text);
            }
        }
        
        // Return narrative text (client decides how to display it)
        return output.filter(text => text.trim()).join('\n\n');
    }
    
    private translateEvent(event: ISemanticEvent): string {
        // Skip system events (parser, validation, etc) - these are for debugging
        if (event.type.startsWith('system.')) {
            return '';
        }
        
        // Translate different event types to narrative text
        switch (event.type) {
            case 'if.event.room_description':
                return this.translateRoomDescription(event);
                
            case 'if.event.list_contents':
                // Usually handled by action.success, so skip
                return '';
                
            case 'action.success':
                return this.translateActionSuccess(event);
                
            case 'action.failure':
                return this.translateActionFailure(event);
                
            case 'game.message':
                return this.translateGameMessage(event);
                
            case 'game.over':
                return this.translateGameOver(event);
                
            default:
                // Skip events that don't produce narrative text
                // (they're handled by action.success/failure events)
                return '';
        }
    }
    
    private translateRoomDescription(event: ISemanticEvent): string {
        const data = event.data as unknown as RoomDescriptionData;
        const output: string[] = [];
        
        if (!data.roomId || !this.context) {
            return '';
        }
        
        // Query the room entity from world model
        const room = this.context.world.getEntity(data.roomId);
        if (!room) {
            return '';
        }
        
        // Get room name if verbose mode
        if (data.verbose) {
            const name = this.getEntityName(room);
            if (name) {
                output.push(name);
            }
        }
        
        // Get room description
        const description = this.getEntityDescription(room);
        if (description) {
            output.push(description);
        }
        
        return output.join('\n\n');
    }
    
    private translateActionSuccess(event: ISemanticEvent): string {
        const data = event.data as ActionSuccessData;
        
        // Use language provider to get narrative text for this action
        if (data.messageId && this.languageProvider) {
            // Build full message ID
            const fullMessageId = data.actionId ? 
                `${data.actionId}.${data.messageId}` : 
                data.messageId;
            
            // Get localized message with parameter substitution
            let message = this.languageProvider.getMessage(fullMessageId, data.params);
            
            // If not found with full ID, try just messageId
            if (message === fullMessageId && data.messageId) {
                message = this.languageProvider.getMessage(data.messageId, data.params);
            }
            
            // Return the message if found
            if (message !== data.messageId && message !== fullMessageId) {
                return message;
            }
        }
        
        // Fallback to data in event
        return data.message || data.text || this.generateFallback(data);
    }
    
    private translateActionFailure(event: ISemanticEvent): string {
        const data = event.data as ActionFailureData;
        
        // Use language provider for failure messages
        if (data.messageId && this.languageProvider) {
            const fullMessageId = data.actionId ? 
                `${data.actionId}.${data.messageId}` : 
                data.messageId;
            
            let message = this.languageProvider.getMessage(fullMessageId, data.params);
            
            if (message !== data.messageId && message !== fullMessageId) {
                return message;
            }
        }
        
        // Use reason or message from event
        return data.reason || data.message || "You can't do that.";
    }
    
    private translateGameMessage(event: ISemanticEvent): string {
        const data = event.data as GameMessageData;
        return data.text || data.message || '';
    }
    
    private translateGameOver(event: ISemanticEvent): string {
        const data = event.data as GameOverData;
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
        
        return output.join('\n');
    }
    
    /**
     * Get entity name from entity or its IdentityTrait
     */
    private getEntityName(entity: any): string | null {
        // Try direct name property first
        if (entity.name) {
            return entity.name;
        }
        
        // Try getting from identity trait
        const identity = entity.get?.('identity');
        if (identity) {
            const identityData = identity as IdentityData;
            if (identityData.name) {
                return identityData.name;
            }
        }
        
        return null;
    }
    
    /**
     * Get entity description from entity or its IdentityTrait
     */
    private getEntityDescription(entity: any): string | null {
        // Try direct description property first
        if (entity.description) {
            return entity.description;
        }
        
        // Try getting from identity trait (Cloak of Darkness pattern)
        const identity = entity.get?.('identity');
        if (identity) {
            const identityData = identity as IdentityData;
            if (identityData.description) {
                return identityData.description;
            }
        }
        
        return null;
    }
    
    private generateFallback(data: ActionSuccessData): string {
        // Generate fallback text for common actions
        // This should rarely be needed if language provider is complete
        
        if (data.params) {
            const { items, item, direction, destination, surface } = data.params;
            
            switch (data.messageId) {
                case 'contents_list':
                    if (items && data.params.count > 0) {
                        return `You can see ${items} here.`;
                    }
                    return '';
                    
                case 'first_visit':
                    if (destination) {
                        return destination;
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
        
        return '';
    }
    
    reset(): void {
        this.context = undefined;
    }
    
    getLanguageProvider(): LanguageProvider | null {
        return this.languageProvider || null;
    }
}