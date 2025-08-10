/**
 * Capability system types for Sharpee IF Platform
 * 
 * Capabilities store game state that doesn't naturally fit in the entity-relationship model
 */

export interface CapabilityData {
  [key: string]: any;
}

export interface CapabilitySchema {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    required?: boolean;
  };
}

export interface CapabilityStore {
  [capabilityName: string]: {
    data: CapabilityData;
    schema?: CapabilitySchema;
  };
}

export interface CapabilityRegistration {
  name: string;
  schema: CapabilitySchema;
  initialData?: CapabilityData;
}

// Standard capability names
export const StandardCapabilities = {
  SCORING: 'scoring',
  SAVE_RESTORE: 'saveRestore',
  CONVERSATION: 'conversation',
  GAME_META: 'gameMeta',
  COMMAND_HISTORY: 'commandHistory',
  DEBUG: 'debug',
} as const;

export type StandardCapabilityName = typeof StandardCapabilities[keyof typeof StandardCapabilities];
