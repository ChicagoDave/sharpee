/**
 * @file Assembler error types (ADR-192).
 *
 * Purpose: the named error the English Assembler throws when it meets a phrase
 * kind whose realization has not yet landed.
 *
 * Public interface: `PhraseNotImplementedError`.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. The seven stub
 * kinds (Pronoun, Numeral, Verbatim, Contents, Slot, Optional, Choice) are
 * reserved in the `if-domain` algebra but realized only by their follow-on ADRs;
 * until then the Assembler refuses them loudly rather than emitting `Empty`.
 */

import { Phrase } from '@sharpee/if-domain';

/** Maps each stub kind to the ADR that will implement its Assembler case. */
const STUB_KIND_ADR: Partial<Record<Phrase['kind'], string>> = {
  contents: 'ADR-194',
  slot: 'ADR-195',
  optional: 'ADR-196',
  choice: 'ADR-196',
  pronoun: 'ADR-197',
  number: 'ADR-198',
  verbatim: 'the Verbatim ADR',
};

/**
 * Thrown by the Assembler when a reserved (stub) phrase kind is realized before
 * its follow-on ADR has implemented the case. Names the kind and the ADR.
 */
export class PhraseNotImplementedError extends Error {
  readonly kind: Phrase['kind'];

  constructor(kind: Phrase['kind']) {
    const adr = STUB_KIND_ADR[kind] ?? 'a follow-on ADR';
    super(`Phrase kind '${kind}' is not yet realized by the English Assembler (lands in ${adr}).`);
    this.name = 'PhraseNotImplementedError';
    this.kind = kind;
  }
}
