/**
 * claim-output.ts — what `sharpee claim --json` prints: one object, by kind
 * (ADR-367 D7, the lock's two surfaces on one path).
 *
 * Purpose: the Testing tab locks a claim by running the same `sharpee claim`
 *   command an author types, three steps deep — the offer at a card, the
 *   proposal for a picked fact, the write — and reads each step's answer off
 *   stdout as one JSON object. The CLI writes these shapes; the tab imports
 *   this module directly and decodes through `isClaimJsonOutput`, so the two
 *   sides cannot silently disagree (DEVARCH 8b).
 *
 * Public interface: ClaimJsonOutput and its four variants, ClaimJsonWhere,
 *   isClaimJsonOutput.
 * Owner context: @sharpee/ide-protocol — the shared wire contract.
 */

/** Where a lock stands: the line, the turn as a player counts it, and the card. */
export interface ClaimJsonWhere {
  line: { id: string; label: string };
  turn: number;
  cardId?: string;
}

/** The facts true at the card and not at boot (D1), each a sentence the fragment accepts. */
export interface ClaimOfferOutput extends ClaimJsonWhere {
  kind: 'offer';
  offer: string[];
}

/** The proposed set for a fact (D2), trimmed by the cone, and the block it would write. */
export interface ClaimProposalOutput extends ClaimJsonWhere {
  kind: 'proposal';
  name: string;
  fact: string;
  rooms: string[];
  things: string[];
  /** Things the claim cannot depend on (ADR-365 D12), shown struck through. */
  trimmed: string[];
  verbs: string[];
  /** The Chord block, two-space indented, ending in a newline. */
  block: string;
}

/** The lock was written (D4, D5). */
export interface ClaimWrittenOutput extends ClaimJsonWhere {
  kind: 'written';
  name: string;
  fact: string;
  /** The fragment's path, relative to the story file. */
  claimsFile: string;
  /** The fragment was created rather than appended to. */
  created: boolean;
  /** The card was pinned and the tree written; false under `--fragment-only`. */
  pinned: boolean;
  /** Under `--fragment-only` when the manifest does not name the fragment yet: the `claims` value it needs. */
  manifestKey?: string;
  /** Every file written, relative to the project directory. */
  files: string[];
}

/** The command refused; the exit code says how (2 the request, 3 the story). */
export interface ClaimErrorOutput {
  kind: 'error';
  message: string;
}

/** The one object `sharpee claim --json` prints. */
export type ClaimJsonOutput = ClaimOfferOutput | ClaimProposalOutput | ClaimWrittenOutput | ClaimErrorOutput;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((entry) => typeof entry === 'string');
}

function hasWhere(v: Record<string, unknown>): boolean {
  const line = v.line;
  return (
    isObject(line) &&
    typeof line.id === 'string' &&
    typeof line.label === 'string' &&
    typeof v.turn === 'number' &&
    (v.cardId === undefined || typeof v.cardId === 'string')
  );
}

/**
 * Narrow one parsed stdout object to a valid {@link ClaimJsonOutput}.
 *
 * @param value the parsed JSON
 * @returns true for one of the four shapes
 */
export function isClaimJsonOutput(value: unknown): value is ClaimJsonOutput {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'offer':
      return hasWhere(value) && isStringArray(value.offer);
    case 'proposal':
      return (
        hasWhere(value) &&
        typeof value.name === 'string' &&
        typeof value.fact === 'string' &&
        isStringArray(value.rooms) &&
        isStringArray(value.things) &&
        isStringArray(value.trimmed) &&
        isStringArray(value.verbs) &&
        typeof value.block === 'string'
      );
    case 'written':
      return (
        hasWhere(value) &&
        typeof value.name === 'string' &&
        typeof value.fact === 'string' &&
        typeof value.claimsFile === 'string' &&
        typeof value.created === 'boolean' &&
        typeof value.pinned === 'boolean' &&
        (value.manifestKey === undefined || typeof value.manifestKey === 'string') &&
        isStringArray(value.files)
      );
    case 'error':
      return typeof value.message === 'string';
    default:
      return false;
  }
}
