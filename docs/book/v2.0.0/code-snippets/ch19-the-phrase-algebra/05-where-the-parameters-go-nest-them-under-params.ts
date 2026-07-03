// CORRECT: render params nested under params
context.event('game.message', {
  messageId: ZooMessages.PHOTO,
  params: { target: nounPhraseFor(target) },
});

// WRONG: target at the top level; the template can't see it
context.event('game.message', {
  messageId: ZooMessages.PHOTO,
  target: nounPhraseFor(target),
});
