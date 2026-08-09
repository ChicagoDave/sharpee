/**
 * compose.ts — a segment's transcript, composed through the toolchain's own
 * modules (ADR-306 Phase 4, design §3–§5).
 *
 * Purpose: turns one segment of the session into (a) serialized `.transcript`
 *   text for the auto-save writer and (b) display lines for the source panel,
 *   both derived from ONE shared plan so the panel shows exactly what the
 *   file carries. Policy defaults synthesize through branch-tester's
 *   `synthesizePolicyAssertions` and text renders through its
 *   `serializeTranscript` / `serializeAssertionTag` — imported from SOURCE
 *   (ADR-306 D2: the one code path, reused never reimplemented). Structure
 *   rules are the design's: a root carries `seed:` and may claim the opening;
 *   a continuation carries `continues:` and starts after its parent's end;
 *   pre-range and pruned turns write `[SKIP]`; Exact supersedes the contains
 *   family but not the non-prose families; no policy and no claims writes the
 *   `[SKIP]` placeholder (6e's let-me-decide form).
 *
 * Every deletable line carries a DeleteRef the source panel maps straight
 * onto a SessionModel mutator — deletion semantics live in the model, never
 * re-derived here.
 *
 * Public interface: composeSegmentTranscript(options),
 *   composeSegmentLines(options), TurnSource, SourceLine, DeleteRef.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { synthesizePolicyAssertions } from '@sharpee/branch-tester/auto-assertion';
import { serializeAssertionTag, serializeTranscript } from '@sharpee/branch-tester/serializer';
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

/**
 * What deleting a source line means — mapped onto SessionModel mutators by
 * the panel. `default` carries the surviving fragments for `removeDefault`
 * (narrowing); `defaultWhole` drops a non-contains policy default whole;
 * `exact` deletes the literal block whole.
 */
export type DeleteRef =
  | { kind: 'default'; ordinal: number; index: number; defaults: string[] }
  | { kind: 'defaultWhole'; ordinal: number }
  | { kind: 'contains' | 'notContains' | 'state' | 'event' | 'channel';
      ordinal: number; index: number }
  | { kind: 'exact'; ordinal: number };

/** One display line of the source panel. */
export interface SourceLine {
  text: string;
  kind: 'header' | 'separator' | 'blank' | 'command' | 'assertion' | 'skip' | 'block';
  del?: DeleteRef;
}

interface PlanEntry { assertion: Assertion; del?: DeleteRef }
interface PlanTurn { ordinal: number; command: string; entries: PlanEntry[] }
interface SegmentPlan {
  title: string;
  parentTitle?: string;
  turns: PlanTurn[];
  opening: PlanEntry[];
}

interface ComposeOptions {
  model: SessionModel;
  segment: Segment;
  policy?: AutoAssertionPolicy;
  seed: number;
  source: (ordinal: number) => TurnSource | undefined;
}

/** The authored non-prose claims as entries (states/events/channels). */
function nonProseEntries(claims: Readonly<TurnClaims>, ordinal: number): PlanEntry[] {
  const entries: PlanEntry[] = [];
  claims.states.forEach((expression, index) => entries.push({
    assertion: { type: 'state-assert', assertTrue: true, stateExpression: expression },
    del: { kind: 'state', ordinal, index },
  }));
  claims.events.forEach((type, index) => entries.push({
    assertion: { type: 'event-assert', assertTrue: true, eventType: type },
    del: { kind: 'event', ordinal, index },
  }));
  claims.channels.forEach((channel, index) => entries.push({
    assertion: channel.contains !== undefined
      ? { type: 'channel-contains', channelId: channel.id, value: channel.contains }
      : { type: 'channel-is', channelId: channel.id, channelExpected: channel.is },
    del: { kind: 'channel', ordinal, index },
  }));
  return entries;
}

/** One in-range turn's entries (design §5's precedence rules). */
function turnEntries(
  claims: Readonly<TurnClaims>,
  ordinal: number,
  policy: AutoAssertionPolicy | undefined,
  source: TurnSource | undefined,
): PlanEntry[] {
  if (claims.exact) {
    const block = (source?.output ?? '').split('\n');
    return [
      { assertion: { type: 'ok', block }, del: { kind: 'exact', ordinal } },
      ...nonProseEntries(claims, ordinal),
    ];
  }

  const entries: PlanEntry[] = [];
  if (claims.contains.length === 0 && !claims.noDefaults && policy && source) {
    const synthesized = synthesizePolicyAssertions(policy, source.output, source.channelValues);
    const containsDefaults = synthesized
      .filter(a => a.type === 'ok-contains' && a.value !== undefined)
      .map(a => a.value as string);
    let containsIndex = 0;
    for (const assertion of synthesized) {
      if (assertion.type === 'ok-contains' && assertion.value !== undefined) {
        entries.push({
          assertion,
          del: { kind: 'default', ordinal, index: containsIndex, defaults: containsDefaults },
        });
        containsIndex += 1;
      } else {
        entries.push({ assertion, del: { kind: 'defaultWhole', ordinal } });
      }
    }
  }
  claims.contains.forEach((value, index) => entries.push({
    assertion: { type: 'ok-contains', value },
    del: { kind: 'contains', ordinal, index },
  }));
  claims.notContains.forEach((value, index) => entries.push({
    assertion: { type: 'ok-not-contains', value },
    del: { kind: 'notContains', ordinal, index },
  }));
  entries.push(...nonProseEntries(claims, ordinal));

  // Nothing to claim and no policy to supply defaults: the 6e placeholder —
  // executed for state, deliberately not asserted yet.
  if (entries.length === 0) return [{ assertion: { type: 'skip' } }];
  return entries;
}

