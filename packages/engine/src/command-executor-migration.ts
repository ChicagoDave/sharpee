/**
 * Command Executor Migration Helper
 * 
 * This module helps migrate from the old CommandExecutor to the new
 * refactored version while maintaining backward compatibility.
 */

import { CommandExecutor as OldCommandExecutor } from './command-executor';
import { CommandExecutor as NewCommandExecutor } from './command-executor-refactored';
import { WorldModel } from '@sharpee/world-model';
import { ActionRegistry } from '@sharpee/stdlib';
import { EventProcessor } from '@sharpee/event-processor';
import { LanguageProvider } from '@sharpee/if-domain';
import { IParser } from '@sharpee/world-model';

/**
 * Feature flags for gradual migration
 */
export interface MigrationFlags {
  /**
   * Use new refactored CommandExecutor
   */
  useRefactoredExecutor?: boolean;
  
  /**
   * Actions that have been migrated to handle their own error events
   */
  migratedActions?: string[];
  
  /**
   * Enable debug logging for migration
   */
  debugMigration?: boolean;
}

/**
 * Create a command executor based on migration flags
 */
export function createMigratedCommandExecutor(
  world: WorldModel,
  actionRegistry: ActionRegistry,
  eventProcessor: EventProcessor,
  languageProvider: LanguageProvider,
  parser: IParser,
  flags?: MigrationFlags
): OldCommandExecutor | NewCommandExecutor {
  if (flags?.useRefactoredExecutor) {
    if (flags.debugMigration) {
      console.log('[Migration] Using refactored CommandExecutor');
    }
    return new NewCommandExecutor(world, actionRegistry, eventProcessor, parser);
  }
  
  if (flags?.debugMigration) {
    console.log('[Migration] Using legacy CommandExecutor');
  }
  return new OldCommandExecutor(
    world,
    actionRegistry,
    eventProcessor,
    languageProvider,
    parser
  );
}

/**
 * Check if an action has been migrated to the new pattern
 */
export function isActionMigrated(actionId: string, flags?: MigrationFlags): boolean {
  if (!flags?.migratedActions) {
    return false;
  }
  return flags.migratedActions.includes(actionId);
}

/**
 * Default migration flags for gradual rollout
 */
export const DEFAULT_MIGRATION_FLAGS: MigrationFlags = {
  useRefactoredExecutor: false,
  migratedActions: [
    'looking' // Start with looking as the prototype
  ],
  debugMigration: false
};

/**
 * Phase 3.5 migration flags (all actions migrated)
 */
export const PHASE_3_5_FLAGS: MigrationFlags = {
  useRefactoredExecutor: true,
  migratedActions: [
    'looking',
    'examining',
    'going',
    'taking',
    'dropping',
    'opening',
    'closing',
    'putting',
    'inserting',
    'removing'
  ],
  debugMigration: false
};