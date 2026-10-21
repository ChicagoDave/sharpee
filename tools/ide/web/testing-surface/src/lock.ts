/**
 * lock.ts — the Testing tab's lock gesture as a conversation with
 * `sharpee claim` (ADR-367 D7: two surfaces, one path).
 *
 * Purpose: the tab never computes a lock itself. Each step of the gesture is
 *   one `sharpee claim … --json` run the host spawns with the arguments this
 *   module writes, and one JSON object the host hands back, decoded here
 *   through the wire's own guard. Three steps: the offer at a card (no fact),
 *   the proposal for a picked fact (`--propose`), and the write of the
 *   author's edited lists (`--fragment-only`, because the page owns the tree
 *   while it is open and pins the card itself). The argument list is built
 *   here and nowhere else, so neither host carries a second spelling of the
 *   CLI's flags.
 *
 * Public interface: LockStep, LockNeeds, LockPinTarget, lockArgumentsOf,
 *   decodeLockResult, applyLockWritten.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { isClaimJsonOutput, type ClaimJsonOutput, type ClaimWrittenOutput } from '@sharpee/ide-protocol/claim-output';

/** The slice of the tree-session model a written lock touches. */
export interface LockPinTarget {
  setClaimsFile(file: string): void;
  pinLock(cardId: string, name: string): boolean;
}

/**
 * Apply a `written` answer to the page's model: the manifest key when the
 * CLI named one (a fresh fragment), and the claim's name pinned on the card
 * through the same function the CLI pins with (ADR-367 D5, D7). The caller
 * then posts the files that changed. Pure of the DOM, so the real-path test
 * drives exactly what the page drives.
 *
 * @param model the tree-session model
 * @param cardId the card the lock was taken at
 * @param written the CLI's answer
 * @returns true when the pin changed the document
 */
export function applyLockWritten(model: LockPinTarget, cardId: string, written: ClaimWrittenOutput): boolean {
  if (written.manifestKey !== undefined) model.setClaimsFile(written.manifestKey);
  return model.pinLock(cardId, written.name);
}

/** The author's lists as the sheet leaves them (D7's chips). */
export interface LockNeeds {
  rooms: string[];
  things: string[];
  verbs: string[];
}

/** One step of the gesture. */
export interface LockStep {
  /** The line the card sits on — its segment id. */
  line: string;
  /** The card's turn as a player counts it. */
  turn: number;
  /** The picked fact; absent asks for the offer. */
  fact?: string;
  /** The claim's name when the author changed it from the fact. */
  name?: string;
  /** The author's lists; present asks for the write. */
  needs?: LockNeeds;
}

/**
 * The `sharpee claim` arguments for one step, the subcommand first and the
 * project left for the host to append (it knows where the story lives).
 * No fact asks for the offer; a fact without lists asks for the proposal
 * and writes nothing; a fact with lists writes the fragment only.
 *
 * @param step the step
 * @returns the argument list, `claim` first
 */
export function lockArgumentsOf(step: LockStep): string[] {
  const args = ['claim', step.line, '--at', String(step.turn), '--json'];
  if (step.fact === undefined) return args;
  args.splice(2, 0, step.fact);
  if (step.name !== undefined && step.name !== step.fact) args.push('--name', step.name);
  if (step.needs === undefined) {
    args.push('--propose');
    return args;
  }
  args.push('--rooms', step.needs.rooms.join(', '), '--things', step.needs.things.join(', '), '--verbs', step.needs.verbs.join(', '), '--fragment-only');
  return args;
}

/**
 * Decode the one object the CLI printed. Anything that is not one of the
 * four shapes becomes an `error` naming what arrived, so a broken host
 * relay reads as a refusal, never as a silent no-op.
 *
 * @param text the CLI's stdout, whole
 * @returns the decoded object
 */
export function decodeLockResult(text: string): ClaimJsonOutput {
  const line = text.split('\n').map((entry) => entry.trim()).find((entry) => entry.startsWith('{'));
  if (line === undefined) return { kind: 'error', message: text.trim().length > 0 ? text.trim() : 'the lock command printed nothing' };
  try {
    const parsed: unknown = JSON.parse(line);
    if (isClaimJsonOutput(parsed)) return parsed;
    return { kind: 'error', message: `the lock command printed an object the tab does not recognise: ${line.slice(0, 200)}` };
  } catch {
    return { kind: 'error', message: `the lock command printed something that is not JSON: ${line.slice(0, 200)}` };
  }
}
