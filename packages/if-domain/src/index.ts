/**
 * @sharpee/if-domain - Core domain model for Sharpee Interactive Fiction Platform
 * 
 * This package contains the shared domain types, events, and contracts
 * used throughout the Sharpee platform.
 */

// Domain events
export * from './events.js';

// Domain contracts
export * from './contracts.js';

// World state changes
export * from './changes.js';

// Language provider interfaces
export * from './language-provider.js';
export * from './parser-language-provider.js';

// Parser contracts
export * from './parser-contracts/index.js';

// Vocabulary contracts
export * from './vocabulary-contracts/index.js';

// Grammar system
export * from './grammar/index.js';

// Prompt types (ADR-137)
export * from './prompt.js';

// Channel-I/O type contracts (ADR-163)
export * from './channels/index.js';

// Spatial sound propagation contracts (ADR-172)
export * from './sound/index.js';

// Phrase algebra — language-neutral phrase contracts (ADR-192)
export * from './phrase.js';

// Room-description snippet contracts (ADR-209)
export * from './snippets.js';

// Story ending contract (ADR-210 Prerequisite 3)
export * from './endings.js';
