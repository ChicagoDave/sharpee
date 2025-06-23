/**
 * Commands module
 * 
 * Exports command and action executor registries
 */

export * from './command-registry';
export * from './action-executor-registry';

// Initialize the action system on module load
import { registerStandardCommands } from './command-registry';
import { registerStandardExecutors } from './action-executor-registry';

// Auto-register standard commands and executors
registerStandardCommands();
registerStandardExecutors();