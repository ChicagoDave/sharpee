/**
 * feed-record.ts — which play-feed record is a new game's opening.
 *
 * The browser client posts one record for the story's opening (ADR-404),
 * marked `opening` and carrying no command, because nobody typed anything
 * for it. Every other record is a typed turn. The surface seats its one
 * opening card from the mark and from nothing else: not from a record's
 * place in the feed, since a restored session's first record is a typed
 * turn, and not from its command.
 *
 * Public interface: OpeningMark, isOpeningRecord.
 * Owner context: tools/ide — testing surface.
 */

/** The part of a feed record that says whether it is the opening. */
export interface OpeningMark {
  /** True on a new game's opening, which carries no command. */
  opening?: boolean;
}

/**
 * Whether a feed record is a new game's opening.
 *
 * @param record the record as the client posted it
 * @returns true only when the record carries the `opening` mark as `true`
 */
export function isOpeningRecord(record: OpeningMark): boolean {
  return record.opening === true;
}
