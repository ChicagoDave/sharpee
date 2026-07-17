/**
 * Interceptor lifecycle engine barrel (ADR-228).
 *
 * The shared implementation of the ADR-118 interceptor lifecycle:
 * descriptors declare an action's interceptor surface; the engine runs
 * the D1-D4 rulings exactly once. See `lifecycle-engine.ts` for the
 * contract details.
 *
 * Owner: stdlib standard-action infrastructure (ADR-228).
 */

export {
  ActionLifecycleDescriptor,
  EntitySlotSpec,
  LifecycleContracts
} from './descriptor';

export {
  LifecycleState,
  ResolvedConsultation,
  ResolveLifecycleOptions,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from './lifecycle-engine';

export {
  MultiObjectItemState,
  runMultiObjectValidate,
  getMultiObjectLifecycle,
  runMultiObjectExecute,
  runMultiObjectReport
} from './multi-object-lifecycle';
