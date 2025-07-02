// packages/core/src/types/result.ts

/**
 * Generic result type for operations that can succeed or fail
 * This is a discriminated union type - check the 'success' field to narrow the type
 */
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Convenience functions for working with Result types
 */
export const Result = {
  /**
   * Create a successful result
   */
  ok<T>(value: T): Result<T, any> {
    return { success: true, value };
  },
  
  /**
   * Create a failed result
   */
  fail<E>(error: E): Result<any, E> {
    return { success: false, error };
  },
  
  /**
   * Check if a result is successful
   */
  isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success;
  },
  
  /**
   * Check if a result is a failure
   */
  isFail<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return !result.success;
  },
  
  /**
   * Map a successful result to a new value
   */
  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    if (result.success) {
      return Result.ok(fn(result.value));
    }
    return result;
  },
  
  /**
   * Map a failed result to a new error
   */
  mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    if (!result.success) {
      return Result.fail(fn(result.error));
    }
    return result;
  },
  
  /**
   * Chain results together
   */
  flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    if (result.success) {
      return fn(result.value);
    }
    return result;
  },
  
  /**
   * Get the value or throw an error
   */
  unwrap<T, E>(result: Result<T, E>): T {
    if (result.success) {
      return result.value;
    }
    throw result.error;
  },
  
  /**
   * Get the value or return a default
   */
  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    if (result.success) {
      return result.value;
    }
    return defaultValue;
  }
};

/**
 * Generic command result type for operations that produce events
 * Domain-specific implementations can extend this
 */
export interface CommandResult<TEvent = any> {
  /**
   * Whether the command was successful
   */
  success: boolean;

  /**
   * Events generated during command execution
   */
  events: TEvent[];

  /**
   * Error message if the command failed
   */
  error?: string;

  /**
   * Additional metadata about the command execution
   */
  metadata?: Record<string, unknown>;
}
