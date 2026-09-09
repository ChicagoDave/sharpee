/**
 * The engine's introspection read-model: a serializable snapshot of the
 * actions, traits, behavior bindings, and messages a loaded story has,
 * for tooling (the IDE's project manifest, the CLI's `introspect`).
 *
 * A pure read over `(world, actionRegistry, languageProvider)`; it holds
 * no engine state and changes nothing. `GameEngine.introspect()` delegates
 * here, and the five summary types below are what it returns.
 *
 * Public interface: `introspect`, `EngineIntrospection`, `ActionSummary`,
 * `TraitSummary`, `BehaviorBindingSummary`, `MessageSummary`.
 * Owner context: `@sharpee/engine` — tooling surface.
 *
 * References: ADR-184 (the IDE manifest this feeds), ADR-334 A1(i) (the
 * extraction out of the facade).
 */

import type { ITrait, WorldModel } from '@sharpee/world-model';
import type { StandardActionRegistry } from '@sharpee/stdlib';
import type { LanguageProvider } from '@sharpee/if-domain';

/** Trait types the platform ships; anything else (or an `if.`-prefixed type) is the story's. */
const PLATFORM_TRAIT_TYPES = ['room', 'identity', 'container', 'supporter', 'openable',
  'lockable', 'switchable', 'readable', 'scenery', 'actor', 'combatant',
  'light-source', 'wearable', 'region', 'scene', 'story-info', 'player',
  'npc', 'portable'];

/** Message-id namespaces the platform owns; a message outside them is the story's. */
const PLATFORM_MESSAGE_PREFIXES = ['if.', 'core.', 'game.', 'npc.', 'combat.', 'character.'];

/**
 * Summary of a registered action, suitable for JSON serialization.
 * Produced by GameEngine.introspect().
 */
export interface ActionSummary {
  /** Action identifier (e.g., "if.action.taking" or "dungeo.action.say"). */
  id: string;
  /** Semantic group (e.g., "inventory", "container"). */
  group: string | null;
  /** Pattern matching priority. */
  priority: number;
  /** True for stdlib actions (if.action.* prefix). */
  isStandard: boolean;
  /** Verb patterns from the language provider (e.g., ["take :item", "get :item"]). */
  patterns: string[];
  /** Help text from the language provider, if available. */
  help: { description: string; verbs: string[]; examples: string[] } | null;
}

/**
 * Summary of a trait type in use across all entities.
 * Produced by GameEngine.introspect().
 */
export interface TraitSummary {
  /** Trait type identifier (e.g., "container", "dungeo.trait.troll_axe"). */
  type: string;
  /** True for world-model/stdlib traits, false for story-defined traits. */
  isStandard: boolean;
  /** Number of entities that have this trait. */
  entityCount: number;
  /** Entity IDs that have this trait. */
  entityIds: string[];
  /** Property names from a sample trait instance. */
  properties: string[];
  /** Capability action IDs this trait declares (from static capabilities). */
  capabilities: string[];
  /** Interceptor action IDs this trait declares (from static interceptors). */
  interceptors: string[];
}

/**
 * Summary of a capability behavior binding (trait + action + phases).
 * Produced by GameEngine.introspect().
 */
export interface BehaviorBindingSummary {
  /** Trait type this behavior is registered on. */
  traitType: string;
  /** Action/capability ID this behavior handles. */
  actionId: string;
  /** Registration priority (higher = checked first). */
  priority: number;
  /** Which 4-phase methods the behavior implements. */
  phases: string[];
  /** "capability" for CapabilityBehavior, "interceptor" for ActionInterceptor. */
  kind: 'capability' | 'interceptor';
}

/**
 * Summary of a registered message ID and its text.
 * Produced by GameEngine.introspect().
 */
export interface MessageSummary {
  /** Full message ID (e.g., "if.action.taking.taken" or "dungeo.thief.appears"). */
  id: string;
  /** The message text or template string. */
  text: string;
  /** "platform" for stdlib/engine messages, "story" for story-registered messages. */
  source: 'platform' | 'story';
}

/**
 * Serializable snapshot of engine state for tooling (VS Code extension, CLI).
 * Returned by GameEngine.introspect().
 */
export interface EngineIntrospection {
  /** All registered actions with patterns and metadata. */
  actions: ActionSummary[];
  /** All trait types in use with usage counts and metadata. */
  traits: TraitSummary[];
  /** All capability behavior and interceptor bindings. */
  behaviors: BehaviorBindingSummary[];
  /** All registered message IDs with text and source classification. */
  messages: MessageSummary[];
}

