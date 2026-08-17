/**
 * Act-detection barrel (ADR-318 D4/D7/D12a; statement site per ADR-320 D11)
 *
 * Public interface: detectActs, revealConfidedTopic, witnessActs,
 *   witnessStatement, derivedTopicFor, DetectedAct.
 * Owner context: @sharpee/character / act-detection
 */

export {
  detectActs,
  revealConfidedTopic,
  witnessActs,
  witnessStatement,
  derivedTopicFor,
  type DetectedAct,
} from './act-detection.js';
