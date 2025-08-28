/**
 * Base class for switching actions (activate/deactivate)
 * Provides shared validation and helper methods
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, TraitType, SwitchableBehavior } from '@sharpee/world-model';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope';

/**
 * Analysis of switching context for determining messages and effects
 */
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
 * Abstract base class for switching sub-actions
 */
export abstract class SwitchingBaseAction implements Action {
  abstract readonly id: string;
  abstract readonly requiredMessages: string[];
  
  readonly group = "device_manipulation";
  
  readonly metadata: ActionMetadata = {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  };
  
  /**
   * Shared validation logic for switching actions
   */
  protected validateBase(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      return { valid: false, error: 'no_target' };
    }
    
    if (!noun.has(TraitType.SWITCHABLE)) {
      return { 
        valid: false, 
        error: 'not_switchable', 
        params: { target: noun.name } 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Analyzes the switching context to determine light and room conditions
   */
  protected analyzeSwitchingContext(
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
  protected determineSwitchingMessage(
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
  
  /**
   * Sub-actions must implement their specific validation
   */
  abstract validate(context: ActionContext): ValidationResult;
  
  /**
   * Sub-actions must implement their specific execution
   */
  abstract execute(context: ActionContext): ISemanticEvent[];
}