/**
 * ActionMenuComputer — computes available context actions each turn (ADR-136)
 *
 * The action menu has two layers:
 * 1. **Baseline** (auto): directions from room exits + intransitive commands
 *    (look, inventory, wait, etc.) — always shown, zero author effort.
 * 2. **Author picks** (hints in actions.yaml): entity-targeted actions the
 *    author has explicitly chosen to surface. Nothing entity-targeted appears
 *    unless the author adds it.
 *
 * The `computeAll()` method returns the full grammar palette — every verb x
 * entity combination that could theoretically work. The editor and
 * `--show-actions` CLI use this to let the author browse and pick.
 *
 * @public ActionMenuComputer
 * @context engine
 */

import type { GrammarRule, SlotConstraint } from '@sharpee/if-domain';
import type {
  ContextAction,
  ContextActionCategory,
  ActionMenuConfig,
} from '@sharpee/if-domain';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import { TraitType, IdentityTrait, RoomTrait } from '@sharpee/world-model';
import type { ScopeResolver } from '@sharpee/stdlib';
import { ScopeLevel } from '@sharpee/stdlib';
import { SlotType } from '@sharpee/if-domain';

/** Default configuration when no actions.yaml is provided. */
const DEFAULT_CONFIG: Required<ActionMenuConfig> = {
  maxActions: 40,
  maxPerEntity: 8,
  intransitives: ['look', 'inventory', 'wait'],
  categoryOrder: [
    'movement',
    'interaction',
    'inventory',
    'communication',
    'combat',
    'meta',
    'story',
  ],
};

/** Map action IDs to categories. */
const ACTION_CATEGORY_MAP: Record<string, ContextActionCategory> = {
  'if.action.going': 'movement',
  'if.action.taking': 'inventory',
  'if.action.dropping': 'inventory',
  'if.action.putting': 'inventory',
  'if.action.inserting': 'inventory',
  'if.action.removing': 'inventory',
  'if.action.inventory': 'inventory',
  'if.action.wearing': 'inventory',
  'if.action.taking_off': 'inventory',
  'if.action.giving': 'communication',
  'if.action.showing': 'communication',
  'if.action.talking': 'communication',
  'if.action.attacking': 'combat',
  'if.action.throwing': 'combat',
  'if.action.looking': 'meta',
  'if.action.waiting': 'meta',
  'if.action.help': 'meta',
  'if.action.scoring': 'meta',
  'if.action.saving': 'meta',
  'if.action.restoring': 'meta',
  'if.action.quitting': 'meta',
  'if.action.restarting': 'meta',
};

/**
 * Suppression entry: removes a baseline action from the menu.
 */
export interface ActionSuppression {
  /** The action ID to suppress (e.g. "if.action.waiting") */
  readonly actionId: string;
  /** Optional target entity ID — suppress only for this entity */
  readonly targetId?: string;
}

/**
 * Hint entry: adds an action to the menu (author's pick from the palette).
 */
export interface ActionHint {
  /** Full command text */
  readonly command: string;
  /** Action ID */
  readonly actionId: string;
  /** Custom label */
  readonly label?: string;
  /** Target entity ID */
  readonly targetId?: string;
  /** Category override */
  readonly category?: ContextActionCategory;
  /** Priority override */
  readonly priority?: number;
}

/**
 * Compiled author overrides, produced from actions.yaml.
 */
export interface CompiledActionOverrides {
  readonly suppressions: ReadonlyArray<ActionSuppression>;
  readonly hints: ReadonlyArray<ActionHint>;
}

/**
 * Computes the action menu for client rendering.
 *
 * `compute()` returns the player-facing menu: baseline + author picks.
 * `computeAll()` returns the full grammar palette for the editor.
 */
export class ActionMenuComputer {
  /**
   * Compute the player-facing action menu.
   *
   * Returns: baseline (directions + intransitives) + author hints.
   * Entity-targeted actions only appear if the author added them as hints.
   */
  compute(
    world: WorldModel,
    actorId: string,
    rules: GrammarRule[],
    scopeResolver: ScopeResolver,
    config?: ActionMenuConfig,
    overrides?: CompiledActionOverrides,
  ): ContextAction[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const actor = world.getEntity(actorId);
    if (!actor) return [];

    const actions: ContextAction[] = [];

    // 1. Directions from room exits
    actions.push(...this.computeDirectionActions(world, actorId));

    // 2. Intransitive commands (look, inventory, wait, etc.)
    actions.push(...this.computeIntransitiveActions(rules, cfg));

    // 3. Author hints — entity-targeted actions the author picked
    if (overrides) {
      actions.push(...this.applyHints(overrides.hints));

      // Apply suppressions (can remove baseline items too)
      const result = actions.filter(action =>
        !overrides.suppressions.some(s =>
          s.actionId === action.actionId &&
          (!s.targetId || s.targetId === action.targetId),
        ),
      );
      return this.finalize(result, cfg);
    }

    return this.finalize(actions, cfg);
  }

