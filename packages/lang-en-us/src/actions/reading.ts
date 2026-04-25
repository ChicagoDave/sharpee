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
    'not_readable': "There's nothing written on {the:item}.",
    'cannot_read_now': "{reason}",

    // Success messages - include item name for context.
    // Use the formatter chain: {the:cap:item} -> "The book"
    'read_text': "{the:cap:item} reads:\n{text}",
    'read_book': "{the:cap:item} reads:\n{text}",
    'read_book_page': "{the:cap:item} (page {currentPage} of {totalPages}):\n{text}",
    'read_sign': "{the:cap:item} says:\n{text}",
    'read_inscription': "{the:cap:item} reads:\n{text}"
  },

  help: {
    description: 'Read text written on objects.',
    examples: 'read book, read sign, read leaflet',
    summary: 'READ - Read text on books, signs, notes, and inscriptions. Example: READ BOOK'
  }
};
