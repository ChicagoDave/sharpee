/**
 * Chimney Blocked Action Types
 *
 * From MDL source (act1.254 lines 133-146):
 * - Max 2 items in inventory
 * - Must have lamp
 * - Cannot be empty-handed
 */

export const CHIMNEY_BLOCKED_ACTION_ID = 'dungeo.chimney.blocked';

export const ChimneyBlockedMessages = {
  TOO_MUCH_BAGGAGE: 'dungeo.chimney.too_much_baggage',
  EMPTY_HANDED: 'dungeo.chimney.empty_handed'
} as const;

export type ChimneyBlockReason = 'baggage' | 'empty';
