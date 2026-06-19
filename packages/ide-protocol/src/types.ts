/**
 * Wire types for the Sharpee IDE project-introspection manifest.
 *
 * Purpose: the single, shared definition of the manifest the platform emits
 *   (`--introspect` on the platform-bundle CLI, and the Play-panel WKWebView
 *   bridge) and the IDE consumes. This is the wire contract; per DEVARCH 8b
 *   it lives once and is imported by every same-language consumer.
 * Public interface: ProjectManifest, EntityNode, EntityCategory, SourceRef,
 *   TraitSummary, SCHEMA_VERSION.
 * Owner context: @sharpee/ide-protocol (ADR-184). Types only — NO runtime-specific
 *   types (no Buffer / fs / DOM), so both the Node emitter and the browser bridge
 *   import it cleanly. The Swift IDE mirrors these shapes as Codable structs.
 *
 * @packageDocumentation
 * @see ADR-184: IDE project introspection via runtime world model
 */

/** Current manifest schema version. Bump on any breaking shape change. */
export const SCHEMA_VERSION = 1 as const;

/**
 * The Sharpee-aware project tree, produced by running the story's world
 * construction and projecting the resulting entities. A flat entity list plus a
 * build-status header; the IDE buckets into categories client-side from
 * {@link EntityNode.category}.
 */
export interface ProjectManifest {
  /** Schema version; equals {@link SCHEMA_VERSION} for manifests this package emits. */
  schemaVersion: typeof SCHEMA_VERSION;
  /** Story id (from StoryConfig). */
  story: string;
  /** Which path produced this manifest. */
  generatedFrom: 'cli' | 'bridge';
  /** Every introspected entity, in world-enumeration order. */
  entities: EntityNode[];
}

/** Top-level project-tree categories. Doors/exits surface under a room's `exits`. */
export type EntityCategory = 'room' | 'object' | 'npc' | 'region';

/** One introspected world entity. */
export interface EntityNode {
  /** World entity id. */
  id: string;
  /** IdentityTrait name (authored text) — the tree label. */
  displayName: string;
  /** Derived from the runtime trait set (see ADR-184 derivation table). */
  category: EntityCategory;
  /** Trait-type → the IDE-relevant fields (a projection, not the full trait). */
  traits: TraitSummary;
  /** file:line from the tree-sitter name index; absent when unresolved. */
  source?: SourceRef;
}

/** A resolved source location for an entity's creation site. */
export interface SourceRef {
  /** Workspace-relative path. */
  file: string;
  /** 1-based line of the `createEntity('<name>', …)` site. */
  line: number;
  /** `'scope'` = fell back to the enclosing function (non-unique name). */
  resolution: 'exact' | 'scope';
}

/**
 * The fields the IDE renders/lints on, keyed by trait type. Sparse: a key is
 * present only if the entity carries that trait. The index signature keeps the
 * shape forward-compatible — unknown traits pass through without dropping the
 * entity.
 */
export interface TraitSummary {
  identity?: { description?: string };
  /** Exit directions present — drives the "room with no exits" lint. */
  room?: { exits: string[] };
  /** Co-trait lint inputs (e.g. "lockable without openable"). */
  container?: { openable: boolean; lockable: boolean };
  [traitType: string]: Record<string, unknown> | undefined;
}
