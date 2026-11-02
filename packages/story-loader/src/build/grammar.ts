/**
 * grammar.ts — the story's grammar: `define action` rules, passage words, and the alterations.
 *
 * The body of `ChordStory.extendParser`. Registers `define action` grammar
 * patterns as story grammar — one `rule(spec)` per lowered rule, in
 * definition order, with the action's scope constraints as slot
 * constraints on the rules that carry the slot — then each room's passage
 * words as going rules gated on the way being live, then the alterations:
 * `extend action` lines onto an existing action and `remove from action`
 * removals by shape against the LIVE grammar. The loader's one piece of
 * grammar work is mapping each scope requirement word to its predicate;
 * chord's `lowerActionRules` owns the lowering.
 *
 * Not a world build step: the engine hands the parser over separately
 * from the world, so the facade calls `extendGrammar` from `extendParser`.
 *
 * Public interface: extendGrammar.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the grammar bodies move beside the build steps.
 * - ADR-382 D2, D6, D7, D8; ADR-384 D2, D5 — one entry per lowered rule,
 *   story tier wins ties, removal by shape, no verb-alone rule.
 * - ADR-383 D3, D4 — seats from the action's table; an extension inherits its target's.
 * - ADR-271 D1, D2 — scope requirement words and their predicates.
 * - ADR-270 D2, D3 — `extend action`, `remove from action`.
 * - ADR-378 D2, D3, D5 — passage words are grammar where the passage is;
 *   `define action … while` gates every rule.
 * - ADR-380 D2 — the parser treats every article as optional.
 * - ADR-389 D4 — the action and removal names are `validateIR`'s gates.
 */
import {
  commandParts,
  type IRCondition,
  lowerActionRules,
  type LowerableAction,
  lowerParts,
  renderPattern,
  samePatternShape,
  SCOPE_REQUIREMENT_PREDICATES,
  type ScopeRequirementWord,
  type SeatTable,
  seatTable,
  STDLIB_MANIFEST,
} from '@sharpee/chord';
import {
  type GrammarBuilder,
  type GrammarRuleSlotSpec,
  type Parser,
  type ScopeBuilder,
  type ScopeConstraintBuilder,
  SlotType,
} from '@sharpee/if-domain';
import { TraversalBehavior, type ExitKey, type WorldModel } from '@sharpee/world-model';
import { LoadError } from '../errors.js';
import type { BuildContext } from './context.js';

/**
 * Register the story's grammar on the parser's story-tier builder: the
 * `define action` rules, the passage words, the extensions and removals.
 * @param story the build context (the IR and the evaluator the gates close over)
 * @param parser the Story contract's parser; `getStoryGrammar` returns the
 *   real if-domain GrammarBuilder
 * @throws LoadError when a removal matches no live standard rule
 */
export function extendGrammar(story: BuildContext, parser: Parser): void {
  const grammar = parser.getStoryGrammar();
  for (const action of story.ir.actions) {
    registerActionGrammar(story, grammar, `chord.action.${action.name}`, action, {});
  }

  registerPassageGrammar(story, grammar);

  // ADR-270 D2: `extend action` — grammar lines onto an EXISTING action.
  // Story-first resolution (a story-defined action of the name wins, the
  // shadowing semantic); else the name derives `if.action.<name>`. That
  // the name is a standard action is validateIR's gate, against the
  // generated stdlib manifest (ADR-389 D4).
  const storyActionNames = new Set(story.ir.actions.map((a) => a.name));
  for (const ext of story.ir.grammarExtensions ?? []) {
    let actionId: string;
    // ADR-383 D4: an extension seats from its target's table — the story
    // action's own, else the standard action's from the manifest.
    let inheritedSeats: SeatTable;
    if (storyActionNames.has(ext.action)) {
      actionId = `chord.action.${ext.action}`;
      inheritedSeats = seatTable(story.ir.actions.find((a) => a.name === ext.action)!).table;
    } else {
      // A name that is neither a story action nor a standard action was
      // refused upstream by validateIR (analysis.extend-target).
      actionId = `if.action.${ext.action}`;
      inheritedSeats = STDLIB_MANIFEST.locales['en-US'].grammarSeats[actionId] ?? {};
    }
    // No dispatch conveniences (ADR-270 D2, mirroring ADR-269 D3): the
    // extension registers exactly the stated lines at story tier.
    registerActionGrammar(story, grammar, actionId, ext, { inheritedSeats });
  }

  // ADR-270 D3: `remove from action` — standard-tier rules removed by
  // shape through the engine primitive. An unknown action name was refused
  // upstream by validateIR (analysis.removal-target); a shape no LIVE rule
  // matches is a LoadError here, never a silent no-op (D1).
  for (const removal of story.ir.grammarRemovals ?? []) {
    const derived = `if.action.${removal.action}`;
    for (const pattern of removal.patterns) {
      // ADR-382 D6: removal by shape — slot names ignored, words
      // lowercased, alternations as sets — the analyzer's census-3 test.
      const parts = lowerParts(pattern.parts);
      const removed = grammar.removeRules(derived, (rule) => samePatternShape(rule.parts, parts));
      if (removed === 0) {
        // A load-time fact, not a backstop: validateIR matched the
        // pattern against the manifest's shapes; the LIVE grammar is what
        // the removal acts on, and a shape the manifest carries but the
        // running parser does not is knowable only here.
        const actual = grammar
          .getRules()
          .filter((rule) => rule.action === derived && rule.tier === 'standard')
          .map((rule) => `\`${rule.pattern}\``);
        throw new LoadError(
          `\`remove from action ${removal.action}\` — no standard rule matches \`${renderPattern(parts)}\`. The action's standard patterns are: ${actual.join(', ') || '(none)'}.`,
        );
      }
    }
  }
}

