/**
 * grammar.ts — the transcript grammar, as the tab sees it.
 *
 * Purpose: the editor reads and writes `.transcript` files through the SAME
 *   parser and serializer the test run uses — `@sharpee/branch-tester`, bundled
 *   from source — so the editor can never accept a file the runner rejects, nor
 *   write one it would read differently. This module is the single place that
 *   imports them, so the rest of the tab depends on this shape rather than on
 *   a platform package's whole surface.
 *
 *   **Why branch-tester and not transcript-tester.** There are two transcript
 *   parsers in this repository. `sharpee test --tree` is the only run model the
 *   IDE offers and it loads branch-tester's. They do not implement the same
 *   grammar: transcript-tester knows two `[CHANNEL:]` forms and answers
 *   `[CHANNEL: id, is absent]` with `Unknown assertion format` and a null, which
 *   silently DROPS the assertion. Measured over the 37-file Fernhill corpus
 *   2026-08-08: branch-tester round-trips 27 byte-identical and drops nothing;
 *   transcript-tester drops three assertions.
 *
 *   **Saving normalizes.** `serializeTranscript` re-emits the whole file from the
 *   parsed model, so a save can reformat what it did not change: a long header
 *   value re-wraps, a comment written between a command's assertions moves above
 *   the command, an empty `#` gains a trailing space, and comment indentation is
 *   gone before the serializer ever runs (the parser trims it). That is why
 *   {@link saveOutlook} exists — the author sees the rewrite BEFORE saving,
 *   rather than finding it in a diff afterwards.
 *
 * Public interface: parse, serialize, saveOutlook, SaveOutlook, Transcript.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { parseTranscript, validateTranscript } from '@sharpee/branch-tester/parser';
import { serializeAssertionTag, serializeTranscript } from '@sharpee/branch-tester/serializer';
import type { Assertion, Transcript } from '@sharpee/branch-tester/types';

export type { Assertion, Transcript };

/**
 * Parses transcript text into the model the runner uses.
 *
 * `file` is carried for the parser's own diagnostics only; nothing is read from
 * disk here — the page has no filesystem, and the host supplies the text.
 *
 * Throws whatever the parser throws on a file it cannot read. That is the right
 * behaviour: a transcript the grammar rejects is not one the editor should offer
 * to edit, because saving it would rewrite it into something else.
 */
export function parse(text: string, file: string): Transcript {
  return parseTranscript(text, file);
}

/** Writes a transcript model back out as the file the runner will read. */
export function serialize(transcript: Transcript): string {
  return serializeTranscript(transcript);
}

/**
 * What saving this file would do to it, decided before anything is saved.
 *
 * `unsound` is the one that matters and the one that is easy to get wrong.
 * `parseTranscript` does **not** throw on text it cannot make sense of — it
 * returns a transcript with no commands, which serializes to a three-line husk.
 * A save built on "did it throw?" would therefore answer "this reformats 5
 * lines" and then delete the author's file. `validateTranscript` is the check
 * that catches it, and it is the same check `sharpee test` uses to refuse a
 * transcript, so the editor and the runner agree on what a valid file is by
 * construction rather than by intention.
 */
export type SaveOutlook =
  | { kind: 'clean'; generated: string }
  | { kind: 'reformats'; generated: string; changedLines: number }
  /** Parses, zero commands, nothing else wrong — a newly created transcript.
   *  The runner refuses it, but the editor can (and must) still edit it:
   *  `addCommand` is the fix, so the add bar stays open where every other
   *  gate may treat this like `unsound`. */
  | { kind: 'empty'; generated: string }
  | { kind: 'unsound'; problems: string[] };

/**
 * Reports what a save would change, without saving.
 *
 * @param text the file's current contents
 * @param file its path, for the parser's diagnostics
 * @returns `unsound` when the runner would refuse this file — in which case
 *   there is nothing to preview and nothing that may be written over it —
 *   except the one refusal the editor exists to fix: a file that is merely
 *   EMPTY (zero commands, no other defect) is `empty`, not `unsound`.
 */
