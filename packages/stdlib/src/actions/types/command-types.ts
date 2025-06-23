import { IFActions } from '../../constants/if-actions';
import { IFEntity } from '@sharpee/world-model';
import { SemanticEvent } from '../../core-imports';
import { ActionContext } from './action-context';

/**
 * Definition for a command pattern that maps to an action.
 * This is used by the parser to identify commands and their requirements.
 */
export interface CommandDefinition {
  /** The primary verb ID used in the language file */
  verbId: string;
  
  /** The action this command maps to */
  mapsToAction: IFActions;
  
  /** Whether this command requires a direct object (noun) */
  requiresNoun?: boolean;
  
  /** Whether this command can have an indirect object */
  allowsIndirectObject?: boolean;
  
  /** Whether this command requires an indirect object */
  requiresIndirectObject?: boolean;
  
  /** Custom validation for the command pattern */
  validate?: (context: ParseContext) => boolean;
}

/**
 * Context provided to command validators
 */
export interface ParseContext {
  /** The matched verb */
  verb: string;
  
  /** The direct object if any */
  noun?: string;
  
  /** The indirect object if any */
  indirectObject?: string;
  
  /** Preposition used with indirect object */
  preposition?: string;
  
  /** Raw input from user */
  rawInput: string;
}

/**
 * Parsed command ready for execution
 */
export interface ParsedCommand {
  /** The action to execute */
  action: IFActions;
  
  /** The actor performing the action */
  actor: IFEntity;
  
  /** The direct object of the action */
  noun?: IFEntity;
  
  /** The indirect object of the action */
  indirectObject?: IFEntity;
  
  /** Any preposition used */
  preposition?: string;
  
  /** The original parse context */
  parseContext: ParseContext;
}

/**
 * Executor for an action.
 * This contains the actual logic for performing the action.
 */
export interface ActionExecutor {
  /** The action ID this executor handles */
  id: IFActions;
  
  /** Execute the action and return events */
  execute(command: ParsedCommand, context: ActionContext): SemanticEvent[];
  
  /** Optional pre-execution validation */
  validate?: (command: ParsedCommand, context: ActionContext) => boolean;
}

/**
 * Registry entry combining command definition and executor
 */
export interface ActionRegistryEntry {
  /** Command patterns that trigger this action */
  commands: CommandDefinition[];
  
  /** The executor for this action */
  executor: ActionExecutor;
}