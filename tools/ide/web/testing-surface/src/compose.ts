/**
 * compose.ts — a card's assertion display lines, and RECORD-TIME synthesis
 * (ADR-307; David 2026-08-10: the JSON is the source of truth for all
 * testing elements).
 *
 * Purpose: two jobs, one vocabulary. (1) Render one card's assertion list
 *   straight off the card — every claim in the document, each deletable
 *   through a DeleteRef the cards layer maps onto a TreeSessionModel
 *   mutator. (2) Build the assertions RECORDING persists into a card when a
 *   turn lands: the effective policy synthesizes from the turn's REAL
 *   captures through branch-tester's own synthesis module (imported from
 *   source, never reimplemented) and the result is written into the JSON.
 *   Nothing synthesizes at render or run time — what you see is what the
 *   document says, and what runs is exactly the same.
 *
 * v1's transcript-text composition, `continues:` headers, and file
 * re-hydration are gone with the files themselves (D1/D2); v2's live-default
 * rendering (`noDefaults`, narrowing refs) went with run-time synthesis.
 *
 * Public interface: cardAssertionLines(options, ordinal),
 *   openingDefaultClaims(policy, bootCaptures),
 *   recordedTurnAssertions(policy, source), RecordedAssertions,
 *   CardLineOptions, TurnSource, SourceLine, DeleteRef.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import {
  synthesizeOpeningAssertions,
  synthesizePolicyAssertions,
} from '@sharpee/branch-tester/auto-assertion';
import type { AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import type { TreeAssertions, TreeChannelAssertion } from '@sharpee/branch-tester/tree-document';
import type { TreeSessionModel } from './model';

/** What synthesis needs from a turn's feed record. */
export interface TurnSource {
  /** The engine-composed output (the feed record's `output`). */
  output: string;
  /** Channel id → captured values, as the synthesis module reads them. */
  channelValues?: Record<string, unknown[]>;
}

/**
 * What deleting a display line means — mapped onto TreeSessionModel mutators
 * by the cards layer. Every claim is an ordinary document assertion now
 * (recording persists synthesis into the card), so deletion is plain
 * per-family removal; `exact` deletes the literal block whole.
 */
export type DeleteRef =
  | {
      kind: 'contains' | 'notContains' | 'state' | 'event' | 'channel';
      ordinal: number;
      index: number;
    }
  | { kind: 'exact'; ordinal: number };

/** One display line of a card's assertion list. */
export interface SourceLine {
  text: string;
  kind: 'assertion' | 'skip' | 'block';
  del?: DeleteRef;
}

/** Everything line composition reads. Rendering is document-only — the
 *  policy and captures matter at RECORD time, not here. */
export interface CardLineOptions {
  model: TreeSessionModel;
}

/** A quoted fragment as display lines carry it. */
const quoted = (text: string): string => `"${text}"`;

/** One channel claim's display text (`channel info.title is "…"`). */
function channelLineText(claim: TreeChannelAssertion): string {
  if (claim.is !== undefined) return `channel ${claim.id} is ${quoted(claim.is)}`;
  const fragments = (claim.contains ?? []).map(quoted).join(', ');
  return `channel ${claim.id} contains ${fragments}`;
}

/**
 * The opening card's recorded claims in the document's channel shape
 * (ADR-307 open question D: prologue, title, description). RECORD time only:
 * the boot delivery persists these into the opening card (David 2026-08-10 —
 * the JSON is the source of truth); rendering and runs read the card.
 *
 * @param policy the story's effective policy — no policy, no claims.
 * @param bootCaptures the boot's structured channel captures.
 * @returns the claims, possibly empty.
 */
export function openingDefaultClaims(
  policy: AutoAssertionPolicy | undefined,
  bootCaptures: Record<string, unknown[]> | undefined,
): TreeChannelAssertion[] {
  return synthesizeOpeningAssertions(policy, bootCaptures).map((assertion) => {
    const id =
      (assertion.channelPath?.length ?? 0) > 0
        ? `${assertion.channelId}.${assertion.channelPath!.join('.')}`
        : assertion.channelId!;
    return assertion.type === 'channel-contains'
      ? { id, contains: [assertion.value!] }
      : { id, is: String(assertion.channelExpected) };
  });
}

/** What recording persists onto an appended card: assertions, or an explicit
 *  `[SKIP]` demotion when the policy had nothing to read this turn. */
