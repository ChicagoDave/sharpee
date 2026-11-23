/**
 * examinable-classify.ts — the examinable lens's pure half: reading the
 * engine's answer to `examine <phrase>`, trying a noun in both grammatical
 * numbers, and folding a story's findings.
 *
 * Purpose: every class here is decided by the engine's events (ADR-407 D7).
 * `classifyExamine` reads one turn; `classifyCandidates` decides which forms
 * are typed and turns the verdicts into rows; `foldFindings` folds the rows
 * of every room into one line per finding. Nothing here touches a world or
 * an engine: the runner (`examinable-lens.ts`) types the commands.
 *
 * Ported from the spike, `tools/explorer-probe/lens-examinable.js`
 * (`classify`, `otherNumber`, `classifyCandidates`, `foldFindings`), whose
 * pins this module must reproduce (ADR-408 AC-1).
 *
 * Public interface: `classifyExamine`, `classifyCandidates`,
 *   `foldFindings`, `isFinding`, and the row and finding types.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-294 D23, ADR-408 D3).
 */

import type { NounExtractor } from '@sharpee/if-domain/nouns';
import { readsAsThing } from '@sharpee/world-index';
import type { ClaimsTurnEvent } from '../claims/claims-game.js';

/** One class per executed phrase. Every class but `resolved-described` is a finding. */
export type ExaminableKind =
  | 'resolved-described'
  | 'resolved-default'
  | 'not-in-scope'
  | 'number-form'
  | 'ambiguous'
  | 'unclassified';

/** The engine's answer to one `examine <form>`. */
export interface ExamineVerdict {
  readonly kind: Exclude<ExaminableKind, 'number-form'>;
  readonly detail: string;
  /** The display name of the thing that answered, when one did. */
  readonly target?: string;
}

/** One row of a room: a phrase from its prose, or the other number of one. */
export interface ExaminableRow {
  readonly phrase: string;
  readonly kind: ExaminableKind;
  readonly detail: string;
  readonly target?: string;
  /** For a number-form row: the form that did resolve. */
  readonly resolvedForm?: string;
  /** Where in the room's prose the phrase was read: `room`, `room (first visit)`, or a thing's name. */
  readonly sources: readonly string[];
  /** False only for a non-resolution whose head noun is not a thing an author could implement. */
  readonly thing: boolean;
}

/** A room's candidates, folded across its prose: one entry per distinct phrase. */
export type FoldedCandidates = ReadonlyMap<string, { readonly words: readonly string[]; readonly sources: readonly string[] }>;

/** One finding, folded across every room it was seen in. */
export interface ExaminableFinding {
  readonly phrase: string;
  readonly kind: ExaminableKind;
  readonly detail: string;
  readonly target?: string;
  readonly resolvedForm?: string;
  readonly thing: boolean;
  readonly sources: readonly string[];
  readonly rooms: ReadonlyArray<{ readonly roomId: string; readonly room: string }>;
}

/** A room's rows, as `foldFindings` reads them. */
export interface ExaminableRoomRows {
  readonly roomId: string;
  readonly room: string;
  readonly rows: readonly ExaminableRow[];
}

/** Examine message ids that mean "resolved, but the author wrote nothing." */
const DEFAULT_RESPONSE_SUFFIXES = ['.default_description', '.default_description_self', '.nothing_special'];

/** `if.event.examined`'s data, as far as the lens reads it. */
interface ExaminedData {
  readonly messageId?: string;
  readonly blocked?: boolean;
  readonly targetName?: string;
  readonly isContentsMessage?: boolean;
}

/** `client.query`'s data, as far as the lens reads it. */
interface QueryData {
  readonly messageId?: string;
  readonly candidates?: ReadonlyArray<{ readonly name?: string; readonly id?: string } | string>;
}

/** `command.failed`'s data, as far as the lens reads it. */
interface FailedData {
  readonly reason?: string;
}

