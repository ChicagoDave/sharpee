/**
 * lens-words.ts — the examinable lens's words, declared once: each class's
 * title, a source's owner-and-kind words, and the soundness footer. The
 * console form (`examinable-report.ts`) and Chord Writer's Testing tab both
 * read them, so the CLI and the tab cannot drift (ADR-408 Consequences;
 * D-3(a) of the lens-findings-select-phrase plan: one vocabulary).
 *
 * Browser-safe: it imports types only, so the testing surface's bundle can
 * alias it from source, as it does `claim-report` (ADR-355). It must never
 * import `examinable-classify.ts` or anything else that reaches world-index,
 * `fs`, Node types or the DOM.
 *
 * Public interface: `EXAMINABLE_CLASS_TITLES`, `examinableClassTitle`,
 *   `LENS_SOURCE_KIND_WORDS`, `lensSourceWords`, `LENS_SOUNDNESS_FOOTER`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import type { ExaminableKind, LensSource, LensSourceKind } from '@sharpee/ide-protocol';

/**
 * Each class's title, as an author reads it. `resolved-described` is the one
 * class that is not a finding; it is shown only when every row is asked for.
 */
export const EXAMINABLE_CLASS_TITLES: Readonly<Record<ExaminableKind, string>> = {
  'resolved-default': 'No text',
  'not-in-scope': 'Not answered',
  'number-form': 'Number form',
  ambiguous: 'Ambiguous',
  unclassified: 'Unclassified',
  'resolved-described': 'Described',
};

/**
 * A class's title.
 *
 * @param kind the class id, as the lens document and the run events carry it
 * @returns its title; the id itself for a class this module does not know,
 *   so a newer producer's class is shown rather than dropped
 */
export function examinableClassTitle(kind: ExaminableKind | string): string {
  return (EXAMINABLE_CLASS_TITLES as Readonly<Record<string, string>>)[kind] ?? kind;
}

/** Each passage kind, as it follows its owner's name (`Scullery description`). */
export const LENS_SOURCE_KIND_WORDS: Readonly<Record<LensSourceKind, string>> = {
  description: 'description',
  'first-visit': 'first-visit text',
  state: 'state text',
};

/**
 * A source as an author names it: its owner, then its kind.
 *
 * @param source a lens source
 * @returns the owner's display name and the kind's words (`Scullery description`)
 */
export function lensSourceWords(source: LensSource): string {
  return `${source.ownerName} ${LENS_SOURCE_KIND_WORDS[source.kind]}`;
}

/** The soundness footer (ADR-322 D7): findings are real, absence is not proof. */
export const LENS_SOUNDNESS_FOOTER: readonly string[] = [
  'Findings are real: each phrase was executed through the engine in the state',
  'a route first reached its room in. Absence is not proof: rooms no route',
  'reached, and prose only shown in other states, were not examined.',
];
