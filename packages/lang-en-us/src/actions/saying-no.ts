/**
 * Language content for the saying-no action (ADR-370 D3): bare `no`
 * outside an open exchange. Inside one, the exchange claims it first.
 */

export const sayingNoLanguage = {
  actionId: 'if.action.saying_no',

  patterns: [
    'no'
  ],

  messages: {
    // The stock line
    'nobody_asked': "Nobody asked {you} anything."
  },

  help: {
    description: 'Say no. Answers an open question; otherwise, nobody asked.',
    examples: 'no',
    summary: 'NO - Say no. Answers an open question; otherwise, nobody asked. Example: NO'
  }
};
