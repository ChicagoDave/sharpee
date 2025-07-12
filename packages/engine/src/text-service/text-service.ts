/**
 * Text Service Interface
 * 
 * Converts events into human-readable text output
 */

import { SemanticEvent, SystemEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';
import { TurnResult, SequencedEvent } from '../types';

/**
 * Text output channel
 */
export interface TextChannel {
  write(text: string, metadata?: any): void;
}

/**
 * Text formatting options
 */
export interface TextFormatOptions {
  /**
   * Include timestamps
   */
  includeTimestamps?: boolean;
  
  /**
   * Include event types
   */
  includeEventTypes?: boolean;
  
  /**
   * Include system events
   */
  includeSystemEvents?: boolean;
  
  /**
   * Verbose output (all event details)
   */
  verbose?: boolean;
}

/**
 * Text service interface
 */
export interface TextService {
  /**
   * Process turn results and emit text
   */
  processTurn(
    turnResult: TurnResult,
    channels: TextChannel[],
    options?: TextFormatOptions
  ): void;
  
  /**
   * Format a single event
   */
  formatEvent(
    event: SemanticEvent | SystemEvent | SequencedEvent,
    options?: TextFormatOptions
  ): string;
}

/**
 * Buffered text channel - stores text in memory
 */
export class BufferedTextChannel implements TextChannel {
  private buffer: string[] = [];
  
  write(text: string, metadata?: any): void {
    this.buffer.push(text);
  }
  
  getBuffer(): string {
    return this.buffer.join('');
  }
  
  clear(): void {
    this.buffer = [];
  }
}

/**
 * Console text channel - writes to console
 */
export class ConsoleTextChannel implements TextChannel {
  write(text: string, metadata?: any): void {
    console.log(text);
  }
}

/**
 * Multi text channel - writes to multiple channels
 */
export class MultiTextChannel implements TextChannel {
  constructor(private channels: TextChannel[]) {}
  
  write(text: string, metadata?: any): void {
    for (const channel of this.channels) {
      channel.write(text, metadata);
    }
  }
  
  addChannel(channel: TextChannel): void {
    this.channels.push(channel);
  }
  
  removeChannel(channel: TextChannel): void {
    const index = this.channels.indexOf(channel);
    if (index !== -1) {
      this.channels.splice(index, 1);
    }
  }
  
  getChannels(): TextChannel[] {
    return [...this.channels];
  }
}

/**
 * Standard output channel
 */
export class StdoutChannel implements TextChannel {
  write(text: string, metadata?: any): void {
    console.log(text);
  }
}

/**
 * All Events Template - Simple text service that outputs all events
 * 
 * This is our first implementation that simply prints all events
 * to help with debugging and understanding the event flow
 */
export class AllEventsTextService implements TextService {
  private languageProvider?: any; // Will be IFLanguageProvider when available
  
  constructor(languageProvider?: any) {
    this.languageProvider = languageProvider;
  }
  
  /**
   * Process turn results and emit text
   */
  processTurn(
    turnResult: TurnResult,
    channels: TextChannel[],
    options: TextFormatOptions = {}
  ): void {
    const {
      includeTimestamps = false,
      includeEventTypes = true,
      includeSystemEvents = true,
      verbose = false
    } = options;
    
    // Header for the turn
    const header = `\n=== Turn ${turnResult.turn} ===`;
    this.writeToChannels(header, channels);
    
    // Show the input
    if (turnResult.input) {
      const cmdText = `> ${turnResult.input}`;
      this.writeToChannels(cmdText, channels);
    }
    
    // Process each event
    for (const sequencedEvent of turnResult.events) {
      const event = sequencedEvent; // SequencedEvent extends SemanticEvent
      
      // Skip system events if not requested
      if (!includeSystemEvents && this.isSystemEvent(event)) {
        continue;
      }
      
      const formattedText = this.formatEvent(event, options);
      if (formattedText) {
        this.writeToChannels(formattedText, channels);
      }
    }
    
    // Show success/failure
    if (turnResult.error) {
      this.writeToChannels(`\n[ERROR] ${turnResult.error}`, channels);
    } else if (!turnResult.success) {
      this.writeToChannels('\n[Command failed]', channels);
    }
    
    // Footer
    this.writeToChannels('', channels); // Empty line
  }
  
  /**
   * Format a single event
   */
  formatEvent(
    event: SemanticEvent | SystemEvent | SequencedEvent,
    options: TextFormatOptions = {}
  ): string {
    const {
      includeTimestamps = false,
      includeEventTypes = true,
      verbose = false
    } = options;
    
    let text = '';
    
    // Add timestamp if requested
    if (includeTimestamps && event.timestamp) {
      const timestamp = event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp;
      text += `[${timestamp}] `;
    }
    
    // Add event type if requested
    if (includeEventTypes) {
      text += `[${event.type}] `;
    }
    
    // Format based on event type
    if (this.isSystemEvent(event)) {
      text += this.formatSystemEvent(event as SystemEvent, verbose);
    } else {
      text += this.formatSemanticEvent(event as SemanticEvent, verbose);
    }
    
    return text;
  }
  
  /**
   * Format a semantic event
   */
  private formatSemanticEvent(event: SemanticEvent, verbose: boolean): string {
    // Basic formatting - just show the event type and main details
    let text = '';
    
    switch (event.type) {
      case 'entity_moved':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.entity)} moved to ${this.getEntityName(data.to)}`;
          if (data.from) {
            text += ` from ${this.getEntityName(data.from)}`;
          }
        }
        break;
        
      case 'entity_taken':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.actor)} took ${this.getEntityName(data.entity)}`;
        }
        break;
        
      case 'entity_dropped':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.actor)} dropped ${this.getEntityName(data.entity)}`;
        }
        break;
        
      case 'container_opened':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.actor)} opened ${this.getEntityName(data.container)}`;
        }
        break;
        
      case 'container_closed':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.actor)} closed ${this.getEntityName(data.container)}`;
        }
        break;
        
      case 'entity_examined':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `${this.getEntityName(data.actor)} examined ${this.getEntityName(data.entity)}`;
          if (data.description) {
            text += `\n${data.description}`;
          }
        }
        break;
        
      case 'room_described':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `\n${data.name}\n${data.description}`;
          if (data.exits && Array.isArray(data.exits) && data.exits.length > 0) {
            text += `\nExits: ${data.exits.join(', ')}`;
          }
          if (data.contents && Array.isArray(data.contents) && data.contents.length > 0) {
            text += `\nYou can see: ${data.contents.map((e: any) => this.getEntityName(e)).join(', ')}`;
          }
        }
        break;
        
      case 'action_failed':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `[Failed] ${data.reason}`;
        }
        break;
        
      case 'game_message':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = data.message || '';
        }
        break;
        
      case 'player.looked':
        // Just a marker event, the actual description comes from other events
        text = '';
        break;
        
      case 'location.described':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = data.description || '';
        }
        break;
        
      case 'command.succeeded':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = data.message || '';
        }
        break;
        
      case 'object.examined':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          let text = '';
          if (data.name) {
            text = data.name;
            if (data.description) {
              text += ': ' + data.description;
            }
          } else if (data.description) {
            text = data.description;
          }
          return text;
        }
        break;
        
      case 'inventory.added':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `Added ${data.item} to inventory`;
        }
        break;
        
      case 'game.scored':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = `Score: ${data.points} points (Total: ${data.total})`;
        }
        break;
        
      case 'text.displayed':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          text = data.text || '';
        }
        break;
        
      case 'text.room_description':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          // Get the room entity from world model if we have access
          // For now, just indicate we need to describe the room
          const roomId = data.roomId;
          text = `\n[Room: ${roomId}]`;
          // TODO: Get actual room description from world model
          // This would require passing world model to text service
        }
        break;
        
      case 'text.list_contents':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          if (data.items && Array.isArray(data.items)) {
            text = `You can see: ${data.items.join(', ')}`;
          }
        }
        break;
        
      case 'player.checked_inventory':
        // Just a marker event, NPCs might react
        text = '';
        break;
        
      case 'player.inventory_empty':
        // Just a marker event
        text = '';
        break;
        
      case 'text.inventory_list':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          if (data.empty) {
            text = 'You are carrying nothing.';
          } else {
            text = 'You are carrying:';
            if (data.carried && data.carried.length > 0) {
              text += `\n  ${data.carried.join('\n  ')}`;
            }
            if (data.worn && data.worn.length > 0) {
              text += `\n\nYou are wearing:\n  ${data.worn.join('\n  ')}`;
            }
          }
        }
        break;
        
      default:
        if (verbose && event.data) {
          text = `${event.type}: ${JSON.stringify(event.data, null, 2)}`;
        } else {
          text = `[${event.type}]`;
        }
    }
    
    return text;
  }
  
  /**
   * Format a system event
   */
  private formatSystemEvent(event: SystemEvent, verbose: boolean): string {
    if (verbose && event.data) {
      return `[SYSTEM] ${event.subsystem}::${event.type} - ${JSON.stringify(event.data, null, 2)}`;
    }
    
    // For non-verbose, only show important system events
    switch (event.type) {
      case 'turn_started':
        return '[System: Turn started]';
      case 'turn_completed':
        return '[System: Turn completed]';
      case 'parse_error':
        if (event.data && typeof event.data === 'object') {
          const data = event.data as any;
          return `[System: Parse error - ${data.errorDetails?.message || 'Unknown error'}]`;
        }
        return '[System: Parse error]';
      default:
        return ''; // Don't show other system events unless verbose
    }
  }
  
  /**
   * Check if event is a system event
   */
  private isSystemEvent(event: SemanticEvent | SystemEvent | SequencedEvent): boolean {
    return 'subsystem' in event;
  }
  
  /**
   * Get entity name (with fallback)
   */
  private getEntityName(entity: any): string {
    if (!entity) return 'something';
    
    // If we have a language provider, use it
    if (this.languageProvider && entity.id) {
      try {
        return this.languageProvider.getEntityName(entity);
      } catch {
        // Fall through to defaults
      }
    }
    
    // Otherwise use basic formatting
    if (typeof entity === 'string') {
      return entity;
    }
    if (entity.name) {
      return entity.name;
    }
    if (entity.id) {
      return entity.id;
    }
    
    return 'something';
  }
  
  /**
   * Write text to all channels
   */
  private writeToChannels(text: string, channels: TextChannel[]): void {
    for (const channel of channels) {
      try {
        channel.write(text);
      } catch (error) {
        // Silently ignore channel write errors
        // In production, we might want to log this
      }
    }
  }
}

/**
 * Create a basic text service with buffered output
 */
export function createBasicTextService(languageProvider?: any): {
  service: TextService;
  channels: TextChannel[];
} {
  return {
    service: new AllEventsTextService(languageProvider),
    channels: [new BufferedTextChannel()]
  };
}