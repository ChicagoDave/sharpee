/**
 * Standard capabilities for the Sharpee stdlib
 * 
 * These capabilities provide common game state management patterns
 * that don't naturally fit in the entity-relationship model.
 */

import { StandardCapabilities } from '@sharpee/world-model';

// Import individual capabilities
// NOTE: there is no scoring capability. ADR-260 D1 deleted it — scoring state
// lives on the ScoreLedger (ADR-129), and the schema this table once carried
// was registered by nothing but test infrastructure. Stories are still free to
// register their own capability under the SCORING name for private
// bookkeeping (dungeo keeps moves/deaths there); what died is the platform's
// claim that such a capability is the scoring contract.
import { SaveRestoreCapabilitySchema, SaveRestoreData, SaveData } from './save-restore.js';
import { ConversationCapabilitySchema, ConversationData, ConversationStateData } from './conversation.js';
import { GameMetaCapabilitySchema, GameMetaData } from './game-meta.js';
import { CommandHistoryCapabilitySchema, CommandHistoryData, CommandHistoryEntry } from './command-history.js';
import { DebugCapabilitySchema, DebugData, DEBUG_CAPABILITY, isAnyDebugEnabled, createDefaultDebugData } from './debug.js';

// Re-export all schemas and types
export {
  // Save/Restore
  SaveRestoreCapabilitySchema,
  SaveRestoreData,
  SaveData,
  
  // Conversation
  ConversationCapabilitySchema,
  ConversationData,
  ConversationStateData,
  
  // Game Meta
  GameMetaCapabilitySchema,
  GameMetaData,
  
  // Command History
  CommandHistoryCapabilitySchema,
  CommandHistoryData,
  CommandHistoryEntry,
  
  // Debug
  DebugCapabilitySchema,
  DebugData,
  DEBUG_CAPABILITY,
  isAnyDebugEnabled,
  createDefaultDebugData
};

/**
 * Map of standard capability names to their schemas
 */
export const StandardCapabilitySchemas = {
  [StandardCapabilities.SAVE_RESTORE]: SaveRestoreCapabilitySchema,
  [StandardCapabilities.CONVERSATION]: ConversationCapabilitySchema,
  [StandardCapabilities.GAME_META]: GameMetaCapabilitySchema,
  [StandardCapabilities.COMMAND_HISTORY]: CommandHistoryCapabilitySchema,
  [StandardCapabilities.DEBUG]: DebugCapabilitySchema,
} as const;

/**
 * Helper to register all standard capabilities
 * @param world The world model to register capabilities on
 * @param capabilities Array of capability names to register (defaults to all)
 */
export function registerStandardCapabilities(
  world: { registerCapability: (name: string, reg: any) => void },
  capabilities: string[] = Object.keys(StandardCapabilitySchemas)
): void {
  for (const capabilityName of capabilities) {
    const schema = StandardCapabilitySchemas[capabilityName as keyof typeof StandardCapabilitySchemas];
    if (schema) {
      world.registerCapability(capabilityName, { schema });
    }
  }
}