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
 * The rows and findings are `@sharpee/ide-protocol`'s lens types (ADR-408
 * D4): a row names each passage it was read from by key and owner IR id, and
 * the IR id of the thing that answered.
 *
 * Public interface: `classifyExamine`, `classifyCandidates`,
 *   `foldFindings`, `isFinding`, `ExamineVerdict`, `ExamineTurn`,
 *   `FoldedCandidates`, `ExaminableRoomRows`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-294 D23, ADR-408 D3).
 */

import type { NounExtractor } from '@sharpee/if-domain/nouns';
import type { ExaminableFinding, ExaminableKind, ExaminableRow, LensRoomRef, LensSource } from '@sharpee/ide-protocol';
import { readsAsThing } from '@sharpee/world-index';
import type { ClaimsTurnEvent } from '../claims/claims-game.js';

/** The engine's answer to one `examine <form>`. */
export interface ExamineVerdict {
  readonly kind: Exclude<ExaminableKind, 'number-form'>;
  readonly detail: string;
  /** The display name of the thing that answered, when one did. */
  readonly target?: string;
  /** The IR id of the thing that answered, when one did and the IR declares it. */
  readonly targetId?: string;
}

/** A room's candidates, folded across its prose: one entry per distinct phrase, with every passage it was read from. */
export type FoldedCandidates = ReadonlyMap<string, { readonly words: readonly string[]; readonly sources: readonly LensSource[] }>;

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
  /** The engine's runtime id of the examined entity. */
  readonly targetId?: string;
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

/** The engine's runtime entity id to the IR id the story declares it by, or undefined for an entity the IR does not declare. */
export type IrIdOf = (entityId: string) => string | undefined;

/**
 * Classify one executed `examine <phrase>` from what the turn produced.
 *
 * @param turn the turn's events and result
 * @param irIdOf maps the examined event's runtime target id to its IR id
 * @returns the verdict. `unclassified` is a lens defect to look at, never
 *   dropped: it names what the turn threw and the event types it saw.
 */
export function classifyExamine(turn: ExamineTurn, irIdOf: IrIdOf): ExamineVerdict {
  const examined = turn.events.find((event) => event.type === 'if.event.examined' && !(event.data as ExaminedData | undefined)?.isContentsMessage);
  if (examined) {
    const data = (examined.data as ExaminedData | undefined) ?? {};
    const id = String(data.messageId ?? '');
    const target = data.targetName;
    const targetId = data.targetId === undefined ? undefined : irIdOf(data.targetId);
    const answered = { ...(target !== undefined ? { target } : {}), ...(targetId !== undefined ? { targetId } : {}) };
    if (data.blocked) return { kind: 'not-in-scope', detail: id, ...answered };
    if (DEFAULT_RESPONSE_SUFFIXES.some((suffix) => id.endsWith(suffix))) {
      return { kind: 'resolved-default', detail: id, ...answered };
    }
    return { kind: 'resolved-described', detail: id, ...answered };
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

/** The verdict's answering thing, as a row carries it. */
function answeredBy(verdict: ExamineVerdict): Pick<ExaminableRow, 'target' | 'targetId'> {
  return { ...(verdict.target !== undefined ? { target: verdict.target } : {}), ...(verdict.targetId !== undefined ? { targetId: verdict.targetId } : {}) };
}

function numberFormRow(phrase: string, failed: ExamineVerdict, resolvedForm: string, resolved: ExamineVerdict, sources: readonly LensSource[]): ExaminableRow {
  return {
    phrase,
    kind: 'number-form',
    detail: failed.detail,
    ...answeredBy(resolved),
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
        ...answeredBy(written),
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
 * A source's identity for a union: its passage key, or, for text with no
 * key, its kind and owner. Two rooms reading one passage name one source.
 */
export function sourceIdentity(source: LensSource): string {
  return source.key !== null ? `key:${source.key}` : JSON.stringify([source.kind, source.ownerId, source.ownerName]);
}

/**
 * Add each source not already in `into`, by `sourceIdentity`, keeping first-seen order.
 *
 * @param into the list to extend, changed in place
 * @param sources the sources to union in
 */
export function unionSources(into: LensSource[], sources: readonly LensSource[]): void {
  const seen = new Set(into.map(sourceIdentity));
  for (const source of sources) {
    const identity = sourceIdentity(source);
    if (seen.has(identity)) continue;
    seen.add(identity);
    into.push(source);
  }
}

/**
 * Fold the finding rows of every room by (phrase, kind, detail, target id).
 * The target id is part of the fold so that one phrase answered by two
 * different things in two rooms stays two findings, each naming its own
 * declaration.
 *
 * @param rooms the per-room rows, in discovery order
 * @returns findings sorted most-rooms first, then by phrase; each carries the
 *   rooms it was seen in (discovery order) and the union of its sources by key
 */
export function foldFindings(rooms: readonly ExaminableRoomRows[]): ExaminableFinding[] {
  const byKey = new Map<string, { finding: Omit<ExaminableFinding, 'sources' | 'rooms'>; sources: LensSource[]; rooms: LensRoomRef[] }>();
  for (const room of rooms) {
    for (const row of room.rows) {
      if (!isFinding(row)) continue;
      const key = JSON.stringify([row.phrase, row.kind, row.detail, row.targetId ?? null]);
      let entry = byKey.get(key);
      if (!entry) {
        entry = {
          finding: {
            phrase: row.phrase,
            kind: row.kind,
            detail: row.detail,
            thing: row.thing,
            ...(row.target !== undefined ? { target: row.target } : {}),
            ...(row.targetId !== undefined ? { targetId: row.targetId } : {}),
            ...(row.resolvedForm !== undefined ? { resolvedForm: row.resolvedForm } : {}),
          },
          sources: [],
          rooms: [],
        };
        byKey.set(key, entry);
      }
      unionSources(entry.sources, row.sources);
      entry.rooms.push({ roomId: room.roomId, room: room.room });
    }
  }
  return [...byKey.values()]
    .map(({ finding, sources, rooms: seenIn }) => ({ ...finding, sources, rooms: seenIn }))
    .sort((a, b) => b.rooms.length - a.rooms.length || (a.phrase < b.phrase ? -1 : a.phrase > b.phrase ? 1 : 0));
}
