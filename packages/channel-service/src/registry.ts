/**
 * @sharpee/channel-service — session registry
 *
 * Owner context: platform package. Module-level singleton matching the
 * ADR-163 §12 imperative API. Holds the per-session channel and rule
 * registries plus the negotiated client capabilities.
 *
 * Lifecycle (ADR-163 §11):
 *   1. `registerHello(capabilities)` — required before manifest production.
 *   2. `registerChannel(...)` and `addRule(...)` calls during story init.
 *   3. `produceCmgtManifest(...)` — freezes registration; further
 *      `registerChannel` / `addRule` calls throw.
 *   4. `produceTurnPacket(...)` per turn.
 *   5. `resetSession()` — for the next session (AC-12 replay, tests,
 *      stateless multi-user worker reuse).
 *
 * Bootstrap-order invariants (AC-11): no manifest before hello; no
 * channel registration after manifest.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 11, 12
 */

import type { ChannelDefinition, ClientCapabilities } from './wire';
import type { ChannelRule } from './types';

interface IndexedRule {
  readonly rule: ChannelRule;
  readonly order: number;
}

/**
 * Subset of `ClientCapabilities` keys that name boolean flags. The
 * `text` field is always `true`; the dimension fields are numbers.
 */
export type CapabilityFlag = Exclude<
  {
    [K in keyof ClientCapabilities]: ClientCapabilities[K] extends boolean
      ? K
      : never;
  }[keyof ClientCapabilities],
  'text'
>;

/**
 * Optional registration metadata for `registerChannel` (ADR-163 §6).
 *
 * `gatedBy` names a `ClientCapabilities` boolean flag. The channel is
 * filtered out of `produceCmgtManifest` for clients that did not
 * declare that capability as `true`. Authors gate story channels
 * through the same mechanism.
 */
export interface RegisterChannelOptions {
  readonly gatedBy?: CapabilityFlag;
}

interface SessionState {
  readonly channels: Map<string, ChannelDefinition>;
  readonly gating: Map<string, CapabilityFlag>;
  rules: IndexedRule[];
  ruleCounter: number;
  capabilities: ClientCapabilities | null;
  manifestFrozen: boolean;
  /**
   * Per-channel previous emitted value, used by `produceTurnPacket`
   * for sparse-emit change detection and for `always`-mode replace
   * channels that need to re-emit on idle turns (AC-9).
   */
  readonly prevValues: Map<string, unknown>;
  /**
   * Monotonic turn counter for `turn_id` generation. Increments once
   * per `produceTurnPacket` call. Resets on `resetSession()`.
   */
  turnCounter: number;
}

function createState(): SessionState {
  return {
    channels: new Map(),
    gating: new Map(),
    rules: [],
    ruleCounter: 0,
    capabilities: null,
    manifestFrozen: false,
    prevValues: new Map(),
    turnCounter: 0,
  };
}

let state: SessionState = createState();

/**
 * Register a `hello` for the current session (ADR-163 §2, §11).
 *
 * Single-bundle runtimes synthesize a hello locally before any other
 * channel-service call. Transport-attached deployments (ADR-164) call
 * this when the client's hello arrives.
 *
 * Throws if a hello has already been registered for the session —
 * `resetSession()` must run before a second hello.
 */
export function registerHello(capabilities: ClientCapabilities): void {
  if (state.capabilities !== null) {
    throw new Error(
      'channel-service: hello already registered for this session. ' +
        'Call resetSession() before registering a new hello.',
    );
  }
  state.capabilities = capabilities;
}

/**
 * Read the registered capabilities (ADR-163 §6 — used by stories that
 * gate channel registration on declared capabilities).
 *
 * Throws if no hello has been registered.
 */
export function getCapabilities(): ClientCapabilities {
  if (state.capabilities === null) {
    throw new Error(
      'channel-service: getCapabilities() called before registerHello(). ' +
        'Bootstrap order invariant: hello must precede capability reads.',
    );
  }
  return state.capabilities;
}

/**
 * Register a channel definition (ADR-163 §12, AC-11c).
 *
 * Throws after `produceCmgtManifest()` has been called — channel
 * registration closes at manifest production. Throws on duplicate id
 * to surface ordering / source-of-truth conflicts at registration time.
 */
export function registerChannel(
  def: ChannelDefinition,
  options?: RegisterChannelOptions,
): void {
  if (state.manifestFrozen) {
    throw new Error(
      `channel-service: cannot register channel '${def.id}' after CMGT manifest has been produced. ` +
        'Channel registration is closed for this session.',
    );
  }
  if (state.channels.has(def.id)) {
    throw new Error(
      `channel-service: channel '${def.id}' already registered. ` +
        'Each channel id must be unique per session.',
    );
  }
  state.channels.set(def.id, def);
  if (options?.gatedBy) {
    state.gating.set(def.id, options.gatedBy);
  }
}

