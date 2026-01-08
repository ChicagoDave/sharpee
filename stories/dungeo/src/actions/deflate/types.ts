/**
 * Deflate Action Types
 *
 * Used for deflating the rubber boat by opening the valve.
 * Pattern: "deflate boat", "open valve"
 */

export const DEFLATE_ACTION_ID = 'dungeo.action.deflate' as const;

export const DeflateMessages = {
  SUCCESS: 'dungeo.deflate.success',
  ALREADY_DEFLATED: 'dungeo.deflate.already_deflated',
  NOT_DEFLATABLE: 'dungeo.deflate.not_deflatable',
  CANT_REACH: 'dungeo.deflate.cant_reach',
} as const;
