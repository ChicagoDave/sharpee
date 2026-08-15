/**
 * Act-detection barrel (ADR-318 D4/D7/D12a)
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   derivedTopicFor, DetectedAct.
 * Owner context: @sharpee/character / act-detection
 */

export {
  detectActs,
  revealConfidedTopic,
  witnessActs,
  derivedTopicFor,
  type DetectedAct,
} from './act-detection.js';