/**
 * Internal: capability flag gating a channel, or `undefined` if
 * unregistered or not gated.
 *
 * Used by `produceCmgtManifest` to filter channels per declared
 * capabilities (AC-5). Story channels gate themselves via the
 * `options` argument to `registerChannel`.
 *
 * @internal
 */
export function _getGating(channelId: string): CapabilityFlag | undefined {
  return state.gating.get(channelId);
}

/**
 * Read the full registered channel set (ADR-163 §12).
 *
 * Returns an immutable snapshot. The CMGT producer applies capability
 * filtering on top of this set; this getter does not filter.
 */
export function getChannelRegistry(): ReadonlyArray<ChannelDefinition> {
  return Array.from(state.channels.values());
}

/**
 * Add a routing rule (ADR-163 §12).
 *
 * Rules are kept in priority-descending order with stable tiebreak
 * by registration order — first-registered wins among equal priorities.
 *
 * Throws after manifest production — rule registration closes at the
 * same boundary as channel registration.
 */
export function addRule(rule: ChannelRule): void {
  if (state.manifestFrozen) {
    throw new Error(
      `channel-service: cannot add rule (channel '${rule.emit.channel}') after CMGT manifest has been produced. ` +
        'Rule registration is closed for this session.',
    );
  }
  const indexed: IndexedRule = { rule, order: state.ruleCounter++ };
  state.rules.push(indexed);
  state.rules.sort(compareRules);
}

/**
 * Add multiple routing rules in order (ADR-163 §12).
 */
export function addRules(rules: ReadonlyArray<ChannelRule>): void {
  for (const rule of rules) {
    addRule(rule);
  }
}

/**
 * Internal: priority-desc / order-asc comparator for rule sort.
 */
function compareRules(a: IndexedRule, b: IndexedRule): number {
  const pa = a.rule.priority ?? 0;
  const pb = b.rule.priority ?? 0;
  if (pa !== pb) return pb - pa;
  return a.order - b.order;
}

/**
 * Internal: rules in priority-desc / registration-asc order.
 *
 * Used by the producer to dispatch each `ITextBlock` through the rule
 * chain. Not part of the public API.
 *
 * @internal
 */
export function _getRulesInDispatchOrder(): ReadonlyArray<ChannelRule> {
  return state.rules.map((indexed) => indexed.rule);
}

/**
 * Internal: read the manifest-frozen flag.
 *
 * @internal
 */
export function _isManifestFrozen(): boolean {
  return state.manifestFrozen;
}

/**
 * Internal: mark the manifest frozen. Called by `produceCmgtManifest`
 * after computing the per-client manifest.
 *
 * @internal
 */
export function _freezeManifest(): void {
  state.manifestFrozen = true;
}

/**
 * Internal: read the registered hello, or `null` if unregistered.
 *
 * Used by `produceCmgtManifest` to enforce the hello-before-CMGT
 * invariant (AC-11a, AC-4).
 *
 * @internal
 */
export function _peekCapabilities(): ClientCapabilities | null {
  return state.capabilities;
}

/**
 * Internal: read the previously emitted value for a channel, or
 * `undefined` if no prior emission. Used by `produceTurnPacket` for
 * sparse-emit change detection and `always`-mode replace re-emission.
 *
 * @internal
 */
export function _getPrevValue(channelId: string): unknown {
  return state.prevValues.get(channelId);
}

/**
 * Internal: record an emitted value for a channel.
 *
 * @internal
 */
export function _setPrevValue(channelId: string, value: unknown): void {
  state.prevValues.set(channelId, value);
}

/**
 * Internal: allocate the next monotonic `turn_id` for this session.
 *
 * Format: `'turn-<n>'` starting at `1` and incrementing by 1 per call.
 * Resets on `resetSession()`. Sufficient for in-process single-bundle
 * deployments; multi-user surfaces (ADR-164) may override using a
 * worker-aware id scheme.
 *
 * @internal
 */
export function _nextTurnId(): string {
  state.turnCounter += 1;
  return `turn-${state.turnCounter}`;
}

/**
 * Reset all session state.
 *
 * Required entry point for replay (ADR-163 §14, AC-12), tests, and the
 * stateless multi-user per-worker boot path (ADR-164). After reset:
 * the registry is empty, no hello is registered, the manifest is
 * unfrozen.
 *
 * The platform's standard channels and `platformRules` are NOT
 * reinstated by `resetSession()` — the consumer's bootstrap re-runs
 * story init, which re-registers them.
 */
export function resetSession(): void {
  state = createState();
}
