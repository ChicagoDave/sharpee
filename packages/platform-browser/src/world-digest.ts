/**
 * world-digest.ts — the play feed's world digest (ADR-306 Phase 2).
 *
 * Purpose: after a turn, capture the slice of the world the prose does not
 * show — non-room, non-player entity locations, the score, and each state
 * machine's current state — as the source the testing surface's State picker
 * lists from (design §5: pickers list what the world actually holds, never
 * free text). Built only when the IDE's `turnEvents` bridge is active
 * (turnEventsBridgeActive), so published players never pay the enumeration.
 *
 * Token rule: each entity ref carries the single whitespace-free token the
 * `[STATE:]` evaluator's `findEntity` resolves back to that entity — an alias
 * when one qualifies, the identity/entity name when it is a single token,
 * else the id (which always resolves). This MIRRORS @sharpee/branch-tester's
 * `worldEntityRef` (runner.ts) — the browser bundle cannot import the Node
 * harness, so the rule is a deliberately narrowed mirror pinned by tests on
 * BOTH sides (the ADR-301 A1 pattern); change one and you must change both.
 *
 * Public interface: buildWorldDigest(world, engine).
 * Owner context: @sharpee/platform-browser (browser player client).
 */

import type { WorldModel } from '@sharpee/world-model';
import { TraitType } from '@sharpee/world-model';
import type {
  DigestEntityRef,
  WorldDigest,
  WorldDigestEntity,
  WorldDigestMachine,
} from './turn-events.js';

/** The plugin id plugin-state-machine registers under. */
const STATE_MACHINE_PLUGIN_ID = 'sharpee.plugin.state-machine';

/** The slice of GameEngine this module reads — plugin lookup only. */
interface PluginHost {
  getPluginRegistry?: () => { getById(id: string): unknown } | undefined;
}

/**
 * Derive an entity's digest ref. Mirror of branch-tester's `worldEntityRef`
 * (see header) — alias → single-token name → id, so every emitted token
 * round-trips through the `[STATE:]` evaluator's own resolution order.
 */
function digestEntityRef(entity: {
  id: string;
  name?: string;
  get?: (t: string) => unknown;
}): DigestEntityRef {
  const identity = entity.get?.('identity') as
    | { name?: string; aliases?: unknown[] }
    | undefined;
  const name: string = identity?.name ?? entity.name ?? entity.id;
  const singleToken = (value: unknown): value is string =>
    typeof value === 'string' && value.length > 0 && !/\s/.test(value);
  const aliasToken = identity?.aliases?.find(singleToken);
  const token = aliasToken ?? (singleToken(name) ? name : entity.id);
  return { name, token };
}

/**
 * Build the world digest for one completed turn.
 *
 * Every field degrades to absence, never a throw: a world without a scoring
 * capability has no `score`, an engine without the state-machine plugin has
 * empty `machines`, an entity whose location cannot be resolved is skipped.
 * The digest is observation — play must never break on it.
 */
export function buildWorldDigest(world: WorldModel, engine: PluginHost): WorldDigest {
  const playerId = world.getPlayer?.()?.id;
  const entities: WorldDigestEntity[] = [];

  for (const entity of world.getAllEntities?.() ?? []) {
    if (entity.id === playerId) continue;
    if (entity.has?.(TraitType.ROOM)) continue;
    const locationId = world.getLocation?.(entity.id);
    if (!locationId) continue;
    const location = world.getEntity?.(locationId);
    if (!location) continue;
    const ref = digestEntityRef(entity);
    entities.push({
      kind: entity.has?.(TraitType.ACTOR) ? 'npc' : 'item',
      name: ref.name,
      token: ref.token,
      location: digestEntityRef(location),
    });
  }

  const scoring = world.getCapability?.('scoring') as { scoreValue?: unknown } | null;
  const score = typeof scoring?.scoreValue === 'number' ? scoring.scoreValue : undefined;

  return {
    entities,
    ...(score !== undefined ? { score } : {}),
    machines: machineStates(engine),
  };
}

/**
 * Read each state machine's current state through the engine's existing
 * plugin registry surface (`getById(...).getState()` — no new engine API).
 * Duck-typed defensively: any shape mismatch yields `[]`, never a throw.
 */
function machineStates(engine: PluginHost): WorldDigestMachine[] {
  try {
    const plugin = engine.getPluginRegistry?.()?.getById(STATE_MACHINE_PLUGIN_ID) as
      | { getState?: () => unknown }
      | undefined;
    const state = plugin?.getState?.() as
      | { instances?: Array<{ id?: unknown; currentState?: unknown }> }
      | undefined;
    if (!Array.isArray(state?.instances)) return [];
    return state.instances
      .filter((m) => typeof m?.id === 'string' && typeof m?.currentState === 'string')
      .map((m) => ({ id: m.id as string, state: m.currentState as string }));
  } catch {
    return [];
  }
}
