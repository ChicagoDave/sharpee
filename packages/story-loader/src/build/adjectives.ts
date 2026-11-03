/**
 * adjectives.ts — composition words onto the built entity.
 *
 * An entity block's words (`openable`, `guard`, `combatant`, a `define
 * trait` name) compose traits on the entity pass 1 just made. The core
 * words go through `CORE_TRAIT_ROUTES`, one row each; the NPC and combat
 * words through their field tables; a declared trait becomes a data trait
 * carrying its fields. A `with`-value that names an entity is queued here
 * and resolved once every entity exists, so forward references are legal
 * and no raw display-name string ever reaches a trait field.
 *
 * Invariants:
 * - A word with no row and no definition is a LoadError naming the word,
 *   never a silent fall-through.
 * - `resolvePendingEntityRefs` drains the queue; it runs once per build,
 *   after every entity exists.
 *
 * Public interface: applyTraitAdjectives, traitRouteContext,
 * applyNpcAdjective, applyCombatAdjective, traitFieldValues, entityRefFor,
 * queueToolRequirement, resolvePendingEntityRefs.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D3 — the core table; D2 — this module family.
 * - ADR-215 — names (chord manifests) vs mappings (loader routes); Q4 the
 *   core NPC words; the combat words.
 * - ADR-226 — a combatant's required HealthTrait.
 * - ADR-230 D3b/D3c — tool-gated words and the pending reference pass.
 */
import type { IRComposition, IREntity, IRTraitDef, Span } from '@sharpee/chord';
import {
  CombatantTrait,
  HealthTrait,
  IFEntity,
  type IToolGated,
  NpcTrait,
  toolRequirement,
  TraitType,
  WeaponTrait,
  WorldModel,
} from '@sharpee/world-model';
import { ChordDataTrait } from '../chord-data-trait.js';
import { LoadError } from '../errors.js';
import { COMBAT_FIELD_ROUTES, NPC_FIELD_ROUTES } from '../extension-registry.js';
import { worldIdOf } from '../identity.js';
import { CHORD_TRAIT_PREFIX } from '../state-keys.js';
import type { BuildContext, PendingEntityRef } from './context.js';
import { CORE_TRAIT_ROUTES, entityConfigValue, type TraitRouteContext } from './trait-routes.js';

export function applyTraitAdjectives(story: BuildContext, entity: IFEntity, irEntity: IREntity, kind: string | null): void {
  const routeContext = traitRouteContext(story, kind);
  for (const trait of irEntity.traits) {
    if (trait.condition !== null) {
      // Conditional composition legality (Prerequisite 2): room-`dark`
      // (the Phase A derived property), or a declared trait whose clauses
      // are ALL NPC-behavior-shaped (`on every turn …`) — the scheduler
      // daemon evaluates the composition condition per turn (`chatty
      // while not after-hours`). Anything else is the load error.
      if (trait.name === 'dark' && kind === 'room') continue;
      const def = story.ir.traits.find((t) => t.name === trait.name);
      if (def && def.onClauses.length > 0 && def.onClauses.every((c) => c.binding === 'every-turn')) {
        entity.add(new ChordDataTrait(CHORD_TRAIT_PREFIX + def.name, traitFieldValues(story, def, trait)));
        continue;
      }
      // `validateIR` refused this IR before the world was built
      // (analysis.conditional-composition-unsupported); the branch stays
      // so a conditional trait never composes unconditionally below.
      throw new LoadError(
        `Conditional composition isn't supported for \`${trait.name}\` — move the condition inside the trait (\`on <action> it\` clauses can test it) or split the behavior.`,
        trait.span,
      );
    }
    // One row per core word (ADR-389 D3): the table's keys are pinned to
    // the compiler's catalog by the manifest-conformance test.
    const route = CORE_TRAIT_ROUTES.get(trait.name);
    if (route) {
      route(entity, irEntity, trait, routeContext);
      continue;
    }
    // `define trait` instances (Phase B): a data trait typed
    // `chord.trait.<name>` whose fields are own properties (mutable
    // via `set`, serialized with the world — AC-6-safe).
    const def = story.ir.traits.find((t) => t.name === trait.name);
    if (def) {
      entity.add(new ChordDataTrait(CHORD_TRAIT_PREFIX + def.name, traitFieldValues(story, def, trait)));
      continue;
    }
    // `validateIR` refused this IR before the world was built
    // (analysis.trait-not-declared); the branch stays because a word with
    // no row and no definition composes nothing, and that is never silent.
    throw new LoadError(
      `Trait \`${trait.name}\` is not declared (\`define trait ${trait.name}\`) and is not a v1 adjective.`,
      trait.span,
    );
  }
}

