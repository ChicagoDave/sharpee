/**
 * Press Button Action Types - Story-specific action for maintenance room buttons
 *
 * Per FORTRAN source:
 * - Yellow: Enables bolt (GATEF=TRUE)
 * - Brown: Disables bolt (GATEF=FALSE)
 * - Red: Toggles room lights
 * - Blue: Starts flooding (death trap)
 */

// Action ID
export const PRESS_BUTTON_ACTION_ID = 'DUNGEO_PRESS_BUTTON' as const;

// Message IDs
export const PressButtonMessages = {
  CLICK: 'dungeo.button.click',
  NOT_A_BUTTON: 'dungeo.button.not_a_button',
  LIGHTS_ON: 'dungeo.button.lights_on',
  LIGHTS_OFF: 'dungeo.button.lights_off',
  BLUE_JAMMED: 'dungeo.button.blue_jammed',
  BLUE_LEAK_STARTED: 'dungeo.button.blue_leak_started',
} as const;
