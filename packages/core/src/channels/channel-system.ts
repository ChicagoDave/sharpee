// packages/core/src/channels/channel-system.ts

import { 
    Channel, 
    ChannelDefinition, 
    ChannelManager, 
    ChannelMessage 
  } from './types';
  import { SemanticEvent, EventSource } from '../events/types';
  
  /**
   * Implementation of the Channel interface
   */
  export class ChannelImpl implements Channel {
    public readonly definition: ChannelDefinition;
    private messages: ChannelMessage[] = [];
  
    /**
     * Create a new channel
     */
    constructor(definition: ChannelDefinition) {
      this.definition = definition;
    }
  
    /**
     * Add a message to the channel
     */
    public addMessage(message: ChannelMessage): void {
      this.messages.push(message);
      
      // Enforce maximum message limit if defined
      if (this.definition.maxMessages && this.messages.length > this.definition.maxMessages) {
        this.messages.splice(0, this.messages.length - this.definition.maxMessages);
      }
    }
  
    /**
     * Process an event into messages using the channel's formatter
     */
    public processEvent(event: SemanticEvent): boolean {
      // Check if this channel handles this event type
      if (!this.matchesEvent(event)) {
        return false;
      }
      
      // Format the event into one or more messages
      const messages = this.definition.formatter(event);
      
      // If null or empty, no messages were generated
      if (!messages) {
        return false;
      }
      
      // Add each message to the channel
      if (Array.isArray(messages)) {
        messages.forEach(message => this.addMessage(message));
        return messages.length > 0;
      } else {
        this.addMessage(messages);
        return true;
      }
    }
  
    /**
     * Get all messages in the channel
     */
    public getMessages(): ChannelMessage[] {
      return [...this.messages];
    }
  
    /**
     * Get a specific message by ID
     */
    public getMessage(id: string): ChannelMessage | undefined {
      return this.messages.find(message => message.id === id);
    }
  
    /**
     * Clear all messages in the channel
     */
    public clearMessages(): void {
      this.messages = [];
    }
  
    /**
     * Check if this channel matches an event
     */
    private matchesEvent(event: SemanticEvent): boolean {
      // Check event type
      const matchesType = this.definition.eventTypes.includes(event.type) || 
                         this.definition.eventTypes.includes('*');
      if (!matchesType) return false;
      
      // Check event tags if defined
      if (this.definition.eventTags && this.definition.eventTags.length > 0) {
        const hasTags = event.tags && event.tags.length > 0;
        if (!hasTags) return false;
        
        const matchesTags = this.definition.eventTags.some(tag => 
          event.tags!.includes(tag)
        );
        if (!matchesTags) return false;
      }
      
      // Apply custom filter if defined
      if (this.definition.filter) {
        return this.definition.filter(event);
      }
      
      return true;
    }
  }
  
  /**
   * Implementation of the ChannelManager interface
   */
  export class ChannelManagerImpl implements ChannelManager {
    private channels: Map<string, Channel> = new Map();
    private eventSource?: EventSource;
  
    /**
     * Create a new channel manager
     */
    constructor(eventSource?: EventSource) {
      this.eventSource = eventSource;
      
      // If an event source is provided, listen for events
      if (this.eventSource) {
        const emitter = (this.eventSource as any).getEmitter?.();
        if (emitter) {
          emitter.on('*', (event: SemanticEvent) => {
            this.processEvent(event);
          });
        }
      }
    }
  
    /**
     * Register a channel
     */
    public registerChannel(definition: ChannelDefinition): Channel {
      if (this.channels.has(definition.id)) {
        throw new Error(`Channel with ID "${definition.id}" already exists`);
      }
      
      const channel = new ChannelImpl(definition);
      this.channels.set(definition.id, channel);
      return channel;
    }
  
    /**
     * Get a channel by ID
     */
    public getChannel(id: string): Channel | undefined {
      return this.channels.get(id);
    }
  
    /**
     * Get all registered channels
     */
    public getAllChannels(): Channel[] {
      return Array.from(this.channels.values());
    }
  
    /**
     * Process an event through all channels
     */
    public processEvent(event: SemanticEvent): void {
      for (const channel of this.channels.values()) {
        channel.processEvent(event);
      }
    }
  
    /**
     * Get messages from a specific channel
     */
    public getMessages(channelId: string): ChannelMessage[] {
      const channel = this.channels.get(channelId);
      return channel ? channel.getMessages() : [];
    }
  
    /**
     * Get messages from all channels, optionally filtered
     */
    public getAllMessages(filter?: (message: ChannelMessage) => boolean): ChannelMessage[] {
      // Collect all messages from all channels
      const allMessages = Array.from(this.channels.values())
        .flatMap(channel => channel.getMessages());
      
      // Sort by timestamp (newest first)
      allMessages.sort((a, b) => b.timestamp - a.timestamp);
      
      // Apply filter if provided
      return filter ? allMessages.filter(filter) : allMessages;
    }
  }
  
  /**
   * Create a unique ID for a channel message
   */
  export function generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Create a new channel manager
   */
  export function createChannelManager(eventSource?: EventSource): ChannelManager {
    return new ChannelManagerImpl(eventSource);
  }
  
  /**
   * Create a simple text formatter for channel messages
   */
  export function createTextFormatter(
    messageType: string = 'text',
    extractContent: (event: SemanticEvent) => string | null = defaultTextExtractor
  ): (event: SemanticEvent) => ChannelMessage | null {
    return (event: SemanticEvent) => {
      const content = extractContent(event);
      if (content === null) return null;
      
      return {
        id: generateMessageId(),
        sourceEventIds: [event.id],
        timestamp: Date.now(),
        content,
        type: messageType
      };
    };
  }
  
  /**
   * Default text extractor for semantic events
   */
  function defaultTextExtractor(event: SemanticEvent): string | null {
    // Try to extract description from the payload
    if (event.payload) {
      if (typeof event.payload.description === 'string') {
        return event.payload.description;
      }
      
      if (typeof event.payload.message === 'string') {
        return event.payload.message;
      }
      
      if (typeof event.payload.text === 'string') {
        return event.payload.text;
      }
    }
    
    // Default null means this event doesn't generate a message
    return null;
  }