export function saveOutlook(text: string, file: string): SaveOutlook {
  let transcript: Transcript;
  try {
    transcript = parse(text, file);
  } catch (error) {
    return { kind: 'unsound', problems: [error instanceof Error ? error.message : String(error)] };
  }

  const problems = validateTranscript(transcript);
  // Zero commands is what a newly created transcript IS (newTranscript writes
  // no placeholder), and addCommand is allowed to fix exactly that. Three
  // conditions, all load-bearing: zero commands; exactly one problem (so that
  // problem is necessarily the no-commands one — any other defect keeps the
  // refusal); and the serializer reproduces the text byte-for-byte. The last
  // is the husk hazard's own test: unreadable text ALSO parses to zero
  // commands, but its round trip loses the text — a file the serializer
  // cannot reproduce is not empty, it is unreadable.
  if (transcript.commands.length === 0 && problems.length === 1) {
    const generated = serialize(transcript);
    if (generated === text) return { kind: 'empty', generated };
  }
  if (problems.length > 0) return { kind: 'unsound', problems };

  const generated = serialize(transcript);
  if (generated === text) return { kind: 'clean', generated };
  return { kind: 'reformats', generated, changedLines: countChangedLines(text, generated) };
}

/** The result of an edit: the file text to write, and what writing it costs. */
export interface Draft {
  /** The whole file, as the serializer writes it. */
  text: string;
  /** What this text is relative to the file the author started from. */
  outlook: SaveOutlook;
}

/**
 * Adds an assertion to the command at `commandLine`, and returns the new file.
 *
 * The command is found by its **source line**, which is the identity the run
 * event stream and the parsed file already agree on (`CommandResultEvent.line`
 * is "the 1-based `.transcript` source line of the `> command`, parser-tracked").
 * Matching on the command's text instead would attach the assertion to the wrong
 * turn in any transcript that runs the same command twice, which is most of them.
 *
 * @param text the file as it is on disk
 * @param file its path, for diagnostics
 * @param commandLine the source line of the `> command` the assertion is about
 * @param assertion what to add
 * @returns the new file text and its outlook
 * @throws when the file is unsound, carries no command at that line, or carries
 *   `[TODO]` there — an edit with nowhere to land, or one the runner would never
 *   evaluate, must not silently produce a file that looks like it worked.
 *
 * **A `[SKIP]` on the command is replaced, not joined.** The runner short-circuits
 * on skip: `[SKIP]` alongside `[OK: contains "…"]` passes without ever evaluating
 * the `[OK]`. So appending would write an assertion that is dead on arrival and
 * green — the worst possible pair. Replacing is also what R1 means by "`[SKIP]` is
 * the draft state of every command and promoting-to-assertion is the edit".
 * `[TODO]` short-circuits identically but means something an editor should not
 * decide on the author's behalf, so it refuses instead.
 */
export function addAssertion(
  text: string,
  file: string,
  commandLine: number,
  assertion: Assertion,
  expectedInput?: string,
): Draft {
  const transcript = editable(text, file);
  const command = commandAt(transcript, file, commandLine, expectedInput);
  if (command.assertions.some((existing) => existing.type === 'todo')) {
    throw new Error(
      `"${command.input}" is marked [TODO]. Remove the TODO first — the runner stops at it, so an assertion added beside it would never be checked.`,
    );
  }
  command.assertions = [
    ...command.assertions.filter((existing) => existing.type !== 'skip'),
    assertion,
  ];

  return draftFrom(transcript, file);
}

/** What a new transcript needs to know about itself. */
export interface NewTranscript {
  /** The story it tests, as the header's `story:` field. */
  story: string;
  /** Its title, which is what the author actually typed. */
  title: string;
  /**
   * The stem of the transcript it continues, or null for a root.
   *
   * **The author never types this.** `continues:` is load-bearing and documented
   * nowhere an author reads (R5/F4), and a suite run flat instead of as a tree
   * "fails as a large number of ordinary-looking test failures". The editor owns
   * the field so it cannot be forgotten or misspelled.
   */
  continuesFrom: string | null;
}

