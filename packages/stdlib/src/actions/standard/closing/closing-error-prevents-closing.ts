/**
 * Error data when something prevents closing
 * 
 * This error includes additional context about what's blocking the action
 */

export interface PreventsClosingErrorData {
  /**
   * Description of what's preventing the closing
   * 
   * TODO: This should be refactored to use entity IDs instead of text.
   * Current implementation uses English text in traits which is a 
   * localization anti-pattern. Should be:
   * - obstacleId: EntityId of blocking entity
   * - obstacleName: string (for message params)  
   * - preventionType: string (for message template selection)
   */
  obstacle: string;
}
