/**
 * Command syntax definitions and helpers
 * 
 * Provides structured definitions of command syntax for parsing and help generation
 */

import { IFActions } from '../actions/constants';

/**
 * Command syntax definition
 */
export interface CommandSyntax {
  /**
   * Action ID this syntax is for
   */
  actionId: string;
  
  /**
   * Primary verb
   */
  verb: string;
  
  /**
   * Alternative verbs/aliases
   */
  aliases: string[];
  
  /**
   * Syntax pattern (for documentation)
   */
  syntax: string;
  
  /**
   * Description of what the command does
   */
  description: string;
  
  /**
   * Usage examples
   */
  examples: string[];
  
  /**
   * Whether this command requires a direct object
   */
  requiresNoun: boolean;
  
  /**
   * Whether this command can take an indirect object
   */
  allowsSecondNoun: boolean;
}

/**
 * Standard command syntax definitions
 */
export const standardCommandSyntax: CommandSyntax[] = [
  // Movement
  {
    actionId: IFActions.GOING,
    verb: 'go',
    aliases: ['walk', 'move'],
    syntax: 'GO [direction]',
    description: 'Move in a cardinal direction',
    examples: ['north', 'go south', 'n', 'ne'],
    requiresNoun: false,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.ENTERING,
    verb: 'enter',
    aliases: ['get in', 'get into', 'go in', 'go into'],
    syntax: 'ENTER [object]',
    description: 'Enter a container or vehicle',
    examples: ['enter car', 'get in box'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.EXITING,
    verb: 'exit',
    aliases: ['leave', 'get out', 'go out'],
    syntax: 'EXIT',
    description: 'Exit the current container or vehicle',
    examples: ['exit', 'get out'],
    requiresNoun: false,
    allowsSecondNoun: false
  },
  
  // Object manipulation
  {
    actionId: IFActions.TAKING,
    verb: 'take',
    aliases: ['get', 'pick up', 'grab'],
    syntax: 'TAKE [object]',
    description: 'Pick up an object',
    examples: ['take key', 'get lamp', 'pick up ball'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.DROPPING,
    verb: 'drop',
    aliases: ['put down', 'discard'],
    syntax: 'DROP [object]',
    description: 'Put down something you are carrying',
    examples: ['drop key', 'put down lamp'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.PUTTING,
    verb: 'put',
    aliases: ['place', 'insert'],
    syntax: 'PUT [object] IN/ON [container/supporter]',
    description: 'Put an object in a container or on a supporter',
    examples: ['put key in box', 'place book on table'],
    requiresNoun: true,
    allowsSecondNoun: true
  },
  
  // Observation
  {
    actionId: IFActions.LOOKING,
    verb: 'look',
    aliases: ['l'],
    syntax: 'LOOK',
    description: 'Look around the current location',
    examples: ['look', 'l'],
    requiresNoun: false,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.EXAMINING,
    verb: 'examine',
    aliases: ['x', 'look at', 'inspect'],
    syntax: 'EXAMINE [object]',
    description: 'Look at something in detail',
    examples: ['examine box', 'x key', 'look at painting'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  
  // Container operations
  {
    actionId: IFActions.OPENING,
    verb: 'open',
    aliases: [],
    syntax: 'OPEN [object]',
    description: 'Open a container or door',
    examples: ['open door', 'open box'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.CLOSING,
    verb: 'close',
    aliases: ['shut'],
    syntax: 'CLOSE [object]',
    description: 'Close a container or door',
    examples: ['close door', 'shut box'],
    requiresNoun: true,
    allowsSecondNoun: false
  },
  
  // Meta commands
  {
    actionId: IFActions.INVENTORY,
    verb: 'inventory',
    aliases: ['inv', 'i'],
    syntax: 'INVENTORY',
    description: 'List what you are carrying',
    examples: ['inventory', 'inv', 'i'],
    requiresNoun: false,
    allowsSecondNoun: false
  },
  {
    actionId: IFActions.HELP,
    verb: 'help',
    aliases: ['?'],
    syntax: 'HELP [command]',
    description: 'Get help on commands',
    examples: ['help', '?', 'help take'],
    requiresNoun: false,
    allowsSecondNoun: false
  }
];

/**
 * Get syntax for a specific action
 */
export function getCommandSyntax(actionId: string): CommandSyntax | undefined {
  return standardCommandSyntax.find(s => s.actionId === actionId);
}

/**
 * Get all verbs and aliases for an action
 */
export function getCommandVerbs(actionId: string): string[] {
  const syntax = getCommandSyntax(actionId);
  if (!syntax) return [];
  return [syntax.verb, ...syntax.aliases];
}

/**
 * Find action ID by verb
 */
export function findActionByVerb(verb: string): string | undefined {
  const normalizedVerb = verb.toLowerCase();
  for (const syntax of standardCommandSyntax) {
    if (syntax.verb === normalizedVerb || syntax.aliases.includes(normalizedVerb)) {
      return syntax.actionId;
    }
  }
  return undefined;
}
