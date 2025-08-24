/**
 * Narrative Text Service for Sharpee
 * 
 * Converts semantic events into narrative prose for the player
 * This is the core service that transforms game events into readable text
 */

import { 
    TextService, 
    TextServiceContext, 
    TextOutput 
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent } from '@sharpee/core';

export class NarrativeTextService implements TextService {
    private context?: TextServiceContext;
    private languageProvider?: LanguageProvider;
    private currentLocation: string = '';
    private lastCommand: string = '';
    
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
        
        // Group events by type for better narrative flow
        const groupedEvents = this.groupEventsByNarrativeOrder(events);
        
        // Process each group in narrative order
        for (const group of groupedEvents) {
            const text = this.processEventGroup(group);
            if (text) {
                output.push(text);
            }
        }
        
        // Return formatted narrative
        return output.filter(text => text.trim()).join('\n\n');
    }
    
    private groupEventsByNarrativeOrder(events: ISemanticEvent[]): ISemanticEvent[][] {
        // Define narrative order for event types
        const narrativeOrder = [
            'command.echo',           // Show what player typed
            'action.attempt',         // Show what player is trying
            'action.failure',         // Show why it failed (if it did)
            'action.success',         // Show success message
            'movement',               // Show movement
            'room.description',       // Show new room description
            'room.contents',          // Show what's in the room
            'object.description',     // Show object descriptions
            'inventory.list',         // Show inventory
            'game.message',           // Show game messages
            'game.score',            // Score changes
            'game.over'              // Game ending
        ];
        
        const grouped: Map<string, ISemanticEvent[]> = new Map();
        
        // Group events by their narrative category
        for (const event of events) {
            const category = this.categorizeEvent(event);
            if (!grouped.has(category)) {
                grouped.set(category, []);
            }
            grouped.get(category)!.push(event);
        }
        
        // Return in narrative order
        const result: ISemanticEvent[][] = [];
        for (const category of narrativeOrder) {
            if (grouped.has(category)) {
                result.push(grouped.get(category)!);
            }
        }
        
        // Add any remaining uncategorized events
        for (const [category, events] of grouped.entries()) {
            if (!narrativeOrder.includes(category)) {
                result.push(events);
            }
        }
        
        return result;
    }
    
    private categorizeEvent(event: ISemanticEvent): string {
        // Map event types to narrative categories
        if (event.type.startsWith('action.')) {
            return event.type;
        }
        if (event.type === 'room.entered' || event.type === 'player.moved') {
            return 'movement';
        }
        if (event.type === 'room.description' || event.type === 'location.description') {
            return 'room.description';
        }
        if (event.type === 'object.examined' || event.type === 'entity.description') {
            return 'object.description';
        }
        if (event.type.startsWith('game.')) {
            return event.type;
        }
        if (event.type === 'inventory.listed') {
            return 'inventory.list';
        }
        return event.type;
    }
    
    private processEventGroup(events: ISemanticEvent[]): string {
        if (events.length === 0) return '';
        
        // Process based on the type of the first event (they're all the same category)
        const category = this.categorizeEvent(events[0]);
        
        switch (category) {
            case 'action.failure':
                return this.processActionFailure(events[0]);
                
            case 'action.success':
                return this.processActionSuccess(events[0]);
                
            case 'movement':
                return this.processMovement(events[0]);
                
            case 'room.description':
                return this.processRoomDescription(events);
                
            case 'object.description':
                return this.processObjectDescription(events[0]);
                
            case 'inventory.list':
                return this.processInventory(events[0]);
                
            case 'game.message':
                return this.processGameMessage(events[0]);
                
            case 'game.score':
                return this.processScoreChange(events[0]);
                
            case 'game.over':
                return this.processGameOver(events[0]);
                
            default:
                // For unhandled events, try to extract any text data
                return this.processGenericEvent(events[0]);
        }
    }
    
    private processActionFailure(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // Common failure messages
        if (data.reason) {
            return data.reason;
        }
        
        if (data.message) {
            return data.message;
        }
        
        // Generate message based on action type
        const action = event.entities?.action || data.action;
        if (action) {
            switch (action) {
                case 'take':
                    return "You can't take that.";
                case 'drop':
                    return "You can't drop that here.";
                case 'go':
                    return "You can't go that way.";
                case 'open':
                    return "You can't open that.";
                case 'close':
                    return "You can't close that.";
                case 'examine':
                    return "You don't see that here.";
                default:
                    return `You can't ${action} that.`;
            }
        }
        
        return "That doesn't work.";
    }
    
    private processActionSuccess(event: ISemanticEvent): string {
        const data = event.data || {};
        
        if (data.message) {
            return data.message;
        }
        
        // Generate message based on action
        const action = event.entities?.action || data.action;
        const object = event.entities?.object || data.object;
        
        if (action && object) {
            const objectName = this.getEntityName(object);
            switch (action) {
                case 'take':
                    return `Taken.`;
                case 'drop':
                    return `Dropped.`;
                case 'open':
                    return `You open the ${objectName}.`;
                case 'close':
                    return `You close the ${objectName}.`;
                case 'put':
                    const target = event.entities?.target || data.target;
                    if (target) {
                        return `You put the ${objectName} ${this.formatPreposition(target)}.`;
                    }
                    return `Done.`;
                default:
                    return `You ${action} the ${objectName}.`;
            }
        }
        
        return "Done.";
    }
    
    private processMovement(event: ISemanticEvent): string {
        const direction = event.entities?.direction || event.data?.direction;
        if (direction) {
            // Movement is usually followed by room description, so keep it brief
            return '';  // The room description will handle the output
        }
        return '';
    }
    
    private processRoomDescription(events: ISemanticEvent[]): string {
        const output: string[] = [];
        
        for (const event of events) {
            const data = event.data || {};
            
            // Room name (for first visit or look command)
            if (data.name) {
                output.push(`**${data.name}**`);
                this.currentLocation = data.name;
            }
            
            // Room description
            if (data.description) {
                output.push(data.description);
            }
            
            // List items in room
            if (data.contents && Array.isArray(data.contents)) {
                const items = data.contents.filter(item => item !== 'player');
                if (items.length > 0) {
                    const itemDescriptions = items.map(item => {
                        if (typeof item === 'string') {
                            return this.getEntityName(item);
                        }
                        return item.name || 'something';
                    });
                    
                    if (itemDescriptions.length === 1) {
                        output.push(`You can see ${itemDescriptions[0]} here.`);
                    } else {
                        const lastItem = itemDescriptions.pop();
                        output.push(`You can see ${itemDescriptions.join(', ')} and ${lastItem} here.`);
                    }
                }
            }
            
            // List exits
            if (data.exits && Array.isArray(data.exits)) {
                const exitList = this.formatExits(data.exits);
                if (exitList) {
                    output.push(exitList);
                }
            }
        }
        
        return output.join('\n\n');
    }
    
    private processObjectDescription(event: ISemanticEvent): string {
        const data = event.data || {};
        
        if (data.description) {
            return data.description;
        }
        
        if (data.message) {
            return data.message;
        }
        
        const object = event.entities?.object || data.object;
        if (object) {
            return `You see nothing special about the ${this.getEntityName(object)}.`;
        }
        
        return "You see nothing special.";
    }
    
    private processInventory(event: ISemanticEvent): string {
        const data = event.data || {};
        const items = data.items || data.inventory || [];
        
        if (items.length === 0) {
            return "You are carrying nothing.";
        }
        
        const itemNames = items.map((item: any) => {
            if (typeof item === 'string') {
                return this.getEntityName(item);
            }
            return item.name || 'something';
        });
        
        if (itemNames.length === 1) {
            return `You are carrying ${itemNames[0]}.`;
        }
        
        return `You are carrying:\n  ${itemNames.join('\n  ')}`;
    }
    
    private processGameMessage(event: ISemanticEvent): string {
        const data = event.data || {};
        return data.text || data.message || '';
    }
    
    private processScoreChange(event: ISemanticEvent): string {
        const data = event.data || {};
        const points = data.points || data.change || 0;
        
        if (points > 0) {
            return `[Your score has gone up by ${points} points.]`;
        } else if (points < 0) {
            return `[Your score has gone down by ${Math.abs(points)} points.]`;
        }
        
        return '';
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
    
    private processGenericEvent(event: ISemanticEvent): string {
        const data = event.data || {};
        
        // Try to extract any text from the event
        if (data.text) return data.text;
        if (data.message) return data.message;
        if (data.description) return data.description;
        
        // Don't output anything for unrecognized events
        return '';
    }
    
    private getEntityName(entityId: string): string {
        if (!this.context) return entityId;
        
        const entity = this.context.world.getEntity(entityId);
        if (entity) {
            return entity.name || entityId;
        }
        
        // Clean up entity ID for display
        return entityId.replace(/_/g, ' ').replace(/-/g, ' ');
    }
    
    private formatExits(exits: any[]): string {
        if (exits.length === 0) return '';
        
        const exitNames = exits.map(exit => {
            if (typeof exit === 'string') {
                return exit;
            }
            return exit.direction || exit.name || 'somewhere';
        });
        
        if (exitNames.length === 1) {
            return `Exit: ${exitNames[0]}`;
        }
        
        const lastExit = exitNames.pop();
        return `Exits: ${exitNames.join(', ')} and ${lastExit}`;
    }
    
    private formatPreposition(target: string): string {
        // Format preposition based on target
        if (target.includes('hook') || target.includes('peg')) {
            return `on the ${this.getEntityName(target)}`;
        }
        if (target.includes('box') || target.includes('container')) {
            return `in the ${this.getEntityName(target)}`;
        }
        return `on the ${this.getEntityName(target)}`;
    }
    
    reset(): void {
        this.context = undefined;
        this.currentLocation = '';
        this.lastCommand = '';
    }
    
    getLanguageProvider(): LanguageProvider | null {
        return this.languageProvider || null;
    }
}