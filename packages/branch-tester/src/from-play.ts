/**
 * from-play.ts — build a `.transcript` from a played session (ADR-305).
 *
 * The IDE's play surface records turns (command, composed output, structured
 * channel captures) and the author selects which of them a new transcript
 * should assert. This module turns that selection into serialized transcript
 * text: selection chooses what is ASSERTED, never what runs (ADR-305 D2) — the
 * file carries every command from the origin through the last selected turn,
 * with unselected turns written `[SKIP]` (executed for state, deliberately not
 * asserted). Assertions are synthesized at creation from the played captures
 * through the same engine the runner uses (ADR-305 D5, `auto-assertion.ts`).
 *
 * Restart fencing is the CALLER's job (ADR-305 D3): the records passed in must
 * all belong to one lineage — this module never sees a `restart`.
 *
 * Public interface: `createTranscriptFromPlay(options) => string`,
 * `PlayedTurnRecord`, `CreateFromPlayOptions`, `FromPlayError`.
 * Owner context: @sharpee/branch-tester (test authoring infrastructure).
 */
import { Assertion, AutoAssertionPolicy, Transcript, TranscriptItem } from './types.js';
import { synthesizePolicyAssertions } from './auto-assertion.js';
import { serializeTranscript } from './serializer.js';

/** One played turn as the play surface's feed recorded it (ADR-305 D4). */
export interface PlayedTurnRecord {
  /** The feed's monotonic ordinal — used only to name a turn in errors. */
  turn: number;
  /** The typed command, no `> ` prefix. */
  command: string;
  /**
   * The turn's composed prose — the ENGINE's text, joined the way the
   * headless harness joins it, so an `all-emitted-text` block matches replay.
   */
  output: string;
  /**
   * The turn's channel captures, structured values per channel id. Values
   * stay structured on the wire; flattening to `contains` fragments happens
   * in `auto-assertion.ts` — the one implementation (ADR-305 D5 as amended).
   */
  captures?: Array<{ channel: string; values: unknown[] }>;
  /** Whether the author's margin selection includes this turn. */
  selected: boolean;
}

/** Input to `createTranscriptFromPlay`. */
export interface CreateFromPlayOptions {
  /**
   * The story's `auto-assertion:` policy, absent for "let me decide" — in
   * which case selected turns get the `[SKIP]` placeholder, exactly what the
   * editor writes for a new command in that mode (ADR-305 D5).
   */
  policy?: AutoAssertionPolicy;
  /** The play session's pinned seed (ADR-305 D1), written as `seed:`. */
  seed: number;
  /**
   * The transcript's `title:`. The grammar requires a title or story header
   * (`validateTranscript`), so an absent title gets the default below — the
   * caller can re-title after its save panel names the file.
   */
  title?: string;
  /** The lineage's turns in play order, from its origin. */
  turns: PlayedTurnRecord[];
}

/**
 * A refusal (ADR-305 D6): the input cannot become a transcript, and nothing
 * must be written. The message names the offending turn where one exists.
 */
export class FromPlayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FromPlayError';
  }
}

/**
 * Build serialized `.transcript` text from a played session's records.
 *
 * @param options policy, pinned seed, and the lineage's turns in play order
 * @returns the complete file text, ready to write to disk
 * @throws FromPlayError when no turn is selected, or when a record is
 *   malformed (blank command, non-finite ordinal) — refusals write nothing
 */
export function createTranscriptFromPlay(options: CreateFromPlayOptions): string {
  const { policy, seed, turns } = options;

  for (const record of turns) {
    if (!Number.isFinite(record.turn)) {
      throw new FromPlayError('play record has no turn ordinal — the feed record is incomplete');
    }
    if (typeof record.command !== 'string' || record.command.trim() === '') {
      throw new FromPlayError(`turn ${record.turn} has no command — the feed record is incomplete`);
    }
    if (typeof record.output !== 'string') {
      throw new FromPlayError(`turn ${record.turn} has no output — the feed record is incomplete`);
    }
  }

  const lastSelected = turns.map(t => t.selected).lastIndexOf(true);
  if (lastSelected === -1) {
    throw new FromPlayError('no turns selected — a transcript asserts something');
  }

  // ADR-305 D2: origin through the last selected turn; trailing unselected
  // turns contribute no state anything asserted depends on, so they go.
  const carried = turns.slice(0, lastSelected + 1);

  const items: TranscriptItem[] = carried.map(record => ({
    type: 'command',
    command: {
      lineNumber: 0,
      input: record.command.trim(),
      expectedOutput: [],
      assertions: assertionsFor(record, policy)
    }
  }));

  const transcript: Transcript = {
    filePath: '',
    header: { title: options.title?.trim() || 'Created from play', seed: String(seed) },
    commands: items.map(item => item.command!),
    items,
    comments: []
  };

  return serializeTranscript(transcript);
}

/**
 * The assertions one carried turn gets (ADR-305 D2/D5):
 * - unselected → `[SKIP]`: setup, executed for state, deliberately unasserted;
 * - selected without a policy → `[SKIP]`: the "let me decide" placeholder;
 * - selected under a policy → synthesized from the played output/captures;
 *   EXCEPT a turn whose composed output is blank stays BARE — the runner
 *   leaves a blank turn unsynthesized too, and creation must not invent a
 *   distinction the runner would not (one code path, ADR-305 D5).
 */
function assertionsFor(
  record: PlayedTurnRecord,
  policy: AutoAssertionPolicy | undefined
): Assertion[] {
  if (!record.selected || policy === undefined) return [{ type: 'skip' }];
  if (record.output.trim() === '') return [];
  return synthesizePolicyAssertions(policy, record.output, channelValuesOf(record.captures));
}

/** Re-key the feed's capture list into the synthesis engine's record shape. */
function channelValuesOf(
  captures: Array<{ channel: string; values: unknown[] }> | undefined
): Record<string, unknown[]> | undefined {
  if (!captures || captures.length === 0) return undefined;
  const record: Record<string, unknown[]> = {};
  for (const capture of captures) {
    record[capture.channel] = [...(record[capture.channel] ?? []), ...capture.values];
  }
  return record;
}
