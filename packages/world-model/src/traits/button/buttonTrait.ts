/**
 * Button trait implementation
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

export interface IButtonData {
  /**
   * Whether the button stays pressed or pops back
   */
  latching?: boolean;
  
  /**
   * Color of the button (for descriptive purposes)
   */
  color?: string;
  
  /**
   * Size of the button
   */
  size?: 'tiny' | 'small' | 'medium' | 'large';
  
  /**
   * Shape of the button
   */
  shape?: 'round' | 'square' | 'rectangular' | 'oval';
  
  /**
   * Material of the button
   */
  material?: string;
  
  /**
   * Label on the button
   */
  label?: string;
  
  /**
   * Whether the button is currently pressed (for latching buttons)
   */
  pressed?: boolean;
}

/**
 * Button trait for button-specific properties
 * 
 * Buttons should also have the PUSHABLE trait for push behavior.
 * This trait adds button-specific descriptive properties.
 */
export class ButtonTrait implements ITrait, IButtonData {
  static readonly type = TraitType.BUTTON;
  readonly type = TraitType.BUTTON;
  
  // ButtonData properties
  latching: boolean;
  color?: string;
  size?: 'tiny' | 'small' | 'medium' | 'large';
  shape?: 'round' | 'square' | 'rectangular' | 'oval';
  material?: string;
  label?: string;
  pressed: boolean;
  
  constructor(data: IButtonData = {}) {
    this.latching = data.latching ?? false;
    this.color = data.color;
    this.size = data.size;
    this.shape = data.shape;
    this.material = data.material;
    this.label = data.label;
    this.pressed = data.pressed ?? false;
  }
}
