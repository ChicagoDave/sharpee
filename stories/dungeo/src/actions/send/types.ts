/**
 * Send Action Types
 *
 * Used for the mail order puzzle - "send for brochure" triggers
 * a brochure to appear in the mailbox with the Don Woods stamp.
 */

export const SEND_ACTION_ID = 'dungeo.action.send' as const;

export const SendMessages = {
  SEND_FOR_BROCHURE: 'dungeo.send.brochure',
  BROCHURE_ON_WAY: 'dungeo.send.on_the_way',       // ordered but not delivered (BRFLAG1)
  BROCHURE_ALREADY_RECEIVED: 'dungeo.send.already_received', // delivered (BRFLAG2)
  NO_TARGET: 'dungeo.send.no_target',
} as const;
