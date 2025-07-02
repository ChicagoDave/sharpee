/**
 * Sharpee - Interactive Fiction Engine
 * 
 * Main entry point that aggregates all packages for easy consumption
 */

// Core types and infrastructure
export * from '@sharpee/core';

// World model with entities and traits
export * from '@sharpee/world-model';

// Event processing system
export * from '@sharpee/event-processor';

// Standard library with actions and parser
export * from '@sharpee/stdlib';

// Main engine runtime
export * from '@sharpee/engine';

// Language support
export { EnglishLanguageProvider } from '@sharpee/lang-en-us';

// Note: Specific re-exports removed to avoid conflicts
// Users should get types from the wildcard exports above
