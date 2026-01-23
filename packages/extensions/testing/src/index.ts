/**
 * @sharpee/ext-testing
 *
 * Debug and testing tools extension for Sharpee IF engine.
 *
 * Provides:
 * - Interactive debug mode (GDT-style) with short codes
 * - Test commands ($teleport, $take, $assert, etc.) for transcripts
 * - Checkpoint save/restore system
 * - Playtester annotations (planned)
 *
 * @example
 * ```typescript
 * import { TestingExtension } from '@sharpee/ext-testing';
 *
 * const testing = new TestingExtension({
 *   debugMode: { enabled: true, prefix: 'gdt' },
 *   testMode: { enabled: true, deterministicRandom: true },
 *   checkpoints: { directory: './saves' }
 * });
 *
 * // Execute GDT command
 * const result = testing.executeGdtCommand('AH west-of-house', world);
 *
 * // Execute test command
 * const result = testing.executeTestCommand('$teleport west-of-house', world);
 *
 * // Save/restore checkpoints
 * await testing.saveCheckpoint('before-troll', world);
 * await testing.restoreCheckpoint('before-troll', world);
 * ```
 */

// Main extension class
export { TestingExtension } from './extension.js';

// Types
export type {
  TestingExtensionConfig,
  ITestingExtension,
  DebugContext,
  DebugCommand,
  CommandResult,
  CommandCategory,
  CommandRegistry,
  CheckpointData,
  CheckpointStore,
  SerializedDaemon,
  SerializedFuse,
} from './types.js';

// Context utilities
export { createDebugContext, formatEntity, formatLocationChain } from './context/debug-context.js';

// Command registry utilities
export { createCommandRegistry, parseGdtInput, parseTestInput } from './commands/registry.js';

// Checkpoint utilities
export { serializeCheckpoint, deserializeCheckpoint, validateCheckpoint } from './checkpoints/serializer.js';
export { createFileStore, createMemoryStore, createLocalStorageStore } from './checkpoints/store.js';
