/**
 * @sharpee/ext-hunger
 *
 * A depleting satiety meter (ADR-263) over the ADR-262 banded-scalar crossing
 * engine — the engine's second consumer, proving it is scalar-agnostic (not
 * score-shaped): the scalar decays on a clock, ties to eating, and kills.
 *
 * Like `@sharpee/ext-scoring`, the config-free world piece (the eating handler)
 * is `registerWorld`; the config-dependent daemon and Chord narration are
 * lowered by the story-loader from `ir.hunger`.
 */

export {
  HUNGER_SEVERITY_KEY,
  HUNGER_WATCHER_ID,
  getHungerSeverity,
  setHungerSeverity,
  registerHunger,
  createHungerCrossingWatcher,
} from './hunger.js';
