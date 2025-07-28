/**
 * Event utilities and patterns for IF actions
 * 
 * This module provides optional utilities and patterns that
 * actions can use to create consistent event data structures.
 * Actions are free to define their own event data types.
 */

export * from './action-events';
export * from './common-patterns';
export * from './event-utils';

/**
 * Design principle: Each action defines its own event data types
 * in its own folder. This keeps related code together and makes
 * the system more modular.
 * 
 * Example:
 * ```
 * /actions/standard/closing/
 * ├── closing.ts                    // Action logic
 * ├── closing-event-data.ts         // Success event data
 * └── closing-error-*.ts            // Error event data
 * ```
 */
