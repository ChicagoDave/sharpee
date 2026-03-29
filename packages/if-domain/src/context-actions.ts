/**
 * Context-driven action menu types (ADR-136)
 *
 * Defines the ContextAction type produced by the engine's action menu
 * computer and consumed by clients for rendering interactive action panels.
 *
 * @public ContextAction, ContextActionCategory, ActionMenuConfig
 * @context engine, bridge, client
 */

/**
 * Category for grouping context actions in the client UI.
 */
export type ContextActionCategory =
  | 'movement'
  | 'interaction'
  | 'inventory'
  | 'communication'
  | 'combat'
  | 'meta'
  | 'story';

/**
 * A single action available in the current context.
 *
 * Produced by the engine each turn from the intersection of
 * grammar rules, entity scope, and trait state. Consumed by
 * clients for rendering clickable action buttons.
 */
export interface ContextAction {
  /** The full command text, ready to submit (e.g. "take brass lantern") */
  readonly command: string;

  /** The action ID (e.g. "if.action.taking") */
  readonly actionId: string;

  /** Human-readable verb label (e.g. "Take") */
  readonly verb: string;

  /** Target entity ID, if any */
  readonly targetId?: string;

  /** Target display name (e.g. "brass lantern") */
  readonly targetName?: string;

  /** Instrument entity ID, if any (e.g. key for "unlock door with key") */
  readonly instrumentId?: string;

  /** Instrument display name */
  readonly instrumentName?: string;

  /** Scope level of the target */
  readonly scope?: 'carried' | 'reachable' | 'visible' | 'aware';

  /** Category for client grouping */
  readonly category: ContextActionCategory;

  /** Display priority — higher appears first (default 100) */
  readonly priority: number;

  /** Author-provided custom label (overrides auto-generated verb + target) */
  readonly label?: string;

  /** Whether this action is from auto-compute (true) or author annotation */
  readonly auto: boolean;
}

/**
 * Story-level configuration for the action menu system.
 *
 * Loaded from actions.yaml at build time. Controls caps, categories,
 * intransitive action lists, and sort order. All fields are optional;
 * the engine uses sensible defaults when absent.
 */
export interface ActionMenuConfig {
  /** Maximum total actions to return per turn (default 40) */
  readonly maxActions?: number;

  /** Maximum actions per entity (default 8) */
  readonly maxPerEntity?: number;

  /** Intransitive actions to include (e.g. ["look", "inventory", "wait"]) */
  readonly intransitives?: ReadonlyArray<string>;

  /** Category sort order — categories listed first appear first */
  readonly categoryOrder?: ReadonlyArray<ContextActionCategory>;
}
