/**
 * Send Action Types
 *
 * Used for the mail order puzzle - "send for brochure" triggers
 * a brochure to appear in the mailbox with the Don Woods stamp.
 */

export const SEND_ACTION_ID = 'dungeo.action.send' as const;

export const SendMessages = {
  SEND_FOR_BROCHURE: 'dungeo.send.brochure',
  ALREADY_SENT: 'dungeo.send.already_sent',
  NO_TARGET: 'dungeo.send.no_target',
  BROCHURE_KNOCK: 'dungeo.send.knock',
} as const;
