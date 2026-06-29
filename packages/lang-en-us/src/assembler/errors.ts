/**
 * @file Assembler error types (ADR-192).
 *
 * Purpose: the named error the English Assembler throws when it meets a phrase
 * kind whose realization has not yet landed.
 *
 * Public interface: `PhraseNotImplementedError`.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. The reserved
 * `if-domain` stub kinds are realized only by their follow-on ADRs; until then
 * the Assembler refuses them loudly rather than emitting `Empty`. With ADR-195
 * (Slot) landed, only `Optional` / `Choice` (ADR-196) remain unrealized.
 */

import { Phrase } from '@sharpee/if-domain';

/** Maps each still-unrealized stub kind to the ADR that will implement its case. */
const STUB_KIND_ADR: Partial<Record<Phrase['kind'], string>> = {
  optional: 'ADR-196',
  choice: 'ADR-196',
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
