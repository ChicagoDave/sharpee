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
  ActionGrammarBuilder,
  SemanticProperties,
  SlotConstraint,
  SlotType,
  ScopeConstraintBuilder
} from './grammar-builder.js';
import { PatternCompiler } from './pattern-compiler.js';

/**
 * Grammar matching options
 */
export interface GrammarMatchOptions {
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Maximum number of matches to return */
  maxMatches?: number;
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
   * definition order, the final tiebreak of the resolution order
   * (confidence → tier → literal specificity → definition order). Do not
   * reintroduce a sort here; it would erase the semantics of file order.
   */
  addRule(rule: GrammarRule): void {
    // ADR-382 D4: compile from the rule's parts, never its display text,
    // then settle each slot's type on the compiled record.
    if (!rule.compiledPattern) {
      rule.compiledPattern = this.compiler.compile(rule.parts, rule.pattern);
    }
    resolveSlotTypes(rule, rule.compiledPattern);

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
   * removal primitive. Identity is (action id, pattern string, tier); rule
   * ids are nondeterministic and never part of identity.
   *
   * Diagnostic-free by contract: returns the number of rules removed and
   * never throws — the CALLER owns the miss diagnostic (the Chord loader
   * raises its LoadError on 0; a TS story checks the return itself).
   *
   * @param action The action id whose rule is removed (e.g. 'if.action.taking').
   * @param pattern The exact registered pattern string (e.g. 'get :item').
   * @param tier The tier to remove from — 'standard' (default) targets the
   *   platform grammar; story-tier rules are never touched unless asked.
   * @returns The number of rules removed (0 = no rule matched the shape).
   */
  removeRules(action: string, pattern: string, tier: GrammarTier = 'standard'): number {
    const matches = (rule: GrammarRule) =>
      rule.action === action && rule.pattern === pattern && rule.tier === tier;
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

          mapsTo(action: string) {
            rule.action = action;
            return builder;
          },

          withSemanticVerbs(verbs: Record<string, Partial<SemanticProperties>>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.verbs = verbs;
            return builder;
          },
          
          withSemanticPrepositions(prepositions: Record<string, string>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.prepositions = prepositions;
            return builder;
          },
          
          withSemanticDirections(directions: Record<string, string>) {
            if (!rule.semantics) rule.semantics = {};
            rule.semantics.directions = directions;
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

      forAction(actionId: string): ActionGrammarBuilder {
        // Accumulated configuration
        const verbList: string[] = [];
        const patternList: string[] = [];
        const fullPatternList: string[] = []; // ADR-271 D3: complete lines, verb included
        const directionMap: Record<string, string[]> = {};
        const slotConstraints: Map<string, { constraint: ScopeConstraintBuilder }[]> = new Map();
        const slotTypes: Map<string, SlotType> = new Map();
        let defaultSemantics: Partial<SemanticProperties> | undefined;
        let gate: GrammarGate | undefined; // ADR-378 D5: applied to every rule the block emits

        const actionBuilder: ActionGrammarBuilder = {
          verbs(verbs: string[]) {
            verbList.push(...verbs);
            return actionBuilder;
          },

          pattern(pattern: string) {
            patternList.push(pattern);
            return actionBuilder;
          },

          patterns(patterns: string[]) {
            patternList.push(...patterns);
            return actionBuilder;
          },

          fullPattern(pattern: string) {
            if (!pattern.trim()) {
              throw new Error('fullPattern() requires a non-empty pattern line');
            }
            fullPatternList.push(pattern);
            return actionBuilder;
          },

          directions(map: Record<string, string[]>) {
            Object.assign(directionMap, map);
            return actionBuilder;
          },

          where(slot: string, constraint: ScopeConstraintBuilder) {
            const existing = slotConstraints.get(slot) || [];
            existing.push({ constraint });
            slotConstraints.set(slot, existing);
            return actionBuilder;
          },

          withDefaultSemantics(defaults: Partial<SemanticProperties>) {
            defaultSemantics = defaults;
            return actionBuilder;
          },

          when(predicate: GrammarGate) {
            gate = predicate;
            return actionBuilder;
          },

          slotType(slot: string, type: SlotType) {
            slotTypes.set(slot, type);
            return actionBuilder;
          },

          build() {
            // Apply a slot's declared type via the matching PatternBuilder method
            const applySlotType = (builder: PatternBuilder, slot: string, type: SlotType): PatternBuilder => {
              switch (type) {
                case SlotType.TEXT:
                  return builder.text(slot);
                case SlotType.INSTRUMENT:
                  return builder.instrument(slot);
                case SlotType.NUMBER:
                  return builder.number(slot);
                case SlotType.ORDINAL:
                  return builder.ordinal(slot);
                case SlotType.TIME:
                  return builder.time(slot);
                case SlotType.DIRECTION:
                  return builder.direction(slot);
                case SlotType.MANNER:
                  return builder.manner(slot);
                case SlotType.TOPIC:
                  // ADR-267 D11: `topic()` existed on PatternBuilder but was
                  // missing here, so a declared TOPIC slot silently dropped.
                  return builder.topic(slot);
                default:
                  return builder;
              }
            };

            // Generate verb × pattern combinations
            if (verbList.length > 0 && patternList.length > 0) {
              for (const verb of verbList) {
                for (const patternTemplate of patternList) {
                  // Combine verb with pattern template
                  const fullPattern = patternTemplate.trim()
                    ? `${verb} ${patternTemplate}`
                    : verb;

                  // Create the rule using the existing define() API
                  let builder = engine.createBuilder(tier).define(fullPattern);
                  builder = builder.mapsTo(actionId);

                  if (defaultSemantics) {
                    builder = builder.withDefaultSemantics(defaultSemantics);
                  }

                  // Slot configuration attaches only where the template
                  // carries the slot: a slot a rule lacks is a build error
                  // (ADR-382 D4).
                  const templateSlots = new Set(
                    engine.compiler
                      .parse(fullPattern)
                      .flatMap((part) => (part.kind === 'slot' ? [part.name] : [])),
                  );

                  // Apply slot constraints
                  for (const [slot, constraints] of slotConstraints) {
                    if (!templateSlots.has(slot)) continue;
                    for (const { constraint } of constraints) {
                      builder = builder.where(slot, constraint);
                    }
                  }

                  // Apply slot types
                  for (const [slot, type] of slotTypes) {
                    if (!templateSlots.has(slot)) continue;
                    builder = applySlotType(builder, slot, type);
                  }

                  if (gate) builder = builder.when(gate);
                  builder.build();
                }
              }
            }

            // ADR-271 D3: complete pattern lines (verb included) — one rule
            // each, no verb cross-product. Slot-scoped configuration
            // (.where(), slotType) attaches only where the line carries the
            // slot (D2: a constraint gates the rules that have the slot,
            // never an unrelated line of the same action).
            for (const fullPattern of fullPatternList) {
              // ADR-382 D4: the line's slots come from its parsed parts, so
              // an optional slot (`[:target]`) carries its configuration too.
              const lineSlots = new Set(
                engine.compiler
                  .parse(fullPattern)
                  .flatMap((part) => (part.kind === 'slot' ? [part.name] : [])),
              );

              let builder = engine.createBuilder(tier).define(fullPattern);
              builder = builder.mapsTo(actionId);

              if (defaultSemantics) {
                builder = builder.withDefaultSemantics(defaultSemantics);
              }

              for (const [slot, constraints] of slotConstraints) {
                if (!lineSlots.has(slot)) continue;
                for (const { constraint } of constraints) {
                  builder = builder.where(slot, constraint);
                }
              }

              for (const [slot, type] of slotTypes) {
                if (!lineSlots.has(slot)) continue;
                builder = applySlotType(builder, slot, type);
              }

              if (gate) builder = builder.when(gate);
              builder.build();
            }

            // Generate standalone verb patterns (verb only, no template)
            if (verbList.length > 0 && patternList.length === 0) {
              for (const verb of verbList) {
                let builder = engine.createBuilder(tier).define(verb);
                builder = builder.mapsTo(actionId);

                if (defaultSemantics) {
                  builder = builder.withDefaultSemantics(defaultSemantics);
                }

                if (gate) builder = builder.when(gate);
                builder.build();
              }
            }

            // Generate direction patterns
            for (const [canonical, aliases] of Object.entries(directionMap)) {
              for (const alias of aliases) {
                let builder = engine.createBuilder(tier).define(alias);
                builder = builder.mapsTo(actionId);
                builder = builder.withDefaultSemantics({ direction: canonical });
                if (gate) builder = builder.when(gate);
                builder.build();
              }
            }
          }
        };

        return actionBuilder;
      },

      getRules() {
        return engine.getRules();
      },

      clear() {
        engine.clear();
      },

      removeRules(action: string, pattern: string, tier: GrammarTier = 'standard') {
        return engine.removeRules(action, pattern, tier);
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