/**
 * extras.ts — the well-formed hatch for the bind-check fixture (ADR-259 D5).
 * The other cases are written to a temp dir by the test.
 */
import type { Literal, PhraseProducer } from '@sharpee/if-domain';

export const flavor: PhraseProducer = () => ({
  kind: 'literal',
  text: 'The yard smells of rain.',
} as Literal);