  /**
   * Compute the full grammar palette for the editor / --show-actions.
   *
   * Returns ALL verb x entity combinations from grammar rules, scope,
   * and traits — the complete set the author can pick from.
   */
  computeAll(
    world: WorldModel,
    actorId: string,
    rules: GrammarRule[],
    scopeResolver: ScopeResolver,
    config?: ActionMenuConfig,
  ): ContextAction[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const actor = world.getEntity(actorId);
    if (!actor) return [];

    const actions: ContextAction[] = [];

    // Directions
    actions.push(...this.computeDirectionActions(world, actorId));

    // All entity-targeted actions from grammar
    const carried = world.getContents(actorId);
    const visible = scopeResolver.getVisible(actor);
    actions.push(
      ...this.computeEntityActions(rules, visible, carried, world, actorId, scopeResolver, cfg),
    );

    // Intransitives
    actions.push(...this.computeIntransitiveActions(rules, cfg));

    return this.finalize(actions, cfg);
  }

  // ─── Baseline Computations ────────────────────────────────────

  /** Compute direction actions from room exits. */
  private computeDirectionActions(
    world: WorldModel,
    actorId: string,
  ): ContextAction[] {
    const actions: ContextAction[] = [];
    const room = world.getContainingRoom(actorId);
    if (!room) return actions;

    const roomTrait = room.getTrait(TraitType.ROOM) as RoomTrait | null;
    if (!roomTrait?.exits) return actions;

    for (const [direction, exitInfo] of Object.entries(roomTrait.exits)) {
      if (!exitInfo) continue;
      actions.push({
        command: direction,
        actionId: 'if.action.going',
        verb: 'Go',
        targetName: direction,
        category: 'movement',
        priority: 200,
        auto: true,
      });
    }

    return actions;
  }

  /** Compute intransitive (no-target) actions. */
  private computeIntransitiveActions(
    rules: GrammarRule[],
    config: Required<ActionMenuConfig>,
  ): ContextAction[] {
    const actions: ContextAction[] = [];
    const seen = new Set<string>();

    for (const verbText of config.intransitives) {
      const rule = rules.find(r => {
        if (!r.compiledPattern) return false;
        const tokens = r.compiledPattern.tokens;
        return (
          tokens.length === 1 &&
          tokens[0].type === 'literal' &&
          tokens[0].value === verbText
        );
      });

      if (rule && !seen.has(rule.action)) {
        seen.add(rule.action);
        actions.push({
          command: verbText,
          actionId: rule.action,
          verb: this.capitalize(verbText),
          category: this.categorize(rule.action),
          priority: 50,
          auto: true,
        });
      }
    }

    return actions;
  }

  // ─── Grammar Palette (for editor) ────────────────────────────

  /** Compute ALL entity-targeted actions from grammar rules. */
  private computeEntityActions(
    rules: GrammarRule[],
    visible: IFEntity[],
    carried: IFEntity[],
    world: WorldModel,
    actorId: string,
    scopeResolver: ScopeResolver,
    config: Required<ActionMenuConfig>,
  ): ContextAction[] {
    const actions: ContextAction[] = [];
    const actor = world.getEntity(actorId)!;
    const perEntityCount = new Map<string, number>();

    for (const entity of visible) {
      if (entity.has(TraitType.ROOM)) continue;

      const entityName = this.getEntityName(entity);
      const scopeLevel = scopeResolver.getScope(actor, entity);

      for (const rule of rules) {
        const targetSlot = this.findTargetSlot(rule);
        if (!targetSlot) continue;
        if (!this.matchesTraitFilters(entity, targetSlot)) continue;
        if (!this.matchesScopeRequirement(targetSlot, scopeLevel)) continue;

        const verb = this.extractVerb(rule);
        if (!verb) continue;

        const count = perEntityCount.get(entity.id) || 0;
        if (count >= config.maxPerEntity) continue;

        actions.push({
          command: `${verb} ${entityName}`,
          actionId: rule.action,
          verb: this.capitalize(verb),
          targetId: entity.id,
          targetName: entityName,
          scope: this.scopeLevelToString(scopeLevel),
          category: this.categorize(rule.action),
          priority: 100,
          auto: true,
        });

        perEntityCount.set(entity.id, count + 1);
      }
    }

    return actions;
  }

