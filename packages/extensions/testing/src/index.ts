/**
 * @sharpee/ext-testing
 *
 * Debug and testing tools extension for Sharpee IF engine.
 *
 * Provides:
 * - Interactive debug mode (GDT-style) with short codes
 * - Test commands ($teleport, $take, $assert, etc.) for transcripts
 * - Playtester annotations (ADR-109)
 *
 * Checkpointing is deliberately NOT here. `$save`/`$restore` are transcript-tester
 * directives backed by the platform engine's real save seam
 * (`transcript-tester/src/command-core.ts`), which is the one mechanism; this package
 * once carried a second, world-only checkpoint store that nothing read back.
 *
 * @example
 * ```typescript
 * import { TestingExtension } from '@sharpee/ext-testing';
 *
 * const testing = new TestingExtension({
 *   debugMode: { enabled: true, prefix: 'gdt' },
 *   testMode: { enabled: true, deterministicRandom: true }
 * });
 *
 * // Execute GDT command
 * const result = testing.executeGdtCommand('AH west-of-house', world);
 *
 * // Execute test command
 * const result = testing.executeTestCommand('$teleport west-of-house', world);
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
  // Annotation types (ADR-109)
  AnnotationType,
  Annotation,
  AnnotationContext,
  AnnotationSession,
  AnnotationStore,
} from './types.js';

// Context utilities
export { createDebugContext, formatEntity, formatLocationChain } from './context/debug-context.js';

// Command registry utilities
export { createCommandRegistry, parseGdtInput, parseTestInput } from './commands/registry.js';

// Annotation utilities (ADR-109)
export { createAnnotationStore, captureContext, createEmptyContext } from './annotations/index.js';
