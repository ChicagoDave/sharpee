/**
 * English language content for the entering action
 */

export const enteringLanguage = {
  actionId: 'if.action.entering',
  
  patterns: [
    'enter [something]',
    'get in [something]',
    'get into [something]',
    'get on [something]',
    'go in [something]',
    'go into [something]',
    'go inside [something]',
    'board [something]',
    'mount [something]',
    'sit on [something]',
    'sit in [something]',
    'lie on [something]',
    'lie in [something]',
    'stand on [something]',
    'stand in [something]',
    'climb in [something]',
    'climb into [something]',
    'climb on [something]',
    'climb onto [something]'
  ],
  
  messages: {
    'no_target': "Enter what?",
    'not_enterable': "{You} {can't} enter {the place}.",
    'already_inside': "{You're} already in {the place}.",
    'container_closed': "{capitalize the container} {verb:is container} closed.",
    'too_full': "{capitalize the place} {verb:is place} full (maximum {max} occupants).",
    'entered': "{You} {get} into {the place}.",
    'entered_on': "{You} {get} onto {the place}.",
    'cant_enter': "{You} {can't} enter {the place}: {reason}.",
    'not_here': "{You} {don't} see {the place} here.",
    'too_small': "{capitalize the place} {verb:is place} too small for {you} to enter.",
    'occupied': "{capitalize the place} {verb:is place} already occupied."
  },
  
  help: {
    description: 'Enter containers, vehicles, or furniture that can hold you.',
    examples: 'enter car, get in box, sit on chair, board ship',
    summary: 'ENTER/GET IN - Enter containers, vehicles, or furniture that can hold you. Example: ENTER CAR'
  }
};