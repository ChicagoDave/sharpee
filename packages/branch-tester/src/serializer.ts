/**
 * serializer.ts — write a parsed transcript back out as a `.transcript` file.
 *
 * The matched pair to `parseTranscript`: whatever the parser can read, this
 * writes, and reading it back gives the same transcript. Editing tools work on
 * the parsed transcript and re-emit the whole file on save, so an author never
 * has to format one by hand — and never has to wonder whether saving cost them
 * something they had typed.
 *
 * Formatting follows what transcripts in this repository already do most often,
 * so adopting it is a small diff and none of it is a matter of taste.
 *
 * Public interface: `serializeTranscript(transcript) => string`.
 * Owner context: @sharpee/branch-tester (test authoring infrastructure).
 */
import {
  Transcript,
  TranscriptCommand,
  TranscriptItem,
  Assertion,
  Directive
} from './types.js';

/**
 * The order header fields are written in.
 *
 * Fixed rather than "however the author typed them", because a parsed header is
 * a map and a map has no order to remember. This is the order transcripts
 * already use most often, so most files keep the header they had.
 */
const HEADER_ORDER = [
  'title',
  'story',
  'entry',
  // ADR-302 D1: the parent pointer sits with the other identity fields, above
  // the prose ones — a reader asking "where does this start?" should not have
  // to read past the description to find out.
  'continues',
  'author',
  'description',
  'seed',
  'seeds',
  'channels',
  'events',
  'locale',
  'forces',
  'point-seed'
];

/** Column a long header value wraps at. */
const FOLD_WIDTH = 78;

/** Indent for the continuation lines of a wrapped header value. */
const FOLD_INDENT = '  ';

/**
 * `[FAIL]` and `[TODO]` written without a note come back carrying these as
 * their reason, so a bare tag and one that spells the same words out are
 * indistinguishable afterward. Writing the bare form back when the reason is
 * exactly this leaves both spellings untouched on disk.
 */
const DEFAULT_FAIL_REASON = 'Expected failure';
const DEFAULT_TODO_REASON = 'Not implemented';

/**
 * Write one header field, wrapping a long value across continuation lines.
 *
 * A wrapped value is read back as a single string, so where the author put the
 * line breaks is not something to preserve — the wrap is recomputed from the
 * text every time, and reading it back rejoins exactly what was split. A single
 * word longer than the line is never broken.
 */
