// packages/core/src/channels/types.ts

import { SemanticEvent } from '../events/types';

/**
 * Represents a message in a channel
 */
export interface ChannelMessage {
  /**
   * Unique identifier for this message
   */
  id: string;
  
  /**
   * Source event(s) that generated this message
   */
  sourceEventIds: string[];
  
  /**
   * When the message was created
   */
  timestamp: number;
  
  /**
   * Content of the message - could be a string or a structured object
   */
  content: string | Record<string, unknown>;
  
  /**
   * Type of the message (for formatting/display purposes)
   */
  type: string;
  
  /**
   * Additional metadata about the message
   */
  metadata?: Record<string, unknown>;
}

/**
 * Definition of a channel
 */
export interface ChannelDefinition {
  /**
   * Unique identifier for this channel
   */
  id: string;
  
  /**
   * Human-readable name of the channel
   */
  name: string;
  
  /**
   * Description of what the channel is used for
   */
  description: string;
  
  /**
   * Event types that this channel handles
   */
  eventTypes: string[];
  
  /**
   * Event tags that this channel handles (optional)
   */
  eventTags?: string[];
  
  /**
   * Custom filter for events
   */
  filter?: (event: SemanticEvent) => boolean;
  
  /**
   * Formatter to convert events to channel messages
   */
  formatter: (event: SemanticEvent) => ChannelMessage | ChannelMessage[] | null;
  
  /**
   * Maximum number of messages to keep in the channel
   */
  maxMessages?: number;
  
  /**
   * Whether this channel is persistent (survives across turns)
   */
  persistent?: boolean;
}

/**
 * A channel that collects and manages messages
 */
export interface Channel {
  /**
   * The channel definition
   */
  definition: ChannelDefinition;
  
  /**
   * Add a message to the channel
   */
  addMessage: (message: ChannelMessage) => void;
  
  /**
   * Process an event into messages
   */
  processEvent: (event: SemanticEvent) => boolean;
  
  /**
   * Get all messages in the channel
   */
  getMessages: () => ChannelMessage[];
  
  /**
   * Get a specific message by ID
   */
  getMessage: (id: string) => ChannelMessage | undefined;
  
  /**
   * Clear all messages in the channel
   */
  clearMessages: () => void;
}

/**
 * Interface for managing channels
 */
export interface ChannelManager {
  /**
   * Register a channel
   */
  registerChannel: (definition: ChannelDefinition) => Channel;
  
  /**
   * Get a channel by ID
   */
  getChannel: (id: string) => Channel | undefined;
  
  /**
   * Get all registered channels
   */
  getAllChannels: () => Channel[];
  
  /**
   * Process an event through all channels
   */
  processEvent: (event: SemanticEvent) => void;
  
  /**
   * Get messages from a specific channel
   */
  getMessages: (channelId: string) => ChannelMessage[];
  
  /**
   * Get messages from all channels, optionally filtered
   */
  getAllMessages: (filter?: (message: ChannelMessage) => boolean) => ChannelMessage[];
}