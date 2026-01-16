/**
 * Inference module (ADR-104)
 *
 * Provides implicit inference and implicit take functionality
 */

export {
  InferenceResult,
  tryInferTarget,
  meetsActionRequirements,
  findValidTargets
} from './implicit-inference';