export interface RecordedAssertions {
  assertions?: TreeAssertions;
  skip?: boolean;
}

/**
 * The assertions RECORDING persists onto a just-played turn's card — the
 * effective policy's synthesis over the turn's real captures, in the
 * document's families (David 2026-08-10: the JSON is the source of truth).
 *
 * Room policies produce `contains` entries (a multi-line fragment persists
 * one entry per line — each must appear); `all-emitted-text` persists the
 * whole output as `exact`. A turn that emitted nothing the policy reads
 * persists an explicit `skip` — visible in the JSON, never assumed.
 *
 * @param policy the story's effective policy — no policy, nothing persists.
 * @param source the turn's output and captures.
 * @returns what to persist; `{}` when there is no policy or no source.
 */
export function recordedTurnAssertions(
  policy: AutoAssertionPolicy | undefined,
  source: TurnSource | undefined,
): RecordedAssertions {
  if (policy === undefined || source === undefined) return {};
  const synthesized = synthesizePolicyAssertions(policy, source.output, source.channelValues);

  const assertions: TreeAssertions = {};
  for (const assertion of synthesized) {
    if (assertion.type === 'skip') return { skip: true };
    if (assertion.type === 'ok' && assertion.block !== undefined) {
      assertions.exact = [...assertion.block];
    } else if (assertion.type === 'ok-contains' && assertion.value !== undefined) {
      (assertions.contains ??= []).push(assertion.value);
    } else if (assertion.type === 'ok-contains' && assertion.block !== undefined) {
      (assertions.contains ??= []).push(...assertion.block);
    }
  }
  return Object.keys(assertions).length > 0 ? { assertions } : {};
}

/** Authored non-prose families as lines (states, events, channels). */
function nonProseLines(
  ordinal: number,
  claims: { states?: string[]; events?: string[]; channels?: TreeChannelAssertion[] },
): SourceLine[] {
  const lines: SourceLine[] = [];
  (claims.states ?? []).forEach((expression, index) =>
    lines.push({
      text: `state ${expression}`,
      kind: 'assertion',
      del: { kind: 'state', ordinal, index },
    }),
  );
  (claims.events ?? []).forEach((type, index) =>
    lines.push({
      text: `event ${type}`,
      kind: 'assertion',
      del: { kind: 'event', ordinal, index },
    }),
  );
  (claims.channels ?? []).forEach((claim, index) =>
    lines.push({
      text: channelLineText(claim),
      kind: 'assertion',
      del: { kind: 'channel', ordinal, index },
    }),
  );
  return lines;
}

/**
 * One card's assertion display lines — the document's claims, verbatim, each
 * deletable through its DeleteRef. A `skip` card shows `[SKIP]`; a bare card
 * (hand-edited — recording always persists something) shows `no assertions`,
 * the state a run will fail by name.
 *
 * @param options the shared composition inputs.
 * @param ordinal the bound card to render lines for (0 = the opening).
 * @returns the lines, empty for an unbound ordinal.
 */
export function cardAssertionLines(options: CardLineOptions, ordinal: number): SourceLine[] {
  const { model } = options;
  const card = model.cardAt(ordinal);
  if (card === undefined) return [];

  if (model.claimsNothing(ordinal)) return [{ text: '[SKIP]', kind: 'skip' }];

  const claims = card.assertions;
  if (claims === undefined) return [{ text: 'no assertions', kind: 'skip' }];

  const lines: SourceLine[] = [];

  if (claims.exact !== undefined) {
    lines.push({
      text: `exact output (${claims.exact.length} lines)`,
      kind: 'assertion',
      del: { kind: 'exact', ordinal },
    });
    lines.push(...claims.exact.map((text) => ({ text, kind: 'block' as const })));
    lines.push(...nonProseLines(ordinal, claims));
    return lines;
  }

  (claims.contains ?? []).forEach((value, index) =>
    lines.push({
      text: `contains ${quoted(value)}`,
      kind: 'assertion',
      del: { kind: 'contains', ordinal, index },
    }),
  );
  (claims.notContains ?? []).forEach((value, index) =>
    lines.push({
      text: `not contains ${quoted(value)}`,
      kind: 'assertion',
      del: { kind: 'notContains', ordinal, index },
    }),
  );
  lines.push(...nonProseLines(ordinal, claims));

  if (lines.length === 0) return [{ text: 'no assertions', kind: 'skip' }];
  return lines;
}