/**
 * Composes a new, empty transcript.
 *
 * Empty is deliberate: it carries no command, so the author's first command is
 * their own rather than a placeholder they have to notice and delete. The file
 * is therefore *unsound* until that command arrives, which the source face says
 * plainly and {@link addCommand} is allowed to fix.
 *
 * Built through the serializer, like every other write, so a new file is
 * canonical from its first byte and its first save changes nothing.
 */
export function newTranscript(spec: NewTranscript): string {
  const header: Record<string, string> = { title: spec.title, story: spec.story };
  if (spec.continuesFrom) header.continues = spec.continuesFrom;
  return serialize({
    filePath: '<new>',
    header,
    commands: [],
    items: [],
    goals: [],
    comments: [],
    config: { seeds: [], channels: [], events: false, forces: [] },
  });
}

/**
 * Rewrites what a transcript continues from — or makes it a root.
 *
 * `continues:` is R5's field: load-bearing, documented nowhere an author
 * reads, and wrong in ways that fail as walls of ordinary-looking errors. The
 * editor owns it end to end — the author picks a parent, never types the
 * field. The SEMANTIC weight of this one-line edit (the file now runs from a
 * different history; its assertions may no longer hold) is the caller's to
 * say out loud; this function only makes the file mean it.
 *
 * @param text the file as it is on disk
 * @param file its path, for diagnostics
 * @param parentStem the new parent's stem, or null to make this file a root
 * @returns the new file text and its outlook
 * @throws when the file is unsound, or `parentStem` names the file itself —
 *   a transcript cannot continue from itself, and the one-node cycle is the
 *   only one this layer can see (the caller's candidate list owns the rest)
 */
export function reparent(text: string, file: string, parentStem: string | null): Draft {
  const transcript = editable(text, file);
  const own = (file.split('/').pop() ?? file).replace(/\.transcript$/, '');
  if (parentStem !== null && parentStem === own) {
    throw new Error('A transcript cannot continue from itself.');
  }
  if (parentStem !== null) transcript.header.continues = parentStem;
  else delete transcript.header.continues;
  return draftFrom(transcript, file);
}

/** One of a command's assertions, as the file writes it. */
export interface WrittenAssertion {
  /** Position within its command's assertions — the only identity one has. */
  index: number;
  /** The tag, exactly as the serializer writes it. */
  tag: string;
  /** The literal block beneath the tag, for the forms that carry one. */
  block?: string[];
  /**
   * True for `[SKIP]` and `[TODO]`, which the runner stops at: no assertion
   * after one of these is ever evaluated. A surface that shows a command's
   * claims has to be able to say which of them are not claims at all.
   */
  haltsEvaluation: boolean;
}

/**
 * What each command in the file asserts, keyed by its source line.
 *
 * The tags come from the serializer, not from the file's text and not from a
 * second renderer here: an editor that shows an author something other than what
 * the file says is worse than one that shows nothing.
 *
 * Returns an empty map for a file that does not parse — there is nothing to
 * show, and guessing would be showing.
 */
export function assertionsByCommandLine(text: string, file: string): Map<number, WrittenAssertion[]> {
  const byLine = new Map<number, WrittenAssertion[]>();
  let transcript: Transcript;
  try {
    transcript = parse(text, file);
  } catch {
    return byLine;
  }
  for (const command of transcript.commands) {
    byLine.set(
      command.lineNumber,
      command.assertions.map((assertion, index) => ({
        index,
        tag: serializeAssertionTag(assertion),
        ...(assertion.block ? { block: assertion.block } : {}),
        haltsEvaluation: assertion.type === 'skip' || assertion.type === 'todo',
      })),
    );
  }
  return byLine;
}

/**
 * How many commands a transcript runs — the number every descendant's turn
 * numbers are offset by (R4).
 *
 * Null for text the grammar cannot read: a count that might be wrong is worse
 * than none, because it feeds a warning about other files' correctness.
 */
export function commandCount(text: string, file: string): number | null {
  try {
    const transcript = parse(text, file);
    // The parser is lenient: it collects errors rather than throwing, and a
    // file it half-read has an untrustworthy count — an unclosed block can
    // swallow the commands after it.
    if (transcript.parseErrors?.length) return null;
    return transcript.commands.length;
  } catch {
    return null;
  }
}

