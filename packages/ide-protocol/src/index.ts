/**
 * @sharpee/ide-protocol
 *
 * Shared wire types for the Sharpee IDE project-introspection manifest. The single
 * source of truth for the contract between the platform's introspection emitters
 * (the `--introspect` CLI and the Play-panel bridge) and the IDE that renders the
 * Sharpee-aware project tree. Types only — no runtime dependencies — so both the
 * Node emitter and the browser bridge import it cleanly (DEVARCH 8b).
 *
 * @packageDocumentation
 * @see ADR-184: IDE project introspection via runtime world model
 */

export type {
  ProjectManifest,
  EntityNode,
  EntityCategory,
  SourceRef,
  TraitSummary,
} from './types.js';

export { SCHEMA_VERSION } from './types.js';

export {
  isProjectManifest,
  isEntityNode,
  isEntityCategory,
  isSourceRef,
} from './guards.js';
