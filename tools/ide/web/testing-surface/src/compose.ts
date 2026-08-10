/**
 * compose.ts — a card's assertion display lines (ADR-307: the tab is the
 * human view of the tree; there is no transcript text to mirror).
 *
 * Purpose: renders one card's assertion list — authored claims straight off
 *   the card, policy defaults synthesized LIVE through branch-tester's own
 *   synthesis module (imported from source, never reimplemented), and the
 *   opening card's defaults (prologue, title, description — ADR-307 open
 *   question D, resolved 2026-08-10) from the boot captures. Every deletable
 *   line carries a DeleteRef the cards layer maps straight onto a
 *   TreeSessionModel mutator — deletion semantics live in the model, never
 *   re-derived here.
 *
 * v1's transcript-text composition, `continues:` headers, and file
 * re-hydration are gone with the files themselves (D1/D2): serialization is
 * the shared tree-document module's, and claims live in the document.
 *
 * Public interface: cardAssertionLines(options, ordinal),
 *   openingDefaultClaims(policy, bootCaptures),
 *   turnContainsDefaults(policy, source), CardLineOptions, TurnSource,
 *   SourceLine, DeleteRef.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import {
  synthesizeOpeningAssertions,
  synthesizePolicyAssertions,
} from '@sharpee/branch-tester/auto-assertion';
import type { Assertion, AutoAssertionPolicy } from '@sharpee/branch-tester/types';
import type { TreeChannelAssertion } from '@sharpee/branch-tester/tree-document';
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
 * by the cards layer. `default` carries the surviving contains fragments for
 * `removeDefault` (narrowing); `defaultWhole` drops a non-contains policy
 * default whole; `openingDefault` carries the opening's surviving channel
 * claims for `removeOpeningDefault`; `exact` deletes the literal block whole.
 */
export type DeleteRef =
  | { kind: 'default'; ordinal: number; index: number; defaults: string[] }
  | { kind: 'defaultWhole'; ordinal: number }
  | { kind: 'openingDefault'; index: number; defaults: TreeChannelAssertion[] }
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

/** Everything line composition reads — one options object so every card
 *  renders from the same inputs. */
