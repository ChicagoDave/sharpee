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

// Language provider interfaces
export * from './language-provider';
export * from './parser-language-provider';

// Parser contracts
export * from './parser-contracts';

// Vocabulary contracts
export * from './vocabulary-contracts';

// Grammar system
export * from './grammar';

// Prompt types (ADR-137)
export * from './prompt';

// Channel-I/O type contracts (ADR-163)
export * from './channels';

// Spatial sound propagation contracts (ADR-172)
export * from './sound';

// Phrase algebra — language-neutral phrase contracts (ADR-192)
export * from './phrase';

// Room-description snippet contracts (ADR-209)
export * from './snippets';

// Story ending contract (ADR-210 Prerequisite 3)
export * from './endings';
