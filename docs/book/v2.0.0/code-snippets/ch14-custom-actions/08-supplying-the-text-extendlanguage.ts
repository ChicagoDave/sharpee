extendLanguage(language: LanguageProvider): void {
  // Feed action: every FeedMessages id needs text, or the
  // player sees raw ids.
  language.addMessage(FeedMessages.NO_FEED,
    "You don't have any animal feed.");
  language.addMessage(FeedMessages.NOT_AN_ANIMAL,
    "That's not something you can feed.");
  language.addMessage(FeedMessages.ALREADY_FED,
    "You've already fed them. They look contentedly full.");
  language.addMessage(FeedMessages.FED_GOATS,
    'You scatter some feed on the ground. The pygmy goats ' +
    'rush over, bleating excitedly, and devour the corn and ' +
    'pellets in seconds.');
  language.addMessage(FeedMessages.FED_RABBITS,
    'You sprinkle some pellets near the rabbits. They hop ' +
    'over cautiously, then munch away happily, their little ' +
    'noses twitching.');
  language.addMessage(FeedMessages.FED_GENERIC,
    'You offer some feed. The animal eats it gratefully.');

  // Photograph action.
  language.addMessage(PhotoMessages.NO_CAMERA,
    "You don't have a camera. There's one in the gift shop.");
  language.addMessage(PhotoMessages.TOOK_PHOTO,
    "Click! You snap a photo of {the target}. That one's " +
    "going on the fridge.");
}
