/**
 * English language content for the reading action
 */

export const readingLanguage = {
  actionId: 'if.action.reading',

  patterns: [
    'read [something]',
    'peruse [something]'
  ],

  messages: {
    // Error messages
    'what_to_read': "What do you want to read?",
    'not_readable': "There's nothing written on {the item}.",
    // reason is a full story-authored sentence (ReadableTrait.cannotReadMessage)
    // — verbatim, or the bare-noun default articles it ("a You can make out…").
    'cannot_read_now': "{verbatim:reason}",

    // Success messages - include item name for context.
    // Phrase grammar: {capitalize the item} -> "The book"
    'read_text': "{capitalize the item} reads:\n{verbatim:text}",
    'read_book': "{capitalize the item} reads:\n{verbatim:text}",
    'read_book_page': "{capitalize the item} (page {currentPage} of {totalPages}):\n{verbatim:text}",
    'read_sign': "{capitalize the item} says:\n{verbatim:text}",
    'read_inscription': "{capitalize the item} reads:\n{verbatim:text}"
  },

  help: {
    description: 'Read text written on objects.',
    examples: 'read book, read sign, read leaflet',
    summary: 'READ - Read text on books, signs, notes, and inscriptions. Example: READ BOOK'
  }
};
