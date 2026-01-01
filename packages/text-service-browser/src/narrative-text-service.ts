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
import { ISemanticEvent, getUntypedEventData } from '@sharpee/core';

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
        for (const [category, evts] of grouped.entries()) {
            if (!narrativeOrder.includes(category)) {
                result.push(evts);
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
        const data = getUntypedEventData(event);

        // Common failure messages
        if (typeof data.reason === 'string') {
            return data.reason;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }

        // Generate message based on action type
        const action = (event.entities as Record<string, unknown>)?.action || data.action;
        if (typeof action === 'string') {
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
        const data = getUntypedEventData(event);

        if (typeof data.message === 'string') {
            return data.message;
        }

        // Generate message based on action
        const action = (event.entities as Record<string, unknown>)?.action || data.action;
        const object = (event.entities as Record<string, unknown>)?.object || data.object;

        if (typeof action === 'string' && typeof object === 'string') {
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
                    if (typeof target === 'string') {
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
        const data = getUntypedEventData(event);
        const direction = event.entities?.target || data.direction;
        if (direction) {
            // Movement is usually followed by room description, so keep it brief
            return '';  // The room description will handle the output
        }
        return '';
    }

    private processRoomDescription(events: ISemanticEvent[]): string {
        const output: string[] = [];

        for (const event of events) {
            const data = getUntypedEventData(event);

            // Room name (for first visit or look command)
            if (typeof data.name === 'string') {
                output.push(`**${data.name}**`);
                this.currentLocation = data.name;
            }

            // Room description
            if (typeof data.description === 'string') {
                output.push(data.description);
            }

            // List items in room
            if (Array.isArray(data.contents)) {
                const items = (data.contents as unknown[]).filter(item => item !== 'player');
                if (items.length > 0) {
                    const itemDescriptions = items.map(item => {
                        if (typeof item === 'string') {
                            return this.getEntityName(item);
                        }
                        const itemObj = item as Record<string, unknown>;
                        return typeof itemObj.name === 'string' ? itemObj.name : 'something';
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
            if (Array.isArray(data.exits)) {
                const exitList = this.formatExits(data.exits as unknown[]);
                if (exitList) {
                    output.push(exitList);
                }
            }
        }

        return output.join('\n\n');
    }

    private processObjectDescription(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);

        if (typeof data.description === 'string') {
            return data.description;
        }

        if (typeof data.message === 'string') {
            return data.message;
        }

        const object = (event.entities as Record<string, unknown>)?.object || data.object;
        if (typeof object === 'string') {
            return `You see nothing special about the ${this.getEntityName(object)}.`;
        }

        return "You see nothing special.";
    }

    private processInventory(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const items = (Array.isArray(data.items) ? data.items :
                      Array.isArray(data.inventory) ? data.inventory : []) as unknown[];

        if (items.length === 0) {
            return "You are carrying nothing.";
        }

        const itemNames = items.map((item: unknown) => {
            if (typeof item === 'string') {
                return this.getEntityName(item);
            }
            const itemObj = item as Record<string, unknown>;
            return typeof itemObj.name === 'string' ? itemObj.name : 'something';
        });

        if (itemNames.length === 1) {
            return `You are carrying ${itemNames[0]}.`;
        }

        return `You are carrying:\n  ${itemNames.join('\n  ')}`;
    }

    private processGameMessage(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const text = data.text || data.message;
        return typeof text === 'string' ? text : '';
    }

    private processScoreChange(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);
        const points = typeof data.points === 'number' ? data.points :
                      typeof data.change === 'number' ? data.change : 0;

        if (points > 0) {
            return `[Your score has gone up by ${points} points.]`;
        } else if (points < 0) {
            return `[Your score has gone down by ${Math.abs(points)} points.]`;
        }

        return '';
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

    private processGenericEvent(event: ISemanticEvent): string {
        const data = getUntypedEventData(event);

        // Try to extract any text from the event
        if (typeof data.text === 'string') return data.text;
        if (typeof data.message === 'string') return data.message;
        if (typeof data.description === 'string') return data.description;

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

    private formatExits(exits: unknown[]): string {
        if (exits.length === 0) return '';

        const exitNames = exits.map(exit => {
            if (typeof exit === 'string') {
                return exit;
            }
            const exitObj = exit as Record<string, unknown>;
            return typeof exitObj.direction === 'string' ? exitObj.direction :
                   typeof exitObj.name === 'string' ? exitObj.name : 'somewhere';
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
