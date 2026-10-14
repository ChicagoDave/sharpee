/**
 * Language content for the saying-yes action (ADR-370 D3): bare `yes`
 * outside an open exchange. Inside one, the exchange claims it first.
 */

export const sayingYesLanguage = {
  actionId: 'if.action.saying_yes',

  patterns: [
    'yes'
  ],

  messages: {
    // The stock line
    'nobody_asked': "Nobody asked {you} anything."
  },

  help: {
    description: 'Say yes. Answers an open question; otherwise, nobody asked.',
    examples: 'yes',
    summary: 'YES - Say yes. Answers an open question; otherwise, nobody asked. Example: YES'
  }
};
