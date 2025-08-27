/**
 * Shared logic for switching_on and switching_off actions
 */

import { ActionContext } from '../enhanced-types';
import { IFEntity, TraitType } from '@sharpee/world-model';

export interface SwitchingAnalysis {
  target: IFEntity;
  isLightSource: boolean;
  otherLightsPresent: boolean;
  isInSameRoom: boolean;
  lightRadius?: number;
  lightIntensity?: string;
  willAffectDarkness?: boolean;
}

/**
 * Analyzes the switching context to determine light and room conditions
 */
export function analyzeSwitchingContext(
  context: ActionContext,
  target: IFEntity
): SwitchingAnalysis {
  const actor = context.player;
  
  const analysis: SwitchingAnalysis = {
    target,
    isLightSource: target.has(TraitType.LIGHT_SOURCE),
    otherLightsPresent: false,
    isInSameRoom: false
  };

  // Add light source details if applicable
  if (analysis.isLightSource) {
    const lightTrait = target.get(TraitType.LIGHT_SOURCE) as any;
    analysis.lightRadius = lightTrait.radius || 1;
    analysis.lightIntensity = lightTrait.intensity || 'normal';
  }

  // Check room conditions
  const actorRoom = context.world.getContainingRoom(actor.id);
  const deviceRoom = context.world.getContainingRoom(target.id);
  
  if (actorRoom && deviceRoom && actorRoom.id === deviceRoom.id) {
    analysis.isInSameRoom = true;
    
    if (analysis.isLightSource) {
      // Check for other active light sources
      const roomContents = context.world.getContents(actorRoom.id);
      const otherLights = roomContents.filter(item => 
        item.id !== target.id && 
        item.has(TraitType.LIGHT_SOURCE) && 
        item.has(TraitType.SWITCHABLE) &&
        (item.get(TraitType.SWITCHABLE) as any).isOn
      );
      
      // Also check carried lights
      const carriedItems = context.world.getContents(actor.id);
      const carriedLights = carriedItems.filter(item =>
        item.id !== target.id &&
        item.has(TraitType.LIGHT_SOURCE) &&
        item.has(TraitType.SWITCHABLE) &&
        (item.get(TraitType.SWITCHABLE) as any).isOn
      );
      
      analysis.otherLightsPresent = otherLights.length > 0 || carriedLights.length > 0;
      analysis.willAffectDarkness = !analysis.otherLightsPresent;
    }
  }

  return analysis;
}

/**
 * Determines the appropriate message based on device type and switching direction
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
  
  // Handle light sources
  if (analysis.isLightSource && analysis.isInSameRoom) {
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
  if (!analysis.isLightSource) {
    return isOn ? 'device_humming' : 'device_stops';
  }
  
  // Default messages
  return isOn ? 'switched_on' : 'switched_off';
}