/**
 * English language content for the exiting action
 */

export const exitingLanguage = {
  actionId: 'if.action.exiting',
  
  patterns: [
    'exit',
    'get out',
    'get off',
    'go out',
    'go outside',
    'leave',
    'dismount',
    'stand',
    'stand up',
    'climb out',
    'climb off',
    'disembark',
    'alight'
  ],
  
  messages: {
    'already_outside': "{You're} not inside anything.",
    'container_closed': "{capitalize the container} {verb:is container} closed.",
    'cant_exit': "{You} {can't} exit {the place}.",
    'exited': "{You} {get} out of {the place}.",
    'exited_from': "{You} {get} {preposition} {the place}.",
    'nowhere_to_go': "There's nowhere to go from here.",
    'not_in_that': "But {you} {aren't} in {the container}.",
    'not_on_that': "But {you} {aren't} on {the container}.",
    'exit_blocked': "The way out is blocked.",
    'must_stand_first': "{You}'ll need to stand up first.",
    // Aboard a vehicle (ADR-366 D7, D7a): only the boarding room has a way off.
    'vehicle_not_at_hatch': "There's no way off from here.",
    // More than one way off is open, and nothing says which (David's ruling, 2026-10-21).
    'outside_ambiguous': "{You} ponder the reality of being outside..."
  },
  
  help: {
    description: 'Exit from containers, vehicles, or furniture you are inside.',
    examples: 'exit, get out, leave, stand up',
    summary: 'EXIT/LEAVE/GET OUT - Exit from containers, vehicles, or furniture you are inside. Example: EXIT'
  }
};