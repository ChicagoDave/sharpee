/**
 * scene.ts — the conversation-scene explain model (ADR-320 D12).
 *
 * Purpose: turns a delivered turn's `scene` channel capture — the scene
 *   wire stream's raw rows (opens/closes, utterances with manner beats,
 *   floor changes, interruptions, rendered silences, exchange lifecycle,
 *   dispatch diagnostics) — and its `exchange-affordances` capture — the
 *   open exchange's advertised responses ("what could the player say
 *   here?") — into the same legible `ExplainGroup` lines the NPC panel
 *   renders. Pure projection: no DOM, no model mutation, nothing
 *   persisted — the rows are session observation, never document content.
 *
 * Row kinds are rendered best-effort by a per-kind describer with a
 * compact raw fallback, so an unknown or future event kind still shows
 * honestly rather than vanishing. Each line's click-to-assert fragments
 * pin the event in a channel claim on the line's own channel
 * (`claimChannel`) — `scene` for wire rows, `exchange-affordances` for
 * advertised responses.
 *
 * Public interface: sceneRowsOf(channelValues), sceneExplainGroups(rows,
 * nameOf), affordanceGroupsOf(channelValues, nameOf),
 * threadAffordanceGroupsOf(channelValues, nameOf); type SceneRow.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { ExplainGroup, ExplainLine } from './character';

/** One scene-channel row as stdlib's `scene` channel produces it. */
export interface SceneRow {
  turn: number;
  /** The event type, e.g. 'character.scene.utterance'. */
  kind: string;
  /** The event's payload, verbatim. */
  data: Record<string, unknown>;
}

/** Extracts the turn's scene rows from its per-channel capture values.
 *  Values arrive as the channel produced them (arrays of rows); anything
 *  that is not row-shaped is skipped — observation must never throw. */
export function sceneRowsOf(
  channelValues: Record<string, unknown[]> | undefined,
): SceneRow[] {
  const rows: SceneRow[] = [];
  for (const value of channelValues?.['scene'] ?? []) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === null || typeof entry !== 'object') continue;
      const row = entry as Partial<SceneRow>;
      if (typeof row.kind !== 'string') continue;
      rows.push({
        turn: typeof row.turn === 'number' ? row.turn : 0,
        kind: row.kind,
        data: (row.data && typeof row.data === 'object'
          ? row.data
          : {}) as Record<string, unknown>,
      });
    }
  }
  return rows;
}

const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '?';

/** Resolves an entity-valued payload field to a display name. */
type Who = (value: unknown) => string;

/** Per-kind describers. Text only — scene rows carry no warn tone. */
const DESCRIBERS: Record<string, (data: Record<string, unknown>, who: Who) => string> = {
  'character.scene.scene-opened': (d, who) => {
    const parties = Array.isArray(d.participantIds)
      ? d.participantIds.map(who).join(', ')
      : '?';
    const opened = d.openedBy as Record<string, unknown> | undefined;
    const how = opened && typeof opened === 'object'
      ? (opened.kind === 'witnessed-event'
          ? `on ${text(opened.eventId)}`
          : `${text(opened.kind)} by ${who(opened.openerId)}`)
      : '';
    return `scene opened — ${parties}${how ? ` (${how})` : ''}`;
  },
  'character.scene.scene-closed': (d) => `scene closed — ${text(d.boundary)} boundary`,
  'character.scene.utterance': (d, who) => {
    const to = d.addresseeId !== undefined ? ` to ${who(d.addresseeId)}` : '';
    const beats = Array.isArray(d.beats) && d.beats.length > 0
      ? ` · beats: ${d.beats.map(text).join(', ')}`
      : '';
    return `${who(d.speakerId)} speaks${to} — ${text(d.messageId)}${beats}`;
  },
  'character.scene.floor-change': (d, who) =>
    d.holderId === null ? 'floor open' : `floor to ${who(d.holderId)}`,
  'character.scene.interruption': (d, who) =>
    `${who(d.interrupterId)} interrupts — scene ${text(d.outcome)}`,
  'character.scene.rendered-silence': (d, who) => {
    const beats = Array.isArray(d.beats) && d.beats.length > 0
      ? ` · beats: ${d.beats.map(text).join(', ')}`
      : '';
    return `${who(d.speakerId)} says nothing${beats}`;
  },
  'character.scene.intrusion_blocked': (d, who) =>
    `${who(d.intruderId)} intrudes — the scene holds`,
  'character.scene.exit_refused': (d, who) =>
    `${who(d.leaverId)} cannot leave — no traversable exit`,
  'character.exchange.opened': (d) =>
    `exchange opened — ${text(d.exchangeId)} (${text(d.word)})`,
  // Conversation-thread lifecycle (ADR-320 D14, Phase 10.6).
  'character.scene.thread-opened': (d, who) =>
    `thread opened — ${text(d.threadKey)} (${who(d.ownerId)})`,
  'character.scene.thread-beat': (d, who) =>
    `${who(d.ownerId)} carries ${text(d.threadKey)} — beat ${text(d.beatIndex)}`,
  'character.scene.thread-parked': (d) =>
    `thread parked — ${text(d.threadKey)} at beat ${text(d.beatCursor)}`,
  'character.scene.thread-resumed': (d) =>
    `thread resumed — ${text(d.threadKey)} at beat ${text(d.beatCursor)}`,
  'character.scene.thread-concluded': (d, who) =>
    `thread concluded — ${text(d.threadKey)} (${who(d.ownerId)})`,
};