/** The shared plan both renderings derive from. */
function segmentPlan(options: ComposeOptions): SegmentPlan {
  const { model, segment, policy, seed, source } = options;
  void seed;
  const title = model.titleOf(segment);
  const parent = model.parentOf(segment);
  const end = segment.end ?? segment.start;
  const from = parent ? (parent.end ?? parent.start) + 1 : 1;

  const turns: PlanTurn[] = [];
  for (const turn of model.turns) {
    if (turn.ordinal < from || turn.ordinal > end || turn.ordinal === 0) continue;
    const inRange = turn.ordinal >= Math.max(segment.start, 1)
      && !model.isSkipped(turn.ordinal);
    turns.push({
      ordinal: turn.ordinal,
      command: turn.command,
      entries: inRange
        ? turnEntries(model.claimsOf(turn.ordinal), turn.ordinal, policy, source(turn.ordinal))
        : [{ assertion: { type: 'skip' } }],
    });
  }

  // A segment starting at the OPENING (ordinal 0) claims the boot's
  // emissions above the first command — authored claims only (the opening
  // has no feed record for policy synthesis; absence is its no-claim form).
  const opening: PlanEntry[] = [];
  if (segment.start === 0) {
    const claims = model.claimsOf(0);
    claims.contains.forEach((value, index) => opening.push({
      assertion: { type: 'ok-contains', value },
      del: { kind: 'contains', ordinal: 0, index },
    }));
    claims.notContains.forEach((value, index) => opening.push({
      assertion: { type: 'ok-not-contains', value },
      del: { kind: 'notContains', ordinal: 0, index },
    }));
    opening.push(...nonProseEntries(claims, 0));
  }

  return parent
    ? { title, parentTitle: model.titleOf(parent), turns, opening }
    : { title, turns, opening };
}

/**
 * Composes one segment's complete `.transcript` text (the writer's input).
 *
 * @returns the derived title and the serialized file text
 */
export function composeSegmentTranscript(
  options: ComposeOptions,
): { title: string; text: string } {
  const plan = segmentPlan(options);

  const header: Transcript['header'] = plan.parentTitle !== undefined
    ? { title: plan.title, continues: plan.parentTitle }
    : { title: plan.title, seed: String(options.seed) };

  const commands: TranscriptCommand[] = plan.turns.map(turn => ({
    lineNumber: 0,
    input: turn.command,
    expectedOutput: [],
    assertions: turn.entries.map(entry => entry.assertion),
  }));
  const items: TranscriptItem[] = commands.map(command => ({ type: 'command', command }));

  const transcript: Transcript = {
    filePath: `tests/${plan.title}.transcript`,
    header,
    commands,
    items,
    comments: [],
  };
  if (plan.opening.length > 0) {
    transcript.opening = plan.opening.map(entry => entry.assertion);
  }

  return { title: plan.title, text: serializeTranscript(transcript) };
}

/** One entry as display lines: the tag line (deletable), plus block lines. */
function entryLines(entry: PlanEntry): SourceLine[] {
  const { assertion } = entry;
  if (assertion.type === 'skip') {
    return [{ text: '[SKIP]', kind: 'skip' }];
  }
  const tag: SourceLine = {
    text: serializeAssertionTag(assertion),
    kind: 'assertion',
    ...(entry.del ? { del: entry.del } : {}),
  };
  if (!assertion.block) return [tag];
  return [
    tag,
    { text: 'text', kind: 'block' },
    ...assertion.block.map(line => ({ text: line, kind: 'block' as const })),
    { text: 'end text', kind: 'block' },
  ];
}

/**
 * Composes the source panel's display lines — same plan as the file text,
 * every deletable assertion carrying its DeleteRef.
 */
export function composeSegmentLines(options: ComposeOptions): SourceLine[] {
  const plan = segmentPlan(options);
  const lines: SourceLine[] = [];
  lines.push({ text: `title: ${plan.title}`, kind: 'header' });
  lines.push(plan.parentTitle !== undefined
    ? { text: `continues: ${plan.parentTitle}`, kind: 'header' }
    : { text: `seed: ${options.seed}`, kind: 'header' });
  lines.push({ text: '', kind: 'blank' });
  lines.push({ text: '---', kind: 'separator' });
  lines.push({ text: '', kind: 'blank' });

  if (plan.opening.length > 0) {
    for (const entry of plan.opening) lines.push(...entryLines(entry));
    lines.push({ text: '', kind: 'blank' });
  }

  plan.turns.forEach((turn, index) => {
    lines.push({ text: `> ${turn.command}`, kind: 'command' });
    for (const entry of turn.entries) lines.push(...entryLines(entry));
    if (index < plan.turns.length - 1) lines.push({ text: '', kind: 'blank' });
  });

  return lines;
}
