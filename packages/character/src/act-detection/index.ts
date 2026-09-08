/**
 * Act-detection barrel: what a witnessed event means, and what an NPC does
 * with it.
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   witnessStatement, derivedTopicFor, DetectedAct; observeEvent,
 *   filterPerception, injectHallucinations, DefaultStateTransitions,
 *   StateTransitionRule.
 * Owner context: @sharpee/character / act-detection
 *
 * References:
 *   ADR-318 D4/D7/D12a — act detection and witnessed aliases.
 *   ADR-320 D11 — the statement site.
 *   ADR-339 D2 — the observer lives here, beside the sub-step that calls it.
 */

export {
  detectActs,
  revealConfidedTopic,
  witnessActs,
  witnessStatement,
  derivedTopicFor,
  type DetectedAct,
} from './act-detection.js';
export {
  observeEvent,
  filterPerception,
  injectHallucinations,
  DefaultStateTransitions,
  type StateTransitionRule,
} from './character-observer.js';
