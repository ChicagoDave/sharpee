/**
 * Capability system types for Sharpee IF Platform
 * 
 * Capabilities store game state that doesn't naturally fit in the entity-relationship model
 */

export interface ICapabilityData {
  [key: string]: any;
}

export interface ICapabilitySchema {
  [field: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default?: any;
    required?: boolean;
  };
}

export interface ICapabilityStore {
  [capabilityName: string]: {
    data: ICapabilityData;
    schema?: ICapabilitySchema;
  };
}

export interface ICapabilityRegistration {
  name: string;
  schema: ICapabilitySchema;
  initialData?: ICapabilityData;
}

// Standard capability names
export const StandardCapabilities = {
  SCORING: 'scoring',
  SAVE_RESTORE: 'saveRestore',
  CONVERSATION: 'conversation',
  GAME_META: 'gameMeta',
  COMMAND_HISTORY: 'commandHistory',
  DEBUG: 'debug',
  /**
   * Persistent per-`(entityId, messageKey)` text-state counters backing
   * deterministic `Choice` variation (ADR-196). Data shape:
   * `{ [entityId]: { [messageKey]: number } }`. Serializes with the world so
   * cycling/first-time positions survive save/restore.
   */
  TEXT_STATE: 'textState',
} as const;

export type StandardCapabilityName = typeof StandardCapabilities[keyof typeof StandardCapabilities];