/** The data fields that identify each kind for click-to-assert. Volatile
 *  fields (turn, sceneId — runtime-minted) are deliberately left out so
 *  the claim survives unrelated churn. */
const FRAGMENT_FIELDS: Record<string, string[]> = {
  'character.scene.scene-closed': ['boundary'],
  'character.scene.utterance': ['speakerId', 'messageId'],
  'character.scene.floor-change': ['holderId'],
  'character.scene.interruption': ['interrupterId', 'outcome'],
  'character.scene.rendered-silence': ['speakerId'],
  'character.scene.intrusion_blocked': ['intruderId'],
  'character.scene.exit_refused': ['leaverId'],
  'character.exchange.opened': ['exchangeId', 'word'],
  'character.scene.thread-opened': ['threadKey'],
  'character.scene.thread-beat': ['threadKey', 'beatIndex'],
  'character.scene.thread-parked': ['threadKey', 'beatCursor'],
  'character.scene.thread-resumed': ['threadKey', 'beatCursor'],
  'character.scene.thread-concluded': ['threadKey'],
};

/** One `"key":"value"` fragment — a substring of the row's JSON rendering.
 *  Only scalar values qualify; anything else yields nothing. */
function frag(key: string, value: unknown): string[] {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? [`${JSON.stringify(key)}:${JSON.stringify(value)}`]
    : [];
}

/** A row's compact raw payload — the on-demand detail. */
function rawOf(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '{}';
  }
}

/** One row → one line, falling back to `kind {payload}` for unknown kinds. */
function lineOf(row: SceneRow, who: Who): ExplainLine {
  const describe = DESCRIBERS[row.kind];
  const tail = row.kind.replace(/^character\.scene\.|^character\.exchange\./, '');
  return {
    text: describe ? describe(row.data, who) : `${tail} ${rawOf(row.data)}`,
    tone: 'normal',
    raw: rawOf(row.data),
    fragments: [
      ...frag('kind', row.kind),
      ...(FRAGMENT_FIELDS[row.kind] ?? []).flatMap((field) => frag(field, row.data[field])),
    ],
    claimChannel: 'scene',
  };
}

/**
 * Groups a turn's scene rows by scene, preserving emission order within
 * and across groups (first appearance orders the groups).
 *
 * @param rows the turn's scene rows.
 * @param nameOf resolves a world id to a display name (the world digest);
 *   unresolvable ids read as the player (the digest excludes the player
 *   by design — the character panel's convention).
 */
export function sceneExplainGroups(
  rows: SceneRow[],
  nameOf: (id: string) => string | undefined,
): ExplainGroup[] {
  const who: Who = (value) => {
    const id = text(value);
    return nameOf(id) ?? 'the player';
  };
  const groups = new Map<string, ExplainGroup>();
  for (const row of rows) {
    const key = typeof row.data.sceneId === 'string' ? row.data.sceneId : 'scene';
    let group = groups.get(key);
    if (!group) {
      group = { npcLabel: key, lines: [] };
      groups.set(key, group);
    }
    group.lines.push(lineOf(row, who));
  }
  return [...groups.values()];
}

/** The `exchange-affordances` capture shapes (stdlib's wire, loosely held). */
interface CapturedAffordances {
  sceneId?: unknown;
  exchangeId?: unknown;
  responses?: unknown;
}

