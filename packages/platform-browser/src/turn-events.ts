/**
 * turn-events.ts — the IDE play-session turn feed (ADR-277 D5, rebuilt for
 * ADR-305 D4).
 *
 * Purpose: after a turn fully renders, post its record — monotonic ordinal,
 * typed command, engine-composed output, structured channel captures — to the
 * embedding WKWebView's `turnEvents` message handler, so the Sharpee IDE can
 * promote played turns into a `.transcript` (ADR-305). A restart posts a
 * fence record instead: everything before it is dead lineage (ADR-305 D3).
 * This ships in the same client bundle authors' players use, so outside the
 * IDE (no `window.webkit`) every export MUST be a true no-op — never a
 * throw, never a behavior difference.
 *
 * The ordinal counter is module state, not client state: an in-page restart
 * boots a NEW BrowserClient but the anchors' one invariant is page-lifetime
 * uniqueness (ADR-305 D4), so the counter must never reset while the page
 * lives.
 *
 * Lineage (ADR-306 Phase 2): every record names the lineage it belongs to.
 * A lineage is the run of turns between restart fences; the id starts at 1
 * (or at `__SHARPEE_PLAY_LINEAGE__.id` when the embedder injected one — the
 * IDE's branch-replay boot, the sibling of `__SHARPEE_PLAY_SEED__`) and
 * increments at each fence. Boot-lineage records carry `parentLineage` /
 * `forkOrdinal` when the boot global names them; post-fence lineages never
 * do — a restart is a fence, not a fork (ADR-305 D3).
 *
 * Public interface: nextPlayTurnOrdinal(), currentPlayLineage(),
 * turnEventsBridgeActive(), emitTurnEvent(payload), emitRestartEvent(),
 * capturesOf(payloads); types TurnCapture, TurnEventPayload,
 * RestartEventPayload, TurnEventRecord.
 * Owner context: @sharpee/platform-browser (browser player client).
 */

/** One channel's captured values for a single turn, structure preserved. */
export interface TurnCapture {
  channel: string;
  /**
   * The channel's values as the turn packet carried them — structured, never
   * flattened here: flattening to assertion fragments is the synthesis
   * module's job, the one implementation (ADR-305 D5).
   */
  values: unknown[];
}

/** One entity as the world digest names it: display name + the single
 *  whitespace-free token a `[STATE:]` expression resolves back to it. */
export interface DigestEntityRef {
  name: string;
  token: string;
}

/** One non-room, non-player entity and where it sits (the unseen slice). */
export interface WorldDigestEntity {
  kind: 'npc' | 'item';
  /** The entity's world id — the key author-channel rows (`npcId`) carry,
   *  so the testing surface can resolve a row to this entity's name. */
  id: string;
  name: string;
  token: string;
  location: DigestEntityRef;
}

/** One state machine's current state (plugin-state-machine registry). */
export interface WorldDigestMachine {
  id: string;
  state: string;
}

/**
 * The world digest (ADR-306 Phase 2): the slice the prose does not show —
 * the State picker's source (design §5). Never includes `player.location`.
 */
export interface WorldDigest {
  entities: WorldDigestEntity[];
  score?: number;
  machines: WorldDigestMachine[];
}

/** What a caller supplies per turn; the lineage fields are stamped here. */
export interface TurnEventPayload {
  /** Monotonic 1-based ordinal, matching the turn's `data-turn` anchors. */
  turn: number;
  /** The player's typed command (no `> ` prefix). */
  command: string;
  /**
   * The turn's composed prose — the ENGINE's text, packets joined the way
   * the headless harness joins them (`packetProseText` per packet, then
   * '\n' across packets — `@sharpee/bootstrap`'s outputBuffer rule), so an
   * `all-emitted-text` block written from play matches replay.
   */
  output: string;
  /** The turn's channel captures. */
  captures: TurnCapture[];
  /** The turn's emitted semantic-event types, in emission order. */
  events: string[];
  /** The world digest after this turn; absent when the bridge is inactive
   *  (published players never pay for it — see turnEventsBridgeActive). */
  world?: WorldDigest;
}

/** The record as posted: the payload plus the lineage stamp. */
export interface TurnEventRecord extends TurnEventPayload {
  /** The lineage this turn belongs to (fence-delimited, page-lifetime id). */
  lineage: number;
  /** Boot-lineage records only: the lineage this one forked from. */
  parentLineage?: number;
  /** Boot-lineage records only: which sibling at the fork point this is. */
  forkOrdinal?: number;
}