/**
 * Removes one of a command's assertions.
 *
 * Removing the LAST one leaves `[SKIP]` behind rather than a bare command. A
 * command with no assertions is legal grammar — it is the golden tier's shape —
 * but in a transcript with no recording the runner fails it with a named error,
 * so "remove the only claim" would otherwise turn a green file red for a reason
 * the author did not choose. `[SKIP]` is the draft state, and returning to it is
 * what removing the last claim means.
 *
 * @throws when the file is unsound, no command sits at `commandLine`, or there
 *   is no assertion at `index`
 */
export function removeAssertion(
  text: string,
  file: string,
  commandLine: number,
  index: number,
): Draft {
  const transcript = editable(text, file);
  const command = transcript.commands.find((candidate) => candidate.lineNumber === commandLine);
  if (!command) throw new Error(`No command at line ${commandLine} of ${file}`);
  if (index < 0 || index >= command.assertions.length) {
    throw new Error(`"${command.input}" has no assertion ${index + 1} to remove.`);
  }

  const kept = command.assertions.filter((_, at) => at !== index);
  command.assertions = kept.length > 0 ? kept : [{ type: 'skip' } as Assertion];

  return draftFrom(transcript, file);
}

/**
 * Appends a command to the end of the transcript, asserting nothing.
 *
 * `[SKIP]` is the draft state of every command, and that is not a convenience —
 * it is what the grammar already means (ADR-294 D2: "output is deliberately not
 * asserted", not "the command is not run"). A command added this way executes,
 * so the next run shows what the story said, and promoting that output to an
 * assertion is the edit. Adding a command and asserting about it are therefore
 * two gestures, never one, and an author is never asked to predict output.
 *
 * @param text the file as it is on disk
 * @param file its path, for diagnostics
 * @param input the command, as the player would type it
 * @returns the new file text and its outlook
 * @throws when the file is unsound, or `input` is blank
 */
export function addCommand(text: string, file: string, input: string): Draft {
  const command = input.trim();
  if (!command) throw new Error('A command needs some text.');

  // A transcript with no commands is precisely what a newly created one is, and
  // this is the edit that fixes it — so that one problem is not a bar here.
  const transcript = editable(text, file, true);
  // `lineNumber` is transient: nothing serializes it, and the parse that follows
  // this write establishes the real one. Zero rather than a guess, so a stale
  // value can never be mistaken for a position in the file.
  const added = { lineNumber: 0, input: command, expectedOutput: [], assertions: [{ type: 'skip' } as Assertion] };
  transcript.commands.push(added);
  transcript.items = [...(transcript.items ?? []), { type: 'command', command: added }];

  return draftFrom(transcript, file);
}

/**
 * Changes a command's text in place, keeping everything asserted about it.
 *
 * This is the edit delete-and-re-add cannot express: re-adding loses the
 * command's assertions, which is the right trade only for a typo in a command
 * that has none. Here the assertions stay attached — deliberately, even though
 * the new command may print something they no longer match. The next run is
 * what says so, on the surface built to say it (the cards), rather than the
 * editor guessing which claims survive a wording change.
 *
 * @param text the file as it is on disk
 * @param file its path, for diagnostics
 * @param commandLine the source line of the `> command` to change
 * @param input the command's new text, as the player would type it
 * @param expectedInput the text the caller believes is there now — see
 *   {@link commandAt}
 * @returns the new file text and its outlook
 * @throws when the file is unsound, `input` is blank, no command sits at
 *   `commandLine`, or the one there is not the one the caller meant
 */
export function editCommand(
  text: string,
  file: string,
  commandLine: number,
  input: string,
  expectedInput?: string,
): Draft {
  const replacement = input.trim();
  if (!replacement) throw new Error('A command needs some text.');

  const transcript = editable(text, file);
  const command = commandAt(transcript, file, commandLine, expectedInput);
  command.input = replacement;
  return draftFrom(transcript, file);
}

