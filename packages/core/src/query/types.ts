/**
 * Core types for the PC communication query system
 * 
 * These types define the structure of queries, responses, and validation
 * for the client query system (ADR-018).
 */

/**
 * Sources that can initiate queries
 */
export enum QuerySource {
  /** System-level queries (save, quit, restart) */
  SYSTEM = 'system',
  /** Parser disambiguation queries */
  DISAMBIGUATION = 'disambiguation',
  /** NPC dialogue queries */
  NPC = 'npc',
  /** Game mechanic queries (passwords, combinations) */
  GAME_MECHANIC = 'mechanic',
  /** Narrative-driven queries */
  NARRATIVE = 'narrative'
}

/**
 * Types of queries that can be presented
 */
export enum QueryType {
  /** Simple yes/no question */
  YES_NO = 'yes_no',
  /** Multiple choice with predefined options */
  MULTIPLE_CHOICE = 'multiple_choice',
  /** Open-ended text input */
  FREE_TEXT = 'free_text',
  /** Numeric input only */
  NUMERIC = 'numeric',
  /** Special type for disambiguation */
  DISAMBIGUATION = 'disambiguation'
}

/**
 * A query waiting for player response
 */
export interface IPendingQuery {
  /** Unique identifier for this query */
  id: string;
  
  /** Source that initiated the query */
  source: QuerySource;
  
  /** Type of query */
  type: QueryType;
  
  /** Message ID for the query prompt */
  messageId: string;
  
  /** Parameters for message formatting */
  messageParams?: Record<string, any>;
  
  /** Available options (for multiple choice) */
  options?: string[];
  
  /** Additional context for the query handler */
  context: IQueryContext;
  
  /** Whether the player can interrupt this query */
  allowInterruption: boolean;
  
  /** Name of the validator to use */
  validator?: string;
  
  /** Optional timeout in milliseconds */
  timeout?: number;
  
  /** Timestamp when query was created */
  created: number;
  
  /** Priority level (higher = more important) */
  priority?: number;
}

/**
 * Context data passed with queries
 */
export interface IQueryContext {
  /** Query-specific data */
  [key: string]: any;
  
  /** For quit queries */
  score?: number;
  maxScore?: number;
  moves?: number;
  hasUnsavedProgress?: boolean;
  nearComplete?: boolean;
  
  /** For save queries */
  existingFile?: string;
  lastSaveTime?: number;
  
  /** For disambiguation */
  candidates?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  
  /** For NPC queries */
  npcId?: string;
  npcName?: string;
  topic?: string;
  
  /** For game mechanic queries */
  attempts?: number;
  maxAttempts?: number;
  hint?: string;
}

/**
 * Player's response to a query
 */
export interface IQueryResponse {
  /** ID of the query being responded to */
  queryId: string;
  
  /** Raw input from the player */
  rawInput: string;
  
  /** Processed/normalized response */
  response: string | number | boolean;
  
  /** Selected option index (for multiple choice) */
  selectedIndex?: number;
  
  /** Whether this was an interruption */
  wasInterrupted: boolean;
  
  /** Timestamp of response */
  timestamp: number;
}

/**
 * Function to validate a response
 */
export type QueryValidator = (response: string, query: IPendingQuery) => IValidationResult;

/**
 * Result of validating a response
 */
export interface IValidationResult {
  /** Whether the response is valid */
  valid: boolean;
  
  /** Error message if invalid */
  message?: string;
  
  /** Normalized/parsed response value */
  normalized?: any;
  
  /** Hint for the player */
  hint?: string;
}

/**
 * Handler for processing query responses
 */
export interface IQueryHandler {
  /** Query types this handler can process */
  canHandle: (query: IPendingQuery) => boolean;
  
  /** Process a validated response */
  handleResponse: (response: IQueryResponse, query: IPendingQuery) => void;
  
  /** Handle query timeout */
  handleTimeout?: (query: IPendingQuery) => void;
  
  /** Handle query cancellation */
  handleCancel?: (query: IPendingQuery) => void;
}

/**
 * Query manager state
 */
export interface IQueryState {
  /** Currently active query */
  pendingQuery?: IPendingQuery;
  
  /** Stack of queries waiting to be presented */
  queryStack: IPendingQuery[];
  
  /** History of recent queries and responses */
  history: Array<{
    query: IPendingQuery;
    response?: IQueryResponse;
    result: 'answered' | 'timeout' | 'cancelled';
  }>;
  
  /** Whether input is currently being routed to query system */
  interceptingInput: boolean;
}

/**
 * Events emitted by the query system
 */
export interface IQueryEvents {
  /** A new query needs to be presented to the player */
  'query:pending': (query: IPendingQuery) => void;
  
  /** A query was answered */
  'query:answered': (response: IQueryResponse, query: IPendingQuery) => void;
  
  /** A query timed out */
  'query:timeout': (query: IPendingQuery) => void;
  
  /** A query was cancelled */
  'query:cancelled': (query: IPendingQuery) => void;
  
  /** A query was interrupted by a command */
  'query:interrupted': (query: IPendingQuery, command: string) => void;
  
  /** Validation failed for a response */
  'query:invalid': (response: string, result: IValidationResult, query: IPendingQuery) => void;
}

/**
 * Standard validators
 */
export const StandardValidators = {
  /** Validate yes/no responses */
  yesNo: (response: string): IValidationResult => {
    const normalized = response.toLowerCase().trim();
    const yesVariants = ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay'];
    const noVariants = ['no', 'n', 'nope', 'nah', 'cancel'];
    
    if (yesVariants.includes(normalized)) {
      return { valid: true, normalized: true };
    }
    if (noVariants.includes(normalized)) {
      return { valid: true, normalized: false };
    }
    
    return {
      valid: false,
      message: 'Please answer yes or no.',
      hint: 'You can also use y/n'
    };
  },
  
  /** Validate numeric responses */
  numeric: (response: string, min?: number, max?: number): IValidationResult => {
    const num = parseInt(response.trim(), 10);
    
    if (isNaN(num)) {
      return {
        valid: false,
        message: 'Please enter a number.'
      };
    }
    
    if (min !== undefined && num < min) {
      return {
        valid: false,
        message: `Please enter a number at least ${min}.`
      };
    }
    
    if (max !== undefined && num > max) {
      return {
        valid: false,
        message: `Please enter a number no more than ${max}.`
      };
    }
    
    return { valid: true, normalized: num };
  },
  
  /** Validate multiple choice responses */
  multipleChoice: (response: string, options: string[]): IValidationResult => {
    const trimmed = response.trim();
    
    // Check if it's a number
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) {
      return { valid: true, normalized: num - 1 };
    }
    
    // Check if it matches an option (case insensitive)
    const index = options.findIndex(opt => 
      opt.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(opt.toLowerCase())
    );
    
    if (index >= 0) {
      return { valid: true, normalized: index };
    }
    
    return {
      valid: false,
      message: `Please choose a number 1-${options.length} or type part of an option.`
    };
  }
};