  // ─── Author Hints ─────────────────────────────────────────────

  /** Convert author hints to ContextAction entries. */
  private applyHints(hints: ReadonlyArray<ActionHint>): ContextAction[] {
    return hints.map(hint => ({
      command: hint.command,
      actionId: hint.actionId,
      verb: this.extractVerbFromCommand(hint.command),
      targetId: hint.targetId,
      category: hint.category || this.categorize(hint.actionId),
      priority: hint.priority || 150,
      label: hint.label,
      auto: false,
    }));
  }

  // ─── Finalization ─────────────────────────────────────────────

  /** Deduplicate, sort, and cap. */
  private finalize(
    actions: ContextAction[],
    config: Required<ActionMenuConfig>,
  ): ContextAction[] {
    let result = this.deduplicate(actions);
    result = this.sort(result, config);
    if (result.length > config.maxActions) {
      result = result.slice(0, config.maxActions);
    }
    return result;
  }

  private deduplicate(actions: ContextAction[]): ContextAction[] {
    const seen = new Map<string, ContextAction>();
    for (const action of actions) {
      const targetKey = action.targetId || action.command;
      const key = `${action.actionId}::${targetKey}`;
      const existing = seen.get(key);
      if (!existing || action.priority > existing.priority) {
        seen.set(key, action);
      }
    }
    return Array.from(seen.values());
  }

  private sort(
    actions: ContextAction[],
    config: Required<ActionMenuConfig>,
  ): ContextAction[] {
    const categoryIndex = new Map<string, number>();
    config.categoryOrder.forEach((cat, i) => categoryIndex.set(cat, i));

    return actions.sort((a, b) => {
      const catA = categoryIndex.get(a.category) ?? 999;
      const catB = categoryIndex.get(b.category) ?? 999;
      if (catA !== catB) return catA - catB;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.command.localeCompare(b.command);
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private findTargetSlot(rule: GrammarRule): SlotConstraint | null {
    if (!rule.slots || rule.slots.size === 0) return null;
    for (const [, constraint] of rule.slots) {
      if (
        constraint.slotType &&
        constraint.slotType !== SlotType.ENTITY &&
        constraint.slotType !== SlotType.INSTRUMENT
      ) continue;
      return constraint;
    }
    return null;
  }

  private matchesTraitFilters(entity: IFEntity, slot: SlotConstraint): boolean {
    if (!slot.traitFilters || slot.traitFilters.length === 0) return true;
    return slot.traitFilters.every(trait => entity.has(trait));
  }

  private matchesScopeRequirement(slot: SlotConstraint, entityScope: ScopeLevel): boolean {
    const requiredScope = slot.traitFilters && slot.traitFilters.length > 0
      ? ScopeLevel.REACHABLE
      : ScopeLevel.VISIBLE;
    return entityScope >= requiredScope;
  }

  private extractVerb(rule: GrammarRule): string | null {
    if (!rule.compiledPattern?.tokens) return null;
    const firstToken = rule.compiledPattern.tokens[0];
    return firstToken.type === 'literal' ? firstToken.value : null;
  }

  private getEntityName(entity: IFEntity): string {
    const identity = entity.getTrait(TraitType.IDENTITY) as IdentityTrait | null;
    return identity?.name || entity.name || entity.id;
  }

  private scopeLevelToString(level: ScopeLevel): 'carried' | 'reachable' | 'visible' | 'aware' {
    switch (level) {
      case ScopeLevel.CARRIED: return 'carried';
      case ScopeLevel.REACHABLE: return 'reachable';
      case ScopeLevel.VISIBLE: return 'visible';
      default: return 'aware';
    }
  }

  private categorize(actionId: string): ContextActionCategory {
    return ACTION_CATEGORY_MAP[actionId] || 'interaction';
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private extractVerbFromCommand(command: string): string {
    return this.capitalize(command.split(' ')[0]);
  }
}
