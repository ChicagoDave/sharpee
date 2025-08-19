// packages/world-model/src/traits/exit/exitTrait.ts

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Exit trait for entities that represent passages between locations.
 * Used for doors, passages, portals, and any custom exits like "xyzzy".
 * 
 * This trait contains only data - all behavior is in ExitBehavior.
 */
export class ExitTrait implements ITrait {
  static readonly type = TraitType.EXIT;
  readonly type = TraitType.EXIT;
  
  /** Source location ID (must be an entity ID, not a name) */
  from: string;
  
  /** Destination location ID (must be an entity ID, not a name) */
  to: string;
  
  /** Standard direction (north, south, up, etc.) - optional */
  direction?: string;
  
  /** Command to use this exit (e.g., "go north", "enter portal", "xyzzy") */
  command: string;
  
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
  
  constructor(data: Partial<ExitTrait>) {
    if (!data.from || !data.to || !data.command) {
      throw new Error('ExitTrait requires from, to, and command');
    }
    
    this.from = data.from;
    this.to = data.to;
    this.command = data.command;
    
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