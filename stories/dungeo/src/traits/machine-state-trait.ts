/**
 * Machine State Trait
 *
 * Trait for tracking the coal machine's activation state.
 * The machine can only be used once to convert coal to diamond.
 *
 * Replaces the anti-pattern of:
 * - (machine as any).machineActivated = true
 *
 * This trait persists through checkpoint save/restore.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the machine state trait
 */
export interface MachineStateTraitConfig {
  /** Whether the machine has been activated (one-time use) */
  isActivated: boolean;
}

/**
 * Machine State Trait
 *
 * Tracks whether the coal machine has been used.
 * Once activated, the machine cannot be used again.
 */
export class MachineStateTrait implements ITrait {
  static readonly type = 'dungeo.trait.machine_state' as const;

  readonly type = MachineStateTrait.type;

  /** Whether the machine has been activated */
  isActivated: boolean;

  constructor(config: MachineStateTraitConfig) {
    this.isActivated = config.isActivated;
  }
}

// Ensure the class implements ITraitConstructor
export const MachineStateTraitConstructor: ITraitConstructor<MachineStateTrait> = MachineStateTrait;
