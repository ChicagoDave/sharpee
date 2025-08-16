// packages/core/src/execution/types.ts

/**
 * Generic context interface for execution
 * Domain-specific contexts should extend this interface
 */
export interface IExecutionContext {
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
export interface ICommandHandler<TCommand = any, TResult = any> {
  /**
   * The verb or verbs that this handler can process
   */
  verbs: string[];

  /**
   * Check if this handler can handle the given command
   */
  canHandle: (command: TCommand, context: IExecutionContext) => boolean;

  /**
   * Execute the command
   */
  execute: (command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult;

  /**
   * Validate the command before execution
   */
  validate?: (command: TCommand, context: IExecutionContext) => { valid: boolean; error?: string };
}

/**
 * Generic action interface
 * Actions are handlers with unique identifiers
 */
export interface IAction<TCommand = any, TResult = any> extends ICommandHandler<TCommand, TResult> {
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
export interface ICommandRouter<TCommand = any, TResult = any> {
  /**
   * Register a command handler
   */
  registerHandler: (handler: ICommandHandler<TCommand, TResult>) => void;

  /**
   * Unregister a command handler
   */
  unregisterHandler: (handler: ICommandHandler<TCommand, TResult>) => void;

  /**
   * Get a handler for the command
   */
  getHandler: (command: TCommand, context: IExecutionContext) => ICommandHandler<TCommand, TResult> | undefined;

  /**
   * Route and execute a command
   */
  execute: (command: TCommand, context: IExecutionContext, options?: ICommandExecutionOptions<TCommand>) => Promise<TResult>;

  /**
   * Process the result of command execution and return text output
   */
  processResult?: (result: TResult) => string;
}

/**
 * Generic factory interface for creating handlers
 */
export interface ICommandHandlerFactory<TCommand = any, TResult = any> {
  /**
   * Create a standard command handler
   */
  createHandler: (config: {
    verbs: string[];
    canHandle?: (command: TCommand, context: IExecutionContext) => boolean;
    execute: (command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult;
    validate?: (command: TCommand, context: IExecutionContext) => { valid: boolean; error?: string };
  }) => ICommandHandler<TCommand, TResult>;
}

/**
 * Options for command execution
 */
export interface ICommandExecutionOptions<TCommand = any, TResult = any> {
  /**
   * Whether to skip validation
   */
  skipValidation?: boolean;

  /**
   * Custom validation callback
   */
  customValidation?: (command: TCommand, context: IExecutionContext) => { valid: boolean; error?: string };

  /**
   * Pre-execution hooks
   */
  preExecute?: ((command: TCommand, context: IExecutionContext) => Promise<void> | void)[];

  /**
   * Post-execution hooks
   */
  postExecute?: ((result: TResult, command: TCommand, context: IExecutionContext) => Promise<TResult> | TResult)[];
}