/** The parts of a turn's result the classifier reads. */
export interface ExamineTurn {
  readonly events: readonly ClaimsTurnEvent[];
  /** The engine's `TurnResult.success`; undefined when the turn threw. */
  readonly success?: boolean;
  /** The engine's `TurnResult.error`. */
  readonly error?: string;
  /** What the turn threw, when it threw instead of answering. */
  readonly thrown?: string;
}

/**
 * Classify one executed `examine <phrase>` from what the turn produced.
 *
 * @param turn the turn's events and result
 * @returns the verdict. `unclassified` is a lens defect to look at, never
 *   dropped: it names what the turn threw and the event types it saw.
 */
export function classifyExamine(turn: ExamineTurn): ExamineVerdict {
  const examined = turn.events.find((event) => event.type === 'if.event.examined' && !(event.data as ExaminedData | undefined)?.isContentsMessage);
  if (examined) {
    const data = (examined.data as ExaminedData | undefined) ?? {};
    const id = String(data.messageId ?? '');
    const target = data.targetName;
    if (data.blocked) return { kind: 'not-in-scope', detail: id, ...(target !== undefined ? { target } : {}) };
    if (DEFAULT_RESPONSE_SUFFIXES.some((suffix) => id.endsWith(suffix))) {
      return { kind: 'resolved-default', detail: id, ...(target !== undefined ? { target } : {}) };
    }
    return { kind: 'resolved-described', detail: id, ...(target !== undefined ? { target } : {}) };
  }

  const query = turn.events.find((event) => event.type === 'client.query');
  if (query) {
    const data = (query.data as QueryData | undefined) ?? {};
    const names = (data.candidates ?? []).map((candidate) => (typeof candidate === 'string' ? candidate : candidate.name ?? candidate.id ?? ''));
    return { kind: 'ambiguous', detail: names.join(' / ') || String(data.messageId ?? 'query') };
  }

  const failed = turn.events.find((event) => event.type === 'command.failed');
  if (failed || turn.success === false) {
    const reason = (failed?.data as FailedData | undefined)?.reason ?? turn.error ?? 'failed';
    return { kind: 'not-in-scope', detail: String(reason) };
  }

  return { kind: 'unclassified', detail: (turn.thrown ? `${turn.thrown} ` : '') + turn.events.map((event) => event.type).join(',') };
}

/**
 * A phrase with its head noun in the other grammatical number (ADR-407 D5).
 *
 * @param words the candidate's words; the last is its head
 * @param extractor the story language's extractor, whose `numberForms` decides
 * @returns the phrase in the other number, or null when the language gives
 *   the head no other form
 */
function otherNumber(words: readonly string[], extractor: NounExtractor): string | null {
  const head = words[words.length - 1];
  const forms = extractor.numberForms(head);
  if (forms.singular === forms.plural) return null;
  const other = head === forms.plural ? forms.singular : head === forms.singular ? forms.plural : null;
  return other === null ? null : [...words.slice(0, -1), other].join(' ');
}

const resolves = (verdict: ExamineVerdict): boolean => verdict.kind === 'resolved-described' || verdict.kind === 'resolved-default';

/** No entity answered at all; a blocked examine named one, so it does not count. */
const nothingAnswered = (verdict: ExamineVerdict): boolean => verdict.kind === 'not-in-scope' && verdict.target === undefined;

function numberFormRow(phrase: string, failed: ExamineVerdict, resolvedForm: string, resolved: ExamineVerdict, sources: readonly string[]): ExaminableRow {
  return {
    phrase,
    kind: 'number-form',
    detail: failed.detail,
    ...(resolved.target !== undefined ? { target: resolved.target } : {}),
    resolvedForm,
    sources: [...sources],
    thing: true,
  };
}

