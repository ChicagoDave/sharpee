/**
 * Browser Text Service for Sharpee
 * 
 * Provides a classic IF interface with:
 * - Fixed status line showing location and score/turns
 * - Scrollable main text window
 * - Command input line at bottom
 */

import {
    TextService,
    TextServiceContext,
    TextOutput
} from '@sharpee/if-services';
import { LanguageProvider } from '@sharpee/if-domain';
import { ISemanticEvent, getUntypedEventData } from '@sharpee/core';
import { StandardTextService } from './standard-text-service';

export interface BrowserTextServiceConfig {
    containerId?: string;
    theme?: 'classic' | 'dark' | 'light';
    fontSize?: string;
    showScore?: boolean;
    showTurns?: boolean;
}

export class BrowserTextService implements TextService {
    private context?: TextServiceContext;
    private languageProvider?: LanguageProvider;
    private config: BrowserTextServiceConfig;
    private currentLocation: string = '';
    private currentScore: number = 0;
    private currentTurn: number = 0;
    private standardService: StandardTextService;
    
    constructor(config?: BrowserTextServiceConfig) {
        this.config = {
            containerId: 'game-container',
            theme: 'classic',
            fontSize: '16px',
            showScore: true,
            showTurns: true,
            ...config
        };
        this.standardService = new StandardTextService();
    }
    
    initialize(context: TextServiceContext): void {
        this.context = context;
        this.standardService.initialize(context);
    }
    
    setLanguageProvider(provider: LanguageProvider): void {
        this.languageProvider = provider;
        this.standardService.setLanguageProvider(provider);
    }
    
    processTurn(): TextOutput {
        if (!this.context) {
            return '[ERROR] No context initialized';
        }
        
        // Use the standard service to process events into text
        const narrativeText = this.standardService.processTurn();
        
        // Extract status information from events
        const events = this.context.getCurrentTurnEvents();
        for (const event of events) {
            this.updateStatusFromEvent(event);
        }
        
        // Update player location
        const player = this.context.getPlayer();
        if (player) {
            const location = this.context.getLocation(player.id);
            if (location) {
                const room = this.context.world.getEntity(location);
                if (room) {
                    this.currentLocation = room.name || 'Unknown';
                }
            }
        }
        
        // Send status update to browser
        this.sendToBrowser({
            type: 'status',
            location: this.currentLocation,
            score: this.currentScore,
            turns: this.currentTurn
        });
        
        // Send the narrative text to browser
        this.sendToBrowser({
            type: 'text',
            content: narrativeText
        });
        
        // Increment turn counter
        this.currentTurn++;
        
        // Return the narrative text
        return narrativeText;
    }
    
    private updateStatusFromEvent(event: ISemanticEvent): void {
        const data = getUntypedEventData(event);
        switch (event.type) {
            case 'room.description':
            case 'room.entered':
                if (typeof data.name === 'string') {
                    this.currentLocation = data.name;
                }
                break;

            case 'game.score':
                if (typeof data.score === 'number') {
                    this.currentScore = data.score;
                } else if (typeof data.points === 'number') {
                    this.currentScore += data.points;
                }
                break;

            case 'game.turn':
                if (typeof data.turn === 'number') {
                    this.currentTurn = data.turn;
                }
                break;
        }
    }
    
    private sendToBrowser(message: any): void {
        // Send message to browser context
        // This will be bridged through WASM or postMessage
        if (typeof window !== 'undefined' && (window as any).browserTextService) {
            (window as any).browserTextService.handleEngineMessage(message);
        }
    }
    
    reset(): void {
        this.context = undefined;
        this.currentLocation = '';
        this.currentScore = 0;
        this.currentTurn = 0;
        this.standardService.reset();
    }
    
    getLanguageProvider(): LanguageProvider | null {
        return this.languageProvider || null;
    }
}

// Export the standard text service for direct use
export { StandardTextService } from './standard-text-service';

// Factory function for text services
export function createBrowserTextService(config?: BrowserTextServiceConfig): TextService {
    return new BrowserTextService(config);
}