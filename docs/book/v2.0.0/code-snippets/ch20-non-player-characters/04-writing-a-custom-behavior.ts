const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  "Who's a good bird? WHO'S A GOOD BIRD?",
  'BAWK! Welcome to the zoo!',
];

// Every random draw names a choice point. The name is what lets you force
// the outcome in a test, see it in a coverage report, and replay a session
// exactly. The squawk decision has yes/no outcomes; the phrase pick is a
// plain draw with no outcome classes.
const PARROT_SQUAWK = definePoint('family-zoo.parrot.squawk', {
  classes: ['yes', 'no'],
});
const PARROT_PHRASE = definePoint('family-zoo.parrot.phrase');

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  // Called every turn, whether or not the player is here.
  onTurn(context: NpcContext): NpcAction[] {
    // no audience, stay quiet
    if (!context.playerVisible) return [];

    // 50% chance to squawk
    if (context.random.chance(PARROT_SQUAWK, 0.5)) {
      const phrase = context.random.pick(PARROT_PHRASE, PARROT_PHRASES);
      return [{
        type: 'speak',
        messageId: 'npc.speech',
        data: { text: phrase },
      }];
    }
    return [];
  },

  // Called once when the player walks into the parrot's room.
  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [{
      type: 'emote',
      messageId: 'npc.emote',
      data: {
        text:
          'The parrot ruffles its feathers and eyes you ' +
          'with interest.',
      },
    }];
  },
};
