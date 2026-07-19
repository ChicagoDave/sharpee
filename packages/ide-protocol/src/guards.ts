/**
 * Type guards for the IDE introspection manifest wire types.
 *
 * Purpose: validate untrusted manifest JSON at the decode boundary (the IDE, and
 *   the bridge/CLI round-trip tests) before it is treated as a {@link ProjectManifest}.
 * Public interface: isProjectManifest, isEntityNode, isEntityCategory, isSourceRef.
 * Owner context: @sharpee/ide-protocol (ADR-184). Pure predicates, no runtime deps.
 */

import type {
  ProjectManifest,
  EntityNode,
  EntityCategory,
  SourceRef,
} from './types.js';
import { SCHEMA_VERSION } from './types.js';

const CATEGORIES: ReadonlySet<EntityCategory> = new Set<EntityCategory>([
  'room',
  'object',
  'npc',
  'region',
]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Narrow a value to a valid {@link EntityCategory}. */
export function isEntityCategory(value: unknown): value is EntityCategory {
  return typeof value === 'string' && CATEGORIES.has(value as EntityCategory);
}

/** Narrow a value to a valid {@link SourceRef}. */
export function isSourceRef(value: unknown): value is SourceRef {
  if (!isObject(value)) return false;
  return (
    typeof value.file === 'string' &&
    typeof value.line === 'number' &&
    (value.resolution === 'exact' || value.resolution === 'scope')
  );
}

/** Narrow a value to a valid {@link EntityNode}. `source`, when present, must be a valid SourceRef. */
export function isEntityNode(value: unknown): value is EntityNode {
  if (!isObject(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.displayName !== 'string') return false;
  if (!isEntityCategory(value.category)) return false;
  if (!isObject(value.traits)) return false;
  if ('source' in value && value.source !== undefined && !isSourceRef(value.source)) return false;
  return true;
}

/**
 * Narrow a value to a valid {@link ProjectManifest}. Requires the schema version
 * to match this package's {@link SCHEMA_VERSION} and every entity to be well-formed.
 */
export function isProjectManifest(value: unknown): value is ProjectManifest {
  if (!isObject(value)) return false;
  if (value.schemaVersion !== SCHEMA_VERSION) return false;
  if (typeof value.story !== 'string') return false;
  if (value.generatedFrom !== 'cli' && value.generatedFrom !== 'bridge') return false;
  if (!Array.isArray(value.entities)) return false;
  return value.entities.every(isEntityNode);
}
