// packages/world-model/src/traits/exit/exitTrait.ts

import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

/**
 * Exit trait for entities that represent passages between locations.
 * Used for doors, passages, portals, and any custom exits like "xyzzy".
 *
 * `from`, `to` and `command` may each be unset while a story is still composing
 * the passage — the trait polices nothing (ADR-346 D7). `ExitBehavior` is where a
 * passage is required to be complete before it is used: `createBidirectional`
 * already refuses incomplete data of its own accord.
 *
 * This trait contains only data - all behavior is in ExitBehavior.
 */
export class ExitTrait implements ITrait {
  static readonly type = TraitType.EXIT;
  readonly type = TraitType.EXIT;
  
  /** Source location ID (an entity ID, not a name) — unset while unplaced. */
  from?: string;
  
  /** Destination location ID (an entity ID, not a name) — unset until the story supplies it. */
  to?: string;
  
  /** Standard direction (north, south, up, etc.) - optional */
  direction?: string;
  
  /** Command to use this exit (e.g., "go north", "enter portal", "xyzzy") — unset until named. */
  command?: string;
  
  /** Alternative commands that work for this exit */
  aliases?: string[];
  
  /** Whether this exit is visible to players */
  visible: boolean = true;
  
  /** Whether this exit appears in room descriptions */
  listed: boolean = true;
  
  /** Whether this exit works in reverse (bidirectional) */
  bidirectional: boolean = false;
  
  /** The reverse command if bidirectional */
  reverseCommand?: string;
  
  /** The reverse direction if bidirectional */
  reverseDirection?: string;
  
  /** Custom message when using this exit */
  useMessage?: string;
  
  /** Custom message when this exit is blocked */
  blockedMessage?: string;
  
  /** Whether this exit requires special conditions */
  conditional: boolean = false;
  
  /** Condition identifier (checked by behaviors) */
  conditionId?: string;
  
  constructor(data: Partial<ExitTrait> = {}) {
    if (data.from !== undefined) this.from = data.from;
    if (data.to !== undefined) this.to = data.to;
    if (data.command !== undefined) this.command = data.command;
    
    if (data.direction !== undefined) this.direction = data.direction;
    if (data.aliases !== undefined) this.aliases = data.aliases;
    if (data.visible !== undefined) this.visible = data.visible;
    if (data.listed !== undefined) this.listed = data.listed;
    if (data.bidirectional !== undefined) this.bidirectional = data.bidirectional;
    if (data.reverseCommand !== undefined) this.reverseCommand = data.reverseCommand;
    if (data.reverseDirection !== undefined) this.reverseDirection = data.reverseDirection;
    if (data.useMessage !== undefined) this.useMessage = data.useMessage;
    if (data.blockedMessage !== undefined) this.blockedMessage = data.blockedMessage;
    if (data.conditional !== undefined) this.conditional = data.conditional;
    if (data.conditionId !== undefined) this.conditionId = data.conditionId;
  }
}