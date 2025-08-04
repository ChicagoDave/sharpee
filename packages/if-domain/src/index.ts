/**
 * @sharpee/if-domain - Core domain model for Sharpee Interactive Fiction Platform
 * 
 * This package contains the shared domain types, events, and contracts
 * used throughout the Sharpee platform.
 */

// Domain events
export * from './events';

// Domain contracts
export * from './contracts';

// World state changes
export * from './changes';

// Event sequencing
export * from './sequencing';

// Language provider interfaces
export * from './language-provider';
export * from './parser-language-provider';

// Parser contracts
export * from './parser-contracts';

// Vocabulary contracts
export * from './vocabulary-contracts';

// Grammar system
export * from './grammar';
