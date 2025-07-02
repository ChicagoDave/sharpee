/**
 * Parsed command type
 * 
 * This is the output of the command resolver after validating
 * candidate commands against the world model.
 */

import { IFEntity } from '@sharpee/world-model';

/**
 * A fully resolved and validated command ready for execution
 * @deprecated Use ValidatedCommand from @sharpee/world-model instead
 */
export interface ResolvedCommand {
  /**
   * The action to perform
   */
  action: string;
  
  /**
   * The entity performing the action (usually the player)
   */
  actor: IFEntity;
  
  /**
   * Primary target of the action
   */
  noun?: IFEntity;
  
  /**
   * Secondary target or instrument
   */
  secondNoun?: IFEntity;
  
  /**
   * Raw text that was parsed to identify the noun
   */
  nounText?: string;
  
  /**
   * Raw text that was parsed to identify the second noun
   */
  secondNounText?: string;
  
  /**
   * Original user input
   */
  originalInput?: string;
  
  /**
   * Additional parameters from parsing
   */
  params?: Record<string, unknown>;
}
