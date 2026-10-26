/**
 * @file Grammar Engine Base
 * @description Abstract base class for grammar matching engines
 */

import { Token } from '../parser-contracts/parser-types.js';
import {
  GrammarRule,
  GrammarGate,
  GrammarTier,
  PatternMatch,
  GrammarContext,
  CompiledPattern,
  GrammarBuilder,
  GrammarRuleSpec,
  PatternBuilder,
  SemanticProperties,
  Seat,
  SlotConstraint,
  SlotType,
  ScopeConstraintBuilder
} from './grammar-builder.js';
import { PatternCompiler } from './pattern-compiler.js';

/**
 * Grammar matching options
 */
export interface GrammarMatchOptions {
  /** Whether to allow partial matches */
  allowPartial?: boolean;
}

/**
 * Abstract base class for grammar engines
 * Language-specific implementations provide concrete matching logic
 */
export abstract class GrammarEngine {
  protected rules: GrammarRule[] = [];
  protected rulesByAction: Map<string, GrammarRule[]> = new Map();
  protected compiler: PatternCompiler;
  
  constructor(compiler: PatternCompiler) {
    this.compiler = compiler;
  }
  
  /**
   * Add a grammar rule.
   *
   * ADR-268: insertion is deliberately unsorted — registration order IS
   * definition order, the last of the rule keys of the resolution order
   * (items naming nothing → literal specificity → tier → definition order →
   * names → exact names, `compareGrammarRank`, ADR-386 D5). Do not
   * reintroduce a sort here; it would erase the semantics of file order.
   */
  addRule(rule: GrammarRule): void {
    // ADR-382 D4: compile from the rule's parts, never its display text,
    // then settle each slot's type on the compiled record.
    if (!rule.compiledPattern) {
      rule.compiledPattern = this.compiler.compile(rule.parts, rule.pattern);
    }
    resolveSlotTypes(rule, rule.compiledPattern);
    assignSeats(rule, rule.compiledPattern);

    this.rules.push(rule);

    // Index by action for faster lookup
    const actionRules = this.rulesByAction.get(rule.action) || [];
    actionRules.push(rule);
    this.rulesByAction.set(rule.action, actionRules);
  }
  
  /**
   * Add multiple rules
   */
  addRules(rules: GrammarRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }
  
  /**
   * Find matching grammar rules for tokens
   */
  abstract findMatches(
    tokens: Token[], 
    context: GrammarContext,
    options?: GrammarMatchOptions
  ): PatternMatch[];
  
  /**
   * Get the best match from a set of tokens
   */
  getBestMatch(
    tokens: Token[], 
    context: GrammarContext,
    options?: GrammarMatchOptions
  ): PatternMatch | null {
    const matches = this.findMatches(tokens, context, options);
    return matches.length > 0 ? matches[0] : null;
  }
  
  /**
   * Clear all rules
   */
  clear(): void {
    this.rules = [];
    this.rulesByAction.clear();
  }

  /**
   * ADR-270 D3: remove registered rules by shape — the alteration model's
   * removal primitive. Identity is (action id, shape, tier); the shape test
   * is the caller's (ADR-382 D6: Chord passes `samePatternShape` over the
   * rule's parts). Rule ids are nondeterministic and never part of identity.
   *
   * Diagnostic-free by contract: returns the number of rules removed and
   * never throws — the CALLER owns the miss diagnostic (the Chord loader
   * raises its LoadError on 0; a TS story checks the return itself).
   *
   * @param action The action id whose rule is removed (e.g. 'if.action.taking').
   * @param shapeMatches Whether a rule of that action and tier has the shape to remove.
   * @param tier The tier to remove from — 'standard' (default) targets the
   *   platform grammar; story-tier rules are never touched unless asked.
   * @returns The number of rules removed (0 = no rule matched the shape).
   */
  removeRules(action: string, shapeMatches: (rule: GrammarRule) => boolean, tier: GrammarTier = 'standard'): number {
    const matches = (rule: GrammarRule) =>
      rule.action === action && rule.tier === tier && shapeMatches(rule);
    const removed = this.rules.filter(matches).length;
    if (removed === 0) return 0;
    // Definition order of the survivors is untouched — filter preserves it.
    this.rules = this.rules.filter((rule) => !matches(rule));
    const actionRules = this.rulesByAction.get(action);
    if (actionRules) {
      const remaining = actionRules.filter((rule) => !matches(rule));
      if (remaining.length > 0) this.rulesByAction.set(action, remaining);
      else this.rulesByAction.delete(action);
    }
    return removed;
  }

