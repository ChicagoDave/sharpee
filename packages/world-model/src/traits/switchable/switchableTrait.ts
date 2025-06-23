// packages/world-model/src/traits/switchable/switchableTrait.ts

import { Trait } from '../trait';
import { TraitType } from '../trait-types';

export interface SwitchableData {
  /** Whether the entity is currently on */
  isOn?: boolean;
  
  /** Whether the entity starts on */
  startsOn?: boolean;
  
  /** Power consumption when on (arbitrary units) */
  powerConsumption?: number;
  
  /** Whether this requires power to operate */
  requiresPower?: boolean;
  
  /** Whether power is currently available */
  hasPower?: boolean;
  
  /** Custom message when turning on */
  onMessage?: string;
  
  /** Custom message when turning off */
  offMessage?: string;
  
  /** Custom message when already on */
  alreadyOnMessage?: string;
  
  /** Custom message when already off */
  alreadyOffMessage?: string;
  
  /** Custom message when no power available */
  noPowerMessage?: string;
  
  /** Sound made when switching on */
  onSound?: string;
  
  /** Sound made when switching off */
  offSound?: string;
  
  /** Continuous sound while on */
  runningSound?: string;
  
  /** Time in turns before auto-off (0 = never) */
  autoOffTime?: number;
  
  /** Turns remaining before auto-off */
  autoOffCounter?: number;
}

/**
 * Switchable trait for entities that can be turned on and off.
 * Used for lights, machines, devices, etc.
 * 
 * This trait contains only data - all switching logic
 * is in SwitchableBehavior.
 */
export class SwitchableTrait implements Trait, SwitchableData {
  static readonly type = TraitType.SWITCHABLE;
  readonly type = TraitType.SWITCHABLE;
  
  // SwitchableData properties
  isOn: boolean;
  startsOn: boolean;
  powerConsumption: number;
  requiresPower: boolean;
  hasPower: boolean;
  onMessage?: string;
  offMessage?: string;
  alreadyOnMessage?: string;
  alreadyOffMessage?: string;
  noPowerMessage?: string;
  onSound?: string;
  offSound?: string;
  runningSound?: string;
  autoOffTime: number;
  autoOffCounter: number;
  
  constructor(data: SwitchableData = {}) {
    // Set defaults and merge with provided data
    this.startsOn = data.startsOn ?? false;
    this.requiresPower = data.requiresPower ?? false;
    this.hasPower = data.hasPower ?? true;
    this.isOn = data.isOn ?? (this.startsOn && this.hasPower);
    this.powerConsumption = data.powerConsumption ?? 1;
    this.onMessage = data.onMessage;
    this.offMessage = data.offMessage;
    this.alreadyOnMessage = data.alreadyOnMessage;
    this.alreadyOffMessage = data.alreadyOffMessage;
    this.noPowerMessage = data.noPowerMessage;
    this.onSound = data.onSound;
    this.offSound = data.offSound;
    this.runningSound = data.runningSound;
    this.autoOffTime = data.autoOffTime ?? 0;
    this.autoOffCounter = data.autoOffCounter ?? (this.isOn && this.autoOffTime > 0 ? this.autoOffTime : 0);
  }
}
