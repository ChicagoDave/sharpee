export { TurnPlugin } from './turn-plugin.js';
export { TurnPluginContext, TurnPluginActionResult } from './turn-plugin-context.js';
export { PluginRegistry } from './plugin-registry.js';

// Turn-phase bands (ADR-332)
export { TURN_BANDS, TURN_BAND_ORDER, bandOf } from './turn-bands.js';
export type { TurnBand, TurnBandName } from './turn-bands.js';

// Banded-scalar crossing engine (ADR-262)
export {
  createBandDataWatcher,
  createBandNarrator,
} from './band-crossing.js';
export type {
  BandAnnounceMode,
  BandRung,
  BandCrossingSpan,
  BandCrossedData,
  BandCrossingConfig,
  BandWatcherState,
  BandNarrationParams,
  BandNarratorConfig,
} from './band-crossing.js';
