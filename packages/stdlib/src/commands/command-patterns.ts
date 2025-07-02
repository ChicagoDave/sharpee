/**
 * Command pattern definitions for standard IF actions
 * 
 * These patterns define how user input maps to actions.
 * Used by parsers to convert text into ParsedCommand objects.
 */

import { CommandPattern } from '../language/if-language-provider';
import { IFActions } from '../actions/constants';

/**
 * Movement command patterns
 */
export const movementPatterns: CommandPattern[] = [
  // Cardinal directions
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(north|n)$/i,
    example: 'north',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(south|s)$/i,
    example: 'south',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(east|e)$/i,
    example: 'east',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(west|w)$/i,
    example: 'west',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(northeast|ne)$/i,
    example: 'northeast',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(northwest|nw)$/i,
    example: 'northwest',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(southeast|se)$/i,
    example: 'southeast',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(southwest|sw)$/i,
    example: 'southwest',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(up|u)$/i,
    example: 'up',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(down|d)$/i,
    example: 'down',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(in|inside)$/i,
    example: 'in',
    priority: 10
  },
  {
    actionId: IFActions.GOING,
    pattern: /^(go\s+)?(out|outside)$/i,
    example: 'out',
    priority: 10
  },
  
  // Enter/exit
  {
    actionId: IFActions.ENTERING,
    pattern: /^(enter|get\s+in|get\s+into|go\s+in|go\s+into)\s+(.+)$/i,
    example: 'enter car',
    priority: 9
  },
  {
    actionId: IFActions.EXITING,
    pattern: /^(exit|leave|get\s+out|go\s+out)$/i,
    example: 'exit',
    priority: 9
  }
];

/**
 * Object manipulation command patterns
 */
export const manipulationPatterns: CommandPattern[] = [
  // Taking
  {
    actionId: IFActions.TAKING,
    pattern: /^(take|get|pick\s+up|grab)\s+(.+)$/i,
    example: 'take key',
    priority: 8
  },
  
  // Dropping
  {
    actionId: IFActions.DROPPING,
    pattern: /^(drop|put\s+down|discard)\s+(.+)$/i,
    example: 'drop key',
    priority: 8
  },
  
  // Putting
  {
    actionId: IFActions.PUTTING,
    pattern: /^(put|place|insert)\s+(.+)\s+(in|into|on|onto)\s+(.+)$/i,
    example: 'put key in box',
    priority: 8
  },
  
  // Removing
  {
    actionId: IFActions.REMOVING,
    pattern: /^(remove|take\s+out)\s+(.+)\s+from\s+(.+)$/i,
    example: 'remove key from box',
    priority: 8
  }
];

/**
 * Observation command patterns
 */
export const observationPatterns: CommandPattern[] = [
  // Looking
  {
    actionId: IFActions.LOOKING,
    pattern: /^(look|l)$/i,
    example: 'look',
    priority: 10
  },
  {
    actionId: IFActions.LOOKING,
    pattern: /^(look\s+around|look\s+about)$/i,
    example: 'look around',
    priority: 9
  },
  
  // Examining
  {
    actionId: IFActions.EXAMINING,
    pattern: /^(examine|x|look\s+at|inspect)\s+(.+)$/i,
    example: 'examine box',
    priority: 8
  },
  
  // Searching
  {
    actionId: IFActions.SEARCHING,
    pattern: /^(search|look\s+in|look\s+inside)\s+(.+)$/i,
    example: 'search box',
    priority: 8
  }
];

/**
 * Container command patterns
 */
export const containerPatterns: CommandPattern[] = [
  // Opening
  {
    actionId: IFActions.OPENING,
    pattern: /^open\s+(.+)$/i,
    example: 'open door',
    priority: 8
  },
  
  // Closing
  {
    actionId: IFActions.CLOSING,
    pattern: /^close\s+(.+)$/i,
    example: 'close door',
    priority: 8
  },
  
  // Locking
  {
    actionId: IFActions.LOCKING,
    pattern: /^lock\s+(.+)(?:\s+with\s+(.+))?$/i,
    example: 'lock door with key',
    priority: 8
  },
  
  // Unlocking
  {
    actionId: IFActions.UNLOCKING,
    pattern: /^unlock\s+(.+)(?:\s+with\s+(.+))?$/i,
    example: 'unlock door with key',
    priority: 8
  }
];

/**
 * Meta command patterns
 */
export const metaPatterns: CommandPattern[] = [
  // Inventory
  {
    actionId: IFActions.INVENTORY,
    pattern: /^(inventory|inv|i)$/i,
    example: 'inventory',
    priority: 10
  },
  
  // Waiting
  {
    actionId: IFActions.WAITING,
    pattern: /^(wait|z)$/i,
    example: 'wait',
    priority: 10
  },
  
  // Help
  {
    actionId: IFActions.HELP,
    pattern: /^(help|\?)$/i,
    example: 'help',
    priority: 10
  }
];

/**
 * All standard command patterns
 */
export const standardCommandPatterns: CommandPattern[] = [
  ...movementPatterns,
  ...manipulationPatterns,
  ...observationPatterns,
  ...containerPatterns,
  ...metaPatterns
];

/**
 * Get command patterns by action ID
 */
export function getCommandPatternsForAction(actionId: string): CommandPattern[] {
  return standardCommandPatterns.filter(p => p.actionId === actionId);
}

/**
 * Get the highest priority pattern for an action
 */
export function getPrimaryCommandPattern(actionId: string): CommandPattern | undefined {
  const patterns = getCommandPatternsForAction(actionId);
  if (patterns.length === 0) return undefined;
  
  return patterns.reduce((best, current) => 
    (current.priority || 0) > (best.priority || 0) ? current : best
  );
}
