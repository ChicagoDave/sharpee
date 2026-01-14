/**
 * Language content for answering action
 */

export const answeringLanguage = {
  actionId: 'if.action.answering',
  
  patterns: [
    'answer [response]',
    'reply [response]',
    'respond [response]',
    'say yes',
    'say no',
    'yes',
    'no'
  ],
  
  messages: {
    // Error messages
    'no_question': "There's nothing to answer.",
    'no_one_asked': "No one asked {you} anything.",
    'too_late': "It's too late to answer that.",

    // Success messages
    'answered': "{You} {answer}, \"{response}\"",
    'answered_yes': "{You} {say}, \"Yes.\"",
    'answered_no': "{You} {say}, \"No.\"",
    'gave_answer': "{You} {respond} to the question.",

    // Response reactions
    'accepted': "{Your} answer is accepted.",
    'rejected': "{Your} answer is not what they wanted to hear.",
    'noted': "{Your} response is noted.",
    'confused_by_answer': "{Your} answer seems to confuse them.",

    // Invalid responses
    'invalid_response': "That's not a valid answer to the question.",
    'needs_yes_or_no': "Please answer yes or no.",
    'unclear_answer': "{Your} answer isn't clear. Try again."
  },
  
  help: {
    description: 'Answer questions that have been asked of you.',
    examples: 'answer yes, say no, reply "the password is xyzzy", yes',
    summary: 'ANSWER/SAY - Answer questions that have been asked of you. Example: SAY YES'
  }
};