export interface CardLineOptions {
  model: TreeSessionModel;
  /** The story's `auto-assertion:` policy — no policy, no default lines. */
  policy?: AutoAssertionPolicy;
  /** Per-ordinal synthesis source (the feed record's output + captures). */
  source: (ordinal: number) => TurnSource | undefined;
  /** The BOOT's channel captures — the opening defaults' carrier. */
  bootCaptures?: Record<string, unknown[]>;
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
 * The opening card's default claims in the document's channel shape
 * (ADR-307 open question D: prologue, title, description) — what the model's
 * `removeOpeningDefault` narrows into authored channel claims. Derived from
 * the shared synthesis so both consumers agree on the pieces.
 *
 * @param policy the story's policy — no policy, no defaults.
 * @param bootCaptures the boot's structured channel captures.
 * @returns the defaults as channel claims, possibly empty.
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

/** The policy's contains-fragments for a turn — `removeDefault`'s narrowing
 *  base when a non-contains default line is deleted whole. */
export function turnContainsDefaults(
  policy: AutoAssertionPolicy | undefined,
  source: TurnSource | undefined,
): string[] {
  if (policy === undefined || source === undefined) return [];
  return synthesizePolicyAssertions(policy, source.output, source.channelValues)
    .filter((a) => a.type === 'ok-contains' && a.value !== undefined)
    .map((a) => a.value as string);
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

/** A synthesized turn default as display lines (value-form contains lines
 *  narrow individually; everything else deletes whole). */
function defaultLines(ordinal: number, synthesized: Assertion[]): SourceLine[] {
  const containsDefaults = synthesized
    .filter((a) => a.type === 'ok-contains' && a.value !== undefined)
    .map((a) => a.value as string);
  const lines: SourceLine[] = [];
  let containsIndex = 0;
  for (const assertion of synthesized) {
    if (assertion.type === 'skip') {
      lines.push({ text: '[SKIP]', kind: 'skip' });
    } else if (assertion.type === 'ok-contains' && assertion.value !== undefined) {
      lines.push({
        text: `contains ${quoted(assertion.value)}`,
        kind: 'assertion',
        del: { kind: 'default', ordinal, index: containsIndex, defaults: containsDefaults },
      });
      containsIndex += 1;
    } else if (assertion.type === 'ok-contains' && assertion.block !== undefined) {
      lines.push({
        text: `contains (${assertion.block.length} lines)`,
        kind: 'assertion',
        del: { kind: 'defaultWhole', ordinal },
      });
      lines.push(...assertion.block.map((text) => ({ text, kind: 'block' as const })));
    } else if (assertion.type === 'ok' && assertion.block !== undefined) {
      lines.push({
        text: `exact output (${assertion.block.length} lines)`,
        kind: 'assertion',
        del: { kind: 'defaultWhole', ordinal },
      });
      lines.push(...assertion.block.map((text) => ({ text, kind: 'block' as const })));
    }
  }
  return lines;
}

/**
 * One card's assertion display lines: the authored claims (each deletable
 * through its DeleteRef), or the card's live defaults when it authors
 * nothing — turn defaults from the policy synthesis, opening defaults from
 * the boot captures. A pruned-to-nothing card shows `[SKIP]`.
 *
 * @param options the shared composition inputs.
 * @param ordinal the bound card to render lines for (0 = the opening).
 * @returns the lines, empty for an unbound ordinal.
 */
export function cardAssertionLines(options: CardLineOptions, ordinal: number): SourceLine[] {
  const { model, policy, source, bootCaptures } = options;
  const card = model.cardAt(ordinal);
  if (card === undefined) return [];

  if (model.claimsNothing(ordinal)) return [{ text: '[SKIP]', kind: 'skip' }];

  const claims = card.assertions;
  const lines: SourceLine[] = [];

  if (claims?.exact !== undefined) {
    lines.push({
      text: `exact output (${claims.exact.length} lines)`,
      kind: 'assertion',
      del: { kind: 'exact', ordinal },
    });
    lines.push(...claims.exact.map((text) => ({ text, kind: 'block' as const })));
    lines.push(...nonProseLines(ordinal, claims));
    return lines;
  }

  const hasAuthoredProse = (claims?.contains?.length ?? 0) > 0;
  const authorsAnything =
    hasAuthoredProse ||
    (claims?.notContains?.length ?? 0) > 0 ||
    (claims?.states?.length ?? 0) > 0 ||
    (claims?.events?.length ?? 0) > 0 ||
    (claims?.channels?.length ?? 0) > 0;

  // Defaults synthesize only while the author has not narrowed them away:
  // no authored contains (turns) / channels (opening), and no `noDefaults`.
  if (!hasAuthoredProse && claims?.noDefaults !== true && policy !== undefined) {
    if (ordinal === 0) {
      if ((claims?.channels?.length ?? 0) === 0) {
        const defaults = openingDefaultClaims(policy, bootCaptures);
        defaults.forEach((claim, index) =>
          lines.push({
            text: channelLineText(claim),
            kind: 'assertion',
            del: { kind: 'openingDefault', index, defaults },
          }),
        );
      }
    } else {
      const src = source(ordinal);
      if (src !== undefined) {
        const synthesized = synthesizePolicyAssertions(policy, src.output, src.channelValues);
        // The synthesis's [SKIP] placeholder only shows when the card
        // authors nothing at all — an authored family already speaks.
        const meaningful = synthesized.filter((a) => a.type !== 'skip');
        if (meaningful.length > 0 || !authorsAnything) {
          lines.push(...defaultLines(ordinal, meaningful.length > 0 ? meaningful : synthesized));
        }
      }
    }
  }

  (claims?.contains ?? []).forEach((value, index) =>
    lines.push({
      text: `contains ${quoted(value)}`,
      kind: 'assertion',
      del: { kind: 'contains', ordinal, index },
    }),
  );
  (claims?.notContains ?? []).forEach((value, index) =>
    lines.push({
      text: `not contains ${quoted(value)}`,
      kind: 'assertion',
      del: { kind: 'notContains', ordinal, index },
    }),
  );
  if (claims !== undefined) lines.push(...nonProseLines(ordinal, claims));

  return lines;
}
