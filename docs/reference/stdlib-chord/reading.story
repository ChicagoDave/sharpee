## ========================================================================
## REFERENCE ONLY — generated Chord-form rendering of `if.action.reading`.
## This is NOT the implementation. The real action is TypeScript in
## packages/stdlib/src/actions/standard/reading/. Do not edit — regenerate
## with `node scripts/generate-stdlib-chord.js`. `sharpee` refuses to run a
## reference-only artifact (ADR-265). The Sharpee <-> Chord parity claim is
## about surface, not implementation: this shows what the action does and
## how to change it, in Chord form.
## ========================================================================

story "Standard action: reading" by "Sharpee (generated)"
  id: stdlib-chord-reading
  version: 1.0.0
  reference-only: true

## Action  : if.action.reading
## Verbs   : read, peruse
## Slots   : target   (interceptor-consulted entity slots, ADR-228)
## Emits   : if.event.read
## Summary : READ - Read text on books, signs, notes, and inscriptions. Example: READ BOOK

## Messages — override any with `override message <alias>`:
##
##   alias                             message id                              text
##   reading-what-to-read              what_to_read                            What do you want to read?
##   reading-not-readable              not_readable                            There's nothing written on {the item}.
##   reading-cannot-read-now           cannot_read_now                         {verbatim:reason}
##   reading-read-text                 read_text                               {capitalize the item} reads: {verbatim:text}
##   reading-read-book                 read_book                               {capitalize the item} reads: {verbatim:text}
##   reading-read-book-page            read_book_page                          {capitalize the item} (page {currentPage} of {totalPages}): {verbatim:text}
##   reading-read-sign                 read_sign                               {capitalize the item} says: {verbatim:text}
##   reading-read-inscription          read_inscription                        {capitalize the item} reads: {verbatim:text}

## Change how this action behaves (the real, supported seams — D4):
##   • message  — `override message <alias>` (see the table above)
##   • guard    — register an action interceptor on this action id (ADR-090/228)
##   • react    — an event handler on if.event.read (ADR-052)

create the Void
  a room

  A reference document — the standard library rendered in Chord for
  reading. The real implementation is TypeScript. See packages/stdlib.

create the player
  starts in the Void

  You.
