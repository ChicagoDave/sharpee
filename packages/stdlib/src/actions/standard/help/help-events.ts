/**
 * Event type definitions for the help action
 */

/**
 * Event data for when help is displayed
 */
export interface HelpDisplayedEventData {
  /** Whether general help was requested */
  generalHelp?: boolean;
  
  /** Whether help for a specific topic was requested */
  specificHelp?: boolean;
  
  /** The type of help being displayed */
  helpType?: string;
  
  /** The specific topic/action requested help for */
  helpRequest?: string;
  
  /** Whether this is the first time help was requested */
  firstTime?: boolean;
  
  /** Available help sections */
  sections?: string[];
  
  /** Whether hints are available in the game */
  hintsAvailable?: boolean;
}

/**
 * Complete event map for help action
 */
export interface HelpEventMap {
  'if.event.help_displayed': HelpDisplayedEventData;
  'action.success': {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
  };
}
