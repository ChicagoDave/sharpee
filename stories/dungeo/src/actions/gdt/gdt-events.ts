/**
 * GDT Event Types
 *
 * Semantic events emitted by GDT actions.
 */

/**
 * Event data for entering GDT mode
 */
export interface GDTEnteredEventData {
  /** Welcome message (pre-formatted with newlines) */
  message: string;
}

/**
 * Event data for exiting GDT mode
 */
export interface GDTExitedEventData {
  /** Exit message */
  message: string;
}

/**
 * Event data for GDT command output
 */
export interface GDTOutputEventData {
  /** Command code executed */
  code: string;
  /** Output (pre-formatted with newlines) */
  output: string;
  /** Whether command succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Event data for unknown GDT command
 */
export interface GDTUnknownCommandEventData {
  /** The input that wasn't recognized */
  input: string;
  /** Error message */
  message: string;
}

/**
 * Event types
 */
export const GDTEventTypes = {
  ENTERED: 'dungeo.gdt.entered',
  EXITED: 'dungeo.gdt.exited',
  OUTPUT: 'dungeo.gdt.output',
  UNKNOWN_COMMAND: 'dungeo.gdt.unknown_command'
} as const;
