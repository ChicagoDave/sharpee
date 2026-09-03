/**
 * Language content for the answering action (GH #346): answering the open
 * exchange in the player's live conversation. The success line comes from
 * the exchange's answer row; `answered` is the fallback when a row speaks
 * no phrase of its own.
 */

export const answeringLanguage = {
  actionId: 'if.action.answering',

  patterns: [
    'answer [response]',
    'reply [response]',
    'respond [response]',
    'say [response]'
  ],

  messages: {
    // Error messages
    'no_question': "No one has asked {you} anything.",
    'no_response': "Answer what?",
    'not_an_answer': "{capitalize the target} {verb:waits target} for an answer to the question.",

    // Success fallback — the exchange row usually speaks for itself
    'answered': "{You} {answer}, \"{verbatim:response}.\""
  },

  help: {
    description: 'Answer a question a character has put to you.',
    examples: 'answer yes, say no, reply norwich, yes',
    summary: 'ANSWER/SAY - Answer a question a character has put to you. Example: SAY YES'
  }
};