/** The story-side services a core adjective row may call, for one entity's composition. */
export function traitRouteContext(story: BuildContext, kind: string | null): TraitRouteContext {
  return {
    kind,
    queueToolRequirement: (gated, composition, owner) => queueToolRequirement(story, gated, composition, owner),
    resolveEntityRef: (name, configKey, owner, span, apply) => {
      story.pendingEntityRefs.push(entityRefFor(story, name, configKey, owner, span, apply));
    },
    applyNpcAdjective: (target, owner, composition) => applyNpcAdjective(story, target, owner, composition),
    applyCombatAdjective: (target, owner, composition) => applyCombatAdjective(target, owner, composition),
  };
}

/**
 * ADR-215 Q4 core NPC routing: compose NpcTrait from a behavior
 * adjective — behaviorId (`guard`/`passive` built-in; factory behaviors
 * get `chord.npc.<id>`), movement defaults (movement behaviors default
 * `canMove: true`), boolean fields via NPC_FIELD_ROUTES, and room-list
 * fields (`allowed-rooms`/`forbidden-rooms`) filled through the shared
 * pending-entity-ref mechanism once every entity exists.
 */
export function applyNpcAdjective(story: BuildContext, entity: IFEntity, irEntity: IREntity, trait: IRComposition): void {
  const isFactory = trait.name === 'wanderer' || trait.name === 'follower' || trait.name === 'patrol';
  const data: NonNullable<ConstructorParameters<typeof NpcTrait>[0]> = {
    behaviorId: isFactory ? `chord.npc.${irEntity.id}` : trait.name,
    // Movement behaviors move by definition; `can-move false` overrides.
    canMove: isFactory,
  };
  for (const setting of trait.config) {
    const route = NPC_FIELD_ROUTES.get(setting.key);
    if (!route) continue; // behavior-factory params — consumed at engine-ready
    if (route.convert === 'boolean') {
      data[route.field] = setting.value === 'true';
    }
  }
  const npcTrait = new NpcTrait(data);
  entity.add(npcTrait);
  // Room lists resolve after every entity exists (pass-1 ordering).
  for (const setting of trait.config) {
    const route = NPC_FIELD_ROUTES.get(setting.key);
    if (route?.convert !== 'rooms') continue;
    const target: string[] = [];
    npcTrait[route.field] = target;
    for (const memberIrId of setting.values ?? []) {
      story.pendingEntityRefs.push({
        irRefId: memberIrId,
        ownerName: irEntity.name,
        span: trait.span,
        apply: (worldId) => target.push(worldId),
      });
    }
  }
  if (isFactory) {
    story.npcBehaviors.push({ irId: irEntity.id, adjective: trait.name, config: trait.config, span: trait.span });
  }
}

/**
 * ADR-215 combat routing: compose `combatant` (CombatantTrait + the
 * REQUIRED HealthTrait per ADR-226 — health/max-health route THERE) or
 * `weapon` (WeaponTrait) from a composition's `with`-fields, via the
 * exported COMBAT_FIELD_ROUTES table the manifest-conformance test pins.
 */
