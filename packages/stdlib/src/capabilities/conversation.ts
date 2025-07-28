/**
 * Conversation capability for tracking NPC conversation states and history
 */

import { CapabilitySchema } from '@sharpee/world-model';

/**
 * Conversation capability schema  
 * Tracks NPC conversation states and history
 */
export const ConversationCapabilitySchema: CapabilitySchema = {
  states: {
    type: 'object',
    default: {},
    required: true
  },
  globalTopics: {
    type: 'array',
    default: [],
    required: false
  },
  conversationHistory: {
    type: 'array',
    default: [],
    required: false
  }
};

/**
 * Conversation state for individual NPCs
 */
export interface ConversationStateData {
  hasGreeted: boolean;
  currentTopic?: string;
  availableTopics: string[];
  relationshipLevel: number;
  lastInteraction?: number;
  flags: Record<string, boolean>;
}

/**
 * Type-safe conversation data interface
 */
export interface ConversationData {
  states: Record<string, ConversationStateData>;
  globalTopics?: string[];
  conversationHistory?: Array<{
    npcId: string;
    topic: string;
    timestamp: number;
  }>;
}