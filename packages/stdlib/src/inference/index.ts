/**
 * Inference module (ADR-104)
 *
 * Provides implicit object inference functionality.
 *
 * Note: Implicit take is handled per-action via context.requireCarriedOrImplicitTake()
 * rather than at the command level. See ADR-104 for rationale.
 */

export {
  InferenceResult,
  tryInferTarget,
  meetsActionRequirements,
  findValidTargets
} from './implicit-inference';