/**
 * Removes a command and everything asserted about it.
 *
 * The command and its assertions go together because they are one thing in the
 * file and one thing to an author: a command with its assertions removed still
 * runs, still consumes a turn, and still shifts every turn-indexed beat beneath
 * it, which is the failure mode R4 exists to make visible. Half a deletion would
 * be the confusing one.
 *
 * @throws when the file is unsound, no command sits at `commandLine`, or the
 *   one there is not the one the caller meant (see {@link commandAt})
 */
export function deleteCommand(
  text: string,
  file: string,
  commandLine: number,
  expectedInput?: string,
): Draft {
  const transcript = editable(text, file);
  const target = commandAt(transcript, file, commandLine, expectedInput);

  transcript.commands = transcript.commands.filter((candidate) => candidate !== target);
  transcript.items = (transcript.items ?? []).filter(
    (item) => !(item.type === 'command' && item.command === target),
  );

  return draftFrom(transcript, file);
}

/**
 * The command at `commandLine`, verified to be the one the caller meant.
 *
 * Line number alone is not a safe identity for a command an author is LOOKING
 * at: the cards carry lines from the last run, and a structural edit since then
 * (a deleted turn) shifts every later command up — so a stale line can land on
 * a DIFFERENT command that now occupies it, and the edit would silently hit the
 * wrong turn. When the caller knows what text it believes is at that line (the
 * card shows it), the file must agree, or the edit is refused with the reason —
 * R10's rule applied to targeting: the editor must not act on a claim it cannot
 * substantiate.
 *
 * `expectedInput` is optional because not every caller has a card in hand.
 */
function commandAt(
  transcript: Transcript,
  file: string,
  commandLine: number,
  expectedInput?: string,
): Transcript['commands'][number] {
  const command = transcript.commands.find((candidate) => candidate.lineNumber === commandLine);
  if (!command) throw new Error(`No command at line ${commandLine} of ${file}`);
  if (expectedInput !== undefined && command.input !== expectedInput) {
    throw new Error(
      `Line ${commandLine} is "> ${command.input}" now, not "> ${expectedInput}" — the file has changed since this run. Run again, then edit.`,
    );
  }
  return command;
}

/**
 * The one problem an edit can legitimately be performed *in order to* fix.
 *
 * A transcript with no commands is what a newly created one is, and adding the
 * first command is exactly how it stops being that. Refusing the edit would
 * leave a new file permanently unfillable from the editor that made it.
 */
const NO_COMMANDS = 'Transcript has no commands';

/**
 * Parses a file for editing, refusing one the runner would refuse.
 *
 * An unsound transcript serializes to a husk, so every edit has to be stopped
 * here rather than at the write — by then the author's work is already gone.
 *
 * @param allowEmpty tolerate a transcript whose ONLY problem is having no
 *   commands. Set by the edit that adds one, and by nothing else: for every
 *   other edit an empty transcript really is a file with nothing to edit.
 */
function editable(text: string, file: string, allowEmpty = false): Transcript {
  const outlook = saveOutlook(text, file);
  if (outlook.kind === 'unsound') {
    const blocking = allowEmpty
      ? outlook.problems.filter((problem) => problem !== NO_COMMANDS)
      : outlook.problems;
    if (blocking.length > 0) throw new Error(`Cannot edit ${file}: ${blocking.join('; ')}`);
  }
  return parse(text, file);
}

/** Writes an edited transcript out and reports what that costs. */
function draftFrom(transcript: Transcript, file: string): Draft {
  const written = serialize(transcript);
  return { text: written, outlook: saveOutlook(written, file) };
}

/**
 * Lines that differ between two texts, as a diff would count them.
 *
 * A longest-common-subsequence over lines, which for the sizes involved here
 * (the largest transcript in the corpus is 359 lines) is not worth optimising:
 * the quadratic table is under 130k cells and runs once per document open.
 */
function countChangedLines(before: string, after: string): number {
  const a = before.split('\n');
  const b = after.split('\n');
  // lcs[i][j] = length of the longest common subsequence of a[i…] and b[j…].
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const common = lcs[0][0];
  return a.length - common + (b.length - common);
}