function foldHeaderField(key: string, value: string): string[] {
  const words = value.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [`${key}:`];

  const lines: string[] = [];
  let current = `${key}:`;
  let indent = '';

  for (const word of words) {
    const candidate = current === indent ? `${indent}${word}` : `${current} ${word}`;
    if (candidate.length > FOLD_WIDTH && current !== indent) {
      lines.push(current);
      indent = FOLD_INDENT;
      current = `${indent}${word}`;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

/** Write the header block, in the fixed field order above. */
function serializeHeader(transcript: Transcript): string[] {
  const lines: string[] = [];
  const emitted = new Set<string>();

  for (const key of HEADER_ORDER) {
    const value = transcript.header[key];
    if (value === undefined) continue;
    lines.push(...foldHeaderField(key, value));
    emitted.add(key);
  }

  // Any field this writer does not recognize. No transcript in the repository
  // has one, but dropping a field an author wrote because it was not on a list
  // is exactly the kind of quiet loss saving must never cause.
  for (const key of Object.keys(transcript.header)) {
    if (emitted.has(key)) continue;
    const value = transcript.header[key];
    if (value === undefined) continue;
    lines.push(...foldHeaderField(key, value));
  }

  return lines;
}

/** Write one assertion tag. Its literal block, if any, is written by the caller. */
function serializeAssertionTag(assertion: Assertion): string {
  switch (assertion.type) {
    case 'ok':
      return '[OK]';

    case 'ok-contains':
      // With no text of its own, the fragment is the block on the next line.
      return assertion.value === undefined
        ? '[OK: contains]'
        : `[OK: contains "${assertion.value}"]`;

    case 'ok-not-contains':
      return `[OK: not contains "${assertion.value}"]`;

    case 'skip':
      return '[SKIP]';

    case 'fail':
      return assertion.reason === DEFAULT_FAIL_REASON
        ? '[FAIL]'
        : `[FAIL: ${assertion.reason}]`;

    case 'todo':
      return assertion.reason === DEFAULT_TODO_REASON
        ? '[TODO]'
        : `[TODO: ${assertion.reason}]`;

    case 'event-assert': {
      const parts: string[] = [String(assertion.assertTrue)];
      if (assertion.eventPosition !== undefined) {
        parts.push(String(assertion.eventPosition));
      }
      const props = [`type="${assertion.eventType}"`];
      for (const [key, value] of Object.entries(assertion.eventData ?? {})) {
        props.push(`${key}="${value}"`);
      }
      return `[EVENT: ${parts.join(', ')}, ${props.join(' ')}]`;
    }

    case 'state-assert':
      return `[STATE: ${assertion.assertTrue}, ${assertion.stateExpression}]`;

    case 'channel-contains':
      return `[CHANNEL: ${assertion.channelId}, contains "${assertion.value}"]`;

    case 'channel-not-contains':
      return `[CHANNEL: ${assertion.channelId}, not contains "${assertion.value}"]`;
  }
}

/**
 * Write one assertion: its tag, then its literal block if it has one.
 *
 * Never a blank line between the two. This is the one formatting rule here that
 * changes meaning rather than looks — a blank line detaches the block from the
 * assertion, and the file would say something different afterward.
 */
function serializeAssertion(assertion: Assertion): string[] {
  const lines = [serializeAssertionTag(assertion)];
  if (assertion.block !== undefined) {
    lines.push('text', ...assertion.block, 'end text');
  }
  return lines;
}

/** Write a command: the command itself, its assertions, then its output. */
function serializeCommand(command: TranscriptCommand): string[] {
  const lines = [`> ${command.input}`];

  for (const assertion of command.assertions) {
    lines.push(...serializeAssertion(assertion));
  }

  // Plain expected-output lines go after the assertions. Only one command in
  // the repository still uses them, and it already writes them in this order.
  lines.push(...command.expectedOutput);

  return lines;
}

/** Write a directive. The `$` forms keep the author's line exactly. */
function serializeDirective(directive: Directive): string[] {
  switch (directive.type) {
    case 'goal':
      return [`[GOAL: ${directive.goalName}]`];
    case 'end_goal':
      return ['[END GOAL]'];
    case 'save':
      return [`$save ${directive.saveName}`];
    case 'restore':
      return [`$restore ${directive.saveName}`];
    case 'test-command':
      return [directive.testCommand!];
  }
}

/**
 * Does this item start a new block of the file — the thing a blank line goes above?
 *
 * A block is a command with its assertions, plus any comments the author wrote
 * immediately above it. The blank line goes above those comments, never between
 * a comment and the command it is talking about. Comments therefore do not
 * start a block on their own; the caller holds them for the command they lead.
 */
function opensStanza(item: TranscriptItem): boolean {
  return item.type === 'command' || item.type === 'directive';
}

/**
 * Write a parsed transcript back out as `.transcript` source.
 *
 * Writing an already-written file changes nothing, so saving a transcript you
 * edited one line of produces a one-line diff.
 *
 * @param transcript a transcript as produced by `parseTranscript`
 * @returns the file's full text, ending in a newline
 */
export function serializeTranscript(transcript: Transcript): string {
  const lines: string[] = [];

  lines.push(...serializeHeader(transcript));
  lines.push('');      // blank line above the separator
  lines.push('---');
  lines.push('');      // and below it

  // Assertions about the opening sit at the top, above the first command,
  // because that is when the banner and the prologue happen.
  for (const assertion of transcript.opening ?? []) {
    lines.push(...serializeAssertion(assertion));
  }
  if (transcript.opening && transcript.opening.length > 0) lines.push('');

  const items = transcript.items ?? [];
  /** Comments held until we know which command they were written above. */
  let pendingComments: string[] = [];
  let firstStanza = true;

  const openStanza = (): void => {
    if (!firstStanza) lines.push('');
    firstStanza = false;
    lines.push(...pendingComments);
    pendingComments = [];
  };

  for (const item of items) {
    if (item.type === 'comment') {
      pendingComments.push(`# ${item.comment!.text}`);
      continue;
    }

    if (!opensStanza(item)) continue;

    openStanza();

    if (item.type === 'command') {
      lines.push(...serializeCommand(item.command!));
    } else {
      const directive = item.directive!;
      lines.push(...serializeDirective(directive));
      // A goal label opens a section and always has a blank line under it. The
      // next command would add its own blank above, so the goal takes that job
      // over rather than letting the two stack up.
      if (directive.type === 'goal') {
        lines.push('');
        firstStanza = true;
      }
    }
  }

  // Comments at the end of the file, with no command under them, are still the
  // author's and still get written.
  if (pendingComments.length > 0) {
    if (!firstStanza) lines.push('');
    lines.push(...pendingComments);
  }

  return lines.join('\n') + '\n';   // files end with a newline
}
