/**
 * @sharpee/media — Audio and media type definitions for the Sharpee IF platform.
 *
 * Public interface: Re-exports all audio types, event interfaces, registry,
 * and capability/preference types from the audio module.
 *
 * Owner context: Media subsystem (ADR-138). Types-only package with no
 * runtime dependencies beyond @sharpee/core.
 *
 * Importing this module activates TypeScript declaration merging for
 * audio event keys in @sharpee/core's EventDataRegistry.
 */
export * from './audio';
