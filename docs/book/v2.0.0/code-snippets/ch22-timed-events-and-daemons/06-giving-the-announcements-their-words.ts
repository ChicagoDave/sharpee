extendLanguage(language: LanguageProvider): void {
  language.addMessage(TimedMessages.PA_CLOSING_3,
    '*DING DONG* "Attention visitors! The zoo closes in three hours. Please ' +
    'visit all exhibits before closing time!"');
  language.addMessage(TimedMessages.PA_CLOSING_2,
    '*DING DONG* "Two hours until closing. Don\'t forget the gift shop!"');
  language.addMessage(TimedMessages.PA_CLOSING_1,
    '*DING DONG* "One hour until closing. Please make your way toward the exit."');
  language.addMessage(TimedMessages.PA_CLOSED,
    '*DING DONG* "The zoo is now closed. Thank you for visiting!"');
  language.addMessage(TimedMessages.FEEDING_TIME,
    '*DING DONG* "It\'s FEEDING TIME at the Petting Zoo! Come watch the goats ' +
    'and rabbits enjoy their snacks!"');
  language.addMessage(TimedMessages.GOATS_BLEATING,
    'The pygmy goats are bleating loudly and headbutting the fence. They seem ' +
    'very hungry!');
}
