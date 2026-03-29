/**
 * actions.yaml Compiler (ADR-136, Phase 5)
 *
 * Parses a story's actions.yaml file into ActionMenuConfig and
 * CompiledActionOverrides for the engine's action menu system.
 *
 * The YAML file is the single source of truth for author editorial
 * overrides: suppressions, hints, caps, category order, and
 * intransitive action lists.
 *
 * @public compileActionsYaml, ActionsYamlError
 * @context engine, build
 */

import type { ActionMenuConfig, ContextActionCategory } from '@sharpee/if-domain';
import type { CompiledActionOverrides, ActionSuppression, ActionHint } from './action-menu-computer';

// ─── YAML Schema Types ─────────────────────────────────────────

/** Raw YAML structure before validation. */
interface RawActionsYaml {
  defaults?: {
    maxActions?: number;
    maxPerEntity?: number;
    intransitives?: string[];
    categoryOrder?: string[];
  };
  entities?: Record<string, RawEntityOverrides>;
}

interface RawEntityOverrides {
  suppress?: Array<{ actionId: string }>;
  hints?: Array<{
    command: string;
    actionId: string;
    label?: string;
    category?: string;
    priority?: number;
    targetId?: string;
  }>;
}

// ─── Validation ─────────────────────────────────────────────────

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  'movement', 'interaction', 'inventory', 'communication',
  'combat', 'meta', 'story',
]);

/** Error from actions.yaml parsing or validation. */
export class ActionsYamlError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly line?: number,
  ) {
    super(`actions.yaml: ${message} (at ${path})`);
    this.name = 'ActionsYamlError';
  }
}

// ─── Compiler ───────────────────────────────────────────────────

/**
 * Result of compiling an actions.yaml file.
 */
export interface CompiledActionsYaml {
  /** Story-level config (caps, intransitives, category order). */
  config: ActionMenuConfig;
  /** Per-entity overrides (suppressions and hints). */
  overrides: CompiledActionOverrides;
}

/**
 * Compile a parsed YAML object into ActionMenuConfig and CompiledActionOverrides.
 *
 * @param yaml - Parsed YAML object (from js-yaml or similar)
 * @returns Compiled config and overrides
 * @throws ActionsYamlError on schema violations
 */
export function compileActionsYaml(yaml: unknown): CompiledActionsYaml {
  if (yaml === null || yaml === undefined) {
    return {
      config: {},
      overrides: { suppressions: [], hints: [] },
    };
  }

  if (typeof yaml !== 'object' || Array.isArray(yaml)) {
    throw new ActionsYamlError('Root must be an object', '.');
  }

  const raw = yaml as RawActionsYaml;
  const config = compileDefaults(raw.defaults);
  const overrides = compileEntities(raw.entities);

  return { config, overrides };
}

/**
 * Parse a YAML string and compile it.
 *
 * @param yamlText - Raw YAML text
 * @returns Compiled config and overrides
 * @throws ActionsYamlError on parse or validation errors
 */
export function parseAndCompileActionsYaml(yamlText: string): CompiledActionsYaml {
  let parsed: unknown;
  try {
    // Use a simple YAML parser. js-yaml is available as a transitive dep.
    // We import dynamically to keep the module tree-shakeable when not used.
    const jsYaml = require('js-yaml');
    parsed = jsYaml.load(yamlText);
  } catch (err: any) {
    throw new ActionsYamlError(
      `YAML parse error: ${err.message || err}`,
      '.',
    );
  }

  return compileActionsYaml(parsed);
}

// ─── Internal Helpers ───────────────────────────────────────────

