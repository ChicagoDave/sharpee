/**
 * switching-shared.ts — what switching a device says about the light.
 *
 * Switching on and switching off share one question: did the actor's room
 * change between dark and lit because of this switch? The answer is read from
 * the visibility system before and after the change (`darkForActor`, ADR-374
 * D5), never by counting other lamps, so a lit room stays lit when its only
 * lamp is switched and a night-vision actor is never told the darkness moved.
 *
 * Public interface: SwitchingAnalysis, analyzeSwitchingContext,
 *   determineSwitchingMessage.
 * Owner context: stdlib standard actions (switching_on, switching_off).
 */

import { ActionContext } from '../enhanced-types.js';
import { IFEntity, TraitType, LightSourceTrait } from '@sharpee/world-model';
import { darkForActor } from './illumination-shared.js';

export interface SwitchingAnalysis {
  target: IFEntity;
  isLightSource: boolean;
  /** The light's brightness (LightSourceTrait.brightness), when it is a light source. */
  lightRadius?: number;
  /**
   * The actor's room changed between dark and lit across the switch: dark
   * before and lit after when switching on, lit before and dark after when
   * switching off. Always false for a device that is not a light source.
   */
  willAffectDarkness: boolean;
}

/**
 * Analyze what the switch did to the light in the actor's room.
 *
 * Call after the switch has been applied to the world.
 *
 * @param context - The acting context
 * @param target - The device that was switched
 * @param wasDarkBefore - Whether the actor's room was dark to the actor before the switch
 * @returns The light facts the message rule and the event data read
 */
export function analyzeSwitchingContext(
  context: ActionContext,
  target: IFEntity,
  wasDarkBefore: boolean
): SwitchingAnalysis {
  const isLightSource = target.has(TraitType.LIGHT_SOURCE);
  const darkNow = darkForActor(context);

  return {
    target,
    isLightSource,
    lightRadius: isLightSource ? target.getTrait(LightSourceTrait)?.brightness : undefined,
    willAffectDarkness: isLightSource && wasDarkBefore !== darkNow
  };
}

/**
 * Determines the appropriate message based on device type and switching direction
 *
 * @param isOn - true when the device was switched on, false when off
 * @param analysis - From analyzeSwitchingContext
 * @param hasSound - The sound the switch made, when it made one
 * @param wasTemporary - The device runs on a timer
 * @param hadRunningSound - The sound that stopped when the device went off
 * @param willOpenClose - The switch also opened or closed the device
 * @returns The action's message key
 */
export function determineSwitchingMessage(
  isOn: boolean,
  analysis: SwitchingAnalysis,
  hasSound?: string,
  wasTemporary?: boolean,
  hadRunningSound?: string,
  willOpenClose?: boolean
): string {
  // Handle special cases first
  if (willOpenClose) {
    return isOn ? 'door_opens' : 'door_closes';
  }

  if (wasTemporary) {
    return isOn ? 'temporary_activation' : 'was_temporary';
  }

  if (hasSound) {
    return 'with_sound';
  }

  // Handle light sources: the darkness lines only when the room's light changed
  if (analysis.isLightSource) {
    if (isOn) {
      return analysis.willAffectDarkness ? 'illuminates_darkness' : 'light_on';
    } else {
      return analysis.willAffectDarkness ? 'light_off' : 'light_off_still_lit';
    }
  }

  // Handle devices with running sounds
  if (!isOn && hadRunningSound) {
    return 'silence_falls';
  }

  // Handle non-light devices
  return isOn ? 'device_humming' : 'device_stops';
}
