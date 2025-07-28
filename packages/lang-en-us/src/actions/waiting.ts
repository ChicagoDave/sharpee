/**
 * Language content for waiting action
 */

export const waitingLanguage = {
  actionId: 'if.action.waiting',
  
  patterns: [
    'wait',
    'z'
  ],
  
  messages: {
    // Success messages
    'waited': "Time passes.",
    'waited_patiently': "You wait patiently.",
    'time_passes': "Time passes...",
    'nothing_happens': "You wait. Nothing happens.",
    
    // Contextual waiting
    'waited_in_vehicle': "You wait in {vehicle}.",
    'waited_for_event': "You wait for something to happen.",
    'waited_anxiously': "You wait anxiously.",
    'waited_briefly': "You wait for a moment.",
    
    // Special situations
    'something_approaches': "As you wait, you hear something approaching.",
    'time_runs_out': "You've waited too long!",
    'patience_rewarded': "Your patience is rewarded.",
    'grows_restless': "You grow restless from waiting."
  },
  
  help: {
    description: 'Wait for time to pass without doing anything.',
    examples: 'wait, z',
    summary: 'WAIT/Z - Wait for time to pass without doing anything. Example: Z'
  }
};
