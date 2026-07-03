const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  "Who's a good bird? WHO'S A GOOD BIRD?",
  'BAWK! Welcome to the zoo!',
];

const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',

  // Called every turn, whether or not the player is here.
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];        // no audience, stay quiet

    if (context.random.chance(0.5)) {             // 50% chance to squawk
      const phrase = context.random.pick(PARROT_PHRASES);
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
        text: 'The parrot ruffles its feathers and eyes you with interest.',
      },
    }];
  },
};
