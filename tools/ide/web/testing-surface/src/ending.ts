/**
 * ending.ts — has the story ended, as state rather than as prose (ADR-347).
 *
 * Purpose: the engine enters the `stopped` phase at an Ending and refuses
 *   every subsequent command — but a refusal still comes back as a completed
 *   turn record carrying the refusal as its output. A driver that asks only
 *   "did a turn land" therefore counts every refusal as a step taken and
 *   walks on, which is how replaying a tree whose prefix dies produced
 *   thousands of identical `the engine is in the 'stopped' phase` turns with
 *   every assertion failing.
 *
 *   The fix is to ask the question the platform answers in state. ADR-347 D3a
 *   put the Ending on the `story-ending` channel precisely so a client need
 *   not infer it: not from the refusal's wording, and not from the
 *   `data-story-ended` attribute another client's renderer happens to stamp —
 *   both are surrogates, and D3a exists because four namings of one fact was
 *   the defect.
 *
 * Public interface: EndingState, endingOf, blocksCommand.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

/** One capture as the feed carries it. */
interface Capture {
  channel: string;
  values: unknown[];
}

/**
 * What a delivered record said about the story's Ending.
 *
 * `story-ending` is a replace-mode STATE channel with three answers, and they
 * are different claims: the record while the world holds an Ending, `null` on
 * the turn a previously-reported one goes away (an UNDO or RESTORE back to a
 * live turn), and silence otherwise. `undefined` means "said nothing" and must
 * never be read as "not ended".
 */
export type EndingState = 'ended' | 'live' | undefined;

/**
 * Reads the Ending out of a delivered record's captures.
 *
 * @param captures the record's channel captures, or undefined when it carries none
 * @returns `'ended'` while the world holds an Ending, `'live'` on the clear
 *   signal, `undefined` when the channel said nothing this turn
 */
export function endingOf(captures: readonly Capture[] | undefined): EndingState {
  const capture = (captures ?? []).find(c => c.channel === 'story-ending');
  if (!capture) return undefined;

  const value = capture.values.at(-1);
  if (value === null) return 'live';
  if (typeof value === 'object' && value !== undefined) {
    const kind = (value as { kind?: unknown }).kind;
    if (kind === 'victory' || kind === 'defeat') return 'ended';
  }
  // Anything else on this channel is a story's own payload, not an Ending.
  // Guessing at it would lock the driver out of a story that overrode it.
  return undefined;
}

/**
 * Whether a stopped engine would refuse this command.
 *
 * Mirrors the engine's own rule rather than restating it differently: once
 * stopped, only the meta commands are accepted, and `restart` in particular
 * must still go through — it is the one way back, and the replay driver's
 * fresh-boot primitive is built on it.
 *
 * @param command the command about to be typed, as authored
 */
export function blocksCommand(command: string): boolean {
  const meta = new Set(['restart', 'restore', 'quit', 'undo']);
  return !meta.has(command.trim().toLowerCase());
}