/** One advertised response → its display text. */
function responseText(response: Record<string, unknown>, who: Who): string {
  if (response.kind === 'verbal') {
    const topic = response.topic as Record<string, unknown> | undefined;
    if (topic?.kind === 'entity') return `say: ${who(topic.id)}`;
    const aliases = Array.isArray(topic?.aliases) && topic.aliases.length > 0
      ? ` (${topic.aliases.map(text).join(', ')})`
      : '';
    return `say: "${text(topic?.primary)}"${aliases}`;
  }
  if (response.kind === 'act') return `act: ${text(response.actionId)}`;
  if (response.kind === 'silence') return 'silence';
  return `${text(response.kind)} ${rawOf(response)}`;
}

/** A response's assert fragments: pins THIS choice on THIS exchange. */
function responseFragments(
  exchangeId: unknown,
  response: Record<string, unknown>,
): string[] {
  const topic = response.topic as Record<string, unknown> | undefined;
  return [
    ...frag('exchangeId', exchangeId),
    ...frag('kind', response.kind),
    ...(response.kind === 'verbal' && topic
      ? [...frag('primary', topic.primary), ...frag('id', topic.id)]
      : []),
    ...frag('actionId', response.actionId),
  ];
}

/**
 * Projects the turn's `exchange-affordances` capture — "what could the
 * player say here?" — into one group per open exchange, one line per
 * advertised response, each line asserting into a channel claim on
 * `exchange-affordances`.
 *
 * @param channelValues the turn's per-channel capture values.
 * @param nameOf resolves a world id to a display name (the world digest).
 */
export function affordanceGroupsOf(
  channelValues: Record<string, unknown[]> | undefined,
  nameOf: (id: string) => string | undefined,
): ExplainGroup[] {
  const who: Who = (value) => {
    const id = text(value);
    return nameOf(id) ?? 'the player';
  };
  const groups: ExplainGroup[] = [];
  for (const value of channelValues?.['exchange-affordances'] ?? []) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === null || typeof entry !== 'object') continue;
      const advertised = entry as CapturedAffordances;
      if (typeof advertised.exchangeId !== 'string' || !Array.isArray(advertised.responses)) continue;
      const lines: ExplainLine[] = [];
      for (const raw of advertised.responses) {
        if (raw === null || typeof raw !== 'object') continue;
        const response = raw as Record<string, unknown>;
        lines.push({
          text: responseText(response, who),
          tone: 'normal',
          raw: rawOf(response),
          fragments: responseFragments(advertised.exchangeId, response),
          claimChannel: 'exchange-affordances',
        });
      }
      groups.push({ npcLabel: `responses — ${advertised.exchangeId}`, lines });
    }
  }
  return groups;
}

/** The `thread-affordances` capture shape (stdlib's wire, loosely held). */
interface CapturedContinuability {
  sceneId?: unknown;
  ownerId?: unknown;
  threadKey?: unknown;
  beatCursor?: unknown;
  continuable?: unknown;
}

/**
 * Projects the turn's `thread-affordances` capture — "does the owner have
 * more to say?" (ADR-320 D14) — into one group per active thread, one
 * line stating the continuability, each line asserting into a channel
 * claim on `thread-affordances`.
 *
 * @param channelValues the turn's per-channel capture values.
 * @param nameOf resolves a world id to a display name (the world digest).
 */
export function threadAffordanceGroupsOf(
  channelValues: Record<string, unknown[]> | undefined,
  nameOf: (id: string) => string | undefined,
): ExplainGroup[] {
  const who: Who = (value) => {
    const id = text(value);
    return nameOf(id) ?? 'the player';
  };
  const groups: ExplainGroup[] = [];
  for (const value of channelValues?.['thread-affordances'] ?? []) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === null || typeof entry !== 'object') continue;
      const advertised = entry as CapturedContinuability;
      if (typeof advertised.threadKey !== 'string') continue;
      const owner = who(advertised.ownerId);
      const cursor = text(advertised.beatCursor);
      const line: ExplainLine = {
        text: advertised.continuable === true
          ? `${owner} has more to say — beat ${cursor} served, next ready`
          : `${owner} holds — beat ${cursor} served, next beat waits on its gate`,
        tone: 'normal',
        raw: rawOf(advertised as Record<string, unknown>),
        fragments: [
          ...frag('threadKey', advertised.threadKey),
          ...frag('continuable', advertised.continuable),
        ],
        claimChannel: 'thread-affordances',
      };
      groups.push({ npcLabel: `thread — ${advertised.threadKey}`, lines: [line] });
    }
  }
  return groups;
}
