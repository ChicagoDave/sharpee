/**
 * Event type definitions for the again action
 */

/**
 * Event data for when a command is being repeated
 */
export interface RepeatingCommandEventData {
  /** The original command text */
  originalCommand: string;
  
  /** The action ID being repeated */
  actionId: string;
  
  /** The turn number when the command was originally executed */
  turnNumber: number;
}

/**
 * Event data for executing a command
 */
export interface ExecuteCommandEventData {
  /** The parsed command to execute */
  command: any; // ParsedCommand type from core
  
  /** The original text of the command */
  originalText: string;
  
  /** Whether this is a repeat */
  isRepeat: boolean;
}

/**
 * Error data for again failures
 */
export interface AgainErrorData {
  reason: 'no_command_to_repeat' | 'cant_repeat_that' | 'cant_repeat_again' | 
          'cant_repeat_meta';
  action?: string;
}

/**
 * Complete event map for again action
 */
export interface AgainEventMap {
  'if.event.repeating_command': RepeatingCommandEventData;
  'if.event.execute_command': ExecuteCommandEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
  'action.error': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