/**
 * Classify a room's candidates, each in both grammatical numbers (ADR-407 D5, D7).
 *
 * A written phrase is a number-form finding when nothing answers it and its
 * other number resolves; otherwise it keeps its own verdict. The other number
 * of a phrase that resolves is added as a number-form row when nothing
 * answers it, unless the prose wrote that form too. Each distinct form is
 * typed once.
 *
 * @param folded the room's candidates, in prose order
 * @param runForm types `examine <form>` and returns the engine's verdict
 * @param extractor the story language's extractor
 * @returns the room's rows: each written phrase in prose order, followed by
 *   any number-form row for its other number
 */
export async function classifyCandidates(
  folded: FoldedCandidates,
  runForm: (form: string) => Promise<ExamineVerdict>,
  extractor: NounExtractor,
): Promise<ExaminableRow[]> {
  const verdicts = new Map<string, ExamineVerdict>();
  const verdictOf = async (form: string): Promise<ExamineVerdict> => {
    const known = verdicts.get(form);
    if (known) return known;
    const verdict = await runForm(form);
    verdicts.set(form, verdict);
    return verdict;
  };
  const rows: ExaminableRow[] = [];
  const rowed = new Set<string>();
  for (const [phrase, { words, sources }] of folded) {
    const written = await verdictOf(phrase);
    const otherPhrase = otherNumber(words, extractor);
    const other = otherPhrase === null ? null : await verdictOf(otherPhrase);
    if (other && otherPhrase !== null && nothingAnswered(written) && resolves(other)) {
      rows.push(numberFormRow(phrase, written, otherPhrase, other, sources));
    } else {
      rows.push({
        phrase,
        kind: written.kind,
        detail: written.detail,
        ...(written.target !== undefined ? { target: written.target } : {}),
        sources: [...sources],
        // Only a non-resolution is asked "is this even a thing"; a phrase
        // that resolved is a thing by demonstration.
        thing: written.kind === 'not-in-scope' ? readsAsThing({ phrase, words }) : true,
      });
    }
    rowed.add(phrase);
    if (other && otherPhrase !== null && !folded.has(otherPhrase) && !rowed.has(otherPhrase) && nothingAnswered(other) && resolves(written)) {
      rows.push(numberFormRow(otherPhrase, other, phrase, written, sources));
      rowed.add(otherPhrase);
    }
  }
  return rows;
}

/** A finding row is anything that is not a described resolution. */
export function isFinding(row: ExaminableRow): boolean {
  return row.kind !== 'resolved-described';
}

/**
 * Fold the finding rows of every room by (phrase, kind, detail).
 *
 * @param rooms the per-room rows, in discovery order
 * @returns findings sorted most-rooms first, then by phrase; each carries the
 *   rooms it was seen in (discovery order) and the union of its sources
 */
export function foldFindings(rooms: readonly ExaminableRoomRows[]): ExaminableFinding[] {
  const byKey = new Map<string, { finding: Omit<ExaminableFinding, 'sources' | 'rooms'>; sources: string[]; rooms: Array<{ roomId: string; room: string }> }>();
  for (const room of rooms) {
    for (const row of room.rows) {
      if (!isFinding(row)) continue;
      const key = JSON.stringify([row.phrase, row.kind, row.detail]);
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          finding: {
            phrase: row.phrase,
            kind: row.kind,
            detail: row.detail,
            thing: row.thing,
            ...(row.target !== undefined ? { target: row.target } : {}),
            ...(row.resolvedForm !== undefined ? { resolvedForm: row.resolvedForm } : {}),
          },
          sources: [],
          rooms: [],
        };
        byKey.set(key, entry);
      }
      for (const source of row.sources) if (!entry.sources.includes(source)) entry.sources.push(source);
      entry.rooms.push({ roomId: room.roomId, room: room.room });
    }
  }
  return [...byKey.values()]
    .map(({ finding, sources, rooms: seenIn }) => ({ ...finding, sources, rooms: seenIn }))
    .sort((a, b) => b.rooms.length - a.rooms.length || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
}