export function applyCombatAdjective(entity: IFEntity, irEntity: IREntity, trait: IRComposition): void {
  const values: Record<'combatant' | 'health' | 'weapon', Record<string, unknown>> = {
    combatant: {},
    health: {},
    weapon: {},
  };
  for (const setting of trait.config) {
    const route = COMBAT_FIELD_ROUTES.get(setting.key);
    if (!route) {
      throw new LoadError(
        `\`${irEntity.name}\`: \`${setting.key}\` has no combat field route — the compiler manifest and loader routes are out of step.`,
        trait.span,
      );
    }
    if (route.convert === 'number') {
      const parsed = Number(setting.value);
      if (Number.isNaN(parsed)) {
        // validateIR refused this upstream (analysis.extension-config-value);
        // the branch stays because the field must be a number.
        throw new LoadError(`\`${irEntity.name}\`: \`${setting.key}\` needs a number, got \`${setting.value}\`.`, trait.span);
      }
      values[route.trait][route.field] = parsed;
    } else {
      values[route.trait][route.field] = setting.value === 'true';
    }
  }

  if (trait.name === 'weapon') {
    entity.add(new WeaponTrait(values.weapon));
    return;
  }
  // CombatantTrait REQUIRES a HealthTrait (ADR-226 §2) — auto-attach,
  // seeded from the health/max-health fields (defaults when omitted).
  if (!entity.has(TraitType.HEALTH)) {
    entity.add(new HealthTrait(values.health));
  } else if (Object.keys(values.health).length > 0) {
    const health = entity.get(TraitType.HEALTH) as HealthTrait;
    Object.assign(health, values.health);
    if (values.health.health !== undefined && values.health.maxHealth === undefined) {
      health.maxHealth = Math.max(health.maxHealth, health.health);
    }
  }
  entity.add(new CombatantTrait(values.combatant));
}

/**
 * Initial values for a `define trait` instance: declared `starts`
 * defaults overlaid by the composition's `with` config. Entity-name
 * values (`with food the handful of feed`) resolve to IR entity ids.
 */
export function traitFieldValues(story: BuildContext, def: IRTraitDef, comp: IRComposition): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const field of def.data) {
    if (field.initial !== null) values[field.name] = field.initial;
  }
  for (const setting of comp.config) {
    if (setting.valueKind === 'name') {
      const lower = setting.value.toLowerCase();
      const target = story.ir.entities.find(
        (e) => e.name.toLowerCase() === lower || e.aka.includes(lower),
      );
      if (!target) {
        // `validateIR` refused this IR before the world was built
        // (analysis.setting-names-no-entity); the branch stays because
        // the field needs an id.
        throw new LoadError(`\`${setting.value}\` (config \`${setting.key}\`) names no entity.`, comp.span);
      }
      values[setting.key] = target.id;
    } else {
      values[setting.key] = setting.value;
    }
  }
  return values;
}

/** Resolve a trait-config entity NAME to an IR entity and queue the
 *  world-id application (throws LoadError when nothing matches). */
export function entityRefFor(
  story: BuildContext,
  name: string,
  configKey: string,
  owner: IREntity,
  span: Span,
  apply: (worldId: string) => void,
): PendingEntityRef {
  const lower = name.toLowerCase();
  const target = story.ir.entities.find(
    (e) => e.name.toLowerCase() === lower || e.aka.includes(lower),
  );
  if (!target) {
    // `validateIR` refused this IR before the world was built
    // (analysis.setting-names-no-entity); the branch stays because a
    // reference needs a target.
    throw new LoadError(`\`${name}\` (config \`${configKey}\`) names no entity.`, span);
  }
  return { irRefId: target.id, ownerName: owner.name, span, apply };
}

/** Queue a tool-gated trait's requirement (`cuttable with the knife`): the
 *  named tool becomes its `toolRequirement` once every entity exists. No
 *  tool named, no requirement. */
export function queueToolRequirement(story: BuildContext, gated: IToolGated, trait: IRComposition, owner: IREntity): void {
  const toolName = entityConfigValue(trait);
  if (toolName === undefined) return;
  story.pendingEntityRefs.push(
    entityRefFor(story, toolName, 'tool', owner, trait.span, (worldId) => {
      gated.toolRequirement = toolRequirement(worldId);
    }),
  );
}

/**
 * Resolve trait-config entity references (`with tool X`, `with key X`)
 * to world entity ids (ADR-230 D3c / Phase 9a) — runs once, after every
 * entity is built.
 */
export function resolvePendingEntityRefs(story: BuildContext, world: WorldModel): void {
  for (const pending of story.pendingEntityRefs) {
    const worldId = worldIdOf(world, pending.irRefId);
    if (worldId === undefined || !world.hasEntity(worldId)) {
      throw new LoadError(
        `\`${pending.ownerName}\`: a trait-config entity reference was never built.`,
        pending.span,
      );
    }
    pending.apply(worldId);
  }
  story.pendingEntityRefs.length = 0;
}
