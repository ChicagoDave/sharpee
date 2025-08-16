/**
 * Blood Magic action constants
 */

export const BloodActions = {
  // Mirror actions
  TOUCHING_MIRROR: 'blood.action.touching_mirror',
  CONNECTING_MIRRORS: 'blood.action.connecting_mirrors',
  ENTERING_MIRROR: 'blood.action.entering_mirror',
  LOOKING_THROUGH_MIRROR: 'blood.action.looking_through_mirror',
  STEPPING_ON_MIRROR: 'blood.action.stepping_on_mirror',
  FALLING_THROUGH_MIRROR: 'blood.action.falling_through_mirror',
  
  // Moon actions
  TOUCHING_MOON: 'blood.action.touching_moon',
  FORGETTING_MOON: 'blood.action.forgetting_moon',
  
  // Sensing actions
  SENSING_BLOOD: 'blood.action.sensing_blood',
  SENSING_RIPPLES: 'blood.action.sensing_ripples'
} as const;