/**
 * phrases.ts — the runtime's phrases section.
 *
 * Phrase emission: a phrase key becomes a semantic event carrying its
 * staged params — strategy Choice atoms, hatch producers, slot bindings,
 * counters — and the channel narration (`entered`/`exited`/`disappeared`)
 * enqueued outside a report pass and drained by the next one.
 *
 * Public interface: PhrasesSection.
 * Owner context: @sharpee/story-loader (one section of the Chord runtime).
 *
 * References:
 * - ADR-335 D1 — one module per runtime section over a shared core.
 */
import type { IREmitField, IREmitValue, IRPhrase, IRPhraseVariant, IRStatement, IRValue } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import type { Choice, Literal } from '@sharpee/if-domain';
import { CharacterModelTrait, type DispositionWord, TraitType, WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import { stagingRenderContext } from '../hatch-context.js';
import { withLineBreaks } from '../text.js';
import { ExecContext, STRATEGY_SELECTOR, type RuntimeCore } from './core.js';

export class PhrasesSection {
  constructor(private readonly core: RuntimeCore) {}

  /** Enqueue witnessed channel narration (Z3) — it lands in the turn's report pass. */
  enqueueChannelEvent(event: ISemanticEvent): void {
    this.core.pendingChannelEvents.push(event);
  }

  /** Drain pending channel narration (Z3) — report-collecting passes and the drain daemon consume it. */
  drainChannelEvents(): ISemanticEvent[] {
    return this.core.pendingChannelEvents.splice(0, this.core.pendingChannelEvents.length);
  }

  /**
   * Z3: build the channel phrase event for an owner (`entered` / `exited` /
   * `disappeared`). The phrase is the owner's `<irId>.<channel>` block;
   * `Choice` counters key `(ownerWorldId, channel)` — ADR-212 §4's owner +
   * channel-key convention, shared with the `present` slot entries.
   *
   * @param ownerIrId the channel owner's IR entity id
   * @param channel the channel key (`entered`/`exited`/`disappeared`)
   * @param world the live world
   * @returns the phrase event, or null when the owner has no such block
   */
  channelEvent(ownerIrId: string, channel: string, world: WorldModel): ISemanticEvent | null {
    const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
    if (!table[`${ownerIrId}.${channel}`]) return null;
    const ownerWorldId = this.core.host.entityId(ownerIrId);
    if (!ownerWorldId) return null;
    return this.phraseEvent(`${ownerIrId}.${channel}`, { world, it: ownerIrId }, undefined, {
      entityId: ownerWorldId,
      messageKey: channel,
    });
  }

  /**
   * Build the semantic event for `phrase <key>`: entity-scoped override
   * resolution (prereq 4), strategy variants as a persistent Choice atom,
   * and hatch producers bound by marker name.
   *
   * @param counter Z3 channel counter identity — overrides the default
   *   `('chord', overrideKey)` Choice keying with `(owner, channelKey)`.
   */
  phraseEvent(
    key: string,
    ctx: ExecContext,
    stmtParams?: ReadonlyArray<{ param: string; value: IRValue }>,
    counter?: { entityId: string; messageKey: string },
  ): ISemanticEvent {
    const table = this.core.ir.phrases.locales[this.core.ir.phrases.defaultLocale] ?? {};
    const overrideKey = ctx.it && table[`${ctx.it}.${key}`] ? `${ctx.it}.${key}` : key;
    const phrase = table[overrideKey];
    // ADR-250: a key covered only by phrasebooks has no table entry — emit
    // the bare key (the render-path book layer supplies the winning
    // template and its Choice) but still stage stmt params and any hatch
    // producers the book entries reference, since staging is emit-time work.
    const bookVariants: IRPhraseVariant[] | null = phrase ? null : this.core.binding.bookEntriesFor(key).flatMap((e) => e.variants);
    if (!phrase && bookVariants!.length === 0) {
      throw new LoadError(`Phrase \`${key}\` is missing from the IR at emit time.`);
    }

    const params: Record<string, unknown> = {};
    // Authored `with <param> = <value>` bindings (zoo-chain follow-up,
    // 2026-07-12): entity values pass as their display name (the template's
    // article hint does the rest); scalars pass through.
    for (const p of stmtParams ?? []) {
      const value = this.core.evaluator.evalValue(p.value, ctx);
      const asEntity = typeof value === 'string' ? ctx.world.getEntity(value) : undefined;
      params[p.param] = asEntity ? asEntity.name : (value as string | number | boolean);
    }
    this.stagePhraseParams(params, overrideKey, phrase ?? null, bookVariants, ctx, counter);
    return this.core.rawEvent('chord.phrase', { messageId: overrideKey, params });
  }

  /**
   * Stage the render params a phrase's template consumes — hatch producers
   * bound by marker name, grammar-slot bindings, verbatim text, and the
   * strategy variants as a persistent Choice atom. Shared by `phraseEvent`
   * (`phrase <key>` statements) and `refusalOf` (the validate partition's
   * veto path): a refusal keyed to a strategy phrase must carry the same
   * Choice the statement path carries, or the registered `{variants}`
   * template renders its raw placeholder.
   *
   * @param params Mutated in place. Keys already present (authored `with`
   *   bindings) are overridden by hatch producers but win over grammar-slot
   *   bindings — exactly the precedence `phraseEvent` had before this was
   *   extracted.
   */
  stagePhraseParams(
    params: Record<string, unknown>,
    overrideKey: string,
    phrase: IRPhrase | null,
    bookVariants: IRPhraseVariant[] | null,
    ctx: ExecContext,
    counter?: { entityId: string; messageKey: string },
  ): void {
    for (const variant of phrase ? phrase.variants : bookVariants!) {
      for (const marker of variant.markers) {
        const producer = this.core.host.producers.get(marker);
        if (producer) {
          // Params carry phrase ATOMS, not functions — the template binder
          // string-coerces anything that isn't a Phrase (ADR-196: producers
          // are invoked at staging, their atoms realized by the assembler).
          // The context is the narrow staging facade (design.md §5.6): a
          // producer reaching outside it fails HERE, named, not as an
          // anonymous TypeError downstream.
          try {
            params[marker] = producer(stagingRenderContext(ctx.world));
          } catch (error) {
            throw new LoadError(
              `Hatch \`${marker}\` threw while staging phrase \`${overrideKey}\`: ${error instanceof Error ? error.message : String(error)}. Hatches see the narrow staging context only (design.md §5.6).`,
            );
          }
        }
      }
    }
    // Grammar-slot params (`{the target}` in a dispatch-action or trait
    // clause body, zoo-chain fixes 2026-07-12): the slot entity's name
    // binds as the NounPhrase-default string — the template's own article
    // hint supplies `the`/`a`. Producers above win on a name collision.
    // ADR-275 D2: a WORD binding (semantic value — `direction`, `means`
    // keys) has no entity to resolve and renders VERBATIM — bound as a
    // Literal atom, which the template binder passes through untouched
    // (never an article-bearing NounPhrase: "swings port", not "swings
    // the port").
    if (ctx.slots) {
      for (const [name, worldId] of Object.entries(ctx.slots)) {
        if (params[name] !== undefined) continue;
        const slotEntity = ctx.world.getEntity(worldId);
        params[name] = slotEntity ? slotEntity.name : ({ kind: 'literal', text: worldId } satisfies Literal);
      }
    }
    if (phrase?.verbatim) {
      // `{verbatim:text}` template (loader registration) — the atom is
      // exempt from whitespace collapse, so line structure and interior
      // spacing survive as authored (grammar log 2026-07-10).
      params.text = phrase.variants[0]?.text ?? '';
    } else if (phrase?.strategy) {
      const choice: Choice = {
        kind: 'choice',
        alternatives: phrase.variants.map((v): Literal => ({ kind: 'literal', text: withLineBreaks(v.text) })),
        selector: STRATEGY_SELECTOR[phrase.strategy],
        entityId: counter?.entityId ?? 'chord',
        messageKey: counter?.messageKey ?? overrideKey,
      };
      params.variants = choice;
    }
  }

  /**
   * Evaluate an emit payload (ADR-216) against the live turn context.
   * Keys pass VERBATIM; number literals become numbers; `true`/`false`
   * symbols become booleans; other value expressions evaluate through the
   * shared evaluator (entity refs → world ids, field reads → live values).
   */
  emitPayload(fields: IREmitField[] | undefined, ctx: ExecContext): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const field of fields ?? []) {
      data[field.key] = this.emitValue(field.value, ctx);
    }
    return data;
  }

  private emitValue(value: IREmitValue, ctx: ExecContext): unknown {
    switch (value.kind) {
      case 'literal':
        return value.valueType === 'number' ? Number(value.value) : value.value;
      case 'value':
        if (value.value.kind === 'symbol' && (value.value.name === 'true' || value.value.name === 'false')) {
          return value.value.name === 'true';
        }
        return this.core.evaluator.evalValue(value.value, ctx);
      case 'array':
        return value.items.map((item) => this.emitValue(item, ctx));
      case 'object': {
        const nested: Record<string, unknown> = {};
        for (const field of value.fields) nested[field.key] = this.emitValue(field.value, ctx);
        return nested;
      }
    }
  }

  /**
   * The declared bounds of a counter (ADR-264 D2) — story-global when
   * `entityIrId` is null, else the entity's own counter. Undefined when
   * unbounded / undeclared (no clamp).
   */
  counterBounds(counter: string, entityIrId: string | null): { lo: number | null; hi: number | null } | undefined {
    if (entityIrId === null) {
      const def = this.core.ir.counters.find((c) => c.name === counter);
      return def ? { lo: def.lo, hi: def.hi } : undefined;
    }
    const entity = this.core.ir.entities.find((e) => e.id === entityIrId);
    const def = entity?.counters.find((c) => c.name === counter);
    return def ? { lo: def.lo, hi: def.hi } : undefined;
  }

  /**
   * ADR-310 D3 transition statements (`change mood to <word>`, `change
   * feeling toward <target> to <word>`): mutate the clause owner's
   * character model and return the from→to record the reports pass
   * replays as the author-channel transition row.
   *
   * @param stmt - The transition statement
   * @param ctx - The executing clause's context (`it` is the owner)
   * @returns The transition record, for the reports pass to emit
   * @throws LoadError when the owner carries no character model or the
   *   mood word is unknown to the manifest + custom-mood table
   */
  execCharacterTransition(
    stmt: Extract<IRStatement, { kind: 'change-mood' } | { kind: 'change-feeling' }>,
    ctx: ExecContext,
  ): { type: string; actor: string; from: string; to: string; target?: string } {
    const ownerWorldId = ctx.it !== undefined ? this.core.host.entityId(ctx.it) : undefined;
    const owner = ownerWorldId !== undefined ? ctx.world.getEntity(ownerWorldId) : undefined;
    const trait = owner?.get(TraitType.CHARACTER_MODEL) as CharacterModelTrait | undefined;
    if (ownerWorldId === undefined || !trait) {
      // A transition on a person without the model is an authoring error,
      // not a silent no-op (the loader's loud-wiring rule).
      throw new LoadError('`change mood`/`change feeling` targets a character-model person.', stmt.span);
    }
    if (stmt.kind === 'change-mood') {
      const axes = this.core.evaluator.moodAxesFor(stmt.mood);
      if (!axes) throw new LoadError(`Unknown mood \`${stmt.mood}\`.`, stmt.span);
      const from = trait.getMood();
      trait.moodValence = axes.valence;
      trait.moodArousal = axes.arousal;
      return { type: 'npc.character.mood_changed', actor: ownerWorldId, from, to: stmt.mood };
    }
    const targetWorldId = this.core.evaluator.entityValue(stmt.target, ctx);
    const from = trait.getDispositionWord(targetWorldId);
    trait.setDisposition(targetWorldId, stmt.disposition as DispositionWord);
    return {
      type: 'npc.character.disposition_changed',
      actor: ownerWorldId,
      from,
      to: stmt.disposition,
      target: targetWorldId,
    };
  }
}
