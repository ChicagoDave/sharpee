/**
 * topic-tables.ts — the runtime's topic tables section.
 *
 * Topic tables' claims: which phrase keys a table row claims for its owner
 * (so the dialogue registration can tell an authored line from a platform
 * default) and the witnessed alias a row is reached by.
 *
 * Public interface: TopicTablesSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { ClaimTag } from '@sharpee/character';
import type { RuntimeCore } from './core.js';

export class TopicTablesSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Lazily built phrase-key → claims-tag map (ADR-318 D9). */
  private phraseClaims?: Map<string, ClaimTag>;

  /** The claims tag a phrase key carries, if any (ADR-318 D9). */
  claimsFor(phraseKey: string): ClaimTag | undefined {
    if (!this.phraseClaims) {
      this.phraseClaims = new Map();
      const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
      for (const [key, phrase] of Object.entries(table)) {
        if (phrase.claims) this.phraseClaims.set(key, { ...phrase.claims });
      }
    }
    return this.phraseClaims.get(phraseKey);
  }

  /**
   * The D12a witnessed-topic alias for (actor, act), when the story
   * declares one (`define topic <actor> <act> as <alias>`); otherwise
   * the deterministic derived name stands.
   */
  witnessedAliasFor(actorIrId: string | undefined, act: string, derived: string): string {
    if (!actorIrId) return derived;
    const alias = (this.core.ir.witnessedTopics ?? []).find((w) => w.actor === actorIrId && w.act === act);
    return alias?.alias ?? derived;
  }
}
