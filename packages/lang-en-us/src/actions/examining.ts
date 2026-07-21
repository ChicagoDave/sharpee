/**
 * English language content for the examining action
 */

export const examiningLanguage = {
  actionId: 'if.action.examining',
  
  patterns: [
    'examine [something]',
    'x [something]',
    'look at [something]',
    'inspect [something]',
    'study [something]',
    'read [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Examine what?",
    'not_visible': "{You} {can't} see {the item} here.",
    'cant_see': "{You} {can't} see {the item} here.",

    // Success messages - these match stdlib's ExaminingMessages.
    // The trailing `{slot:detail}` is the ADR-195 S2 object-detail channel: the
    // examined object's traits stage state sentences (e.g. "It hums softly.") that
    // the slot appends after the description's terminator (sentence mode — the
    // description is a complete sentence; clause mode is for author-terminated
    // templates). Empty by default — only objects whose traits contribute get detail.
    'examined': "{verbatim:description}{slot:detail}",
    'examined_self': "{verbatim:description}",
    'examined_container': "{verbatim:description}{slot:detail}",
    'examined_supporter': "{verbatim:description}{slot:detail}",
    'examined_readable': "{verbatim:description}{slot:detail}",
    'examined_switchable': "{verbatim:description}{slot:detail}",
    'examined_wearable': "{verbatim:description}{slot:detail}",
    'examined_door': "{verbatim:description}{slot:detail}",
    'examined_wall': "{verbatim:description}{slot:detail}",
    'nothing_special': "{You} {see} nothing special about {the item}.",
    // Generalized descriptionless fallback (David's wording, 2026-07-20
    // triage ruling): examining an entity with no authored description
    // prints this, never a silent blank. The {slot:detail} append keeps
    // trait-driven state sentences following the fallback line.
    'default_description': "{capitalize the item} {verb:is item} just {a item}.{slot:detail}",
    // Self counterpart (David's wording ruling, 2026-07-20): the player noun
    // does not fit the "just a" phrasing, so descriptionless EXAMINE ME gets
    // the classic line instead. No {slot:detail} — parity with examined_self.
    'default_description_self': "As good-looking as ever.",
    'description': "{verbatim:description}{slot:detail}",
    'brief_description': "{verbatim:description}",
    'no_description': "{You} {see} nothing special about {the item}.",

    // Legacy messages for compatibility
    'container_open': "{capitalize the item} {verb:is item} open.",
    'container_closed': "{capitalize the item} {verb:is item} closed.",
    'container_empty': "{capitalize the item} {verb:is item} empty.",
    'container_contents': "In {the container} {you} {see} {items}.",
    'surface_contents': "On {the surface} {you} {see} {items}.",
    'worn_by_you': "{You} {are} wearing {the item}.",
    'worn_by_other': "{actor} {verb:is actor} wearing {the item}."
  },
  
  help: {
    description: 'Examine objects more closely.',
    examples: 'examine book, x lamp, look at key, inspect door',
    summary: 'EXAMINE/X/LOOK AT - Look closely at objects to see detailed descriptions. Example: X BOOK'
  }
};