function compileDefaults(
  defaults: RawActionsYaml['defaults'],
): ActionMenuConfig {
  if (!defaults) return {};

  const config: ActionMenuConfig = {};

  if (defaults.maxActions !== undefined) {
    if (typeof defaults.maxActions !== 'number' || defaults.maxActions < 1) {
      throw new ActionsYamlError(
        'maxActions must be a positive number',
        'defaults.maxActions',
      );
    }
    (config as any).maxActions = defaults.maxActions;
  }

  if (defaults.maxPerEntity !== undefined) {
    if (typeof defaults.maxPerEntity !== 'number' || defaults.maxPerEntity < 1) {
      throw new ActionsYamlError(
        'maxPerEntity must be a positive number',
        'defaults.maxPerEntity',
      );
    }
    (config as any).maxPerEntity = defaults.maxPerEntity;
  }

  if (defaults.intransitives !== undefined) {
    if (!Array.isArray(defaults.intransitives)) {
      throw new ActionsYamlError(
        'intransitives must be an array of strings',
        'defaults.intransitives',
      );
    }
    for (let i = 0; i < defaults.intransitives.length; i++) {
      if (typeof defaults.intransitives[i] !== 'string') {
        throw new ActionsYamlError(
          `intransitives[${i}] must be a string`,
          `defaults.intransitives[${i}]`,
        );
      }
    }
    (config as any).intransitives = defaults.intransitives;
  }

  if (defaults.categoryOrder !== undefined) {
    if (!Array.isArray(defaults.categoryOrder)) {
      throw new ActionsYamlError(
        'categoryOrder must be an array',
        'defaults.categoryOrder',
      );
    }
    for (let i = 0; i < defaults.categoryOrder.length; i++) {
      const cat = defaults.categoryOrder[i];
      if (!VALID_CATEGORIES.has(cat)) {
        throw new ActionsYamlError(
          `Unknown category "${cat}". Valid: ${[...VALID_CATEGORIES].join(', ')}`,
          `defaults.categoryOrder[${i}]`,
        );
      }
    }
    (config as any).categoryOrder = defaults.categoryOrder as ContextActionCategory[];
  }

  return config;
}

function compileEntities(
  entities: RawActionsYaml['entities'],
): CompiledActionOverrides {
  const suppressions: ActionSuppression[] = [];
  const hints: ActionHint[] = [];

  if (!entities) return { suppressions, hints };

  if (typeof entities !== 'object' || Array.isArray(entities)) {
    throw new ActionsYamlError('entities must be an object', 'entities');
  }

  for (const [entityKey, overrides] of Object.entries(entities)) {
    if (!overrides || typeof overrides !== 'object') {
      throw new ActionsYamlError(
        `Entity override must be an object`,
        `entities.${entityKey}`,
      );
    }

    // Compile suppressions
    if (overrides.suppress) {
      if (!Array.isArray(overrides.suppress)) {
        throw new ActionsYamlError(
          'suppress must be an array',
          `entities.${entityKey}.suppress`,
        );
      }

      for (let i = 0; i < overrides.suppress.length; i++) {
        const s = overrides.suppress[i];
        if (!s.actionId || typeof s.actionId !== 'string') {
          throw new ActionsYamlError(
            'suppress entry must have a string actionId',
            `entities.${entityKey}.suppress[${i}]`,
          );
        }
        suppressions.push({
          actionId: s.actionId,
          targetId: entityKey,
        });
      }
    }

    // Compile hints
    if (overrides.hints) {
      if (!Array.isArray(overrides.hints)) {
        throw new ActionsYamlError(
          'hints must be an array',
          `entities.${entityKey}.hints`,
        );
      }

      for (let i = 0; i < overrides.hints.length; i++) {
        const h = overrides.hints[i];
        if (!h.command || typeof h.command !== 'string') {
          throw new ActionsYamlError(
            'hint must have a string command',
            `entities.${entityKey}.hints[${i}].command`,
          );
        }
        if (!h.actionId || typeof h.actionId !== 'string') {
          throw new ActionsYamlError(
            'hint must have a string actionId',
            `entities.${entityKey}.hints[${i}].actionId`,
          );
        }
        if (h.category && !VALID_CATEGORIES.has(h.category)) {
          throw new ActionsYamlError(
            `Unknown category "${h.category}". Valid: ${[...VALID_CATEGORIES].join(', ')}`,
            `entities.${entityKey}.hints[${i}].category`,
          );
        }

        hints.push({
          command: h.command,
          actionId: h.actionId,
          label: h.label,
          targetId: h.targetId || entityKey,
          category: (h.category as ContextActionCategory) || undefined,
          priority: h.priority,
        });
      }
    }
  }

  return { suppressions, hints };
}