/** A restart fence on the wire (ADR-305 D3): `turn` is the first ordinal of
 *  the NEW lineage, `lineage` its id (ADR-306 Phase 2). */
export interface RestartEventPayload {
  restart: true;
  turn: number;
  lineage: number;
}

/** Page-lifetime ordinal counter — survives in-page reboots by design. */
let playTurnCounter = 0;

/** The boot lineage context, read once from the embedder's global. */
interface PlayLineageBoot {
  id?: number;
  parent?: number;
  fork?: number;
}

/** Current lineage id; `undefined` until first use (global not yet read). */
let playLineage: number | undefined;
/** The boot global as captured at first use; boot-lineage records carry it. */
let bootLineage: PlayLineageBoot | undefined;
/** The id the page booted with — records of THIS lineage carry parent/fork. */
let bootLineageId: number | undefined;

/** Resolve (and on first use, initialize) the current lineage id. */
function ensureLineage(): number {
  if (playLineage === undefined) {
    bootLineage = (window as unknown as { __SHARPEE_PLAY_LINEAGE__?: PlayLineageBoot })
      .__SHARPEE_PLAY_LINEAGE__;
    playLineage = typeof bootLineage?.id === 'number' ? bootLineage.id : 1;
    bootLineageId = playLineage;
  }
  return playLineage;
}

/** The lineage id the next record will carry. */
export function currentPlayLineage(): number {
  return ensureLineage();
}

/**
 * Whether the IDE's `turnEvents` bridge is present. Callers use this to skip
 * work that only feeds the bridge (the world digest) in published players.
 */
export function turnEventsBridgeActive(): boolean {
  return !!(window as unknown as {
    webkit?: { messageHandlers?: { turnEvents?: unknown } };
  }).webkit?.messageHandlers?.turnEvents;
}

/**
 * Claim the next turn ordinal. Monotonic and 1-based for the page's lifetime;
 * the same value goes on the turn's `data-turn` anchors and its feed record.
 */
export function nextPlayTurnOrdinal(): number {
  playTurnCounter += 1;
  return playTurnCounter;
}

/**
 * Merge the turn's packet payloads into per-channel capture lists, structure
 * preserved. Scalar payload values wrap into one-element lists; list payloads
 * pass through, so downstream consumers always see `unknown[]` per channel.
 */
export function capturesOf(
  payloads: ReadonlyArray<Readonly<Record<string, unknown>>>
): TurnCapture[] {
  const merged = new Map<string, unknown[]>();
  for (const payload of payloads) {
    for (const [channel, value] of Object.entries(payload)) {
      const values = Array.isArray(value) ? value : [value];
      merged.set(channel, [...(merged.get(channel) ?? []), ...values]);
    }
  }
  return [...merged.entries()].map(([channel, values]) => ({ channel, values }));
}

/**
 * Posts a completed turn's record to the IDE's `turnEvents` bridge when
 * embedded in a WKWebView that registered one; silently does nothing
 * otherwise. Stamps the lineage fields centrally so callers never manage
 * lineage state.
 */
export function emitTurnEvent(payload: TurnEventPayload): void {
  const lineage = ensureLineage();
  const record: TurnEventRecord = { ...payload, lineage };
  if (lineage === bootLineageId) {
    if (typeof bootLineage?.parent === 'number') record.parentLineage = bootLineage.parent;
    if (typeof bootLineage?.fork === 'number') record.forkOrdinal = bootLineage.fork;
  }
  post(record);
}

/**
 * Posts a restart fence (ADR-305 D3) naming the first ordinal AND the
 * lineage id of the new lineage (ADR-306 Phase 2). Call when an in-page
 * reboot begins; a full page reload needs no event — the embedder sees the
 * navigation itself.
 */
export function emitRestartEvent(): void {
  playLineage = ensureLineage() + 1;
  const payload: RestartEventPayload = {
    restart: true,
    turn: playTurnCounter + 1,
    lineage: playLineage,
  };
  post(payload);
}

/** Shared best-effort post — play must never break on the bridge. */
function post(payload: TurnEventRecord | RestartEventPayload): void {
  const handler = (window as unknown as {
    webkit?: { messageHandlers?: { turnEvents?: { postMessage(body: string): void } } };
  }).webkit?.messageHandlers?.turnEvents;
  if (!handler) return;
  try {
    handler.postMessage(JSON.stringify(payload));
  } catch {
    // The bridge is best-effort observation — play must never break on it.
  }
}