/**
 * Register one action's grammar surfaces (shared by `define action` and
 * ADR-270 `extend action`) at story tier: the rules chord's
 * `lowerActionRules` lowers the action to, each through `rule(spec)` in
 * definition order with its own `means` defaults (ADR-382 D7). The
 * loader's one piece of grammar work is mapping each scope requirement
 * word to its predicate. Exactly the written lines register: no rule for a
 * line's verb alone (ADR-384 D5).
 * Every entity slot is registered with its seat from the action's seat
 * table, started from `inheritedSeats` for an extension (ADR-383 D3, D4).
 */
function registerActionGrammar(
  story: BuildContext,
  grammar: GrammarBuilder,
  actionId: string,
  def: LowerableAction & { constraints: Array<{ slot: string; requirement: ScopeRequirementWord }>; condition?: IRCondition },
  opts: { inheritedSeats?: SeatTable },
): void {
  // ADR-378 D5 (ADR-370 D7, GH #317): `define action … while` gates every
  // rule the action registers — where the
  // condition is false the input parses as though the action did not
  // exist. Read against the live world at match time.
  const condition = def.condition;
  const gate = condition
    ? (ctx: { world: unknown }) => story.evaluator.evalCondition(condition, { world: ctx.world as WorldModel })
    : undefined;

  for (const lowered of lowerActionRules(def, opts)) {
    const slots: Record<string, GrammarRuleSlotSpec> = {};
    for (const { slot, requirement } of lowered.requirements) {
      const predicate = SCOPE_REQUIREMENT_PREDICATES[requirement as ScopeRequirementWord];
      const constraint: ScopeConstraintBuilder = (scope) => applyScopePredicate(scope, predicate);
      slots[slot] = { ...slots[slot], constraints: [...(slots[slot]?.constraints ?? []), constraint] };
    }
    for (const [slot, type] of Object.entries(lowered.slotTypes)) {
      slots[slot] = { ...slots[slot], type: type === 'instrument' ? SlotType.INSTRUMENT : SlotType.TOPIC };
    }
    for (const [slot, seat] of Object.entries(lowered.seats)) {
      slots[slot] = { ...slots[slot], seat };
    }
    // Story tier: the builder from getStoryGrammar() registers 'story',
    // which wins ties with the standard grammar (ADR-384 D2).
    grammar.rule({
      action: actionId,
      parts: lowered.parts,
      pattern: lowered.pattern,
      ...(lowered.defaults ? { defaults: lowered.defaults } : {}),
      slots,
      ...(gate ? { when: gate } : {}),
    });
  }
}

/**
 * ADR-378 D2: a passage's words are grammar only where the passage is.
 * Each command a room's passage block admits registers as a story-tier
 * rule for `if.action.going` with the passage key as its direction, as
 * written; that `climb rope` reaches `climb the rope` is the parser's
 * work, which treats every article as optional (ADR-380 D2). The rule is
 * gated on the actor's room having that way live: hidden
 * (D3) or absent, the words are not a rule and the input falls through
 * to the standard grammar or the parser's own not-understood. Two rooms
 * writing the same first form share the key and the rule.
 */
function registerPassageGrammar(story: BuildContext, grammar: GrammarBuilder): void {
  const formsByKey = new Map<string, Set<string>>();
  for (const irEntity of story.ir.entities) {
    for (const exit of irEntity.exits) {
      if (!exit.passage) continue;
      const forms = formsByKey.get(exit.direction) ?? new Set<string>();
      for (const form of exit.passage) forms.add(form.toLowerCase());
      formsByKey.set(exit.direction, forms);
    }
  }
  for (const [key, forms] of formsByKey) {
    const gate = (ctx: { world: unknown; actorId: string }): boolean => {
      const world = ctx.world as WorldModel;
      const actor = world.getEntity(ctx.actorId);
      const room = world.getContainingRoom(ctx.actorId);
      if (!actor || !room) return false;
      const way = TraversalBehavior.wayFor(world, room, key as ExitKey, { kind: 'walker', entity: actor });
      return !(way.kind === 'refused' && (way.reason === 'hidden' || way.reason === 'no_exit'));
    };
    // ADR-382 D8: each command as word parts, through the same entry.
    for (const form of forms) {
      const parts = commandParts(form);
      grammar.rule({ action: 'if.action.going', parts, pattern: renderPattern(parts), defaults: { direction: key }, when: gate });
    }
  }
}

/**
 * ADR-271 D2: apply the ScopeBuilder predicate a scope-constraint
 * requirement word names. The names come from chord's
 * `SCOPE_REQUIREMENT_PREDICATES` (one table, D1); the exhaustive switch
 * carries a `never` check so a word added to the table without a mapping
 * here is a TYPE error at build time, not a silently dropped constraint.
 */
function applyScopePredicate(
  scope: ScopeBuilder,
  predicate: (typeof SCOPE_REQUIREMENT_PREDICATES)[ScopeRequirementWord],
): ScopeBuilder {
  switch (predicate) {
    case 'touchable':
      return scope.touchable();
    case 'visible':
      return scope.visible();
    case 'carried':
      return scope.carried();
    default: {
      const exhaustive: never = predicate;
      throw new LoadError(`Unmapped scope predicate \`${String(exhaustive)}\`.`);
    }
  }
}
