/**
 * compose.ts — a segment's transcript, composed through the toolchain's own
 * modules (ADR-306 Phase 4, design §3–§5).
 *
 * Purpose: turns one closed-or-open segment of the session into serialized
 *   `.transcript` text. Policy defaults synthesize through branch-tester's
 *   `synthesizePolicyAssertions` and the text serializes through its
 *   `serializeTranscript` — both imported from SOURCE (ADR-306 D2: the one
 *   code path, reused never reimplemented). Structure rules are the design's:
 *   a root carries `seed:` and may claim the opening; a continuation carries
 *   `continues:` and starts after its parent's end; pre-range turns ride as
 *   `[SKIP]`; pruned turns write `[SKIP]`; Exact supersedes the contains
 *   family but not the non-prose families; no policy and no claims writes the
 *   `[SKIP]` placeholder (6e's let-me-decide form).
 *
 * Public interface: composeSegmentTranscript(options), TurnSource.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { synthesizePolicyAssertions } from '@sharpee/branch-tester/auto-assertion';
import { serializeTranscript } from '@sharpee/branch-tester/serializer';
import type {
  Assertion, AutoAssertionPolicy, Transcript, TranscriptCommand, TranscriptItem,
} from '@sharpee/branch-tester/types';
import type { Segment, SessionModel, TurnClaims } from './model';

/** What synthesis needs from a turn's feed record. */
export interface TurnSource {
  /** The engine-composed output (the feed record's `output`). */
  output: string;
  /** Channel id → captured values, as `synthesizePolicyAssertions` reads. */
  channelValues?: Record<string, unknown[]>;
}

/** The authored claims as toolchain assertions (non-prose families). */
function nonProseAssertions(claims: Readonly<TurnClaims>): Assertion[] {
  const assertions: Assertion[] = [];
  for (const expression of claims.states) {
    assertions.push({ type: 'state-assert', assertTrue: true, stateExpression: expression });
  }
  for (const type of claims.events) {
    assertions.push({ type: 'event-assert', assertTrue: true, eventType: type });
  }
  for (const channel of claims.channels) {
    if (channel.contains !== undefined) {
      assertions.push({ type: 'channel-contains', channelId: channel.id, value: channel.contains });
    } else if (channel.is !== undefined) {
      assertions.push({ type: 'channel-is', channelId: channel.id, channelExpected: channel.is });
    }
  }
  return assertions;
}

/** One in-range turn's assertion list (design §5's precedence rules). */
function turnAssertions(
  claims: Readonly<TurnClaims>,
  policy: AutoAssertionPolicy | undefined,
  source: TurnSource | undefined,
): Assertion[] {
  if (claims.exact) {
    // [OK] + the whole turn as a literal block; contains is superseded, the
    // non-prose families still apply.
    const block = (source?.output ?? '').split('\n');
    return [{ type: 'ok', block }, ...nonProseAssertions(claims)];
  }

  const assertions: Assertion[] = [];
  if (claims.contains.length === 0 && !claims.noDefaults && policy && source) {
    assertions.push(...synthesizePolicyAssertions(policy, source.output, source.channelValues));
  }
  for (const value of claims.contains) {
    assertions.push({ type: 'ok-contains', value });
  }
  for (const value of claims.notContains) {
    assertions.push({ type: 'ok-not-contains', value });
  }
  assertions.push(...nonProseAssertions(claims));

  // Nothing to claim and no policy to supply defaults: the 6e placeholder —
  // executed for state, deliberately not asserted yet.
  if (assertions.length === 0) return [{ type: 'skip' }];
  return assertions;
}

/**
 * Composes one segment's transcript text.
 *
 * @param options.model    the session model (segments, claims, names)
 * @param options.segment  the segment to compose (open ranges compose too —
 *   the source panel shows them; the WRITER only writes closed ones)
 * @param options.policy   the story's `auto-assertion:` policy, if declared
 * @param options.seed     the pinned play seed (roots write `seed:`)
 * @param options.source   per-ordinal feed data for synthesis
 * @returns the derived title and the complete serialized file text
 */
export function composeSegmentTranscript(options: {
  model: SessionModel;
  segment: Segment;
  policy?: AutoAssertionPolicy;
  seed: number;
  source: (ordinal: number) => TurnSource | undefined;
}): { title: string; text: string } {
  const { model, segment, policy, seed, source } = options;
  const title = model.titleOf(segment);
  const parent = model.parentOf(segment);
  const end = segment.end ?? segment.start;

  const header: Transcript['header'] = parent
    ? { title, continues: model.titleOf(parent) }
    : { title, seed: String(seed) };

  const commands: TranscriptCommand[] = [];
  const from = parent ? (parent.end ?? parent.start) + 1 : 1;
  for (const turn of model.turns) {
    if (turn.ordinal < from || turn.ordinal > end || turn.ordinal === 0) continue;
    const inRange = turn.ordinal >= Math.max(segment.start, 1)
      && !model.isSkipped(turn.ordinal);
    commands.push({
      lineNumber: 0,
      input: turn.command,
      expectedOutput: [],
      assertions: inRange
        ? turnAssertions(model.claimsOf(turn.ordinal), policy, source(turn.ordinal))
        : [{ type: 'skip' }],
    });
  }

  const items: TranscriptItem[] = commands.map(command => ({ type: 'command', command }));

  const transcript: Transcript = {
    filePath: `tests/${title}.transcript`,
    header,
    commands,
    items,
    comments: [],
  };

  // A segment starting at the OPENING (ordinal 0) claims the boot's
  // emissions above the first command — authored claims only (the opening
  // has no feed record for policy synthesis; absence is its no-claim form).
  if (segment.start === 0) {
    const claims = model.claimsOf(0);
    const opening: Assertion[] = [];
    for (const value of claims.contains) opening.push({ type: 'ok-contains', value });
    for (const value of claims.notContains) opening.push({ type: 'ok-not-contains', value });
    opening.push(...nonProseAssertions(claims));
    if (opening.length > 0) transcript.opening = opening;
  }

  return { title, text: serializeTranscript(transcript) };
}
