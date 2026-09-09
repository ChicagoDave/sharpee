/**
 * bind.ts — the runtime's bind section.
 *
 * Phrasebooks and message overrides, and the gerund checks every bind step
 * shares. The story's `use`d and `define`d phrasebooks resolve once (manifest
 * keys checked against the packaged data, dotted keys refused) and register
 * one render-time evaluator per book-covered key the story does not define;
 * `override message` entries register on the same seam under their dotted
 * platform ids. A gerund is consulted, a dispatch action, or dead — the
 * fail-fast the on-clause and trait-clause bind steps ask before binding.
 *
 * Public interface: BindSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import { type IRCondition, type IROnClause, type IRPhrase, PHRASEBOOK_REGISTRY } from '@sharpee/chord';
import { type PhrasebookResolution, phrasebookTemplateKey } from '@sharpee/engine';
import type { Choice, Literal } from '@sharpee/if-domain';
import { interceptorConsultingActionIds } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { aliasToActionMessageId } from '../message-alias-map.js';
import { PHRASEBOOK_DATA } from '../phrasebook-data.js';
import { withLineBreaks } from '../text.js';
import { STRATEGY_SELECTOR, type RuntimeCore } from './core.js';

export class BindSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Resolved books cache (built once per runtime — see resolvedBooks). */
  private books: Array<{ name: string; condition: IRCondition | null; entries: Record<string, IRPhrase> }> | null = null;

  /**
   * The story's phrasebooks in arbitration order, entries resolved:
   * `define`d books carry their entries in the IR; `use`d books resolve
   * from the packaged-data registry with manifest-key conformance (ADR-250
   * D3 — LoadError on a missing book or a key mismatch), plus the D1 key
   * rules the story compiler never saw the packaged data pass through.
   */
  private resolvedBooks(): Array<{ name: string; condition: IRCondition | null; entries: Record<string, IRPhrase> }> {
    if (this.books) return this.books;
    this.books = this.core.ir.phrasebooks.map((book) => {
      if (book.source === 'define') {
        return { name: book.name, condition: book.condition ?? null, entries: book.entries ?? {} };
      }
      const data = PHRASEBOOK_DATA.get(book.name);
      if (!data) {
        throw new LoadError(`Phrasebook \`${book.name}\` is not in the load-time data registry — the compile-time manifest knows the name, the runtime has no entries for it.`);
      }
      const manifestKeys = [...(PHRASEBOOK_REGISTRY.get(book.name)?.keys ?? [])].sort();
      const dataKeys = Object.keys(data.entries).sort();
      if (manifestKeys.join('\u0000') !== dataKeys.join('\u0000')) {
        throw new LoadError(`Phrasebook \`${book.name}\`: manifest keys [${manifestKeys.join(', ')}] and data keys [${dataKeys.join(', ')}] disagree.`);
      }
      for (const key of dataKeys) {
        if (key.includes('.')) {
          throw new LoadError(`Phrasebook \`${book.name}\`: \`${key}\` is a dotted platform ID — books voice story keys only (ADR-250 D1).`);
        }
      }
      return { name: book.name, condition: book.condition ?? null, entries: data.entries };
    });
    return this.books;
  }

  /** Book entries covering a key, in arbitration order (emit-time staging). */
  bookEntriesFor(key: string): IRPhrase[] {
    return this.resolvedBooks().flatMap((b) => (b.entries[key] ? [b.entries[key]] : []));
  }

  /**
   * ADR-250 D4.2: register ONE evaluator per key that some book covers and
   * the story does NOT define — story-beats-book is decided here,
   * statically, so a story-defined key never pays predicate evaluation.
   * The key convention (`phrasebook.template.<key>`) is built by the
   * engine's read point (`phrasebookTemplateKey`) and here — nowhere else.
   */
  registerPhrasebookEvaluators(world: WorldModel): void {
    const books = this.resolvedBooks();
    if (books.length === 0) return;
    const storyTable = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
    const covered = new Set<string>();
    for (const book of books) {
      for (const key of Object.keys(book.entries)) {
        if (!storyTable[key]) covered.add(key);
      }
    }
    for (const key of covered) {
      world.registerEvaluator(phrasebookTemplateKey(key), (w) => this.resolvePhrasebook(key, w as WorldModel));
    }
  }

  /**
   * The evaluator body: first book in declaration order whose predicate
   * holds AND that covers the key supplies it (ADR-245 D3 arbitration).
   * Derivation mirrors registered phrases — verbatim/single/multi-variant
   * templates and a Choice atom keyed `phrasebook.<book>` / key so
   * cycling/first-time/sticky counters stay per (book, key) (ADR-250 D5)
   * — keeping every Chord IR shape loader-side (ADR-210 direction rule).
   */
  private resolvePhrasebook(key: string, world: WorldModel): PhrasebookResolution | undefined {
    for (const book of this.resolvedBooks()) {
      const entry = book.entries[key];
      if (!entry) continue;
      if (book.condition && !this.core.evaluator.evalCondition(book.condition, { world })) continue;
      const { template, params } = this.derivePhraseTemplate(entry, `phrasebook.${book.name}`, key);
      return { book: book.name, key, template, ...(Object.keys(params).length > 0 ? { params } : {}) };
    }
    return undefined;
  }

  /**
   * Derive the render-time template + bound params for an IR phrase body,
   * shared by phrasebook resolution and ADR-255 message overrides: a verbatim
   * or single-variant phrase becomes its literal template; a strategy/multi
   * phrase becomes `{variants}` plus a Choice atom keyed by (counterEntityId,
   * messageKey) so cycling/first-time/sticky counters stay per source+key.
   */
  private derivePhraseTemplate(
    entry: IRPhrase,
    counterEntityId: string,
    messageKey: string,
  ): { template: string; params: Record<string, unknown> } {
    const params: Record<string, unknown> = {};
    let template: string;
    if (entry.verbatim) {
      template = '{verbatim:text}';
      params.text = entry.variants[0]?.text ?? '';
    } else if (entry.strategy === null && entry.variants.length === 1) {
      template = withLineBreaks(entry.variants[0].text);
    } else {
      template = '{variants}';
      if (entry.strategy) {
        const choice: Choice = {
          kind: 'choice',
          alternatives: entry.variants.map((v): Literal => ({ kind: 'literal', text: withLineBreaks(v.text) })),
          selector: STRATEGY_SELECTOR[entry.strategy],
          entityId: counterEntityId,
          messageKey,
        };
        params.variants = choice;
      }
    }
    return { template, params };
  }

  /**
   * ADR-255 D6: register one evaluator per overridden standard-action message,
   * on the SAME phrasebook resolution seam (`phrasebook.template.<id>`) the
   * engine consults before the platform default — so an `override message`
   * sets the story-wide baseline (with full strategy/cycling parity) while a
   * per-entity phrase or on-clause refusal, which emit their own message ids,
   * still win. The alias is resolved to its dotted `if.action.*` id here, on
   * the loader side (Interface Contract 3); the alias never reaches the engine.
   */
  registerMessageOverrideEvaluators(world: WorldModel): void {
    const table = this.core.ir.messageOverrides.locales[this.core.ir.messageOverrides.defaultLocale] ?? {};
    for (const [alias, entry] of Object.entries(table)) {
      const messageId = aliasToActionMessageId(alias);
      if (!messageId) continue; // analyzer already rejected unknown aliases
      world.registerEvaluator(phrasebookTemplateKey(messageId), () => {
        if (entry.condition && !this.core.evaluator.evalCondition(entry.condition, { world })) return undefined;
        const { template, params } = this.derivePhraseTemplate(entry, 'message-override', messageId);
        return { book: 'message-override', key: messageId, template, ...(Object.keys(params).length > 0 ? { params } : {}) };
      });
    }
  }

  /**
   * True when an interceptor registered under `if.action.<gerund>` can ever
   * fire: a wired stdlib action consults the id (the ADR-228 D5 registry,
   * derived from the descriptor table), or the gerund names a `define
   * action X from` hatch — an author-owned TS Action the loader can't see
   * inside, which may consult its own id.
   * @param gerund the clause's action word (e.g. `taking`)
   */
  isConsultedGerund(gerund: string): boolean {
    if (interceptorConsultingActionIds.has(`if.action.${gerund}`)) return true;
    return this.core.ir.hatches.some((h) => h.hatchKind === 'action' && h.name === gerund);
  }

  /** True when the gerund names a `define action` dispatch action. */
  isDispatchAction(gerund: string): boolean {
    return this.core.ir.actions.some((a) => a.name === gerund);
  }

  /**
   * Load-time diagnostic for a clause whose gerund nothing will ever
   * consult (ADR-228 D5): a typo or an unimplemented action word would
   * otherwise register and silently die. lowering/raising get the pointed
   * capability-dispatch message (they are full-delegation by design).
   * @param clause the dead clause (its span anchors the diagnostic)
   */
  deadGerundError(clause: IROnClause): LoadError {
    const phrase = `${clause.clauseKind} ${clause.action} it`;
    if (clause.action === 'lowering' || clause.action === 'raising') {
      return new LoadError(
        `\`${phrase}\` — \`${clause.action}\` is a full-delegation capability action by design (ADR-118): the standard action never consults interceptors. Use a capability behavior or a Chord dispatch action (\`define action ${clause.action}\`) instead.`,
        clause.span,
      );
    }
    return new LoadError(
      `\`${phrase}\` — no standard action consults \`if.action.${clause.action}\`, so this clause would never fire. Check the action word's spelling, or create the verb with \`define action ${clause.action}\`.`,
      clause.span,
    );
  }
}