  /**
   * Get all rules
   */
  getRules(): GrammarRule[] {
    return [...this.rules];
  }
  
  /**
   * Get rules for a specific action
   */
  getRulesForAction(action: string): GrammarRule[] {
    return this.rulesByAction.get(action) || [];
  }
  
  /**
   * Create a grammar builder connected to this engine.
   *
   * @param tier ADR-268 D2: the layer rules built here register under.
   *   'standard' (default) for the platform grammar; 'story' for the story
   *   grammar surface and the Chord loader — story-tier rules outrank
   *   standard-tier rules unconditionally.
   */
  createBuilder(tier: GrammarTier = 'standard'): GrammarBuilder {
    const engine = this;

    return {
      define(pattern: string) {
        // ADR-382 D3: the text is parsed once, here; a malformed pattern
        // throws at the definition that wrote it.
        const rule: Partial<GrammarRule> = {
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          parts: engine.compiler.parse(pattern),
          slots: new Map(),
          tier
        };
        
        const builder: PatternBuilder = {
          where(slot: string, constraint: ScopeConstraintBuilder) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.constraints.push(constraint);
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          text(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TEXT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          instrument(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.INSTRUMENT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          seat(slot: string, seat: Seat) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.seat = seat;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          mapsTo(action: string) {
            rule.action = action;
            return builder;
          },

          withDefaultSemantics(defaults: Partial<SemanticProperties>) {
            rule.defaultSemantics = defaults;
            return builder;
          },

          when(predicate: GrammarGate) {
            rule.when = predicate;
            return builder;
          },

          // ADR-082: Typed Value Slots

          number(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.NUMBER;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          ordinal(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.ORDINAL;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          time(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TIME;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Built-in Vocabulary Slots

          direction(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.DIRECTION;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          manner(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.MANNER;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Category-Based Vocabulary Slots

          fromVocabulary(slot: string, category: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.VOCABULARY;
            slotConstraint.vocabularyCategory = category;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // Deprecated methods - use fromVocabulary() instead

          adjective(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.ADJECTIVE;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          noun(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.NOUN;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          // ADR-082: Text Variant Slots

          quotedText(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.QUOTED_TEXT;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          topic(slot: string) {
            const slotConstraint = rule.slots!.get(slot) || { name: slot, constraints: [] };
            slotConstraint.slotType = SlotType.TOPIC;
            rule.slots!.set(slot, slotConstraint);
            return builder;
          },

          build() {
            if (!rule.action) {
              throw new Error('Grammar rule must have an action (use .mapsTo())');
            }
            engine.addRule(rule as GrammarRule);
            return rule as GrammarRule;
          }
        };
        
        return builder;
      },

      rule(spec: GrammarRuleSpec): void {
        if (!spec.action) {
          throw new Error(`Grammar rule "${spec.pattern}" must have an action`);
        }
        const slots = new Map<string, SlotConstraint>();
        for (const [name, config] of Object.entries(spec.slots ?? {})) {
          slots.set(name, {
            name,
            constraints: [...(config.constraints ?? [])],
            slotType: config.type,
            vocabularyCategory: config.vocabularyCategory,
            ...(config.seat ? { seat: config.seat } : {}),
          });
        }
        engine.addRule({
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern: spec.pattern,
          parts: spec.parts,
          slots,
          action: spec.action,
          tier,
          ...(spec.defaults ? { defaultSemantics: spec.defaults } : {}),
          ...(spec.when ? { when: spec.when } : {}),
        });
      },

      getRules() {
        return engine.getRules();
      },

      clear() {
        engine.clear();
      },

      removeRules(action: string, shapeMatches: (rule: GrammarRule) => boolean, tier: GrammarTier = 'standard') {
        return engine.removeRules(action, shapeMatches, tier);
      }
    };
  }
}

/**
 * Settle each configured slot's type on the rule's compiled slot records
 * (ADR-382 D4). A greedy slot is TEXT_GREEDY; a non-greedy slot takes the
 * configured type, keeping the compiler's ENTITY when none is configured.
 * @param rule The rule whose per-slot configuration is applied
 * @param compiled The rule's compiled pattern; its slot records are updated
 * @throws Error when configuration names a slot the pattern lacks, or types
 *   a greedy slot as anything but TEXT_GREEDY
 */
function resolveSlotTypes(rule: GrammarRule, compiled: CompiledPattern): void {
  for (const [name, config] of rule.slots) {
    const slot = compiled.slotsByName.get(name);
    if (!slot) {
      throw new Error(`Grammar rule "${rule.pattern}" configures slot '${name}', which its pattern does not have`);
    }
    if (config.slotType === undefined) continue;
    if (slot.greedy && config.slotType !== SlotType.TEXT_GREEDY) {
      throw new Error(
        `Grammar rule "${rule.pattern}" types greedy slot '${name}' as ${config.slotType}; a greedy slot is always ${SlotType.TEXT_GREEDY}`,
      );
    }
    slot.slotType = config.slotType;
  }
}

/** The seats an entity slot can take, in the order the positional default fills them. */
const SEATS: readonly Seat[] = ['direct', 'indirect'];

/**
 * Seat every ENTITY slot on the rule's compiled slot records (ADR-383 D1,
 * D2), once types are settled. Declared seats are taken first; then each
 * undeclared entity slot, in pattern order, takes the first seat still
 * free. With nothing declared that is the positional rule: the first entity
 * slot direct, the second indirect, optional slots counted. Every other
 * slot type is seated by its type and carries no seat. Recomputed from
 * scratch on each build, so a pre-compiled pattern added twice is seated
 * the same way; the records are written only once every seat is settled,
 * so a refused rule leaves its pattern's seats as they were.
 * @param rule The rule whose per-slot seat declarations are applied
 * @param compiled The rule's compiled pattern; its slot records are updated
 * @throws Error when a seat is declared on a slot that is not an entity
 *   slot, when two entity slots hold one seat, or when an entity slot is
 *   left with no free seat (a third entity slot)
 */
function assignSeats(rule: GrammarRule, compiled: CompiledPattern): void {
  const seatOf = new Map<string, Seat>();
  const holder = new Map<Seat, string>();

  for (const [name, config] of rule.slots) {
    if (config.seat === undefined) continue;
    const slot = compiled.slotsByName.get(name)!;
    if (slot.slotType !== SlotType.ENTITY) {
      throw new Error(
        `Grammar rule "${rule.pattern}" seats slot '${name}' as ${config.seat}, but its type is ${slot.slotType}; only an entity slot takes a seat`,
      );
    }
    const other = holder.get(config.seat);
    if (other !== undefined) {
      throw new Error(`Grammar rule "${rule.pattern}" seats both '${other}' and '${name}' as ${config.seat}`);
    }
    holder.set(config.seat, name);
    seatOf.set(name, config.seat);
  }

  for (const slot of compiled.slots) {
    if (slot.slotType !== SlotType.ENTITY || seatOf.has(slot.name)) continue;
    const free = SEATS.find((seat) => !holder.has(seat));
    if (free === undefined) {
      throw new Error(
        `Grammar rule "${rule.pattern}" has more entity slots than seats: '${slot.name}' has none left (direct and indirect are taken)`,
      );
    }
    holder.set(free, slot.name);
    seatOf.set(slot.name, free);
  }

  for (const slot of compiled.slots) {
    const seat = seatOf.get(slot.name);
    if (seat === undefined) delete slot.seat;
    else slot.seat = seat;
  }
}