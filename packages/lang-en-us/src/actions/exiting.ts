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
    'container_closed': "{the:cap:container} is closed.",
    'cant_exit': "{You} {can't} exit {the:place}.",
    'exited': "{You} {get} out of {the:place}.",
    'exited_from': "{You} {get} {preposition} {the:place}.",
    'nowhere_to_go': "There's nowhere to go from here.",
    'exit_blocked': "The way out is blocked.",
    'must_stand_first': "{You}'ll need to stand up first."
  },
  
  help: {
    description: 'Exit from containers, vehicles, or furniture you are inside.',
    examples: 'exit, get out, leave, stand up',
    summary: 'EXIT/LEAVE/GET OUT - Exit from containers, vehicles, or furniture you are inside. Example: EXIT'
  }
};