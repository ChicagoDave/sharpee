export { TurnPlugin } from './turn-plugin.js';
export { TurnPluginContext, TurnPluginActionResult } from './turn-plugin-context.js';
export { PluginRegistry } from './plugin-registry.js';

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