/**
 * Build the introspection snapshot.
 * @param world the loaded world (entities, capability and interceptor bindings)
 * @param actionRegistry the registered actions
 * @param languageProvider the language layer, for patterns, help, and messages; none yields empty lists
 * @returns the snapshot, ready for JSON serialization
 */
export function introspect(
  world: WorldModel,
  actionRegistry: StandardActionRegistry,
  languageProvider: LanguageProvider | undefined
): EngineIntrospection {
  const actions: ActionSummary[] = [];
  const lang = languageProvider;

  for (const action of actionRegistry.getAll()) {
    const patterns = lang?.getActionPatterns(action.id) ?? [];
    const rawHelp = lang?.getActionHelp?.(action.id);
    const help = rawHelp
      ? { description: rawHelp.description, verbs: rawHelp.verbs, examples: rawHelp.examples }
      : null;

    actions.push({
      id: action.id,
      group: action.group ?? null,
      priority: action.priority ?? 0,
      isStandard: action.id.startsWith('if.action.'),
      patterns,
      help,
    });
  }

  // Trait summaries — enumerate all trait types in use across entities
  const traitMap = new Map<string, { entityIds: string[]; sample: ITrait | null }>();
  for (const entity of world.getAllEntities()) {
    for (const trait of entity.getTraits()) {
      const type = trait.type as string;
      const entry = traitMap.get(type);
      if (entry) {
        entry.entityIds.push(entity.id);
        if (!entry.sample) entry.sample = trait;
      } else {
        traitMap.set(type, { entityIds: [entity.id], sample: trait });
      }
    }
  }

  // Collect capability and interceptor registrations per trait type
  const capsByTrait = new Map<string, string[]>();
  for (const [key] of world.getAllCapabilityBindings()) {
    const [traitType, capability] = key.split(':');
    const list = capsByTrait.get(traitType) ?? [];
    list.push(capability);
    capsByTrait.set(traitType, list);
  }

  const intsByTrait = new Map<string, string[]>();
  for (const [key] of world.getAllActionInterceptors()) {
    const [traitType, actionId] = key.split(':');
    const list = intsByTrait.get(traitType) ?? [];
    list.push(actionId);
    intsByTrait.set(traitType, list);
  }

  const traits: TraitSummary[] = [];
  for (const [type, { entityIds, sample }] of traitMap) {
    const properties = sample
      ? Object.keys(sample).filter(k => k !== 'type')
      : [];

    traits.push({
      type,
      isStandard: PLATFORM_TRAIT_TYPES.includes(type) || type.startsWith('if.'),
      entityCount: entityIds.length,
      entityIds,
      properties,
      capabilities: capsByTrait.get(type) ?? [],
      interceptors: intsByTrait.get(type) ?? [],
    });
  }

  // Behavior bindings — capability behaviors and action interceptors
  const behaviors: BehaviorBindingSummary[] = [];

  for (const [key, binding] of world.getAllCapabilityBindings()) {
    const [traitType, capability] = key.split(':');
    const behavior = binding.behavior;
    const phases: string[] = [];
    if (typeof behavior.validate === 'function') phases.push('validate');
    if (typeof behavior.execute === 'function') phases.push('execute');
    if (typeof behavior.report === 'function') phases.push('report');
    if (typeof behavior.blocked === 'function') phases.push('blocked');

    behaviors.push({
      traitType,
      actionId: capability,
      priority: binding.priority ?? 0,
      phases,
      kind: 'capability',
    });
  }

  for (const [key, binding] of world.getAllActionInterceptors()) {
    const [traitType, actionId] = key.split(':');
    const interceptor = binding.interceptor;
    const phases: string[] = [];
    if (typeof interceptor.preValidate === 'function') phases.push('preValidate');
    if (typeof interceptor.postValidate === 'function') phases.push('postValidate');
    if (typeof interceptor.postExecute === 'function') phases.push('postExecute');

    behaviors.push({
      traitType,
      actionId,
      priority: binding.priority ?? 0,
      phases,
      kind: 'interceptor',
    });
  }

  // Language messages — all registered message IDs with text and source
  const messages: MessageSummary[] = [];
  const allMessages = lang?.getAllMessages?.();
  if (allMessages) {
    for (const [id, text] of allMessages) {
      const source = PLATFORM_MESSAGE_PREFIXES.some(p => id.startsWith(p)) ? 'platform' : 'story';
      messages.push({ id, text, source });
    }
  }

  return { actions, traits, behaviors, messages };
}
