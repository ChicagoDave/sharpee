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
    // Legacy fields (backward compatibility)
    roomId?: string;
    verbose?: boolean;
    includeContents?: boolean;
    
    // New atomic event fields
    room?: {
        id: string;
        name: string;
        description?: string;
        isDark?: boolean;
        isVisited?: boolean;
        exits?: Record<string, string>;
        contents?: any[];
        traits?: Record<string, unknown>;
    };
    roomName?: string;
    roomDescription?: string;
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
        
        // Use new atomic event data if available
        if (data.room) {
            // Get room name if verbose mode
            if (data.verbose) {
                const name = this.extractProviderValue(data.room.name);
                if (name) {
                    output.push(name);
                } else if (typeof data.room.name === 'string') {
                    output.push(data.room.name);
                }
            }
            
            // Get room description
            const description = this.extractProviderValue(data.room.description);
            if (description) {
                output.push(description);
            } else if (typeof data.room.description === 'string') {
                output.push(data.room.description);
            }
            
            return output.join('\n\n');
        }
        
        // Fallback to simple fields for backward compatibility
        if (data.verbose && data.roomName) {
            const name = this.extractProviderValue(data.roomName);
            output.push(name || data.roomName);
        }
        
        if (data.roomDescription) {
            const desc = this.extractProviderValue(data.roomDescription);
            output.push(desc || data.roomDescription);
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
     * Extract value from a provider function or return the value directly
     * 
     * Provider functions allow dynamic descriptions that can change based on state.
     * If the value is a function, execute it safely to get the actual value.
     * 
     * @param value The value or provider function
     * @returns The extracted value or null if execution fails
     */
    private extractProviderValue(value: any): string | null {
        if (typeof value === 'function') {
            try {
                const result = value();
                return result ? String(result) : null;
            } catch (error) {
                console.error('Provider function error:', error);
                return null;
            }
        }
        
        return value ? String(value) : null;
    }
    
    
    private generateFallback(data: ActionSuccessData): string {
        // Generate fallback text for common actions
        // This should rarely be needed if language provider is complete
        
        if (data.params) {
            // Extract names from entity snapshots if they exist
            const extractName = (value: any): string => {
                if (typeof value === 'object' && value?.name) {
                    return this.extractProviderValue(value.name) || value.name;
                }
                return this.extractProviderValue(value) || value;
            };
            
            const { items, item, direction, destination, surface } = data.params;
            
            switch (data.messageId) {
                case 'contents_list':
                    if (items && data.params.count > 0) {
                        return `You can see ${extractName(items)} here.`;
                    }
                    return '';
                    
                case 'first_visit':
                    if (destination) {
                        return extractName(destination);
                    }
                    return '';
                    
                case 'put_on':
                    if (item && surface) {
                        return `You put the ${extractName(item)} on the ${extractName(surface)}.`;
                    }
                    return 'Done.';
                    
                case 'examined_wearable':
                case 'examined_readable':
                    if (data.params.description) {
                        return this.extractProviderValue(data.params.description) || data.params.description;
                    }
                    // Check for entity snapshot with description
                    if (data.params.target?.description) {
                        return this.extractProviderValue(data.params.target.description) || data.params.target.description;
                    }
                    return '';
                    
                case 'read_text':
                    if (data.params.text) {
                        return this.extractProviderValue(data.params.text) || data.params.text;
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