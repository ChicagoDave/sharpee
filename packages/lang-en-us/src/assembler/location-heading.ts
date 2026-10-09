/**
 * @file English realization of the location heading's parts (ADR-349 D13).
 *
 * The projection in `@sharpee/world-model` returns the heading as ordered parts
 * and never as a joined string, because who joins them — and with what
 * punctuation and whitespace — is the locale's authority, and the English
 * Assembler holds it by written contract: "the SOLE authority for every
 * cross-cutting correctness concern — article, agreement, punctuation,
 * whitespace, reference, and case" (`english-assembler.ts:4-7`). This file is
 * where English exercises that authority over this particular join.
 *
 * The parts are positional and take no conjunction — "Top of Well, in the
 * bucket", never "Top of Well and the bucket". That is why the tree is a
 * `Sequence` and not a `PhraseList`: a list would impose ADR-190's
 * comma-and-`and` semantics, which reads an enclosure as a second item in a list
 * of places.
 *
 * Public interface: `locationHeadingPhrase`, `realizeLocationHeading`.
 * Owner context: `@sharpee/lang-en-us` — English realization.
 */

import type { HeadingPart, Phrase, RenderContext, Mentioned } from '@sharpee/if-domain';
import { EnglishAssembler } from './english-assembler.js';

/**
 * The punctuation English puts between two heading parts. A `Sequence` inserts
 * nothing of its own — it abuts its parts byte-exactly — so the separator is an
 * explicit node in the tree, which is what keeps this file, rather than the
 * combinator, the thing that decides it.
 */
const PART_SEPARATOR = ', ';

/**
 * Build the phrase tree for a heading.
 *
 * INVARIANT: every node is a `Literal` or the enclosing `Sequence`. Neither reads
 * the render context while realizing (`english-assembler.ts` — the `Literal` and
 * `Sequence` cases take `ctx` and never touch it), which is what lets
 * `realizeLocationHeading` realize without a live world.
 *
 * @param parts the heading's parts in emission order; blank texts are dropped
 * @returns a `Sequence` of the parts with separators between them, or `Empty`
 *   when no part carries text
 */
export function locationHeadingPhrase(
  parts: ReadonlyArray<Pick<HeadingPart, 'text'>>,
): Phrase {
  const spoken = parts.filter((part) => part.text.trim().length > 0);
  if (spoken.length === 0) return { kind: 'empty' };

  const nodes: Phrase[] = [];
  spoken.forEach((part, index) => {
    if (index > 0) nodes.push({ kind: 'literal', text: PART_SEPARATOR });
    nodes.push({ kind: 'literal', text: part.text });
  });
  return { kind: 'seq', parts: nodes };
}

/**
 * A render context for a tree of literals.
 *
 * Every accessor is inert because `locationHeadingPhrase`'s invariant says none
 * of them is reached. It exists because `Assembler.realize` takes a context by
 * contract, not because this realization has state — supplying a live one would
 * mean handing the `location` channel producer a world adapter, a text-state
 * store, and a reference context to realize two string literals and a comma.
 */
function literalOnlyContext(): RenderContext {
  let last: Mentioned | undefined;
  return {
    world: {
      getEntity: () => undefined,
      getEntityContents: () => [],
      getContainingRoom: () => undefined,
    },
    params: {},
    settings: {},
    narrative: { person: 'third' },
    reference: {
      lastMentioned: () => last,
      note: (mentioned) => {
        last = mentioned;
      },
    },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const assembler = new EnglishAssembler();

/**
 * Realize a heading's parts to the text the player reads.
 *
 * @param parts the heading's parts in emission order
 * @returns the joined heading, or `''` when no part carries text
 */
export function realizeLocationHeading(
  parts: ReadonlyArray<Pick<HeadingPart, 'text'>>,
): string {
  const tree = locationHeadingPhrase(parts);
  if (tree.kind === 'empty') return '';
  const blocks = assembler.realize(tree, literalOnlyContext());
  return blocks
    .map((block) => block.content.map((node) => (typeof node === 'string' ? node : '')).join(''))
    .join('');
}
