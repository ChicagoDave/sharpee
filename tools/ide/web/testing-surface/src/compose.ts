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
 * Re-hydration (Phase 5): `rehydrateSegmentClaims` is compose's inverse —
 * on reopen, a restored closed segment's claims are parsed BACK out of its
 * `tests/` file (through the same imported parser the runner uses), so the
 * files remain the single truth for closed segments and reopening never
 * rewrites authored claims away (ADR-306 D8: the sidecar carries no
 * assertions; the files do).
 *
 * Public interface: composeSegmentTranscript(options),
 *   composeSegmentLines(options), composeTurnAssertionLines(options, ordinal),
 *   rehydrateSegmentClaims(options, fileText), TurnSource, SourceLine,
 *   DeleteRef.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { synthesizePolicyAssertions } from '@sharpee/branch-tester/auto-assertion';
import { parseTranscript } from '@sharpee/branch-tester/parser';
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
  /** The opening's default contains-fragment (David 2026-08-09: the opening
   *  card lists a default too) — the first line of the opening's own prose,
   *  the story banner's title in the real client. Synthesized only under a
   *  policy, and withheld exactly like turn defaults once the author
   *  narrows (authored contains or a deleted default). */
  openingText?: string;
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

  // Path-ordered iteration (Phase 5): the walk from just after the parent
  // segment to this segment's end, along this segment's own lineage path —
  // never an ordinal window, which would cross lineages after a fork.
  const turns: PlanTurn[] = [];
  for (const turn of model.turnsForCompose(segment)) {
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
  // emissions above the first command. The opening has no feed record for
  // channel synthesis, so its policy default is the caller-supplied
  // `openingText` (the banner's title line) — same precedence as a turn's
  // defaults: authored contains or a deleted default withhold it.
  const opening: PlanEntry[] = [];
  if (segment.start === 0) {
    const claims = model.claimsOf(0);
    if (claims.contains.length === 0 && !claims.noDefaults && policy
        && options.openingText && !options.openingText.includes('"')) {
      opening.push({
        assertion: { type: 'ok-contains', value: options.openingText },
        del: { kind: 'default', ordinal: 0, index: 0, defaults: [options.openingText] },
      });
    }
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

/**
 * Re-hydrates a restored segment's claims from its `tests/` file (compose's
 * inverse — Phase 5). Parses the text through the toolchain's own parser,
 * maps commands 1:1 onto the segment's composed walk, and lifts each turn's
 * assertions back onto the model: a turn whose assertion list matches its
 * re-synthesized policy defaults stays untouched; anything else becomes
 * authored claims (`noDefaults` — defaults stay withheld on recompose).
 * `[SKIP]` turns need nothing (the sidecar's skip set already restored them).
 *
 * @returns 'attached' when recomposing reproduces the file byte-for-byte;
 *   'diverged' when it does not (hand-edited file — the caller must stop
 *   auto-writing it); 'unmapped' when the file cannot be parsed or its
 *   commands do not align with the session (nothing was applied).
 */
export function rehydrateSegmentClaims(
  options: ComposeOptions,
  fileText: string,
): 'attached' | 'diverged' | 'unmapped' {
  const { model, segment, policy, source } = options;
  const parsed = parseTranscript(fileText, 'rehydrate.transcript');
  if ((parsed.parseErrors ?? []).length > 0) return 'unmapped';

  const walk = model.turnsForCompose(segment);
  if (parsed.commands.length !== walk.length) return 'unmapped';

  const lift = (n: number, assertions: Assertion[]): void => {
    for (const assertion of assertions) {
      switch (assertion.type) {
        case 'ok':
          if (assertion.block) model.setExact(n, true);
          break;
        case 'ok-contains':
          if (assertion.value !== undefined) model.addContains(n, assertion.value);
          break;
        case 'ok-not-contains':
          if (assertion.value !== undefined) model.addNotContains(n, assertion.value);
          break;
        case 'state-assert':
          if (assertion.stateExpression) model.addState(n, assertion.stateExpression);
          break;
        case 'event-assert':
          if (assertion.eventType) model.addEvent(n, assertion.eventType);
          break;
        case 'channel-contains':
          if (assertion.channelId && assertion.value !== undefined) {
            model.addChannel(n, { id: assertion.channelId, contains: assertion.value });
          }
          break;
        case 'channel-is':
          if (assertion.channelId && assertion.channelExpected !== undefined) {
            model.addChannel(n, {
              id: assertion.channelId,
              is: assertion.channelExpected as string | number | boolean,
            });
          }
          break;
        default:
          break; // skip markers and unknown forms carry no claims
      }
    }
  };

  parsed.commands.forEach((command, index) => {
    const turn = walk[index];
    const inRange = turn.ordinal >= Math.max(segment.start, 1)
      && !model.isSkipped(turn.ordinal);
    if (!inRange) return; // ancestry/pruned turns: [SKIP] comes from structure
    const onlySkip = command.assertions.every(a => a.type === 'skip');
    if (onlySkip) return;

    // Untouched turns re-synthesize identically — leave them defaults.
    const src = source(turn.ordinal);
    const synthesized = policy && src
      ? synthesizePolicyAssertions(policy, src.output, src.channelValues)
      : [];
    if (JSON.stringify(command.assertions) === JSON.stringify(synthesized)) return;

    lift(turn.ordinal, command.assertions);
    // Suppress default re-synthesis: the file's list IS the claim set now.
    const claims = model.claimsOf(turn.ordinal);
    if (!claims.exact && claims.contains.length === 0) {
      model.removeDefault(turn.ordinal, -1, claims.contains.slice());
    }
  });

  if (segment.start === 0 && parsed.opening) {
    lift(0, parsed.opening);
  }

  return composeSegmentTranscript(options).text === fileText ? 'attached' : 'diverged';
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
 * One turn's assertion lines — the same plan the file text derives from,
 * scoped to a single ordinal (0 = the opening's claims). The cards column
 * renders these inside each turn card (David's ruling 2026-08-09: the
 * assertions live in the box, under the prose, above the buttons), every
 * deletable line carrying its DeleteRef. Empty when the turn is outside
 * the segment's walk.
 *
 * @param options the segment whose plan covers the turn.
 * @param ordinal the turn to render lines for.
 * @returns tag/skip lines for that turn (exact literal block lines included).
 */
export function composeTurnAssertionLines(
  options: ComposeOptions, ordinal: number,
): SourceLine[] {
  const plan = segmentPlan(options);
  if (ordinal === 0) {
    return plan.opening.flatMap(entry => entryLines(entry));
  }
  const turn = plan.turns.find(t => t.ordinal === ordinal);
  return turn ? turn.entries.flatMap(entry => entryLines(entry)) : [];
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
