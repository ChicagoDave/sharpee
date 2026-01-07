/**
 * Inflate Action Types
 *
 * Used for inflating the rubber boat with the hand pump.
 * Pattern: "inflate boat with pump", "inflate boat"
 */

export const INFLATE_ACTION_ID = 'dungeo.action.inflate' as const;

export const InflateMessages = {
  SUCCESS: 'dungeo.inflate.success',
  NO_PUMP: 'dungeo.inflate.no_pump',
  ALREADY_INFLATED: 'dungeo.inflate.already_inflated',
  NOT_INFLATABLE: 'dungeo.inflate.not_inflatable',
  CANT_REACH: 'dungeo.inflate.cant_reach',
} as const;
