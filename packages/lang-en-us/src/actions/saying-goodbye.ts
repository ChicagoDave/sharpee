/**
 * Language content for the saying-goodbye action (GH #300): the player ends
 * the live conversation. The partner's parting line, when authored, rides
 * the scene close (a parked thread's `on parting` row); this file carries
 * only the player's side and the refusals.
 */

export const sayingGoodbyeLanguage = {
  actionId: 'if.action.saying_goodbye',

  patterns: [
    'goodbye',
    'bye',
    'farewell',
    'say goodbye',
    'say goodbye to [someone]'
  ],

  messages: {
    // Error messages
    'not_talking': "{You} {aren't} talking to anyone.",
    'not_talking_to': "{You} {aren't} talking to {the target}.",

    // Success
    'said_goodbye': "{You} {say} goodbye to {the target}."
  },

  help: {
    description: 'End the conversation you are having.',
    examples: 'goodbye, bye, say goodbye to the merchant',
    summary: 'GOODBYE - End the conversation you are having. Example: BYE'
  }
};
