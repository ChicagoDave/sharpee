/**
 * @file Assembler error types (ADR-192).
 *
 * Purpose: the named error the English Assembler throws when it meets a phrase
 * kind whose realization has not yet landed.
 *
 * Public interface: `PhraseNotImplementedError`.
 *
 * Owner context: `@sharpee/lang-en-us` — English realization. As of ADR-196
 * (Optional / Choice) every if-domain phrase kind is realized; this error is now
 * a defensive guard against a future kind landing without an Assembler case,
 * refusing loudly rather than silently dropping text.
 */

import { Phrase } from '@sharpee/if-domain';

/** Maps a still-unrealized stub kind to the ADR that will implement its case. */
const STUB_KIND_ADR: Partial<Record<Phrase['kind'], string>> = {
  // All kinds are realized as of ADR-196; an entry here would name the pending ADR.
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
