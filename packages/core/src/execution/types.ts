// packages/core/src/execution/types.ts

/**
 * Generic context interface for execution
 * Domain-specific contexts should extend this interface
 */
export interface ExecutionContext {
  /**
   * Additional context data
   */
  [key: string]: any;
}

/**
 * Generic handler interface for any command-like system
 * This is kept generic - specific implementations (IF, visual novel, etc)
 * should define their own command and result types
 */
export interface CommandHandler<TCommand = any, TResult = any> {
  /**
   * The verb or verbs that this handler can process
   */
  verbs: string[];

  /**
   * Check if this handler can handle the given command
   */
  canHandle: (command: TCommand, context: ExecutionContext) => boolean;

  /**
   * Execute the command
   */
  execute: (command: TCommand, context: ExecutionContext) => Promise<TResult> | TResult;

  /**
   * Validate the command before execution
   */
  validate?: (command: TCommand, context: ExecutionContext) => { valid: boolean; error?: string };
}

/**
 * Generic action interface
 * Actions are handlers with unique identifiers
 */
export interface Action<TCommand = any, TResult = any> extends CommandHandler<TCommand, TResult> {
  /**
   * Unique identifier for the action
   */
  id: string;

  /**
   * Action metadata (if any)
   */
  metadata?: any;
}

/**
 * Generic router interface for command-like systems
 */
export interface CommandRouter<TCommand = any, TResult = any> {
  /**
   * Register a command handler
   */
  registerHandler: (handler: CommandHandler<TCommand, TResult>) => void;

  /**
   * Unregister a command handler
   */
  unregisterHandler: (handler: CommandHandler<TCommand, TResult>) => void;

  /**
   * Get a handler for the command
   */
  getHandler: (command: TCommand, context: ExecutionContext) => CommandHandler<TCommand, TResult> | undefined;

  /**
   * Route and execute a command
   */
  execute: (command: TCommand, context: ExecutionContext, options?: CommandExecutionOptions<TCommand>) => Promise<TResult>;

  /**
   * Process the result of command execution and return text output
   */
  processResult?: (result: TResult) => string;
}

/**
 * Generic factory interface for creating handlers
 */
export interface CommandHandlerFactory<TCommand = any, TResult = any> {
  /**
   * Create a standard command handler
   */
  createHandler: (config: {
    verbs: string[];
    canHandle?: (command: TCommand, context: ExecutionContext) => boolean;
    execute: (command: TCommand, context: ExecutionContext) => Promise<TResult> | TResult;
    validate?: (command: TCommand, context: ExecutionContext) => { valid: boolean; error?: string };
  }) => CommandHandler<TCommand, TResult>;
}

/**
 * Options for command execution
 */
export interface CommandExecutionOptions<TCommand = any, TResult = any> {
  /**
   * Whether to skip validation
   */
  skipValidation?: boolean;

  /**
   * Custom validation callback
   */
  customValidation?: (command: TCommand, context: ExecutionContext) => { valid: boolean; error?: string };

  /**
   * Pre-execution hooks
   */
  preExecute?: ((command: TCommand, context: ExecutionContext) => Promise<void> | void)[];

  /**
   * Post-execution hooks
   */
  postExecute?: ((result: TResult, command: TCommand, context: ExecutionContext) => Promise<TResult> | TResult)[];
}
