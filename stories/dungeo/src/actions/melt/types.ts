/**
 * Melt Action Types
 *
 * MDL GLACIER function handles MELT verb (act1.mud:389-398).
 * "melt ice/glacier with torch" → partial melt, player drowns.
 */

export const MELT_ACTION_ID = 'dungeo.action.melt';

export const MeltMessages = {
  DEATH: 'dungeo.glacier.melt_death',
  NO_FLAME: 'dungeo.glacier.melt_no_flame',
  NOTHING: 'dungeo.glacier.melt_nothing',
  NO_INSTRUMENT: 'dungeo.glacier.melt_no_instrument'
} as const;
