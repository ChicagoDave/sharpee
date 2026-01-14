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
    'not_enterable': "{You} {can't} enter {place}.",
    'already_inside': "{You're} already in {place}.",
    'container_closed': "{container} is closed.",
    'too_full': "{place} is full (maximum {max} occupants).",
    'entered': "{You} {get} into {place}.",
    'entered_on': "{You} {get} onto {place}.",
    'cant_enter': "{You} {can't} enter {place}: {reason}.",
    'not_here': "{You} {don't} see {place} here.",
    'too_small': "{place} is too small for {you} to enter.",
    'occupied': "{place} is already occupied."
  },
  
  help: {
    description: 'Enter containers, vehicles, or furniture that can hold you.',
    examples: 'enter car, get in box, sit on chair, board ship',
    summary: 'ENTER/GET IN - Enter containers, vehicles, or furniture that can hold you. Example: ENTER CAR'
  }
};